import { PrismaClient } from "@prisma/client";
import prisma from "../../../config/prisma.client";

export class CampaignCompletionVerificationRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  findActive(
    userId: string,
    campaignId: string,
  ): Promise<{ id: string; value: number } | null> {
    return this.prisma.campaignCompletionVerification.findFirst({
      where: { userId, campaignId, deletedAt: null },
      select: { id: true, value: true },
    });
  }

  async aggregateCountsByCampaign(
    campaignIds: string[],
  ): Promise<Map<string, { cleanCount: number; notCleanCount: number }>> {
    const uniqueIds = [...new Set(campaignIds)];
    const map = new Map<string, { cleanCount: number; notCleanCount: number }>();
    for (const id of uniqueIds) {
      map.set(id, { cleanCount: 0, notCleanCount: 0 });
    }
    if (uniqueIds.length === 0) {
      return map;
    }

    const rows = await this.prisma.campaignCompletionVerification.groupBy({
      by: ["campaignId", "value"],
      where: {
        campaignId: { in: uniqueIds },
        deletedAt: null,
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      const cur = map.get(row.campaignId);
      if (!cur) continue;
      if (row.value === 1) {
        cur.cleanCount = row._count._all;
      } else if (row.value === -1) {
        cur.notCleanCount = row._count._all;
      }
    }
    return map;
  }

  findMyValuesForCampaigns(
    userId: string,
    campaignIds: string[],
  ): Promise<Map<string, number>> {
    const uniqueIds = [...new Set(campaignIds)];
    if (uniqueIds.length === 0) {
      return Promise.resolve(new Map());
    }
    return this.prisma.campaignCompletionVerification
      .findMany({
        where: {
          userId,
          campaignId: { in: uniqueIds },
          deletedAt: null,
        },
        select: { campaignId: true, value: true },
      })
      .then((rows) => new Map(rows.map((r) => [r.campaignId, r.value])));
  }

  async upsert(
    userId: string,
    campaignId: string,
    value: number,
  ) {
    const existing = await this.findActive(userId, campaignId);
    if (existing) {
      return this.prisma.campaignCompletionVerification.update({
        where: { id: existing.id },
        data: { value },
      });
    }
    return this.prisma.campaignCompletionVerification.create({
      data: { userId, campaignId, value },
    });
  }
}

export const campaignCompletionVerificationRepository =
  new CampaignCompletionVerificationRepository();
