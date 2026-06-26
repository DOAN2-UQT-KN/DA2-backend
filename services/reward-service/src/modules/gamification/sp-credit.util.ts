import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { Prisma as PrismaClient } from "@prisma/client";
import { mapResourceTypeToSourceType } from "./point-source.util";

export type SpCreditOutcome = "credited" | "skipped";

/**
 * Idempotent SP credit (ledger + wallet batch). Mirrors green-point earnings 1:1.
 */
export async function applySpendablePointCredit(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    points: number;
    transactionType: string;
    resourceId: string;
    resourceType: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<SpCreditOutcome> {
  if (params.points <= 0) {
    return "skipped";
  }

  const idempotencyKey = `sp:${params.transactionType}:${params.resourceType}:${params.resourceId}:${params.userId}`;
  const existing = await tx.userPointTransaction.findFirst({
    where: { userId: params.userId, idempotencyKey },
  });
  if (existing) {
    return "skipped";
  }

  const spRule = await tx.spendablePointRules.findFirst({
    where: { isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const expirationDays = spRule?.expirationDays ?? 90;

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setUTCDate(expiresAt.getUTCDate() + expirationDays);

  const sourceType = mapResourceTypeToSourceType(params.resourceType);

  try {
    await tx.userPointTransaction.create({
      data: {
        id: randomUUID(),
        userId: params.userId,
        kind: "SP",
        amount: params.points,
        sourceType,
        sourceId: params.resourceId,
        seasonId: null,
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

  await tx.userSpWalletEntry.create({
    data: {
      id: randomUUID(),
      userId: params.userId,
      amount: params.points,
      remaining: params.points,
      sourceType,
      sourceId: params.resourceId,
      expiresAt,
    },
  });

  return "credited";
}
