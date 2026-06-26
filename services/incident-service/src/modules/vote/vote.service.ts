import { Prisma } from "@prisma/client";
import { HttpError, HTTP_STATUS } from "../../constants/http-status";
import {
  VoteResourceType,
  VoteValue,
} from "../../constants/status.enum";
import prisma from "../../config/prisma.client";
import { campaignRepository } from "../campaign/campaign.repository";
import { reportRepository } from "../report/report.repository";
import {
  VoteActionBody,
  VoteActionResponse,
  ResourceVoteSummary,
} from "./vote.dto";
import { voteRepository } from "./vote.repository";
import { emitOutbox } from "../../outbox/outbox.writer";
import { OutboxEventType } from "../../outbox/outbox.types";

export class VoteService {
  /**
   * Vote totals per resource plus the viewer’s own vote (if viewerUserId is set).
   */
  async getVoteSummariesForResources(
    resourceType: VoteResourceType,
    resourceIds: string[],
    viewerUserId?: string | null,
  ): Promise<Map<string, ResourceVoteSummary>> {
    const uniqueIds = [...new Set(resourceIds)];
    const result = new Map<string, ResourceVoteSummary>();
    if (uniqueIds.length === 0) {
      return result;
    }

    const [countMap, myVotes] = await Promise.all([
      voteRepository.aggregateVoteCountsByResource(resourceType, uniqueIds),
      viewerUserId
        ? voteRepository.findMyVoteValuesForResources(
            viewerUserId,
            resourceType,
            uniqueIds,
          )
        : Promise.resolve(new Map<string, number>()),
    ]);

    for (const id of uniqueIds) {
      const counts = countMap.get(id) ?? { upvoteCount: 0, downvoteCount: 0 };
      result.set(id, {
        upvoteCount: counts.upvoteCount,
        downvoteCount: counts.downvoteCount,
        myVote:
          viewerUserId != null
            ? (myVotes.get(id) ?? VoteValue.NONE)
            : null,
      });
    }
    return result;
  }

  private async ensureVotableResource(
    resourceType: VoteResourceType,
    resourceId: string,
  ): Promise<void> {
    if (resourceType === VoteResourceType.REPORT) {
      const report = await reportRepository.findById(resourceId);
      if (!report) {
        throw new HttpError(HTTP_STATUS.REPORT_NOT_FOUND);
      }
      return;
    }
    if (resourceType === VoteResourceType.CAMPAIGN) {
      const campaign = await campaignRepository.findById(resourceId);
      if (!campaign) {
        throw new HttpError(
          HTTP_STATUS.NOT_FOUND.withMessage("Campaign not found"),
        );
      }
      return;
    }
    throw new HttpError(HTTP_STATUS.INVALID_INPUT);
  }

  /**
   * Report creator bonus: emit a vote-milestone green-point event inside the
   * same transaction as the vote write. Counts are read post-upsert via `tx`
   * so the event carries the fresh upvote total. The reward worker is
   * idempotent per (reportId, voteCount) milestone.
   */
  private async emitReportVoteMilestoneIfNeeded(
    tx: Prisma.TransactionClient,
    args: {
      resourceType: VoteResourceType;
      resourceId: string;
      newValue: number;
    },
  ): Promise<void> {
    if (args.resourceType !== VoteResourceType.REPORT) return;
    if (args.newValue !== VoteValue.UP) return;

    const report = await tx.report.findFirst({
      where: { id: args.resourceId, deletedAt: null },
      select: { userId: true },
    });
    const reportCreatorUserId = report?.userId ?? null;
    if (!reportCreatorUserId) return;

    const upvoteCount = await tx.vote.count({
      where: {
        resourceType: VoteResourceType.REPORT,
        resourceId: args.resourceId,
        value: VoteValue.UP,
        deletedAt: null,
      },
    });
    if (upvoteCount <= 0) return;

    await emitOutbox(tx, {
      aggregateType: "vote",
      aggregateId: args.resourceId,
      eventType: OutboxEventType.REPORT_VOTE_MILESTONE_GREEN_POINTS,
      payload: {
        reportId: args.resourceId,
        reportCreatorUserId,
        voteCount: upvoteCount,
      },
      dedupKey: `${OutboxEventType.REPORT_VOTE_MILESTONE_GREEN_POINTS}:${args.resourceId}:${upvoteCount}`,
    });
  }

  private nextUpvoteValue(current: number | null): number {
    if (current === VoteValue.UP) {
      return VoteValue.NONE;
    }
    return VoteValue.UP;
  }

  private nextDownvoteValue(current: number | null): number {
    if (current === VoteValue.DOWN) {
      return VoteValue.NONE;
    }
    return VoteValue.DOWN;
  }

  async upvote(
    userId: string,
    body: VoteActionBody,
  ): Promise<VoteActionResponse> {
    await this.ensureVotableResource(body.resourceType, body.resourceId);
    const existing = await voteRepository.findActive(
      userId,
      body.resourceType,
      body.resourceId,
    );
    const current = existing?.value ?? null;
    const value = this.nextUpvoteValue(current);
    await prisma.$transaction(async (tx) => {
      await voteRepository.upsertVote(
        userId,
        body.resourceType,
        body.resourceId,
        value,
        tx,
      );
      await this.emitReportVoteMilestoneIfNeeded(tx, {
        resourceType: body.resourceType,
        resourceId: body.resourceId,
        newValue: value,
      });
    });

    return {
      resourceId: body.resourceId,
      resourceType: body.resourceType,
      value,
    };
  }

  async downvote(
    userId: string,
    body: VoteActionBody,
  ): Promise<VoteActionResponse> {
    await this.ensureVotableResource(body.resourceType, body.resourceId);
    const existing = await voteRepository.findActive(
      userId,
      body.resourceType,
      body.resourceId,
    );
    const current = existing?.value ?? null;
    const value = this.nextDownvoteValue(current);
    await voteRepository.upsertVote(
      userId,
      body.resourceType,
      body.resourceId,
      value,
    );
    return {
      resourceId: body.resourceId,
      resourceType: body.resourceType,
      value,
    };
  }
}

export const voteService = new VoteService();
