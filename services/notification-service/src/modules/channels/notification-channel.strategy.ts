import {
  NotificationKind,
  type Notification,
  type NotificationType,
} from "@prisma/client";
import type { SendNotificationJobPayload } from "../notification-queue/notification-job.types";

export interface ChannelDeliveryResult {
  notification: Notification;
  emailSent?: boolean;
  emailSkippedReason?: string;
}

/**
 * Strategy for one delivery channel (email, in-app, future SMS/push, etc.).
 */
export interface NotificationChannelStrategy {
  readonly prismaType: NotificationType;

  supports(apiType: string): boolean;

  deliver(
    job: SendNotificationJobPayload,
    normalizedPayload: Record<string, string>,
  ): Promise<ChannelDeliveryResult>;
}

export function isValidNotificationKind(kind: string): kind is NotificationKind {
  const valid = new Set<string>(
    Object.values(NotificationKind).filter((v) => typeof v === "string"),
  );
  return valid.has(kind);
}

export function normalizePayload(
  input?: Record<string, string>,
): Record<string, string> {
  const payload: Record<string, string> = {};
  if (input) {
    for (const [k, v] of Object.entries(input)) {
      payload[k] = v === undefined || v === null ? "" : String(v);
    }
  }
  return payload;
}
