import { Prisma, Report } from "@prisma/client";
import { defaultResourceVoteSummary } from "../vote/vote.dto";
import type {
  DuplicateMediaMatch,
  DuplicateVerification,
  ReportResponse,
} from "./report.dto";

// Type-based entity
export type ReportEntity = Report;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

export function toDuplicateVerification(
  raw: Prisma.JsonValue | null | undefined,
): DuplicateVerification | null {
  const obj = asRecord(raw);
  if (obj == null) {
    return null;
  }

  const duplicateReportIdRaw =
    obj.duplicateReportId ?? obj.duplicate_report_id;
  const duplicateReportId =
    typeof duplicateReportIdRaw === "string" && duplicateReportIdRaw
      ? duplicateReportIdRaw
      : null;

  const reasonsRaw = obj.reasons;
  const reasons = Array.isArray(reasonsRaw)
    ? reasonsRaw.filter((item): item is string => typeof item === "string")
    : [];

  const matches: DuplicateMediaMatch[] = [];
  const matchesRaw = obj.matches;
  if (Array.isArray(matchesRaw)) {
    for (const item of matchesRaw) {
      const match = asRecord(item);
      if (match == null) {
        continue;
      }
      const mediaId = match.mediaId ?? match.media_id;
      const duplicateMediaId =
        match.duplicateMediaId ?? match.duplicate_media_id;
      if (typeof mediaId === "string" && typeof duplicateMediaId === "string") {
        matches.push({ mediaId, duplicateMediaId });
      }
    }
  }

  return { duplicateReportId, reasons, matches };
}

export function toDuplicateVerificationJson(
  verification: DuplicateVerification,
): Prisma.InputJsonValue {
  return {
    duplicateReportId: verification.duplicateReportId,
    reasons: verification.reasons,
    matches: verification.matches.map((m) => ({
      mediaId: m.mediaId,
      duplicateMediaId: m.duplicateMediaId,
    })),
  };
}

// Helper function for conversion
export const toReportResponse = (
  entity: ReportEntity,
  distance?: number,
): ReportResponse => ({
  id: entity.id,
  userId: entity.userId,
  user: null,
  title: entity.titleVi ?? entity.title,
  titleVi: entity.titleVi ?? entity.title,
  titleEn: entity.titleEn,
  description: entity.descriptionVi ?? entity.description,
  descriptionVi: entity.descriptionVi ?? entity.description,
  descriptionEn: entity.descriptionEn,
  wasteType: entity.wasteType,
  severityLevel: entity.severityLevel,
  latitude: entity.latitude,
  longitude: entity.longitude,
  detailAddress: entity.detailAddress,
  status: entity.status,
  isVerify: entity.isVerify,
  rejectReason: entity.rejectReason ?? null,
  aiVerified: entity.aiVerified,
  aiRecommendation: entity.aiRecommendation,
  duplicateVerification: toDuplicateVerification(entity.duplicateVerification),
  createdAt: entity.createdAt,
  updatedAt: entity.updatedAt,
  ...(distance !== undefined && { distance }),
  votes: defaultResourceVoteSummary(null),
  saved: null,
});
