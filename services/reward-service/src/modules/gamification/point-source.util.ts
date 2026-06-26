import type { PointSourceType } from "@prisma/client";
import { GreenPointResourceType } from "../green-point/green-point-transaction.constants";

export function mapResourceTypeToSourceType(
  resourceType: string,
): PointSourceType {
  if (resourceType === GreenPointResourceType.CAMPAIGN) {
    return "CAMPAIGN";
  }
  if (resourceType === GreenPointResourceType.REPORT) {
    return "REPORT";
  }
  return "SYSTEM";
}
