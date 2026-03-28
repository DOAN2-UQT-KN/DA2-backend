import { ReportStatus, TaskStatus } from "../../constants/status.enum";

// Request DTOs
export interface CreateReportRequest {
  title: string;
  description?: string;
  wasteType?: string;
  severityLevel?: number;
  latitude: number;
  longitude: number;
  imageUrls: string[]; // Array of image URLs
}

export interface UpdateReportRequest {
  title?: string;
  description?: string;
  wasteType?: string;
  severityLevel?: number;
  latitude?: number;
  longitude?: number;
  status?: ReportStatus;
  imageUrls?: string[] | null;
}

export interface ReportSearchQuery {
  search?: string; // Search in title/description
  status?: ReportStatus; // Filter by status
  wasteType?: string; // Filter by waste type
  severityLevel?: number; // Filter by severity
  latitude?: number; // User's latitude for distance sorting
  longitude?: number; // User's longitude for distance sorting
  maxDistance?: number; // Maximum distance in meters
  sortBy?: "distance" | "createdAt" | "severityLevel";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

// Response DTOs
export interface ReportResponse {
  id: string;
  userId: string | null;
  title: string | null;
  description: string | null;
  wasteType: string | null;
  severityLevel: number | null;
  latitude: number | null;
  longitude: number | null;
  status: number | null;
  aiVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  distance?: number; // Distance in meters (when searching with location)
}

export interface ReportDetailResponse extends ReportResponse {
  mediaFiles: ReportMediaFileResponse[];
  managers: ReportManagerResponse[];
  joiningRequests?: JoinRequestResponse[];
  tasks?: TaskResponse[];
}

export interface ReportMediaFileResponse {
  id: string;
  mediaId: string;
  url: string | null;
  stage: string | null;
  uploadedBy: string | null;
  createdAt: Date;
}

export interface ReportManagerResponse {
  reportId: string;
  userId: string;
  assignedBy: string | null;
  assignedAt: Date;
}

export interface JoinRequestResponse {
  id: string;
  reportId: string | null;
  volunteerId: string | null;
  status: number;
  createdAt: Date;
}

export interface TaskResponse {
  id: string;
  reportId: string | null;
  title: string | null;
  description: string | null;
  status: number;
  scheduledTime: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

// Pagination response
export interface PaginatedReportsResponse {
  reports: ReportResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Manager Request DTOs
export interface AddManagersRequest {
  userIds: string[]; // Array of user IDs to add as managers
}

export interface RemoveManagerRequest {
  userId: string; // User ID to remove as manager
}

// Task Request DTOs
export interface CreateTaskRequest {
  reportId: string;
  title: string;
  description?: string;
  scheduledTime?: string; // ISO date string
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  status?: TaskStatus;
  scheduledTime?: string;
}

export interface AssignTaskRequest {
  volunteerId: string;
}

// Task Response DTOs
export interface TaskDetailResponse extends TaskResponse {
  assignments: TaskAssignmentResponse[];
}

export interface TaskAssignmentResponse {
  id: string;
  campaignTaskId: string | null;
  volunteerId: string | null;
  createdAt: Date;
}
