import { reportRepository } from "./report.repository";
import { toReportResponse } from "./report.entity";
import {
  CreateReportRequest,
  UpdateReportRequest,
  ReportSearchQuery,
  ReportResponse,
  ReportDetailResponse,
  PaginatedReportsResponse,
} from "./report.dto";
import { reportMediaRepository } from "./report_media.repository";
import { reportManagerRepository } from "./report_manager.repository";
import { ReportStatus, MediaFileStage } from "../../constants/status.enum";
import prisma from "../../config/prisma.client";

export class ReportService {
  constructor() {}

  async createReport(
    userId: string,
    request: CreateReportRequest,
  ): Promise<ReportResponse> {
    const imageUrls = request.imageUrls
      .map((imageUrl) => imageUrl.trim())
      .filter((imageUrl) => imageUrl.length > 0);

    const report = await prisma.$transaction(async (tx) => {
      const createdReport = await tx.report.create({
        data: {
          userId,
          title: request.title,
          description: request.description,
          wasteType: request.wasteType,
          severityLevel: request.severityLevel,
          latitude: request.latitude,
          longitude: request.longitude,
          status: ReportStatus.PENDING,
          aiVerified: false,
        },
      });

      await reportMediaRepository.createMany(
        imageUrls.map((fileUrl) => ({
          reportId: createdReport.id,
          fileUrl,
          stage: MediaFileStage.BEFORE,
          uploadedBy: userId,
        })),
        tx,
      );

      return createdReport;
    });

    // TODO: Call AI service to analyze the report
    // This would verify the report content, detect waste type, etc.
    this.analyzeReportWithAI(report.id, imageUrls).catch((err) => {
      console.error("AI analysis failed:", err.message);
    });

    return toReportResponse(report);
  }

  /**
   * Call AI service to analyze report images
   * TODO: Implement actual AI service integration when ai-service is available
   */
  private async analyzeReportWithAI(
    reportId: string,
    mediaFiles: string[],
  ): Promise<void> {
    try {
      // TODO: Uncomment when ai-service is implemented
      // const response = await axios.post(`${AI_SERVICE_URL}/api/v1/analyze`, {
      //     reportId,
      //     images: mediaFiles,
      // });
      //
      // if (response.data.success) {
      //     await reportRepository.update(reportId, {
      //         wasteType: response.data.data.detectedWasteType,
      //         aiVerified: true,
      //     });
      // }

      console.log(
        `[AI Analysis] Would analyze report ${reportId} with ${mediaFiles.length} images`,
      );
    } catch (error) {
      console.error("AI service analysis failed:", error);
      // Don't throw - AI analysis is not critical for report creation
    }
  }

  async getReportById(id: string): Promise<ReportResponse | null> {
    const report = await reportRepository.findById(id);
    return report ? toReportResponse(report) : null;
  }

  async getReportDetail(id: string): Promise<ReportDetailResponse | null> {
    const report = await reportRepository.findByIdWithRelations(id);
    if (!report) return null;

    return {
      ...toReportResponse(report),
      mediaFiles: report.reportMediaFiles.map((mf) => ({
        id: mf.id,
        fileUrl: mf.fileUrl,
        stage: mf.stage,
        uploadedBy: mf.uploadedBy,
        createdAt: mf.createdAt,
      })),
      managers: report.reportManagers.map((m) => ({
        reportId: m.reportId,
        userId: m.userId,
        assignedBy: m.assignedBy,
        assignedAt: m.assignedAt,
      })),
      joiningRequests: report.reportJoiningRequest.map((jr) => ({
        id: jr.id,
        reportId: jr.reportId,
        volunteerId: jr.volunteerId,
        status: jr.status,
        createdAt: jr.createdAt,
      })),
      tasks: report.reportTasks.map((t) => ({
        id: t.id,
        reportId: t.reportId,
        title: t.title,
        description: t.description,
        status: t.status,
        scheduledTime: t.scheduledTime,
        createdBy: t.createdBy,
        createdAt: t.createdAt,
      })),
    };
  }

  async updateReport(
    id: string,
    request: UpdateReportRequest,
  ): Promise<ReportResponse> {
    const existing = await reportRepository.findById(id);
    if (!existing) {
      throw new Error("Report not found");
    }

    const report = await prisma.$transaction(async (tx) => {
      const updatedReport = await tx.report.update({
        where: { id },
        data: {
          title: request.title,
          description: request.description,
          wasteType: request.wasteType,
          severityLevel: request.severityLevel,
          latitude: request.latitude,
          longitude: request.longitude,
          status: request.status,
        },
      });

      // Skip media updates when imageUrls is null/undefined/empty.
      if (request.imageUrls !== undefined && request.imageUrls !== null) {
        const imageUrls = request.imageUrls
          .map((imageUrl) => imageUrl.trim())
          .filter((imageUrl) => imageUrl.length > 0);

        if (imageUrls.length > 0) {
          await reportMediaRepository.softDeleteByReportId(id, tx);
          await reportMediaRepository.createMany(
            imageUrls.map((fileUrl) => ({
              reportId: id,
              fileUrl,
              stage: MediaFileStage.BEFORE,
              uploadedBy: existing.userId ?? undefined,
            })),
            tx,
          );
        }
      }

      return updatedReport;
    });

    return toReportResponse(report);
  }

  async deleteReport(id: string): Promise<void> {
    const existing = await reportRepository.findById(id);
    if (!existing) {
      throw new Error("Report not found");
    }

    await reportRepository.softDelete(id);
  }

  async getUserReports(userId: string): Promise<ReportResponse[]> {
    const reports = await reportRepository.findByUserId(userId);
    return reports.map((r) => toReportResponse(r));
  }

  async searchReports(
    query: ReportSearchQuery,
  ): Promise<PaginatedReportsResponse> {
    const page = query.page || 1;
    const limit = query.limit || 10;

    // If user provides location, use geospatial search
    if (query.latitude !== undefined && query.longitude !== undefined) {
      const { reports, total } = await reportRepository.searchWithDistance(
        query.latitude,
        query.longitude,
        query,
      );

      return {
        reports: reports.map((r) => toReportResponse(r, r.distance)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    }

    // Otherwise, use standard search
    const { reports, total } = await reportRepository.search(query);

    return {
      reports: reports.map((r) => toReportResponse(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update report status
   */
  async updateReportStatus(
    id: string,
    status: string,
  ): Promise<ReportResponse> {
    const existing = await reportRepository.findById(id);
    if (!existing) {
      throw new Error("Report not found");
    }

    const report = await reportRepository.update(id, { status });
    return toReportResponse(report);
  }

  /**
   * Check if user is the reporter of a report
   */
  async isReporter(reportId: string, userId: string): Promise<boolean> {
    const report = await reportRepository.findById(reportId);
    return report?.userId === userId;
  }

  /**
   * Check if user can manage a report (is reporter or manager)
   */
  async canManageReport(reportId: string, userId: string): Promise<boolean> {
    const report = await reportRepository.findById(reportId);
    if (!report) return false;

    // Reporter can always manage
    if (report.userId === userId) return true;

    // Check if user is a manager
    return reportManagerRepository.isManager(reportId, userId);
  }
}

// Singleton instance
export const reportService = new ReportService();
