import type { SavedResourceType } from "../../constants/status.enum";
import type { CampaignResponse } from "../campaign/campaign.dto";
import type { ReportDetailResponse } from "../report/report.dto";

export interface SaveResourceBody {
  resourceId: string;
  resourceType: SavedResourceType;
}

export interface SaveResourceResponse {
  id: string;
  userId: string;
  resourceId: string;
  resourceType: SavedResourceType;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Current resource payload when available (e.g. after save/toggle). */
export interface SaveResourceWithResourceResponse extends SaveResourceResponse {
  resource: ReportDetailResponse | CampaignResponse | null;
}

/** OpenAPI: `data` for POST /incident/saved-resources/save */
export interface SaveResourceEnvelopeData {
  saved_resource: SaveResourceWithResourceResponse;
}

/** Query for GET /incident/saved-resources (current user’s saved list). */
export interface SavedResourceListQuery {
  page?: number;
  limit?: number;
  /** If set, only rows for this resource type. */
  resourceType?: SavedResourceType;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface SavedListItem extends SaveResourceResponse {
  resource: ReportDetailResponse | CampaignResponse | null;
}

export interface PaginatedSavedResourcesList {
  items: SavedListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** OpenAPI: `data` for GET /incident/saved-resources */
export interface SavedResourcesListEnvelopeData {
  saved_resource: PaginatedSavedResourcesList;
}
