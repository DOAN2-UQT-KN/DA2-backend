import type { NotificationKind } from "@prisma/client";

export enum NotificationJobType {
  SEND_NOTIFICATION = "SEND_NOTIFICATION",
}

export interface SendNotificationJobPayload {
  type: "email" | "website";
  kind: NotificationKind;
  /** Required for email (recipient resolved via identity-service) and website. */
  userId?: string;
  payload?: Record<string, string>;
}

export interface NotificationJobEnvelope<TPayload = unknown> {
  jobId: string;
  version: 1;
  jobType: NotificationJobType;
  createdAt: string;
  payload: TPayload;
}

export interface ReceivedNotificationJob {
  messageId: string;
  receiptHandle: string;
  body: string;
  receiveCount: number;
}
