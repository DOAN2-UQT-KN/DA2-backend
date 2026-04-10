import { PrismaClient } from "@prisma/client";
import prisma from "../../config/prisma.client";

export class VoteRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  findActive(
    userId: string,
    resourceType: string,
    resourceId: string,
  ): Promise<{ id: string; value: number } | null> {
    return this.prisma.vote.findFirst({
      where: { userId, resourceType, resourceId, deletedAt: null },
      select: { id: true, value: true },
    });
  }

  /**
   * Active votes grouped by resource and value (1 / -1 / 0). Used for public counts.
   */
  async aggregateVoteCountsByResource(
    resourceType: string,
    resourceIds: string[],
  ): Promise<Map<string, { upvoteCount: number; downvoteCount: number }>> {
    const uniqueIds = [...new Set(resourceIds)];
    const map = new Map<string, { upvoteCount: number; downvoteCount: number }>();
    for (const id of uniqueIds) {
      map.set(id, { upvoteCount: 0, downvoteCount: 0 });
    }
    if (uniqueIds.length === 0) {
      return map;
    }

    const rows = await this.prisma.vote.groupBy({
      by: ["resourceId", "value"],
      where: {
        resourceType,
        resourceId: { in: uniqueIds },
        deletedAt: null,
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      const cur = map.get(row.resourceId);
      if (!cur) continue;
      if (row.value === 1) {
        cur.upvoteCount = row._count._all;
      } else if (row.value === -1) {
        cur.downvoteCount = row._count._all;
      }
    }
    return map;
  }

  findMyVoteValuesForResources(
    userId: string,
    resourceType: string,
    resourceIds: string[],
  ): Promise<Map<string, number>> {
    const uniqueIds = [...new Set(resourceIds)];
    if (uniqueIds.length === 0) {
      return Promise.resolve(new Map());
    }
    return this.prisma.vote
      .findMany({
        where: {
          userId,
          resourceType,
          resourceId: { in: uniqueIds },
          deletedAt: null,
        },
        select: { resourceId: true, value: true },
      })
      .then((rows) => new Map(rows.map((r) => [r.resourceId, r.value])));
  }

  async upsertVote(
    userId: string,
    resourceType: string,
    resourceId: string,
    value: number,
  ) {
    const existing = await this.findActive(userId, resourceType, resourceId);
    if (existing) {
      return this.prisma.vote.update({
        where: { id: existing.id },
        data: { value },
      });
    }
    return this.prisma.vote.create({
      data: {
        userId,
        resourceType,
        resourceId,
        value,
      },
    });
  }
}

export const voteRepository = new VoteRepository();
