import {
  NotificationJobType,
  type SendNotificationJobPayload,
} from "./notification-job.types";
import { getNotificationJobRepository } from "./notification-job.repository";

export async function enqueueSendNotification(
  payload: SendNotificationJobPayload,
  options?: { delaySeconds?: number },
): Promise<string> {
  return getNotificationJobRepository().enqueue(
    NotificationJobType.SEND_NOTIFICATION,
    payload,
    options,
  );
}
