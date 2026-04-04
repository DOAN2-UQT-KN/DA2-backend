import { getNotificationJobRepository } from "../notification-job.repository";
import { parseNotificationJobEnvelopeLoose } from "../notification-job-envelope.util";
import type { ReceivedNotificationJob } from "../notification-job.types";
import type { NotificationJobMessageHandler } from "./notification-job-handler.types";

const WAIT_TIME_SECONDS = Number(
  process.env.WORKER_SQS_WAIT_TIME_SECONDS || 20,
);
const VISIBILITY_TIMEOUT_SECONDS = Number(
  process.env.WORKER_SQS_VISIBILITY_TIMEOUT_SECONDS || 120,
);
const BATCH_SIZE = Number(process.env.WORKER_BATCH_SIZE || 5);
const MAX_RECEIVE_COUNT = Number(process.env.WORKER_MAX_RECEIVE_COUNT || 5);
const RETRY_BASE_SECONDS = Number(process.env.WORKER_RETRY_BASE_SECONDS || 30);
const MAX_RETRY_DELAY_SECONDS = Number(
  process.env.WORKER_MAX_RETRY_DELAY_SECONDS || 900,
);
const ERROR_BACKOFF_MS = 2_000;

export class NotificationJobOrchestratorWorker {
  private readonly workerId = `${process.pid}-${Math.random().toString(36).slice(2, 10)}`;
  private readonly handlersByType: Map<string, NotificationJobMessageHandler>;
  private isRunning = false;
  private isShuttingDown = false;

  constructor(handlers: NotificationJobMessageHandler[]) {
    this.handlersByType = new Map(
      handlers.map((h) => [h.jobType as string, h]),
    );
  }

  start(): void {
    console.log(
      `[Notification worker ${this.workerId}] starting (${this.handlersByType.size} handler(s))`,
    );
    void this.pollLoop();
  }

  async stop(): Promise<void> {
    this.isShuttingDown = true;

    while (this.isRunning) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[Notification worker ${this.workerId}] stopped`);
  }

  private async pollLoop(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    const repo = getNotificationJobRepository();

    try {
      while (!this.isShuttingDown) {
        const messages = await repo.receive(
          BATCH_SIZE,
          WAIT_TIME_SECONDS,
          VISIBILITY_TIMEOUT_SECONDS,
        );

        for (const message of messages) {
          if (this.isShuttingDown) {
            break;
          }

          await this.processMessage(message);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `[Notification worker ${this.workerId}] polling failed: ${message}`,
      );
      await this.sleep(ERROR_BACKOFF_MS);
    } finally {
      this.isRunning = false;

      if (!this.isShuttingDown) {
        void this.pollLoop();
      }
    }
  }

  private async processMessage(
    message: ReceivedNotificationJob,
  ): Promise<void> {
    const repo = getNotificationJobRepository();
    const loose = parseNotificationJobEnvelopeLoose(message.body);

    try {
      if (!loose) {
        throw new Error("Invalid JSON or missing jobId/jobType in envelope");
      }

      const handler = this.handlersByType.get(loose.jobType);
      if (!handler) {
        console.error(
          `[Notification worker ${this.workerId}] no handler for job type ${loose.jobType}, acknowledging ${message.messageId}`,
        );
        try {
          await repo.markFailed(loose.jobId);
        } catch {
          console.warn(
            `[Notification worker ${this.workerId}] could not mark job ${loose.jobId} failed`,
          );
        }
        await repo.acknowledge(message.receiptHandle);
        return;
      }

      const { jobId, run } = handler.parseAndPrepare(message.body);

      const canProcess = await repo.markProcessing(
        jobId,
        message.receiveCount,
      );

      if (!canProcess) {
        await repo.acknowledge(message.receiptHandle);
        console.log(
          `[Notification worker ${this.workerId}] skipped stale message ${message.messageId} for job ${jobId}`,
        );
        return;
      }

      await run();
      await repo.acknowledge(message.receiptHandle);
      await repo.markSucceeded(jobId);
      console.log(
        `[Notification worker ${this.workerId}] completed ${message.messageId} for job ${jobId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      const jobIdForStatus = loose?.jobId ?? null;

      if (message.receiveCount >= MAX_RECEIVE_COUNT) {
        await repo.acknowledge(message.receiptHandle);
        if (jobIdForStatus) {
          await repo.markFailed(jobIdForStatus);
        }
        console.error(
          `[Notification worker ${this.workerId}] dropped ${message.messageId} after ${message.receiveCount} receives: ${errorMessage}`,
        );
        return;
      }

      const retryDelaySeconds = Math.min(
        MAX_RETRY_DELAY_SECONDS,
        RETRY_BASE_SECONDS * 2 ** Math.max(0, message.receiveCount - 1),
      );

      await repo.scheduleRetry(message.receiptHandle, retryDelaySeconds);

      if (jobIdForStatus) {
        await repo.markRetryScheduled(jobIdForStatus);
      }

      console.error(
        `[Notification worker ${this.workerId}] failed ${message.messageId}: ${errorMessage} (receive ${message.receiveCount})`,
      );
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
