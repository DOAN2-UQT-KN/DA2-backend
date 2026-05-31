/** Job types owned by incident-service. */
export enum ReportJobType {
  ANALYZE_REPORT = "ANALYZE_REPORT",
  TRANSLATE_TEXT = "TRANSLATE_TEXT",
}

/** Logical resource types carried in TRANSLATE_TEXT payloads. */
export enum TranslationResourceType {
  REPORT = "REPORT",
  ORGANIZATION = "ORGANIZATION",
  CAMPAIGN = "CAMPAIGN",
}

/**
 * Single translation request inside a TRANSLATE_TEXT job. The worker calls the
 * AI translation service for `sourceText` and writes the result into the named
 * Vietnamese / English columns. Either target may be omitted (e.g. when the
 * client already provided one of the two languages).
 */
export interface TranslationFieldTarget {
  sourceText: string;
  viField?: string;
  enField?: string;
}

export interface TranslationJobPayload {
  resourceType: TranslationResourceType;
  resourceId: string;
  translations: TranslationFieldTarget[];
}
