import axios from "axios";
import prisma from "../../config/prisma.client";
import { MediaResourceType, ReportStatus } from "../../constants/status.enum";

interface PredictResult {
  source_url?: string;
  detections?: number;
  predicted_url?: string;
}

interface PredictApiResponse {
  results?: PredictResult[];
}

export class ReportAiAnalysisService {
  private readonly aiPredictUrl =
    process.env.AI_PREDICT_URL || "http://68.183.189.178:8000/predict";

  async analyzeReport(
    reportId: string,
    reportMediaFileIds: string[],
  ): Promise<void> {
    const reportMediaFiles = await prisma.reportMediaFile.findMany({
      where: {
        id: { in: reportMediaFileIds },
        reportId,
        deletedAt: null,
      },
      select: {
        id: true,
        mediaId: true,
      },
    });

    if (reportMediaFiles.length === 0) {
      throw new Error("No active report media files found for AI analysis");
    }

    const mediaRecords = await prisma.media.findMany({
      where: {
        id: { in: reportMediaFiles.map((item) => item.mediaId) },
        deletedAt: null,
      },
      select: {
        id: true,
        url: true,
      },
    });

    const mediaById = new Map(mediaRecords.map((item) => [item.id, item.url]));

    const sourceToReportMediaFileIds = new Map<string, string[]>();
    for (const reportMediaFile of reportMediaFiles) {
      const sourceUrl = mediaById.get(reportMediaFile.mediaId);
      if (!sourceUrl) {
        continue;
      }

      const existing = sourceToReportMediaFileIds.get(sourceUrl) ?? [];
      existing.push(reportMediaFile.id);
      sourceToReportMediaFileIds.set(sourceUrl, existing);
    }

    const sourceUrls = [...sourceToReportMediaFileIds.keys()];
    if (sourceUrls.length === 0) {
      throw new Error("No source URLs found for AI analysis");
    }
    console.log(
      `Sending AI predict API request for report ${reportId} with ${sourceUrls.length} source URLs...`,
    );
    const response = await axios.post<PredictApiResponse>(
      this.aiPredictUrl,
      {
        image_urls: sourceUrls,
      },
      {
        timeout: 45_000,
      },
    );
    console.log(
      `AI predict API response for report ${reportId}:`,
      response.data,
    );
    const results = response.data?.results ?? [];
    if (results.length === 0) {
      throw new Error("AI predict API returned no results");
    }

    await prisma.$transaction(async (tx) => {
      for (const item of results) {
        if (!item.source_url || !item.predicted_url) {
          continue;
        }

        const queueForSource = sourceToReportMediaFileIds.get(item.source_url);
        const reportMediaFileId = queueForSource?.shift();
        if (!reportMediaFileId) {
          continue;
        }

        const predictedMedia = await tx.media.create({
          data: {
            url: item.predicted_url,
            type: MediaResourceType.AI_PREDICT,
          },
          select: { id: true },
        });

        await tx.aiAnalysisLog.create({
          data: {
            reportId,
            reportMediaFileId,
            mediaId: predictedMedia.id,
            detections:
              typeof item.detections === "number" ? item.detections : null,
          },
        });
      }

      await tx.report.update({
        where: { id: reportId },
        data: {
          status: ReportStatus._STATUS_VERIFIED,
          aiVerified: true,
        },
      });
    });
  }
}

export const reportAiAnalysisService = new ReportAiAnalysisService();
