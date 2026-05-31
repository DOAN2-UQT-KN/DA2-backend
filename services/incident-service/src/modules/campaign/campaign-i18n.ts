import {
  flattenLocalizedForTemplates,
  pickLocalizedText,
  toLocalizedText,
  type AppLocale,
} from "@da2/constants";

export function campaignTitleLocalized(entity: {
  title: string;
  titleVi?: string | null;
  titleEn?: string | null;
}): ReturnType<typeof toLocalizedText> {
  return toLocalizedText({
    title: entity.title,
    titleVi: entity.titleVi,
    titleEn: entity.titleEn,
  });
}

export function pickCampaignTitle(
  entity: {
    title: string;
    titleVi?: string | null;
    titleEn?: string | null;
  },
  locale?: AppLocale | null,
): string {
  const loc = locale ?? "en";
  return pickLocalizedText(campaignTitleLocalized(entity), loc);
}

/** Template payload fields for notification jobs (campaignTitle + En/Vi). */
export function campaignTitleNotificationPayload(entity: {
  title: string;
  titleVi?: string | null;
  titleEn?: string | null;
}): Record<string, string> {
  return flattenLocalizedForTemplates(
    "campaignTitle",
    campaignTitleLocalized(entity),
  );
}

export function campaignNameNotificationPayload(entity: {
  title: string;
  titleVi?: string | null;
  titleEn?: string | null;
}): Record<string, string> {
  const t = campaignTitleLocalized(entity);
  const flat = flattenLocalizedForTemplates("campaignName", t);
  return flat;
}
