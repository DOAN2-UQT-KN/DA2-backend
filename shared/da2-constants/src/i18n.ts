export type AppLocale = "en" | "vi";

export type LocalizedText = {
  en?: string | null;
  vi?: string | null;
  original?: string | null;
};

export function normalizeAppLocale(raw: string | null | undefined): AppLocale {
  return raw?.toLowerCase().startsWith("vi") ? "vi" : "en";
}

/** Pick display string: requested locale first, then the other locale, then original. */
export function pickLocalizedText(
  text: LocalizedText,
  locale: AppLocale,
): string {
  const o = text.original?.trim();
  if (locale === "vi") {
    return text.vi?.trim() || text.en?.trim() || o || "";
  }
  return text.en?.trim() || text.vi?.trim() || o || "";
}

export function toLocalizedText(entity: {
  title?: string | null;
  titleVi?: string | null;
  titleEn?: string | null;
  description?: string | null;
  descriptionVi?: string | null;
  descriptionEn?: string | null;
  name?: string | null;
  nameVi?: string | null;
  nameEn?: string | null;
}): LocalizedText {
  return {
    original: entity.title ?? entity.description ?? entity.name ?? null,
    vi: entity.titleVi ?? entity.descriptionVi ?? entity.nameVi ?? null,
    en: entity.titleEn ?? entity.descriptionEn ?? entity.nameEn ?? null,
  };
}

/** Flatten for Handlebars: campaignTitleEn, campaignTitleVi, campaignTitle (en default). */
export function flattenLocalizedForTemplates(
  prefix: string,
  text: LocalizedText,
): Record<string, string> {
  const en = pickLocalizedText(text, "en");
  const vi = pickLocalizedText(text, "vi");
  return {
    [prefix]: en,
    [`${prefix}En`]: en,
    [`${prefix}Vi`]: vi,
  };
}
