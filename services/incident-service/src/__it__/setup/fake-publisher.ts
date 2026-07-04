import type {
  OutboxEventMessage,
  OutboxPublisher,
} from "../../outbox/outbox-publisher";

/**
 * In-process stand-in for the reward intake SQS queue. Records every published
 * event and can be told to fail the next call (e.g. to simulate "reward intake
 * is unreachable") so we can prove the relay retries instead of losing events.
 */
export class FakePublisher implements OutboxPublisher {
  readonly published: OutboxEventMessage[] = [];
  private failNextCount = 0;
  private failError = new Error("reward intake unavailable");

  /** Force the next `count` publish calls to throw. */
  failNext(count: number, error?: Error): void {
    this.failNextCount = count;
    if (error) this.failError = error;
  }

  reset(): void {
    this.published.length = 0;
    this.failNextCount = 0;
  }

  async publish(event: OutboxEventMessage): Promise<void> {
    if (this.failNextCount > 0) {
      this.failNextCount -= 1;
      throw this.failError;
    }
    this.published.push(event);
  }
}
