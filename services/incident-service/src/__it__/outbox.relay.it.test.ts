/**
 * Relay end-to-end integration test (real Postgres + real in-process reward HTTP).
 *
 * Covers what the unit tests mock away: the claim-lock SQL against a real table,
 * real HTTP delivery, and the "reward is down -> retry -> eventually delivered"
 * loop that is the whole reason the outbox exists.
 */
import { randomUUID } from "node:crypto";
import { OutboxRelay } from "../outbox/outbox-relay";
import { OutboxEventType } from "../outbox/outbox.types";
import { GlobalStatus } from "../constants/status.enum";
import { prisma, resetTables } from "./setup/test-db";
import { RewardMock } from "./setup/reward-mock";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface ClaimedRow {
  id: string;
  event_type: string;
  payload: unknown;
  attempts: number;
  max_attempts: number;
}

type RelayInternals = {
  claimBatch: () => Promise<ClaimedRow[]>;
  deliver: (row: ClaimedRow) => Promise<void>;
};

const rewardMock = new RewardMock();

async function seedEvent(overrides: Record<string, unknown> = {}) {
  return prisma.outboxEvent.create({
    data: {
      aggregateType: "report",
      aggregateId: randomUUID(),
      eventType: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
      payload: { reportId: "r1", userId: "u1", points: 10 },
      dedupKey: `k-${randomUUID()}`,
      status: GlobalStatus._STATUS_PENDING,
      attempts: 0,
      maxAttempts: 10,
      runAfter: new Date(Date.now() - 1_000),
      ...overrides,
    },
  });
}

function newRelay(): RelayInternals {
  return new OutboxRelay(prisma) as never as RelayInternals;
}

describe("[it] outbox relay end-to-end", () => {
  beforeAll(async () => {
    const url = await rewardMock.start();
    process.env.REWARD_SERVICE_URL = url;
    process.env.OUTBOX_RELAY_RETRY_BASE_MS = "20";
    process.env.OUTBOX_RELAY_MAX_RETRY_DELAY_MS = "200";
    process.env.OUTBOX_RELAY_BATCH_SIZE = "20";
  });

  afterAll(async () => {
    await rewardMock.stop();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetTables();
    rewardMock.reset();
  });

  it("claim + deliver: green-point event reaches reward and becomes COMPLETED", async () => {
    const event = await seedEvent();
    const relay = newRelay();

    const claimed = await relay.claimBatch();
    expect(claimed).toHaveLength(1);

    // Claimed rows are locked + flipped to INPROCESS so replicas don't collide.
    const afterClaim = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(afterClaim.status).toBe(GlobalStatus._STATUS_INPROCESS);

    await relay.deliver(claimed[0]);

    expect(rewardMock.requests).toHaveLength(1);
    expect(rewardMock.requests[0]).toMatchObject({
      path: "/internal/v1/green-points/enqueue",
      apiKey: "it-internal-key",
      body: {
        type: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
        payload: { reportId: "r1", userId: "u1", points: 10 },
      },
    });

    const done = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(done.status).toBe(GlobalStatus._STATUS_COMPLETED);
    expect(done.processedAt).not.toBeNull();
    expect(done.lastError).toBeNull();
  });

  it("claimBatch locks the batch: a second claim returns nothing", async () => {
    await seedEvent();
    await seedEvent();
    const relay = newRelay();

    const first = await relay.claimBatch();
    expect(first).toHaveLength(2);

    const second = await relay.claimBatch();
    expect(second).toHaveLength(0);
  });

  it("reward is down -> event goes back to PENDING (not lost), then is delivered on retry", async () => {
    const event = await seedEvent();
    const relay = newRelay();

    // 1) reward returns 500.
    rewardMock.setNextStatus(500);
    const [row] = await relay.claimBatch();
    await relay.deliver(row);

    const afterFail = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(afterFail.status).toBe(GlobalStatus._STATUS_PENDING);
    expect(afterFail.status).not.toBe(GlobalStatus._STATUS_COMPLETED);
    expect(afterFail.attempts).toBe(1);
    expect(afterFail.processedAt).toBeNull();
    expect(afterFail.lastError).toBeTruthy();
    expect(afterFail.runAfter.getTime()).toBeGreaterThan(Date.now() - 50);

    // 2) reward recovers; backoff is tiny in tests so the row is claimable again.
    rewardMock.setNextStatus(202);
    await sleep(60);
    const [retryRow] = await relay.claimBatch();
    expect(retryRow).toBeDefined();
    await relay.deliver(retryRow);

    const recovered = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(recovered.status).toBe(GlobalStatus._STATUS_COMPLETED);
    expect(recovered.attempts).toBe(1);
    // 1 failed + 1 successful HTTP call — event was never dropped.
    expect(rewardMock.requests).toHaveLength(2);
  });

  it("exceeding maxAttempts -> FAILED (quarantined for replay, not silently dropped)", async () => {
    const event = await seedEvent({ attempts: 0, maxAttempts: 1 });
    const relay = newRelay();

    rewardMock.setNextStatus(500);
    const [row] = await relay.claimBatch();
    await relay.deliver(row);

    const failed = await prisma.outboxEvent.findUniqueOrThrow({
      where: { id: event.id },
    });
    expect(failed.status).toBe(GlobalStatus._STATUS_FAILED);
    expect(failed.attempts).toBe(1);
  });
});
