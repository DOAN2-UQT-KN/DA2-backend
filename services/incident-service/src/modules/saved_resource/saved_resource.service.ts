import { HttpError, HTTP_STATUS } from "../../constants/http-status";
import { SavedResourceType } from "../../constants/status.enum";
import { campaignRepository } from "../campaign/campaign.repository";
import { campaignService } from "../campaign/campaign.service";
import type { CampaignResponse } from "../campaign/campaign.dto";
import { reportRepository } from "../report/report.repository";
import { reportService } from "../report/report.service";
import type { ReportDetailResponse } from "../report/report.dto";
import {
  PaginatedSavedResourcesList,
  SaveResourceBody,
  SaveResourceResponse,
  SaveResourceWithResourceResponse,
  SavedResourceListQuery,
} from "./saved_resource.dto";
import { savedResourceRepository } from "./saved_resource.repository";

export class SavedResourceService {
  private async ensureSaveableResource(
    resourceType: SavedResourceType,
    resourceId: string,
  ): Promise<void> {
    if (resourceType === SavedResourceType.REPORT) {
      const report = await reportRepository.findById(resourceId);
      if (!report) {
        throw new HttpError(HTTP_STATUS.REPORT_NOT_FOUND);
      }
      return;
    }
    if (resourceType === SavedResourceType.CAMPAIGN) {
      const campaign = await campaignRepository.findById(resourceId);
      if (!campaign) {
        throw new HttpError(
          HTTP_STATUS.NOT_FOUND.withMessage("Campaign not found"),
        );
      }
      return;
    }
    throw new HttpError(HTTP_STATUS.INVALID_INPUT);
  }

  private toResponse(row: {
    id: string;
    userId: string;
    resourceId: string;
    resourceType: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }): SaveResourceResponse {
    return {
      id: row.id,
      userId: row.userId,
      resourceId: row.resourceId,
      resourceType: row.resourceType as SavedResourceType,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
    };
  }

  private async hydrateResource(
    userId: string,
    resourceType: SavedResourceType,
    resourceId: string,
  ): Promise<ReportDetailResponse | CampaignResponse | null> {
    if (resourceType === SavedResourceType.REPORT) {
      const list = await reportService.getReportsByIds([resourceId], userId);
      return list[0] ?? null;
    }
    if (resourceType === SavedResourceType.CAMPAIGN) {
      const list = await campaignService.getCampaignsByIds(
        [resourceId],
        userId,
      );
      return list[0] ?? null;
    }
    return null;
  }

  /**
   * Toggle / upsert saved state: no row → create (saved). Row with deletedAt → restore.
   * Row already active (saved) → soft-delete (deletedAt = now).
   */
  async save(
    userId: string,
    body: SaveResourceBody,
  ): Promise<SaveResourceWithResourceResponse> {
    await this.ensureSaveableResource(body.resourceType, body.resourceId);

    const existing = await savedResourceRepository.findByUserAndResource(
      userId,
      body.resourceType,
      body.resourceId,
    );

    let row: {
      id: string;
      userId: string;
      resourceId: string;
      resourceType: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    };
    if (!existing) {
      row = await savedResourceRepository.create(
        userId,
        body.resourceType,
        body.resourceId,
      );
    } else if (existing.deletedAt != null) {
      row = await savedResourceRepository.restore(existing.id);
    } else {
      row = await savedResourceRepository.softDelete(existing.id);
    }

    const base = this.toResponse(row);
    const resource = await this.hydrateResource(
      userId,
      body.resourceType,
      body.resourceId,
    );
    return { ...base, resource };
  }

  async listForUser(
    userId: string,
    query: SavedResourceListQuery,
  ): Promise<PaginatedSavedResourcesList> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? "createdAt";
    const sortOrder = query.sortOrder ?? "desc";
    const skip = (page - 1) * limit;

    const resourceTypeFilter =
      query.resourceType !== undefined
        ? String(query.resourceType)
        : undefined;

    const { rows, total } =
      await savedResourceRepository.findManyPaginatedForUser({
        userId,
        ...(resourceTypeFilter ? { resourceType: resourceTypeFilter } : {}),
        skip,
        take: limit,
        sortBy,
        sortOrder,
      });

    const reportIds = rows
      .filter((r) => r.resourceType === SavedResourceType.REPORT)
      .map((r) => r.resourceId);
    const campaignIds = rows
      .filter((r) => r.resourceType === SavedResourceType.CAMPAIGN)
      .map((r) => r.resourceId);

    const [reports, campaigns] = await Promise.all([
      reportService.getReportsByIds(reportIds, userId),
      campaignService.getCampaignsByIds(campaignIds, userId),
    ]);

    const reportById = new Map(reports.map((r) => [r.id, r]));
    const campaignById = new Map(campaigns.map((c) => [c.id, c]));

    const items = rows.map((row) => {
      const rt = row.resourceType as SavedResourceType;
      const resource =
        rt === SavedResourceType.REPORT
          ? (reportById.get(row.resourceId) ?? null)
          : rt === SavedResourceType.CAMPAIGN
            ? (campaignById.get(row.resourceId) ?? null)
            : null;
      return { ...this.toResponse(row), resource };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

export const savedResourceService = new SavedResourceService();
