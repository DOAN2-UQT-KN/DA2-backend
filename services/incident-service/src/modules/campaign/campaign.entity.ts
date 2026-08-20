import { Campaign, CampaignManager, Report } from "@prisma/client";
import type { AppLocale } from "@da2/constants";
import { pickLocalizedText, toLocalizedText } from "@da2/constants";
import { defaultCampaignCompletionVerificationSummary } from "./campaign_completion_verification/campaign_completion_verification.dto";
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
  currentMembers: number,
  maxMembers: number | null,
  locale?: AppLocale | null,
): CampaignResponse => {
  const managerIds = entity.campaignManagers.map((manager) => manager.userId);
  const titleLoc = toLocalizedText({
    title: entity.title,
    titleVi: entity.titleVi,
    titleEn: entity.titleEn,
  });
  const descLoc = toLocalizedText({
    title: entity.description,
    titleVi: entity.descriptionVi,
    titleEn: entity.descriptionEn,
  });
  const loc = locale ?? "en";

  return {
    id: entity.id,
    organizationId: entity.organizationId,
    Organization: undefined,
    owner: null,
    title: pickLocalizedText(titleLoc, loc),
    titleVi: entity.titleVi ?? entity.title,
    titleEn: entity.titleEn ?? null,
    banner: entity.banner,
    description: pickLocalizedText(descLoc, loc),
    descriptionVi: entity.descriptionVi ?? entity.description,
    descriptionEn: entity.descriptionEn ?? null,
    status: entity.status,
    rejectReason: entity.rejectReason ?? null,
    startDate: entity.startDate,
    endDate: entity.endDate,
    detailAddress: entity.detailAddress,
    latitude: entity.latitude,
    longitude: entity.longitude,
    radiusKm: entity.radiusKm,
    difficulty: entity.difficulty,
    greenPoints,
    currentMembers,
    maxMembers,
    createdBy: entity.createdBy,
    updatedBy: entity.updatedBy,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    reports: [],
    managers: managerIds.map((id) => ({ id, name: "", avatar: null })),
    votes: defaultResourceVoteSummary(null),
    completionVerification: defaultCampaignCompletionVerificationSummary(null),
    saved: null,
  };
};
