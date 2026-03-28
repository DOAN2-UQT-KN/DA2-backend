import { GlobalStatus } from "../../constants/status.enum";

export interface CreateCampaignRequest {
  title: string;
  description?: string;
  reportIds?: string[];
}

export interface UpdateCampaignRequest {
  title?: string;
  description?: string;
  status?: GlobalStatus;
  reportIds?: string[];
  managerIds?: string[];
}

export interface CampaignResponse {
  id: string;
  title: string;
  description: string | null;
  status: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  reportIds: string[];
  managerIds: string[];
}
