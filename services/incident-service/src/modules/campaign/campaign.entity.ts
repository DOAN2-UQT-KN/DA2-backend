import { Campaign, CampaignManager, Report } from "@prisma/client";
import { defaultResourceVoteSummary } from "../vote/vote.dto";
import { CampaignResponse } from "./campaign.dto";

export type CampaignEntity = Campaign;

export type CampaignWithReports = Campaign & {
  reports: Pick<Report, "id">[];
  campaignManagers: Pick<CampaignManager, "userId">[];
};

export const toCampaignResponse = (
  entity: CampaignWithReports,
  greenPoints: number,
): CampaignResponse => {
  const managerIds = entity.campaignManagers.map((manager) => manager.userId);

  return {
    id: entity.id,
    Organization: undefined,
    title: entity.title,
    description: entity.description,
    status: entity.status,
    startDate: entity.startDate,
    endDate: entity.endDate,
    detailAddress: entity.detailAddress,
    latitude: entity.latitude,
    longitude: entity.longitude,
    radiusKm: entity.radiusKm,
    difficulty: entity.difficulty,
    greenPoints,
    createdBy: entity.createdBy,
    updatedBy: entity.updatedBy,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    reports: [],
    managers: managerIds.map((id) => ({ id, name: "", avatar: null })),
    votes: defaultResourceVoteSummary(null),
    saved: null,
  };
};
