/** Body for POST /api/v1/organizations */
export interface CreateOrganizationBody {
  name: string;
  description?: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationJoinRequestResponse {
  id: string;
  organizationId: string;
  requesterId: string;
  status: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationJoinRequestDetailResponse
  extends OrganizationJoinRequestResponse {
  organization?: {
    id: string;
    name: string;
    ownerId: string;
  };
}

export interface OrganizationMemberResponse {
  organizationId: string;
  userId: string;
  createdAt: Date;
}

/** Query for GET /api/v1/organizations (discovery). */
export interface OrganizationListQuery {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt" | "name";
  sortOrder?: "asc" | "desc";
}

/** Query for GET /api/v1/organizations/:id/join-requests (owner). */
export interface GetOrganizationJoinRequestsQuery {
  status?: number;
  requesterId?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

/** Query for GET /api/v1/organizations/join-requests/my. */
export interface MyOrganizationJoinRequestsQuery {
  organizationId?: string;
  status?: number;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

/** Query for GET /api/v1/organizations/:id/members (owner). */
export interface OrganizationMembersListQuery {
  userId?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export interface OrganizationOneEnvelopeData {
  organization: OrganizationResponse;
}

export interface MyOrganizationsEnvelopeData {
  organizations: OrganizationResponse[];
}

export interface PaginatedOrganizationsEnvelopeData {
  organizations: OrganizationResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface OrganizationJoinRequestOneEnvelopeData {
  joinRequest: OrganizationJoinRequestResponse;
}

export interface PaginatedOrganizationJoinRequestsEnvelopeData {
  joinRequests: OrganizationJoinRequestResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedOrganizationJoinRequestsDetailEnvelopeData {
  joinRequests: OrganizationJoinRequestDetailResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProcessOrganizationJoinRequestBody {
  requestId: string;
  approved: boolean;
}

export interface CancelOrganizationJoinRequestBody {
  requestId: string;
}

export interface PaginatedOrganizationMembersEnvelopeData {
  members: OrganizationMemberResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
