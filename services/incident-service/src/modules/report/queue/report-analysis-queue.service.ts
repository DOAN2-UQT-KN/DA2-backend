import { backgroundJobRepository } from "../../background-job/background-job.repository";
import {
  AnalyzeReportJobPayload,
  BackgroundJobType,
} from "../../background-job/background-job.types";

export class ReportAnalysisQueueService {
  async enqueueAnalysis(
    reportId: string,
    reportMediaFileIds: string[],
  ): Promise<void> {
    const payload: AnalyzeReportJobPayload = {
      reportId,
      reportMediaFileIds,
    };

    await backgroundJobRepository.enqueue(
      BackgroundJobType.ANALYZE_REPORT,
      payload,
    );
  }
}

export const reportAnalysisQueueService = new ReportAnalysisQueueService();
