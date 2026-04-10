import type { VoteResourceType } from "../../constants/status.enum";

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
