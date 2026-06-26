import { emitOutbox } from "../outbox.writer";
import { OutboxEventType } from "../outbox.types";
import { GlobalStatus } from "../../constants/status.enum";

describe("emitOutbox", () => {
  it("ghi 1 row PENDING với dedupKey + skipDuplicates", async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const tx = { outboxEvent: { createMany } } as never;

    await emitOutbox(tx, {
      aggregateType: "report",
      aggregateId: "report-1",
      eventType: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
      payload: { reportId: "report-1", userId: "user-1", points: 10 },
      dedupKey: `${OutboxEventType.REPORT_COMPLETION_GREEN_POINTS}:report-1`,
    });

    expect(createMany).toHaveBeenCalledTimes(1);
    const arg = createMany.mock.calls[0][0];
    expect(arg.skipDuplicates).toBe(true);
    expect(arg.data).toHaveLength(1);
    expect(arg.data[0]).toMatchObject({
      aggregateType: "report",
      aggregateId: "report-1",
      eventType: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
      dedupKey: "REPORT_COMPLETION_GREEN_POINTS:report-1",
      status: GlobalStatus._STATUS_PENDING,
    });
  });
});
