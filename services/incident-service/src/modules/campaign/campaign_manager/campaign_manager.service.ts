import { campaignManagerRepository } from "./campaign_manager.repository";
import { reportRepository } from "../../report/report.repository";
import {
  ReportManagerResponse,
  AddManagersRequest,
} from "../../report/report.dto";
import { campaignRepository } from "../campaign.repository";

export class CampaignManagerService {
  constructor() {}

  /**
   * Add multiple managers to the campaign that owns the report.
   * Reporter and campaign managers can add managers.
   */
  async addManagers(
    reportId: string,
    request: AddManagersRequest,
    assignedBy: string,
  ): Promise<ReportManagerResponse[]> {
    const report = await reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    if (!report.campaignId) {
      throw new Error("Report is not linked to any campaign");
    }

    const canManage = await this.canManageReport(reportId, assignedBy);
    if (!canManage) {
      throw new Error(
        "Only the reporter or campaign managers can assign managers",
      );
    }

    const addedManagers: ReportManagerResponse[] = [];

    for (const userId of request.userIds) {
      const existing =
        await campaignManagerRepository.findByCampaignIdAndUserId(
          report.campaignId,
          userId,
        );
      if (existing) {
        continue;
      }

      const manager = await campaignManagerRepository.assignManager({
        campaignId: report.campaignId,
        userId,
        assignedBy,
      });

      addedManagers.push({
        reportId,
        userId: manager.userId,
        assignedBy: manager.assignedBy,
        assignedAt: manager.assignedAt,
      });
    }

    return addedManagers;
  }

  /**
   * Remove a manager from the campaign that owns the report.
   * Only the reporter can remove managers for that report's campaign context.
   */
  async removeManager(
    reportId: string,
    userId: string,
    removedBy: string,
  ): Promise<void> {
    const report = await reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    if (!report.campaignId) {
      throw new Error("Report is not linked to any campaign");
    }

    if (report.userId !== removedBy) {
      throw new Error("Only the reporter can remove managers");
    }

    const existing = await campaignManagerRepository.findByCampaignIdAndUserId(
      report.campaignId,
      userId,
    );
    if (!existing) {
      throw new Error("User is not a manager for this report");
    }

    await campaignManagerRepository.removeManager(
      report.campaignId,
      userId,
      removedBy,
    );
  }

  /**
   * Get all campaign managers for a report (via report -> campaign).
   */
  async getReportManagers(reportId: string): Promise<ReportManagerResponse[]> {
    const report = await reportRepository.findById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    if (!report.campaignId) {
      return [];
    }

    const managers = await campaignManagerRepository.findManagersByCampaignId(
      report.campaignId,
    );

    return managers.map((m) => ({
      reportId,
      userId: m.userId,
      assignedBy: m.assignedBy,
      assignedAt: m.assignedAt,
    }));
  }

  /**
   * Check if user is campaign manager for the campaign that owns the report.
   */
  async isManager(reportId: string, userId: string): Promise<boolean> {
    const report = await reportRepository.findById(reportId);
    if (!report?.campaignId) {
      return false;
    }

    return campaignManagerRepository.isManager(report.campaignId, userId);
  }

  /**
   * Check if user can manage a report (is reporter or campaign manager).
   */
  async canManageReport(reportId: string, userId: string): Promise<boolean> {
    const report = await reportRepository.findById(reportId);
    if (!report) return false;

    if (report.userId === userId) return true;

    if (!report.campaignId) {
      return false;
    }

    return campaignManagerRepository.isManager(report.campaignId, userId);
  }

  /**
   * Get all campaigns managed by a user.
   */
  async getMyManagedCampaigns(userId: string) {
    const managers =
      await campaignManagerRepository.findCampaignsByManagerId(userId);

    return managers.map((m) => ({
      campaignId: m.campaignId,
      userId: m.userId,
      assignedBy: m.assignedBy,
      assignedAt: m.assignedAt,
      createdAt: m.createdAt,
      campaign: m.campaign
        ? {
            id: m.campaign.id,
            title: m.campaign.title,
            status: m.campaign.status,
          }
        : undefined,
    }));
  }

  async getCampaignManagers(campaignId: string): Promise<string[]> {
    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const managers =
      await campaignManagerRepository.findManagersByCampaignId(campaignId);
    return managers.map((manager) => manager.userId);
  }
}

// Singleton instance
export const campaignManagerService = new CampaignManagerService();
