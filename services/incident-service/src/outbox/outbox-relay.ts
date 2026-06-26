import axios, { AxiosInstance } from "axios";
import { Prisma, PrismaClient } from "@prisma/client";
import { GlobalStatus } from "../constants/status.enum";
import { OutboxEventType } from "./outbox.types";

interface ClaimedRow {
  id: string;
  event_type: string;
  payload: Prisma.JsonValue;
  attempts: number;
  max_attempts: number;
}

interface RelayConfig {
  batchSize: number;
  pollIntervalMs: number;
  retryBaseMs: number;
  maxRetryDelayMs: number;
}

const ERROR_BACKOFF_MS = 2_000;

/**
 * Outbox relay: claims PENDING outbox rows (FOR UPDATE SKIP LOCKED so multiple
 * replicas don't double-process), delivers them to reward-service, and marks
 * them COMPLETED. Delivery is at-least-once; the reward ledger is idempotent.
 */
export class OutboxRelay {
  private isRunning = false;
  private isShuttingDown = false;
  private readonly config: RelayConfig;

  constructor(private readonly prisma: PrismaClient) {
    this.config = {
      batchSize: Number(process.env.OUTBOX_RELAY_BATCH_SIZE ?? 20),
      pollIntervalMs: Number(process.env.OUTBOX_RELAY_POLL_INTERVAL_MS ?? 2000),
      retryBaseMs: Number(process.env.OUTBOX_RELAY_RETRY_BASE_MS ?? 30_000),
      maxRetryDelayMs: Number(
        process.env.OUTBOX_RELAY_MAX_RETRY_DELAY_MS ?? 900_000,
      ),
    };
  }

  private getRewardClient(): AxiosInstance {
    const baseURL = process.env.REWARD_SERVICE_URL?.trim();
    const key = process.env.INTERNAL_REWARD_API_KEY?.trim();
    if (!baseURL || !key) {
      throw new Error(
        "REWARD_SERVICE_URL and INTERNAL_REWARD_API_KEY must be configured for the outbox relay",
      );
    }
    return axios.create({
      baseURL: baseURL.replace(/\/$/, ""),
      timeout: 10_000,
      headers: { "x-internal-api-key": key },
    });
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("[OutboxRelay] started");
    void this.pollLoop();
  }

  async stop(): Promise<void> {
    this.isShuttingDown = true;
    while (this.isRunning) {
      await sleep(100);
    }
    console.log("[OutboxRelay] stopped");
  }

  private async pollLoop(): Promise<void> {
    this.isRunning = true;
    try {
      while (!this.isShuttingDown) {
        const claimed = await this.claimBatch();
        if (claimed.length === 0) {
          await sleep(this.config.pollIntervalMs);
          continue;
        }
        for (const row of claimed) {
          if (this.isShuttingDown) break;
          await this.deliver(row);
        }
      }
    } catch (err) {
      console.error(
        `[OutboxRelay] loop error: ${(err as Error).message}`,
      );
      await sleep(ERROR_BACKOFF_MS);
    } finally {
      this.isRunning = false;
      if (!this.isShuttingDown) void this.pollLoop();
    }
  }

  /** Atomically lock + mark a batch as in-process so replicas don't collide. */
  private async claimBatch(): Promise<ClaimedRow[]> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<ClaimedRow[]>(Prisma.sql`
        SELECT id, event_type, payload, attempts, max_attempts
        FROM outbox_events
        WHERE status = ${GlobalStatus._STATUS_PENDING} AND run_after <= now()
        ORDER BY created_at
        LIMIT ${this.config.batchSize}
        FOR UPDATE SKIP LOCKED
      `);
      if (rows.length === 0) return [];
      await tx.outboxEvent.updateMany({
        where: { id: { in: rows.map((r) => r.id) } },
        data: { status: GlobalStatus._STATUS_INPROCESS },
      });
      return rows;
    });
  }

  private async deliver(row: ClaimedRow): Promise<void> {
    try {
      const client = this.getRewardClient();
      if (row.event_type === OutboxEventType.CAMPAIGN_FACEBOOK_RECOGNITION) {
        await client.post("/internal/v1/facebook-recognition/enqueue", {
          payload: row.payload,
        });
      } else {
        // All *_GREEN_POINTS event types map to the reward green-points endpoint.
        await client.post("/internal/v1/green-points/enqueue", {
          type: row.event_type,
          payload: row.payload,
        });
      }
      await this.prisma.outboxEvent.update({
        where: { id: row.id },
        data: {
          status: GlobalStatus._STATUS_COMPLETED,
          processedAt: new Date(),
          lastError: null,
        },
      });
    } catch (err) {
      await this.handleFailure(row, err);
    }
  }

  private async handleFailure(row: ClaimedRow, err: unknown): Promise<void> {
    const attempts = row.attempts + 1;
    const message = err instanceof Error ? err.message : String(err);

    if (attempts >= row.max_attempts) {
      await this.prisma.outboxEvent.update({
        where: { id: row.id },
        data: {
          status: GlobalStatus._STATUS_FAILED,
          attempts,
          lastError: message,
          processedAt: new Date(),
        },
      });
      console.error(
        `[OutboxRelay] event ${row.id} (${row.event_type}) FAILED after ${attempts} attempts: ${message}`,
      );
      return;
    }

    const delayMs = Math.min(
      this.config.maxRetryDelayMs,
      this.config.retryBaseMs * 2 ** (attempts - 1),
    );
    await this.prisma.outboxEvent.update({
      where: { id: row.id },
      data: {
        status: GlobalStatus._STATUS_PENDING,
        attempts,
        lastError: message,
        runAfter: new Date(Date.now() + delayMs),
      },
    });
    console.warn(
      `[OutboxRelay] event ${row.id} (${row.event_type}) retry ${attempts} in ${delayMs}ms: ${message}`,
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
