import axios from "axios";
import { OutboxRelay } from "../outbox-relay";
import { OutboxEventType } from "../outbox.types";
import { GlobalStatus } from "../../constants/status.enum";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

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
  let post: jest.Mock;
  let prisma: PrismaMock;
  let relay: OutboxRelay;

  beforeEach(() => {
    // Deterministic backoff for assertions.
    process.env.REWARD_SERVICE_URL = "http://reward.test";
    process.env.INTERNAL_REWARD_API_KEY = "secret";
    process.env.OUTBOX_RELAY_RETRY_BASE_MS = "1000";
    process.env.OUTBOX_RELAY_MAX_RETRY_DELAY_MS = "5000";

    post = jest.fn();
    mockedAxios.create.mockReturnValue({ post } as never);

    prisma = makePrismaMock();
    relay = new OutboxRelay(prisma as never);
  });

  describe("happy case", () => {
    it("green-point event -> POST /green-points/enqueue {type,payload} rồi COMPLETED", async () => {
      post.mockResolvedValue({});

      await (relay as never as { deliver: (r: unknown) => Promise<void> }).deliver(
        greenPointRow,
      );

      expect(post).toHaveBeenCalledWith("/internal/v1/green-points/enqueue", {
        type: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
        payload: greenPointRow.payload,
      });
      expect(prisma.outboxEvent.update).toHaveBeenCalledTimes(1);
      const arg = prisma.outboxEvent.update.mock.calls[0][0];
      expect(arg.where).toEqual({ id: "evt-1" });
      expect(arg.data.status).toBe(GlobalStatus._STATUS_COMPLETED);
      expect(arg.data.processedAt).toBeTruthy();
      expect(arg.data.lastError).toBeNull();
    });

    it("facebook event -> POST /facebook-recognition/enqueue {payload}", async () => {
      post.mockResolvedValue({});
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

      expect(post).toHaveBeenCalledWith(
        "/internal/v1/facebook-recognition/enqueue",
        { payload: fbRow.payload },
      );
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
    it("reward sập -> PENDING + attempts++ + runAfter tương lai, KHÔNG mất", async () => {
      post.mockRejectedValue(new Error("connect ECONNREFUSED"));
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
      post.mockRejectedValue(new Error("boom"));

      await (relay as never as { deliver: (r: unknown) => Promise<void> }).deliver(
        { ...greenPointRow, attempts: 9, max_attempts: 10 },
      );

      const arg = prisma.outboxEvent.update.mock.calls[0][0];
      expect(arg.data.status).toBe(GlobalStatus._STATUS_FAILED);
      expect(arg.data.attempts).toBe(10);
    });

    it("backoff tăng theo attempts và bị cap ở maxRetryDelayMs", async () => {
      post.mockRejectedValue(new Error("down"));

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
});
