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
