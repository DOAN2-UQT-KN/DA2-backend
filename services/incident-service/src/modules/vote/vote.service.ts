import { HttpError, HTTP_STATUS } from "../../constants/http-status";
import {
  VoteResourceType,
  VoteValue,
} from "../../constants/status.enum";
import { campaignRepository } from "../campaign/campaign.repository";
import { reportRepository } from "../report/report.repository";
import { VoteActionBody, VoteActionResponse } from "./vote.dto";
import { voteRepository } from "./vote.repository";

export class VoteService {
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
