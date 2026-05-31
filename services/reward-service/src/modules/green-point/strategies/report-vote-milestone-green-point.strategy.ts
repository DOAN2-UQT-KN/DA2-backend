import { Prisma } from "@prisma/client";
import { applyGreenPointLedgerCredit } from "../green-point-ledger.util";
import { GreenPointTransactionType } from "../green-point-transaction.constants";
import {
  REPORT_VOTE_MILESTONE_GREEN_POINT_JOB_TYPE,
  type ReportVoteMilestoneGreenPointsPayload,
} from "../green-point.types";
import { gamificationConfigService } from "../../gamification/gamification-config.service";
import type {
  GreenPointApplyResult,
  GreenPointCreditStrategy,
} from "./green-point-credit-strategy.types";

function encodeMilestoneResourceType(threshold: number): string {
  // Per-report idempotency key: one payout per (report, threshold).
  return `REPORT_VOTE_MILESTONE_${threshold}`;
}

export class ReportVoteMilestoneGreenPointStrategy
  implements GreenPointCreditStrategy<ReportVoteMilestoneGreenPointsPayload>
{
  readonly queueJobType = REPORT_VOTE_MILESTONE_GREEN_POINT_JOB_TYPE;

  validatePayload(raw: unknown): ReportVoteMilestoneGreenPointsPayload {
    if (raw === null || typeof raw !== "object") {
      throw new Error("Report vote milestone payload must be an object");
    }
    const p = raw as Record<string, unknown>;
    if (typeof p.reportId !== "string" || !p.reportId) {
      throw new Error("reportId is required");
    }
    if (typeof p.reportCreatorUserId !== "string" || !p.reportCreatorUserId) {
      throw new Error("reportCreatorUserId is required");
    }
    if (
      typeof p.voteCount !== "number" ||
      !Number.isFinite(p.voteCount) ||
      p.voteCount < 0
    ) {
      throw new Error("voteCount must be a non-negative number");
    }
    return {
      reportId: p.reportId,
      reportCreatorUserId: p.reportCreatorUserId,
      voteCount: p.voteCount,
    };
  }

  async applyInTransaction(
    tx: Prisma.TransactionClient,
    payload: ReportVoteMilestoneGreenPointsPayload,
  ): Promise<GreenPointApplyResult> {
    const milestones =
      await gamificationConfigService.resolveActiveReportVoteMilestoneCredits(
        payload.voteCount,
      );

    if (milestones.length === 0) {
      return { credited: 0, skipped: 0 };
    }

    let credited = 0;
    let skipped = 0;

    for (const milestone of milestones) {
      const outcome = await applyGreenPointLedgerCredit(tx, {
        userId: payload.reportCreatorUserId,
        points: milestone.points,
        transactionType: GreenPointTransactionType.REPORT_VOTE_MILESTONE,
        resourceId: payload.reportId,
        resourceType: encodeMilestoneResourceType(milestone.threshold),
        metadata: {
          threshold: milestone.threshold,
          milestoneIndex: milestone.milestoneIndex,
          voteCountAtAward: payload.voteCount,
        },
      });

      if (outcome === "credited") {
        credited += 1;
      } else {
        skipped += 1;
      }
    }

    return { credited, skipped };
  }
}
