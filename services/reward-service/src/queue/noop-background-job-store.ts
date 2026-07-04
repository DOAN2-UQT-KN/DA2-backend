import type { BackgroundJobStore } from "@da2/queue";

/**
 * No-op store for the consume-only reward intake queue.
 *
 * Intake messages are produced by other services (e.g. incident-service) whose
 * own transactional outbox guarantees durability, and the green-point ledger is
 * idempotent — so there is no local `reward_background_jobs` row to track here.
 * `markProcessing` always returns true so the worker never skips an external
 * message; SQS visibility/retry handles redelivery on failure.
 */
export class NoopBackgroundJobStore implements BackgroundJobStore {
  async createJob(): Promise<string> {
    return "noop";
  }

  async markProcessing(): Promise<boolean> {
    return true;
  }

  async markSucceeded(): Promise<void> {}

  async markFailed(): Promise<void> {}

  async markRetryScheduled(): Promise<void> {}

  async markEnqueued(): Promise<void> {}

  async markFailedWithoutSend(): Promise<void> {}
}
