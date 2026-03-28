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
import { campaignManagerRepository } from "../campaign/campaign_manager/campaign_manager.repository";
import {
  ReportStatus,
  MediaFileStage,
  MediaResourceType,
} from "../../constants/status.enum";
import prisma from "../../config/prisma.client";
import { randomUUID } from "node:crypto";
import { reportAnalysisQueueService } from "./queue/report-analysis-queue.service";

export class ReportService {
  constructor() {}

  async createReport(
    userId: string,
    request: CreateReportRequest,
  ): Promise<ReportResponse> {
    const imageUrls = request.imageUrls
      .map((imageUrl) => imageUrl.trim())
      .filter((imageUrl) => imageUrl.length > 0);

    const reportAndMedia = await prisma.$transaction(async (tx) => {
      const createdReport = await tx.report.create({
        data: {
          userId,
          title: request.title,
          description: request.description,
          wasteType: request.wasteType,
          severityLevel: request.severityLevel,
          latitude: request.latitude,
          longitude: request.longitude,
          status: ReportStatus._STATUS_PENDING,
          aiVerified: false,
        },
      });

      let reportMediaFileIds: string[] = [];
      if (imageUrls.length > 0) {
        const mediaRows = imageUrls.map((imageUrl) => ({
          id: randomUUID(),
          url: imageUrl,
          type: MediaResourceType.REPORT,
          createdBy: userId,
          updatedBy: userId,
        }));

        await tx.media.createMany({ data: mediaRows });

        const reportMediaRows = mediaRows.map((m) => ({
          id: randomUUID(),
          reportId: createdReport.id,
          mediaId: m.id,
          stage: MediaFileStage.BEFORE,
          uploadedBy: userId,
          createdBy: userId,
          updatedBy: userId,
        }));

        await tx.reportMediaFile.createMany({ data: reportMediaRows });

        reportMediaFileIds = reportMediaRows.map((r) => r.id);
      }

      return {
        report: createdReport,
        reportMediaFileIds,
      };
    });

    // Publish async analysis job so report creation stays fast and resilient.
    reportAnalysisQueueService
      .enqueueAnalysis(
        reportAndMedia.report.id,
        reportAndMedia.reportMediaFileIds,
      )
      .catch((err) => {
        console.error("Failed to enqueue AI analysis job:", err.message);
      });

    return toReportResponse(reportAndMedia.report);
  }

  async getReportById(id: string): Promise<ReportResponse | null> {
    const report = await reportRepository.findById(id);
    return report ? toReportResponse(report) : null;
  }

  async getReportDetail(id: string): Promise<ReportDetailResponse | null> {
    const report = await reportRepository.findByIdWithRelations(id);
    if (!report) return null;

    const mediaUrlMap = await this.getMediaUrlMap(
      report.reportMediaFiles.map((mf) => mf.mediaId),
    );

    return {
      ...toReportResponse(report),
      mediaFiles: report.reportMediaFiles.map((mf) => ({
        id: mf.id,
        mediaId: mf.mediaId,
        url: mediaUrlMap.get(mf.mediaId) ?? null,
        stage: mf.stage,
        uploadedBy: mf.uploadedBy,
        createdAt: mf.createdAt,
      })),
      managers: (report.campaign?.campaignManagers ?? []).map((m) => ({
        campaignId: report.campaignId ?? "",
        userId: m.userId,
        assignedBy: m.assignedBy,
        assignedAt: m.assignedAt,
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

    const existingMediaFiles = await reportMediaRepository.findByReportId(id);
    const existingMediaUrlMap = await this.getMediaUrlMap(
      existingMediaFiles.map((media) => media.mediaId),
    );
    const existingImageUrls = existingMediaFiles
      .map((media) => existingMediaUrlMap.get(media.mediaId)?.trim() ?? "")
      .filter((url) => url.length > 0);

    const hasImageUrlsUpdate =
      request.imageUrls !== undefined && request.imageUrls !== null;
    const nextImageUrls = hasImageUrlsUpdate
      ? (request.imageUrls ?? [])
          .map((imageUrl) => imageUrl.trim())
          .filter((imageUrl) => imageUrl.length > 0)
      : [];
    const imageUrlsChanged =
      hasImageUrlsUpdate &&
      nextImageUrls.length > 0 &&
      this.haveImageUrlsChanged(existingImageUrls, nextImageUrls);

    let nextReportMediaFileIds: string[] = [];

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
      if (hasImageUrlsUpdate) {
        if (nextImageUrls.length > 0) {
          await reportMediaRepository.softDeleteByReportId(id, tx);
          const createdFiles: { id: string }[] = [];

          for (const imageUrl of nextImageUrls) {
            const media = await tx.media.create({
              data: {
                url: imageUrl,
                type: MediaResourceType.REPORT,
                createdBy: existing.userId ?? undefined,
                updatedBy: existing.userId ?? undefined,
              },
            });

            const reportMediaFile = await tx.reportMediaFile.create({
              data: {
                reportId: id,
                mediaId: media.id,
                stage: MediaFileStage.BEFORE,
                uploadedBy: existing.userId ?? undefined,
                createdBy: existing.userId ?? undefined,
                updatedBy: existing.userId ?? undefined,
              },
              select: { id: true },
            });

            createdFiles.push(reportMediaFile);
          }

          nextReportMediaFileIds = createdFiles.map((file) => file.id);
        }
      }

      return updatedReport;
    });

    if (imageUrlsChanged) {
      await reportRepository.update(id, {
        aiVerified: false,
        status: ReportStatus._STATUS_PENDING,
      });

      reportAnalysisQueueService
        .reenqueueAnalysis(id, nextReportMediaFileIds)
        .catch((err) => {
          console.error("Failed to re-enqueue AI analysis job:", err.message);
        });
    }

    return toReportResponse(report);
  }

  async adminMarkReportDone(id: string): Promise<ReportResponse> {
    const existing = await reportRepository.findById(id);
    if (!existing) {
      throw new Error("Report not found");
    }

    if (existing.status === ReportStatus._STATUS_COMPLETED) {
      return toReportResponse(existing);
    }

    const report = await reportRepository.markReportAsDone(id);
    return toReportResponse(report);
  }

  private haveImageUrlsChanged(
    currentUrls: string[],
    nextUrls: string[],
  ): boolean {
    if (currentUrls.length !== nextUrls.length) {
      return true;
    }

    const sortedCurrent = [...currentUrls].sort();
    const sortedNext = [...nextUrls].sort();

    return sortedCurrent.some((url, index) => url !== sortedNext[index]);
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
    status: number,
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
   * Check if user can manage a report (is reporter or campaign manager)
   */
  async canManageReport(reportId: string, userId: string): Promise<boolean> {
    const report = await reportRepository.findById(reportId);
    if (!report) return false;

    // Reporter can always manage
    if (report.userId === userId) return true;

    if (!report.campaignId) {
      return false;
    }

    // Check if user is a campaign manager for the report's campaign
    return campaignManagerRepository.isManager(report.campaignId, userId);
  }
}

// Singleton instance
export const reportService = new ReportService();
