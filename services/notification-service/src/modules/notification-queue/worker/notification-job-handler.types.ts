import type { NotificationJobType } from "../notification-job.types";

export interface NotificationJobMessageHandler {
  jobType: NotificationJobType;
  parseAndPrepare(body: string): {
    jobId: string;
    run: () => Promise<unknown>;
  };
}
