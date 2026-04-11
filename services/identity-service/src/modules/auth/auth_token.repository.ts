import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.client";
import type { AuthTokenTypeValue } from "../../constants/auth-token-type";

const now = (): Date => new Date();

export class AuthTokenRepository {
  async create(data: {
    userId: string;
    type: AuthTokenTypeValue;
    tokenHash: string;
    expiresAt: Date;
    metadata?: Prisma.InputJsonValue;
  }) {
    return prisma.authToken.create({
      data: {
        userId: data.userId,
        type: data.type,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        metadata: data.metadata,
      },
    });
  }

  async findActiveByHashAndType(tokenHash: string, type: AuthTokenTypeValue) {
    return prisma.authToken.findFirst({
      where: {
        tokenHash,
        type,
        revokedAt: null,
        usedAt: null,
        expiresAt: { gt: now() },
      },
    });
  }

  async revokeById(id: string): Promise<void> {
    await prisma.authToken.update({
      where: { id },
      data: { revokedAt: now() },
    });
  }

  async revokeAllForUser(userId: string, type: AuthTokenTypeValue): Promise<void> {
    await prisma.authToken.updateMany({
      where: {
        userId,
        type,
        revokedAt: null,
      },
      data: { revokedAt: now() },
    });
  }

  async markUsed(id: string): Promise<void> {
    await prisma.authToken.update({
      where: { id },
      data: { usedAt: now() },
    });
  }
}

export const authTokenRepository = new AuthTokenRepository();
