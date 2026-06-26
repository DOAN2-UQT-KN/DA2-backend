import { randomUUID } from "crypto";
import type { PointKind, Prisma } from "@prisma/client";
import { Prisma as PrismaClient } from "@prisma/client";
import { SeasonStatus } from "@da2/constants";
import { GreenPointTransactionType } from "../green-point/green-point-transaction.constants";
import prisma from "../../config/prisma.client";
import { mapResourceTypeToSourceType } from "./point-source.util";

export type RpCreditOutcome = "credited" | "skipped";

function mapTransactionTypeToPointKind(
  transactionType: string,
): PointKind | null {
  switch (transactionType) {
    case GreenPointTransactionType.CAMPAIGN_COMPLETION:
      return "VRP";
    case GreenPointTransactionType.REPORT_COMPLETION:
    case GreenPointTransactionType.UPVOTE:
    case GreenPointTransactionType.REPORT_VOTE_MILESTONE:
    case GreenPointTransactionType.REFERRAL:
      return "CRP";
    default:
      return null;
  }
}

async function resolveSeasonIdForCredit(
  tx: Prisma.TransactionClient,
): Promise<string | null> {
  const now = new Date();

  const activeInWindow = await tx.season.findFirst({
    where: {
      status: SeasonStatus.ACTIVE,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: "desc" },
    select: { id: true },
  });
  if (activeInWindow) {
    return activeInWindow.id;
  }

  const activeAny = await tx.season.findFirst({
    where: { status: SeasonStatus.ACTIVE },
    orderBy: { startsAt: "desc" },
    select: { id: true },
  });
  if (activeAny) {
    return activeAny.id;
  }

  const latest = await tx.season.findFirst({
    orderBy: { startsAt: "desc" },
    select: { id: true },
  });
  return latest?.id ?? null;
}

/**
 * Idempotent seasonal RP credit (ledger + materialized totals). Called after green-point earn.
 */
export async function applyRankingPointCredit(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    points: number;
    transactionType: string;
    resourceId: string;
    resourceType: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<RpCreditOutcome> {
  const kind = mapTransactionTypeToPointKind(params.transactionType);
  if (!kind || params.points <= 0) {
    return "skipped";
  }

  const seasonId = await resolveSeasonIdForCredit(tx);
  if (!seasonId) {
    return "skipped";
  }

  const idempotencyKey = `rp:${kind}:${params.transactionType}:${params.resourceType}:${params.resourceId}:${params.userId}`;
  const existing = await tx.userPointTransaction.findFirst({
    where: { userId: params.userId, idempotencyKey },
  });
  if (existing) {
    return "skipped";
  }

  const sourceType = mapResourceTypeToSourceType(params.resourceType);

  try {
    await tx.userPointTransaction.create({
      data: {
        id: randomUUID(),
        userId: params.userId,
        kind,
        amount: params.points,
        sourceType,
        sourceId: params.resourceId,
        seasonId,
        metadata: {
          ...(params.metadata &&
          typeof params.metadata === "object" &&
          !Array.isArray(params.metadata)
            ? (params.metadata as Record<string, unknown>)
            : {}),
          greenPointType: params.transactionType,
          greenPointResourceType: params.resourceType,
        } as Prisma.InputJsonValue,
        idempotencyKey,
      },
    });
  } catch (e: unknown) {
    if (
      e instanceof PrismaClient.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return "skipped";
    }
    throw e;
  }

  if (kind === "CRP") {
    await tx.userSeasonRpTotal.upsert({
      where: {
        userId_seasonId: { userId: params.userId, seasonId },
      },
      create: {
        userId: params.userId,
        seasonId,
        citizenRp: params.points,
        volunteerRp: 0,
      },
      update: {
        citizenRp: { increment: params.points },
      },
    });
  } else {
    await tx.userSeasonRpTotal.upsert({
      where: {
        userId_seasonId: { userId: params.userId, seasonId },
      },
      create: {
        userId: params.userId,
        seasonId,
        citizenRp: 0,
        volunteerRp: params.points,
      },
      update: {
        volunteerRp: { increment: params.points },
      },
    });
  }

  return "credited";
}

/**
 * Backfill RP totals from existing positive green-point ledger rows (local/dev recovery).
 */
export async function backfillRankingPointsFromGreenLedger(): Promise<{
  credited: number;
  skipped: number;
}> {
  const rows = await prisma.greenPointTransaction.findMany({
    where: {
      points: { gt: 0 },
      deletedAt: null,
      type: {
        in: [
          GreenPointTransactionType.CAMPAIGN_COMPLETION,
          GreenPointTransactionType.REPORT_COMPLETION,
          GreenPointTransactionType.UPVOTE,
          GreenPointTransactionType.REPORT_VOTE_MILESTONE,
          GreenPointTransactionType.REFERRAL,
        ],
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let credited = 0;
  let skipped = 0;

  for (const row of rows) {
    const outcome = await prisma.$transaction((tx) =>
      applyRankingPointCredit(tx, {
        userId: row.userId,
        points: row.points,
        transactionType: row.type,
        resourceId: row.resourceId,
        resourceType: row.resourceType,
        metadata: row.metadata ?? undefined,
      }),
    );
    if (outcome === "credited") {
      credited += 1;
    } else {
      skipped += 1;
    }
  }

  return { credited, skipped };
}
