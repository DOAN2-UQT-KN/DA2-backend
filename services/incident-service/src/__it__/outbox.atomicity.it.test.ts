/**
 * Atomicity integration test (real Postgres, real transaction).
 *
 * Proves the core outbox guarantee that unit tests cannot: the business write
 * (report -> COMPLETED) and the outbox event commit or roll back *together*.
 * This is exactly what protects "mark done" from the dual-write problem — points
 * are never lost and never orphaned.
 */
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma, resetTables } from "./setup/test-db";
import { reportRepository } from "../modules/report/report.repository";
import { emitOutbox } from "../outbox/outbox.writer";
import { OutboxEventType } from "../outbox/outbox.types";
import { GlobalStatus } from "../constants/status.enum";

async function seedReport(): Promise<{ id: string; userId: string }> {
  const userId = randomUUID();
  const report = await prisma.report.create({
    data: {
      userId,
      title: "IT report",
      status: GlobalStatus._STATUS_TODO,
    } as Prisma.ReportCreateInput,
  });
  return { id: report.id, userId };
}

describe("[it] outbox atomicity (mark report done)", () => {
  beforeEach(async () => {
    await resetTables();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("commit: report -> COMPLETED and exactly one PENDING outbox event", async () => {
    const { id, userId } = await seedReport();
    const points = 10;

    await prisma.$transaction(async (tx) => {
      const updated = await reportRepository.markReportAsDone(id, tx);
      await emitOutbox(tx, {
        aggregateType: "report",
        aggregateId: updated.id,
        eventType: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
        payload: { reportId: updated.id, userId, points },
        dedupKey: `${OutboxEventType.REPORT_COMPLETION_GREEN_POINTS}:${updated.id}`,
      });
    });

    const report = await prisma.report.findUniqueOrThrow({ where: { id } });
    expect(report.status).toBe(GlobalStatus._STATUS_COMPLETED);

    const events = await prisma.outboxEvent.findMany({
      where: { aggregateId: id },
    });
    expect(events).toHaveLength(1);
    expect(events[0].status).toBe(GlobalStatus._STATUS_PENDING);
    expect(events[0].dedupKey).toBe(
      `${OutboxEventType.REPORT_COMPLETION_GREEN_POINTS}:${id}`,
    );
    expect(events[0].payload).toMatchObject({
      reportId: id,
      userId,
      points,
    });
  });

  it("rollback: a failure after both writes leaves report unchanged and NO outbox row (no dual-write)", async () => {
    const { id, userId } = await seedReport();

    await expect(
      prisma.$transaction(async (tx) => {
        await reportRepository.markReportAsDone(id, tx);
        await emitOutbox(tx, {
          aggregateType: "report",
          aggregateId: id,
          eventType: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
          payload: { reportId: id, userId, points: 10 },
          dedupKey: `${OutboxEventType.REPORT_COMPLETION_GREEN_POINTS}:${id}`,
        });
        // Simulate a crash/error before the transaction commits.
        throw new Error("boom before commit");
      }),
    ).rejects.toThrow("boom before commit");

    // Business state untouched: report did NOT become COMPLETED...
    const report = await prisma.report.findUniqueOrThrow({ where: { id } });
    expect(report.status).toBe(GlobalStatus._STATUS_TODO);
    // ...and no orphan event was left behind.
    const count = await prisma.outboxEvent.count({ where: { aggregateId: id } });
    expect(count).toBe(0);
  });

  it("dedup: emitting the same dedupKey twice writes only one row", async () => {
    const { id, userId } = await seedReport();
    const dedupKey = `${OutboxEventType.REPORT_COMPLETION_GREEN_POINTS}:${id}`;

    for (let i = 0; i < 2; i++) {
      await prisma.$transaction(async (tx) => {
        await emitOutbox(tx, {
          aggregateType: "report",
          aggregateId: id,
          eventType: OutboxEventType.REPORT_COMPLETION_GREEN_POINTS,
          payload: { reportId: id, userId, points: 10 },
          dedupKey,
        });
      });
    }

    const count = await prisma.outboxEvent.count({ where: { dedupKey } });
    expect(count).toBe(1);
  });
});
