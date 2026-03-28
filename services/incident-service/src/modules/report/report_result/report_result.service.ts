import { reportResultRepository } from "./report_result.repository";
import { reportRepository } from "../report.repository";
import { campaignManagerService } from "../../campaign/campaign_manager/campaign_manager.service";
import {
  ResultStatus,
  ReportStatus,
  MediaFileStage,
  MediaResourceType,
} from "../../../constants/status.enum";
import prisma from "../../../config/prisma.client";

// Request DTOs
export interface CreateResultRequest {
  reportId: string;
  description?: string;
  mediaFiles?: string[]; // Array of file URLs (AFTER stage)
}

export interface UpdateResultRequest {
  description?: string;
}

export interface ApproveResultRequest {
  approved: boolean;
  rejectionReason?: string;
}

// Response DTOs
export interface ResultResponse {
  id: string;
  reportId: string;
  submittedByManagerId: string;
  description: string | null;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResultDetailResponse extends ResultResponse {
  mediaFiles: ResultMediaFileResponse[];
  report?: {
    id: string;
    title: string | null;
    status: number | null;
    userId: string | null;
  };
}

export interface ResultMediaFileResponse {
  id: string;
  mediaId: string;
  url: string | null;
  stage: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}

export class ReportResultService {
  constructor() {}

  /**
   * Submit a result for a report
   * Only managers can submit results
   */
  async submitResult(
    managerId: string,
    request: CreateResultRequest,
  ): Promise<ResultResponse> {
    // Check if report exists
    const report = await reportRepository.findById(request.reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    // Check if user is a manager for this report
    const isManager = await campaignManagerService.isManager(
      request.reportId,
      managerId,
    );
    if (!isManager) {
      throw new Error("Only managers can submit results");
    }

    const result = await reportResultRepository.create({
      reportId: request.reportId,
      submittedByManagerId: managerId,
      description: request.description,
    });

    // Add media files if provided
    if (request.mediaFiles && request.mediaFiles.length > 0) {
      for (const fileUrl of request.mediaFiles) {
        const media = await prisma.media.create({
          data: {
            url: fileUrl,
            type: MediaResourceType.REPORT_RESULT,
            createdBy: managerId,
            updatedBy: managerId,
          },
        });

        await reportResultRepository.addMediaFile({
          reportResultId: result.id,
          mediaId: media.id,
          stage: MediaFileStage.AFTER,
          uploadedBy: managerId,
        });
      }
    }

    // TODO: Send notification to reporter about result submission
    // await this.notifyReporterAboutResult(report.userId, request.reportId, result.id);

    return this.toResultResponse(result);
  }

  /**
   * Get result by ID
   */
  async getResultById(id: string): Promise<ResultResponse | null> {
    const result = await reportResultRepository.findById(id);
    return result ? this.toResultResponse(result) : null;
  }

  /**
   * Get result with details
   */
  async getResultDetail(id: string): Promise<ResultDetailResponse | null> {
    const result = await reportResultRepository.findByIdWithRelations(id);
    if (!result) return null;

    const mediaUrlMap = await this.getMediaUrlMap(
      result.reportMediaFiles.map((mf) => mf.mediaId),
    );

    return {
      ...this.toResultResponse(result),
      mediaFiles: result.reportMediaFiles.map((mf) => ({
        id: mf.id,
        mediaId: mf.mediaId,
        url: mediaUrlMap.get(mf.mediaId) ?? null,
        stage: mf.stage,
        uploadedBy: mf.uploadedBy,
        createdAt: mf.createdAt,
      })),
      report: result.report
        ? {
            id: result.report.id,
            title: result.report.title,
            status: result.report.status,
            userId: result.report.userId,
          }
        : undefined,
    };
  }

  /**
   * Get all results for a report
   */
  async getReportResults(reportId: string): Promise<ResultDetailResponse[]> {
    const results = await reportResultRepository.findByReportId(reportId);

    const mediaIds = results.flatMap((result) =>
      result.reportMediaFiles.map((mediaFile) => mediaFile.mediaId),
    );
    const mediaUrlMap = await this.getMediaUrlMap(mediaIds);

    return results.map((result) => ({
      ...this.toResultResponse(result),
      mediaFiles: result.reportMediaFiles.map((mf) => ({
        id: mf.id,
        mediaId: mf.mediaId,
        url: mediaUrlMap.get(mf.mediaId) ?? null,
        stage: mf.stage,
        uploadedBy: mf.uploadedBy,
        createdAt: mf.createdAt,
      })),
    }));
  }

  /**
   * Update a result
   * Only the submitting manager can update
   */
  async updateResult(
    resultId: string,
    managerId: string,
    request: UpdateResultRequest,
  ): Promise<ResultResponse> {
    const result = await reportResultRepository.findById(resultId);
    if (!result) {
      throw new Error("Result not found");
    }

    // Check if user is the submitter
    if (result.submittedByManagerId !== managerId) {
      throw new Error("Only the submitting manager can update this result");
    }

    // Can only update pending results
    if (result.status !== ResultStatus._STATUS_WAITING_APPROVED) {
      throw new Error("Can only update pending results");
    }

    const updated = await reportResultRepository.update(resultId, {
      description: request.description,
    });

    return this.toResultResponse(updated);
  }

  /**
   * Approve or reject a result
   * Only the reporter can approve/reject
   */
  async processResult(
    resultId: string,
    reporterId: string,
    approved: boolean,
  ): Promise<ResultResponse> {
    const result = await reportResultRepository.findByIdWithRelations(resultId);
    if (!result) {
      throw new Error("Result not found");
    }

    // Check if user is the reporter
    if (result.report?.userId !== reporterId) {
      throw new Error("Only the reporter can approve/reject results");
    }

    // Check if already processed
    if (result.status !== ResultStatus._STATUS_WAITING_APPROVED) {
      throw new Error("Result already processed");
    }

    const newStatus = approved
      ? ResultStatus._STATUS_APPROVED
      : ResultStatus._STATUS_REJECTED;
    const updated = await reportResultRepository.updateStatus(
      resultId,
      newStatus,
    );

    if (approved) {
      // Update report status to completed
      await reportRepository.update(result.reportId, {
        status: ReportStatus._STATUS_COMPLETED,
      });

      // TODO: Call reward service to add green points
      // This should add points to all volunteers who participated
      this.addGreenPointsToParticipants(result.reportId).catch((err) => {
        console.error("Failed to add green points:", err.message);
      });
    }

    return this.toResultResponse(updated);
  }

  /**
   * Add green points to participants when result is approved
   * TODO: Implement actual reward service integration
   */
  private async addGreenPointsToParticipants(reportId: string): Promise<void> {
    try {
      // TODO: Uncomment when reward-service is implemented
      // const report = await reportRepository.findByIdWithRelations(reportId);
      // if (!report) return;
      //
      // // Get all approved volunteers
      // const approvedVolunteers = report.reportJoiningRequest
      //     .filter(jr => jr.status === 'approved')
      //     .map(jr => jr.volunteerId);
      //
      // // Add points to reporter
      // if (report.userId) {
      //     await axios.post(`${REWARD_SERVICE_URL}/api/v1/points/add`, {
      //         userId: report.userId,
      //         points: 100, // Reporter bonus
      //         reason: `Report ${reportId} completed`,
      //     });
      // }
      //
      // // Add points to volunteers
      // for (const volunteerId of approvedVolunteers) {
      //     if (volunteerId) {
      //         await axios.post(`${REWARD_SERVICE_URL}/api/v1/points/add`, {
      //             userId: volunteerId,
      //             points: 50, // Volunteer bonus
      //             reason: `Participated in report ${reportId}`,
      //         });
      //     }
      // }

      console.log(
        `[Rewards] Would add green points to participants of report ${reportId}`,
      );
    } catch (error) {
      console.error("Failed to add green points:", error);
    }
  }

  private toResultResponse(result: any): ResultResponse {
    return {
      id: result.id,
      reportId: result.reportId,
      submittedByManagerId: result.submittedByManagerId,
      description: result.description,
      status: result.status,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  private async getMediaUrlMap(
    mediaIds: string[],
  ): Promise<Map<string, string>> {
    if (mediaIds.length === 0) {
      return new Map();
    }

    const mediaRecords = await prisma.media.findMany({
      where: {
        id: { in: mediaIds },
        deletedAt: null,
      },
      select: {
        id: true,
        url: true,
      },
    });

    return new Map(mediaRecords.map((item) => [item.id, item.url]));
  }
}

// Singleton instance
export const reportResultService = new ReportResultService();
