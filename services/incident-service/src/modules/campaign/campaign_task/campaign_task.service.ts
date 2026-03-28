import { campaignTaskRepository } from "./campaign_task.repository";
import { campaignRepository } from "../campaign.repository";
import { campaignManagerService } from "../campaign_manager/campaign_manager.service";
import { campaignJoiningRequestService } from "../campaign_joining_request/campaign_joining_request.service";
import { GlobalStatus, TaskStatus } from "../../../constants/status.enum";
import { HttpError, HTTP_STATUS } from "../../../constants/http-status";

export interface CreateTaskRequest {
  campaignId: string;
  title: string;
  description?: string;
  scheduledTime?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: number;
  scheduledTime?: string;
}

export interface TaskResponse {
  id: string;
  campaignId: string | null;
  title: string | null;
  description: string | null;
  status: number;
  scheduledTime: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDetailResponse extends TaskResponse {
  assignments: CampaignTaskAssignmentResponse[];
}

export interface CampaignTaskAssignmentResponse {
  id: string;
  campaignTaskId: string | null;
  volunteerId: string | null;
  createdAt: Date;
}

export class CampaignTaskService {
  constructor() {}

  async createTask(
    userId: string,
    request: CreateTaskRequest,
  ): Promise<TaskResponse> {
    const campaign = await campaignRepository.findById(request.campaignId);
    if (!campaign) {
      throw new HttpError(
        HTTP_STATUS.NOT_FOUND.withMessage("Campaign not found"),
      );
    }

    const canManage = await campaignManagerService.canManageCampaign(
      request.campaignId,
      userId,
    );
    if (!canManage) {
      throw new HttpError(
        HTTP_STATUS.FORBIDDEN.withMessage(
          "Only the campaign creator or campaign managers can create tasks",
        ),
      );
    }

    const task = await campaignTaskRepository.create({
      campaign: { connect: { id: request.campaignId } },
      title: request.title,
      description: request.description,
      scheduledTime: request.scheduledTime
        ? new Date(request.scheduledTime)
        : undefined,
      createdBy: userId,
      status: TaskStatus._STATUS_TODO,
    });

    return this.toTaskResponse(task);
  }

  async getTaskById(id: string): Promise<TaskResponse | null> {
    const task = await campaignTaskRepository.findById(id);
    return task ? this.toTaskResponse(task) : null;
  }

  async getTaskDetail(id: string): Promise<TaskDetailResponse | null> {
    const task = await campaignTaskRepository.findByIdWithAssignments(id);
    if (!task) {
      return null;
    }

    return {
      ...this.toTaskResponse(task),
      assignments: task.campaignTaskAssignments.map((a) => ({
        id: a.id,
        campaignTaskId: a.campaignTaskId,
        volunteerId: a.volunteerId,
        createdAt: a.createdAt,
      })),
    };
  }

  async getCampaignTasks(
    campaignId: string,
  ): Promise<TaskDetailResponse[]> {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new HttpError(
        HTTP_STATUS.NOT_FOUND.withMessage("Campaign not found"),
      );
    }

    const tasks =
      await campaignTaskRepository.findByCampaignId(campaignId);
    return tasks.map((task) => ({
      ...this.toTaskResponse(task),
      assignments: task.campaignTaskAssignments.map((a) => ({
        id: a.id,
        campaignTaskId: a.campaignTaskId,
        volunteerId: a.volunteerId,
        createdAt: a.createdAt,
      })),
    }));
  }

  async updateTask(
    taskId: string,
    userId: string,
    request: UpdateTaskRequest,
  ): Promise<TaskResponse> {
    const task = await campaignTaskRepository.findById(taskId);
    if (!task) {
      throw new HttpError(HTTP_STATUS.TASK_NOT_FOUND);
    }

    if (!task.campaignId) {
      throw new HttpError(
        HTTP_STATUS.BAD_REQUEST.withMessage("Task has no associated campaign"),
      );
    }

    const canManage = await campaignManagerService.canManageCampaign(
      task.campaignId,
      userId,
    );
    if (!canManage) {
      throw new HttpError(
        HTTP_STATUS.FORBIDDEN.withMessage(
          "Only the campaign creator or campaign managers can update tasks",
        ),
      );
    }

    const updated = await campaignTaskRepository.update(taskId, {
      title: request.title,
      description: request.description,
      status: request.status,
      scheduledTime: request.scheduledTime
        ? new Date(request.scheduledTime)
        : undefined,
    });

    return this.toTaskResponse(updated);
  }

  async deleteTask(taskId: string, userId: string): Promise<void> {
    const task = await campaignTaskRepository.findById(taskId);
    if (!task) {
      throw new HttpError(HTTP_STATUS.TASK_NOT_FOUND);
    }

    if (!task.campaignId) {
      throw new HttpError(
        HTTP_STATUS.BAD_REQUEST.withMessage("Task has no associated campaign"),
      );
    }

    const canManage = await campaignManagerService.canManageCampaign(
      task.campaignId,
      userId,
    );
    if (!canManage) {
      throw new HttpError(
        HTTP_STATUS.FORBIDDEN.withMessage(
          "Only the campaign creator or campaign managers can delete tasks",
        ),
      );
    }

    await campaignTaskRepository.softDelete(taskId);
  }

  async assignTask(
    taskId: string,
    volunteerId: string,
    assignedBy: string,
  ): Promise<CampaignTaskAssignmentResponse> {
    const task = await campaignTaskRepository.findById(taskId);
    if (!task) {
      throw new HttpError(HTTP_STATUS.TASK_NOT_FOUND);
    }

    if (!task.campaignId) {
      throw new HttpError(
        HTTP_STATUS.BAD_REQUEST.withMessage("Task has no associated campaign"),
      );
    }

    const canManage = await campaignManagerService.canManageCampaign(
      task.campaignId,
      assignedBy,
    );
    if (!canManage) {
      throw new HttpError(
        HTTP_STATUS.FORBIDDEN.withMessage(
          "Only the campaign creator or campaign managers can assign tasks",
        ),
      );
    }

    const isApproved =
      await campaignJoiningRequestService.isApprovedVolunteer(
        task.campaignId,
        volunteerId,
      );
    if (!isApproved) {
      throw new HttpError(
        HTTP_STATUS.FORBIDDEN.withMessage(
          "Volunteer must be approved for this campaign before being assigned tasks",
        ),
      );
    }

    const existing = await campaignTaskRepository.findAssignment(
      taskId,
      volunteerId,
    );
    if (existing) {
      throw new HttpError(
        HTTP_STATUS.CONFLICT.withMessage(
          "Volunteer is already assigned to this task",
        ),
      );
    }

    const assignment = await campaignTaskRepository.createAssignment({
      campaignTaskId: taskId,
      volunteerId,
    });

    if (task.status === TaskStatus._STATUS_TODO) {
      await campaignTaskRepository.update(taskId, {
        status: TaskStatus._STATUS_INPROCESS,
      });
    }

    return {
      id: assignment.id,
      campaignTaskId: assignment.campaignTaskId,
      volunteerId: assignment.volunteerId,
      createdAt: assignment.createdAt,
    };
  }

  async unassignTask(
    taskId: string,
    volunteerId: string,
    removedBy: string,
  ): Promise<void> {
    const task = await campaignTaskRepository.findById(taskId);
    if (!task) {
      throw new HttpError(HTTP_STATUS.TASK_NOT_FOUND);
    }

    if (!task.campaignId) {
      throw new HttpError(
        HTTP_STATUS.BAD_REQUEST.withMessage("Task has no associated campaign"),
      );
    }

    const canManage = await campaignManagerService.canManageCampaign(
      task.campaignId,
      removedBy,
    );
    if (!canManage) {
      throw new HttpError(
        HTTP_STATUS.FORBIDDEN.withMessage(
          "Only the campaign creator or campaign managers can unassign tasks",
        ),
      );
    }

    const assignment = await campaignTaskRepository.findAssignment(
      taskId,
      volunteerId,
    );
    if (!assignment) {
      throw new HttpError(
        HTTP_STATUS.NOT_FOUND.withMessage(
          "Volunteer is not assigned to this task",
        ),
      );
    }

    await campaignTaskRepository.removeAssignment(assignment.id);
  }

  async getMyAssignedTasks(volunteerId: string) {
    const assignments =
      await campaignTaskRepository.findAssignmentsByVolunteerId(volunteerId);
    return assignments.map((a) => ({
      assignment: {
        id: a.id,
        campaignTaskId: a.campaignTaskId,
        volunteerId: a.volunteerId,
        createdAt: a.createdAt,
      },
      task: a.campaignTask
        ? {
            id: a.campaignTask.id,
            campaignId: a.campaignTask.campaignId,
            title: a.campaignTask.title,
            description: a.campaignTask.description,
            status: a.campaignTask.status,
            scheduledTime: a.campaignTask.scheduledTime,
            createdBy: a.campaignTask.createdBy,
            createdAt: a.campaignTask.createdAt,
            campaign: a.campaignTask.campaign,
          }
        : null,
    }));
  }

  async updateTaskStatusByVolunteer(
    taskId: string,
    volunteerId: string,
    status: GlobalStatus._STATUS_INPROCESS | GlobalStatus._STATUS_COMPLETED,
  ): Promise<TaskResponse> {
    const task = await campaignTaskRepository.findById(taskId);
    if (!task) {
      throw new HttpError(HTTP_STATUS.TASK_NOT_FOUND);
    }

    const assignment = await campaignTaskRepository.findAssignment(
      taskId,
      volunteerId,
    );
    if (!assignment) {
      throw new HttpError(
        HTTP_STATUS.FORBIDDEN.withMessage("You are not assigned to this task"),
      );
    }

    const updated = await campaignTaskRepository.update(taskId, { status });
    return this.toTaskResponse(updated);
  }

  private toTaskResponse(task: {
    id: string;
    campaignId: string | null;
    title: string | null;
    description: string | null;
    status: number;
    scheduledTime: Date | null;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): TaskResponse {
    return {
      id: task.id,
      campaignId: task.campaignId,
      title: task.title,
      description: task.description,
      status: task.status,
      scheduledTime: task.scheduledTime,
      createdBy: task.createdBy,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }
}

export const campaignTaskService = new CampaignTaskService();
