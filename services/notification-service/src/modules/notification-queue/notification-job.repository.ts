import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SendMessageCommandOutput,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { prisma } from "../../lib/prisma";
import { GlobalStatus } from "../../constants/status.enum";
import type {
  NotificationJobEnvelope,
  NotificationJobType,
  ReceivedNotificationJob,
} from "./notification-job.types";

export class NotificationJobRepository {
  private readonly client: SQSClient;
  private readonly queueUrl: string;

  constructor() {
    const region = process.env.AWS_REGION || "us-east-1";
    const queueUrl = process.env.SQS_NOTIFICATION_QUEUE_URL;
    const endpoint =
      process.env.AWS_SQS_ENDPOINT || process.env.AWS_ENDPOINT_URL;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID || "test";
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || "test";

    if (!queueUrl) {
      throw new Error("SQS_NOTIFICATION_QUEUE_URL is not configured");
    }

    this.client = new SQSClient({
      region,
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
    this.queueUrl = queueUrl;
  }

  async enqueue(
    jobType: NotificationJobType,
    payload: unknown,
    options?: { delaySeconds?: number },
  ): Promise<string> {
    const job = await prisma.notificationJob.create({
      data: {
        jobType,
        payload: payload as object,
        status: GlobalStatus._STATUS_PENDING,
        attempts: 0,
      },
    });

    const envelope: NotificationJobEnvelope = {
      jobId: job.id,
      version: 1,
      jobType,
      createdAt: new Date().toISOString(),
      payload,
    };

    try {
      const response = await this.client.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(envelope),
          DelaySeconds: options?.delaySeconds,
        }),
      );

      await this.markEnqueued(job.id, response);
    } catch (error) {
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: GlobalStatus._STATUS_FAILED,
          processedAt: new Date(),
        },
      });
      throw error;
    }

    return job.id;
  }

  async receive(
    maxNumberOfMessages: number,
    waitTimeSeconds: number,
    visibilityTimeoutSeconds: number,
  ): Promise<ReceivedNotificationJob[]> {
    const response = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxNumberOfMessages,
        WaitTimeSeconds: waitTimeSeconds,
        VisibilityTimeout: visibilityTimeoutSeconds,
        MessageSystemAttributeNames: ["ApproximateReceiveCount"],
      }),
    );

    if (!response.Messages || response.Messages.length === 0) {
      return [];
    }

    return response.Messages.flatMap((message) => {
      if (!message.MessageId || !message.ReceiptHandle || !message.Body) {
        return [];
      }

      const count = Number(message.Attributes?.ApproximateReceiveCount ?? "1");

      return [
        {
          messageId: message.MessageId,
          receiptHandle: message.ReceiptHandle,
          body: message.Body,
          receiveCount: Number.isNaN(count) ? 1 : count,
        },
      ];
    });
  }

  async acknowledge(receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }

  async scheduleRetry(
    receiptHandle: string,
    delaySeconds: number,
  ): Promise<void> {
    await this.client.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: Math.max(0, Math.floor(delaySeconds)),
      }),
    );
  }

  async markProcessing(jobId: string, receiveCount: number): Promise<boolean> {
    const result = await prisma.notificationJob.updateMany({
      where: {
        id: jobId,
        status: {
          in: [
            GlobalStatus._STATUS_PENDING,
            GlobalStatus._STATUS_INPROCESS,
          ],
        },
      },
      data: {
        status: GlobalStatus._STATUS_INPROCESS,
        attempts: receiveCount,
      },
    });

    return result.count > 0;
  }

  async markSucceeded(jobId: string): Promise<void> {
    await prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: GlobalStatus._STATUS_COMPLETED,
        processedAt: new Date(),
      },
    });
  }

  async markFailed(jobId: string): Promise<void> {
    await prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: GlobalStatus._STATUS_FAILED,
        processedAt: new Date(),
      },
    });
  }

  async markRetryScheduled(jobId: string): Promise<void> {
    await prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: GlobalStatus._STATUS_PENDING,
      },
    });
  }

  private async markEnqueued(
    jobId: string,
    _response: SendMessageCommandOutput,
  ): Promise<void> {
    await prisma.notificationJob.update({
      where: { id: jobId },
      data: {
        status: GlobalStatus._STATUS_PENDING,
      },
    });
  }
}

let repositorySingleton: NotificationJobRepository | null = null;

export function getNotificationJobRepository(): NotificationJobRepository {
  if (!repositorySingleton) {
    repositorySingleton = new NotificationJobRepository();
  }
  return repositorySingleton;
}
