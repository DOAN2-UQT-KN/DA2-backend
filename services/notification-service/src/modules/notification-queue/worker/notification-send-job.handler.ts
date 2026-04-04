import {
  NotificationJobType,
  type NotificationJobEnvelope,
  type SendNotificationJobPayload,
} from "../notification-job.types";
import { notificationProcessor } from "../../notification/notification.processor";
import type { NotificationJobMessageHandler } from "./notification-job-handler.types";

function parseEnvelope(
  body: string,
): { jobId: string; payload: SendNotificationJobPayload } {
  const env = JSON.parse(body) as NotificationJobEnvelope<SendNotificationJobPayload>;
  if (typeof env.jobId !== "string" || !env.jobId) {
    throw new Error("Invalid notification job envelope: jobId");
  }
  if (env.jobType !== NotificationJobType.SEND_NOTIFICATION) {
    throw new Error("Invalid notification job envelope: jobType");
  }
  if (!env.payload || typeof env.payload !== "object") {
    throw new Error("Invalid notification job envelope: payload");
  }
  return { jobId: env.jobId, payload: env.payload };
}

export const notificationSendJobHandler: NotificationJobMessageHandler = {
  jobType: NotificationJobType.SEND_NOTIFICATION,

  parseAndPrepare(body: string) {
    const { jobId, payload } = parseEnvelope(body);
    return {
      jobId,
      run: () => notificationProcessor.process(payload),
    };
  },
};
