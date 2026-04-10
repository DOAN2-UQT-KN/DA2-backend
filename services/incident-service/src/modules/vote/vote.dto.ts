import type { VoteResourceType } from "../../constants/status.enum";
import { VoteValue } from "../../constants/status.enum";

export interface VoteActionBody {
  resourceId: string;
  resourceType: VoteResourceType;
}

export interface VoteActionResponse {
  resourceId: string;
  resourceType: VoteResourceType;
  value: number;
}

/** OpenAPI: `data` for POST /api/v1/incident/votes/upvote and /api/v1/incident/votes/downvote */
export interface VoteActionEnvelopeData {
  vote: VoteActionResponse;
}

/** Vote totals and the current user’s vote on a report or campaign (embedded in list/detail payloads). */
export interface ResourceVoteSummary {
  upvoteCount: number;
  downvoteCount: number;
  /**
   * Current user’s vote: 1 up, -1 down, 0 none.
   * Null when the caller is not authenticated.
   */
  myVote: number | null;
}

export function defaultResourceVoteSummary(
  viewerUserId?: string | null,
): ResourceVoteSummary {
  return {
    upvoteCount: 0,
    downvoteCount: 0,
    myVote: viewerUserId != null ? VoteValue.NONE : null,
  };
}
