import { randomUUID } from "crypto";
import type { LeaderboardMetric, SeasonKind } from "@prisma/client";
import { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.client";

export type ReportVoteMilestoneCredit = {
  /** Upvote count threshold from admin config. */
  threshold: number;
  /** 1-based index among configured thresholds (first crossed = 1, second = 2, …). */
  milestoneIndex: number;
  /** Green points for the report creator at this milestone. */
  points: number;
};

/**
 * Resolve milestone payouts for one report from active admin point rules.
 * Each report is evaluated independently via `reportId` in the ledger.
 */
export function resolveReportVoteMilestoneCredits(
  voteCount: number,
  rules: {
    baseReportPoint: number;
    reportMilestoneThresholds: number[];
  } | null,
): ReportVoteMilestoneCredit[] {
  if (!rules || rules.baseReportPoint <= 0 || voteCount <= 0) {
    return [];
  }

  const sorted = [...rules.reportMilestoneThresholds].sort((a, b) => a - b);
  const credits: ReportVoteMilestoneCredit[] = [];

  sorted.forEach((threshold, index) => {
    if (threshold > voteCount) {
      return;
    }
    const milestoneIndex = index + 1;
    const points = rules.baseReportPoint * milestoneIndex;
    if (points > 0) {
      credits.push({ threshold, milestoneIndex, points });
    }
  });

  return credits;
}

export class GamificationConfigService {
  async getActivePointRules() {
    return prisma.gamificationPointRules.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  async resolveActiveReportVoteMilestoneCredits(
    voteCount: number,
  ): Promise<ReportVoteMilestoneCredit[]> {
    const rules = await this.getActivePointRules();
    if (!rules) {
      return [];
    }
    return resolveReportVoteMilestoneCredits(voteCount, {
      baseReportPoint: rules.baseReportPoint,
      reportMilestoneThresholds: rules.reportMilestoneThresholds,
    });
  }

  async upsertPointRules(body: {
    baseReportPoint: number;
    reportMilestoneThresholds: number[];
    volunteerBonusCapByDifficulty?: Prisma.InputJsonValue | null;
  }) {
    const existing = await this.getActivePointRules();
    const thresholds = [...body.reportMilestoneThresholds].sort((a, b) => a - b);

    const saved = existing
      ? await prisma.gamificationPointRules.update({
          where: { id: existing.id },
          data: {
            baseReportPoint: body.baseReportPoint,
            reportMilestoneThresholds: thresholds,
            volunteerBonusCapByDifficulty:
              body.volunteerBonusCapByDifficulty ?? undefined,
          },
        })
      : await prisma.gamificationPointRules.create({
          data: {
            id: randomUUID(),
            baseReportPoint: body.baseReportPoint,
            reportMilestoneThresholds: thresholds,
            volunteerBonusCapByDifficulty:
              body.volunteerBonusCapByDifficulty ?? undefined,
            isActive: true,
          },
        });

    await this.syncLegacyReportVoteGreenPointRules(
      body.baseReportPoint,
      thresholds,
    );

    return saved;
  }

  /**
   * Keeps `report_vote_green_point_rules` aligned for ops/scripts; worker reads gamification rules.
   */
  private async syncLegacyReportVoteGreenPointRules(
    baseReportPoint: number,
    thresholds: number[],
  ): Promise<void> {
    if (thresholds.length === 0) {
      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "report_vote_green_point_rules"
          SET "is_active" = false
        `,
      );
      return;
    }

    for (let index = 0; index < thresholds.length; index++) {
      const threshold = thresholds[index];
      const points = baseReportPoint * (index + 1);
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "report_vote_green_point_rules"
            (id, threshold, points, "is_active")
          VALUES
            (${randomUUID()}::uuid, ${threshold}, ${points}, true)
          ON CONFLICT (threshold)
          DO UPDATE SET
            points = EXCLUDED.points,
            "is_active" = true
        `,
      );
    }

    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "report_vote_green_point_rules"
        SET "is_active" = false
        WHERE threshold NOT IN (${Prisma.join(thresholds)})
      `,
    );
  }

  async getActiveSpRules() {
    return prisma.spendablePointRules.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: "desc" },
    });
  }

  async upsertSpRules(body: { expirationDays: number }) {
    const existing = await this.getActiveSpRules();
    if (existing) {
      return prisma.spendablePointRules.update({
        where: { id: existing.id },
        data: { expirationDays: body.expirationDays },
      });
    }
    return prisma.spendablePointRules.create({
      data: {
        id: randomUUID(),
        expirationDays: body.expirationDays,
        isActive: true,
      },
    });
  }

  async listMultiplierRules() {
    return prisma.volunteerOrgMultiplierRule.findMany({
      orderBy: [{ isActive: "desc" }, { priority: "desc" }],
    });
  }

  async upsertMultiplierRule(body: {
    code: string;
    multiplier: string | number;
    priority?: number;
    isActive?: boolean;
  }) {
    const mul =
      typeof body.multiplier === "number"
        ? body.multiplier
        : Number(body.multiplier);

    return prisma.volunteerOrgMultiplierRule.upsert({
      where: { code: body.code.trim() },
      create: {
        id: randomUUID(),
        code: body.code.trim(),
        multiplier: mul,
        priority: body.priority ?? 0,
        isActive: body.isActive ?? true,
      },
      update: {
        multiplier: mul,
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
  }

  async listSeasonScheduleRules() {
    return prisma.seasonScheduleRules.findMany({
      orderBy: { kind: "asc" },
    });
  }

  async upsertSeasonScheduleRule(body: {
    kind: SeasonKind;
    autoRotate?: boolean;
    metadata?: Prisma.InputJsonValue | null;
  }) {
    return prisma.seasonScheduleRules.upsert({
      where: { kind: body.kind },
      create: {
        id: randomUUID(),
        kind: body.kind,
        autoRotate: body.autoRotate ?? true,
        metadata: body.metadata ?? undefined,
      },
      update: {
        ...(body.autoRotate !== undefined
          ? { autoRotate: body.autoRotate }
          : {}),
        ...(body.metadata !== undefined
          ? {
              metadata:
                body.metadata === null
                  ? Prisma.JsonNull
                  : (body.metadata as Prisma.InputJsonValue),
            }
          : {}),
      },
    });
  }

  async listPayoutTiers(seasonId?: string | null) {
    return prisma.seasonLeaderboardPayoutTier.findMany({
      where: seasonId === undefined ? {} : { OR: [{ seasonId }, { seasonId: null }] },
      orderBy: [{ metric: "asc" }, { rankMin: "asc" }],
    });
  }

  async createPayoutTier(body: {
    seasonId?: string | null;
    metric: LeaderboardMetric;
    rankMin: number;
    rankMax: number;
    spAmount: number;
  }) {
    return prisma.seasonLeaderboardPayoutTier.create({
      data: {
        id: randomUUID(),
        seasonId: body.seasonId ?? null,
        metric: body.metric,
        rankMin: body.rankMin,
        rankMax: body.rankMax,
        spAmount: body.spAmount,
      },
    });
  }

  async patchPayoutTier(
    id: string,
    body: Partial<{
      seasonId: string | null;
      metric: LeaderboardMetric;
      rankMin: number;
      rankMax: number;
      spAmount: number;
    }>,
  ) {
    try {
      return await prisma.seasonLeaderboardPayoutTier.update({
        where: { id },
        data: body,
      });
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return null;
      }
      throw e;
    }
  }

  async deletePayoutTier(id: string): Promise<boolean> {
    try {
      await prisma.seasonLeaderboardPayoutTier.delete({ where: { id } });
      return true;
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2025"
      ) {
        return false;
      }
      throw e;
    }
  }
}

export const gamificationConfigService = new GamificationConfigService();
