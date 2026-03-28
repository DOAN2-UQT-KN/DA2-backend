import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "../../../config/prisma.client";

export class CampaignTaskRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: Prisma.CampaignTaskCreateInput) {
    return this.prisma.campaignTask.create({ data });
  }

  async findById(id: string) {
    return this.prisma.campaignTask.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithAssignments(id: string) {
    return this.prisma.campaignTask.findFirst({
      where: { id, deletedAt: null },
      include: {
        campaignTaskAssignments: {
          where: { deletedAt: null },
        },
      },
    });
  }

  async findByCampaignId(campaignId: string) {
    return this.prisma.campaignTask.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        campaignTaskAssignments: {
          where: { deletedAt: null },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(id: string, data: Prisma.CampaignTaskUpdateInput) {
    return this.prisma.campaignTask.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.campaignTask.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // Task Assignment operations
  async createAssignment(data: {
    campaignTaskId: string;
    volunteerId: string;
  }) {
    return this.prisma.campaignTaskAssignment.create({
      data: {
        campaignTaskId: data.campaignTaskId,
        volunteerId: data.volunteerId,
      },
    });
  }

  async findAssignment(taskId: string, volunteerId: string) {
    return this.prisma.campaignTaskAssignment.findFirst({
      where: {
        campaignTaskId: taskId,
        volunteerId,
        deletedAt: null,
      },
    });
  }

  async findAssignmentsByTaskId(taskId: string) {
    return this.prisma.campaignTaskAssignment.findMany({
      where: { campaignTaskId: taskId, deletedAt: null },
    });
  }

  async findAssignmentsByVolunteerId(volunteerId: string) {
    return this.prisma.campaignTaskAssignment.findMany({
      where: { volunteerId, deletedAt: null },
      include: {
        campaignTask: {
          include: {
            campaign: {
              select: {
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });
  }

  async removeAssignment(id: string) {
    return this.prisma.campaignTaskAssignment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

// Singleton instance
export const campaignTaskRepository = new CampaignTaskRepository();
