import { OutboxRelay } from "../outbox-relay";
import type { OutboxPublisher } from "../outbox-publisher";
import { OutboxEventType } from "../outbox.types";
import { GlobalStatus } from "../../constants/status.enum";

interface PrismaMock {
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
  outboxEvent: {
    updateMany: jest.Mock;
    update: jest.Mock;
  };
}

function makePrismaMock(): PrismaMock {
  return {
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
    outboxEvent: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
}

const greenPointRow = {
  id: "evt-1",
  event_type: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
  payload: { reportId: "r1", userId: "u1", points: 10 },
  attempts: 0,
  max_attempts: 10,
};

describe("OutboxRelay", () => {
  let publish: jest.Mock;
  let publisher: OutboxPublisher;
  let prisma: PrismaMock;
  let relay: OutboxRelay;

  beforeEach(() => {
    // Deterministic backoff for assertions.
    process.env.OUTBOX_RELAY_RETRY_BASE_MS = "1000";
    process.env.OUTBOX_RELAY_MAX_RETRY_DELAY_MS = "5000";

    publish = jest.fn();
    publisher = { publish } as OutboxPublisher;

    prisma = makePrismaMock();
    relay = new OutboxRelay(prisma as never, publisher);
  });

  describe("happy case", () => {
    it("green-point event -> publish {id,eventType,payload} vào queue rồi COMPLETED", async () => {
      publish.mockResolvedValue(undefined);

      await (relay as never as { deliver: (r: unknown) => Promise<void> }).deliver(
        greenPointRow,
      );

      expect(publish).toHaveBeenCalledWith({
        id: "evt-1",
        eventType: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
        payload: greenPointRow.payload,
      });
      expect(prisma.outboxEvent.update).toHaveBeenCalledTimes(1);
      const arg = prisma.outboxEvent.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: "evt-1" });
      expect(arg.data.status).toBe(GlobalStatus._STATUS_COMPLETED);
      expect(arg.data.processedAt).toBeTruthy();
      expect(arg.data.lastError).toBeNull();
    });

    it("facebook event -> publish với eventType = CAMPAIGN_FACEBOOK_RECOGNITION", async () => {
      publish.mockResolvedValue(undefined);
      const fbRow = {
        id: "evt-fb",
        event_type: OutboxEventType.CAMPAIGN_FACEBOOK_RECOGNITION,
        payload: { campaignId: "c1" },
        attempts: 0,
        max_attempts: 10,
      };

      await (relay as never as { deliver: (r: unknown) => Promise<void> }).deliver(
        fbRow,
      );

      expect(publish).toHaveBeenCalledWith({
        id: "evt-fb",
        eventType: OutboxEventType.CAMPAIGN_FACEBOOK_RECOGNITION,
        payload: fbRow.payload,
      });
      expect(prisma.outboxEvent.update.mock.calls[0][0].data.status).toBe(
        GlobalStatus._STATUS_COMPLETED,
      );
    });

    it("claimBatch khoá + flip PENDING -> INPROCESS", async () => {
      const claimed = [
        { ...greenPointRow, id: "a" },
        { ...greenPointRow, id: "b" },
      ];
      const tx = {
        $queryRaw: jest.fn().mockResolvedValue(claimed),
        outboxEvent: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      };
      prisma.$transaction.mockImplementation(
        async (cb: (t: unknown) => unknown) => cb(tx),
      );

      const rows = await (
        relay as never as { claimBatch: () => Promise<unknown[]> }
      ).claimBatch();

      expect(tx.outboxEvent.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ["a", "b"] } },
        data: { status: GlobalStatus._STATUS_INPROCESS },
      });
      expect(rows).toHaveLength(2);
    });
  });

  describe("failed case (service khác sập)", () => {
    it("publish lỗi -> PENDING + attempts++ + runAfter tương lai, KHÔNG mất", async () => {
      publish.mockRejectedValue(new Error("connect ECONNREFUSED"));
      const before = Date.now();

      await (relay as never as { deliver: (r: unknown) => Promise<void> }).deliver(
        { ...greenPointRow, attempts: 0, max_attempts: 10 },
      );

      const arg = prisma.outboxEvent.update.mock.calls[0][0];
      expect(arg.data.status).toBe(GlobalStatus._STATUS_PENDING);
      expect(arg.data.status).not.toBe(GlobalStatus._STATUS_COMPLETED);
      expect(arg.data.attempts).toBe(1);
      expect(arg.data.lastError).toContain("ECONNREFUSED");
      const delay = (arg.data.runAfter as Date).getTime() - before;
      // base 1000 * 2^0 = 1000ms
      expect(delay).toBeGreaterThan(500);
      expect(delay).toBeLessThanOrEqual(1000 + 200);
    });

    it("vượt maxAttempts -> FAILED (giữ lại để replay)", async () => {
      publish.mockRejectedValue(new Error("boom"));

      await (relay as never as { deliver: (r: unknown) => Promise<void> }).deliver(
        { ...greenPointRow, attempts: 9, max_attempts: 10 },
      );

      const arg = prisma.outboxEvent.update.mock.calls[0][0];
      expect(arg.data.status).toBe(GlobalStatus._STATUS_FAILED);
      expect(arg.data.attempts).toBe(10);
    });

    it("backoff tăng theo attempts và bị cap ở maxRetryDelayMs", async () => {
      publish.mockRejectedValue(new Error("down"));

      // attempts=4 -> computed 5 -> 1000 * 2^4 = 16000 -> cap 5000
      const before = Date.now();
      await (relay as never as { deliver: (r: unknown) => Promise<void> }).deliver(
        { ...greenPointRow, attempts: 4, max_attempts: 10 },
      );
      const arg = prisma.outboxEvent.update.mock.calls[0][0];
      const delay = (arg.data.runAfter as Date).getTime() - before;
      expect(delay).toBeLessThanOrEqual(5000 + 200);
      expect(delay).toBeGreaterThan(1000);
    });
  });

  describe("circuit breaker", () => {
    it("mở circuit sau khi publish lỗi liên tiếp đạt ngưỡng", async () => {
      process.env.OUTBOX_BREAKER_FAILURE_THRESHOLD = "3";
      process.env.OUTBOX_BREAKER_OPEN_MS = "30000";
      const failingPublish = jest
        .fn()
        .mockRejectedValue(new Error("connect ECONNREFUSED"));
      const failingRelay = new OutboxRelay(prisma as never, {
        publish: failingPublish,
      } as OutboxPublisher);

      expect(failingRelay.getCircuitState()).toBe("CLOSED");
      const deliver = (failingRelay as never as {
        deliver: (r: unknown) => Promise<void>;
      }).deliver.bind(failingRelay);

      await deliver({ ...greenPointRow, attempts: 0, max_attempts: 10 });
      await deliver({ ...greenPointRow, attempts: 0, max_attempts: 10 });
      expect(failingRelay.getCircuitState()).toBe("CLOSED");
      await deliver({ ...greenPointRow, attempts: 0, max_attempts: 10 });
      expect(failingRelay.getCircuitState()).toBe("OPEN");
    });

    it("publish thành công giữ circuit ở trạng thái CLOSED", async () => {
      publish.mockResolvedValue(undefined);
      await (relay as never as { deliver: (r: unknown) => Promise<void> }).deliver(
        greenPointRow,
      );
      expect(relay.getCircuitState()).toBe("CLOSED");
    });
  });
});
