import { NotificationType } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { fetchUserEmailById } from "../../../lib/identity-user.client";
import { notificationTemplateEngine } from "../../templates/notification-template.engine";
import type {
  ChannelDeliveryResult,
  NotificationChannelStrategy,
} from "../notification-channel.strategy";
import type { SendNotificationJobPayload } from "../../notification-queue/notification-job.types";
import { emailService } from "./email.service";

class EmailNotificationChannel implements NotificationChannelStrategy {
  readonly prismaType = NotificationType.EMAIL;

  supports(apiType: string): boolean {
    return apiType.toLowerCase() === "email";
  }

  async deliver(
    job: SendNotificationJobPayload,
    normalizedPayload: Record<string, string>,
  ): Promise<ChannelDeliveryResult> {
    if (!job.userId) {
      throw new Error("userId is required for email notifications");
    }
    const toEmail = await fetchUserEmailById(job.userId);

    const rendered = notificationTemplateEngine.renderForDelivery(
      job.kind,
      NotificationType.EMAIL,
      normalizedPayload,
    );

    const sendResult = await emailService.sendNotificationMail({
      to: toEmail,
      subject: rendered.emailSubject || rendered.title,
      text: rendered.body,
      html: rendered.htmlBody || rendered.body,
    });

    const notification = await prisma.notification.create({
      data: {
        userId: job.userId,
        type: NotificationType.EMAIL,
        kind: job.kind,
        title: rendered.title,
        body: rendered.body,
        htmlBody: rendered.htmlBody ?? null,
        payload: normalizedPayload as object,
        readAt: null,
      },
    });

    return {
      notification,
      emailSent: sendResult.sent,
      ...(sendResult.skippedReason && {
        emailSkippedReason: sendResult.skippedReason,
      }),
    };
  }
}

export const emailNotificationChannel = new EmailNotificationChannel();
