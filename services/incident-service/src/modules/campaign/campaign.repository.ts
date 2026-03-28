import { Prisma, PrismaClient } from "@prisma/client";
import prisma from "../../config/prisma.client";
import { CampaignWithReports } from "./campaign.entity";

export class CampaignRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: Prisma.CampaignCreateInput): Promise<CampaignWithReports> {
    return this.prisma.campaign.create({
      data,
      include: {
        campaignManagers: {
          where: { deletedAt: null },
          select: { userId: true },
        },
        reports: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });
  }

  async findById(id: string): Promise<CampaignWithReports | null> {
    return this.prisma.campaign.findFirst({
      where: { id, deletedAt: null },
      include: {
        campaignManagers: {
          where: { deletedAt: null },
          select: { userId: true },
        },
        reports: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });
  }

  async findAll(): Promise<CampaignWithReports[]> {
    return this.prisma.campaign.findMany({
      where: { deletedAt: null },
      include: {
        campaignManagers: {
          where: { deletedAt: null },
          select: { userId: true },
        },
        reports: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async update(
    id: string,
    data: Prisma.CampaignUpdateInput,
  ): Promise<CampaignWithReports> {
    return this.prisma.campaign.update({
      where: { id },
      data,
      include: {
        campaignManagers: {
          where: { deletedAt: null },
          select: { userId: true },
        },
        reports: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });
  }

  async softDelete(
    id: string,
    deletedBy: string,
  ): Promise<CampaignWithReports> {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: deletedBy,
      },
      include: {
        campaignManagers: {
          where: { deletedAt: null },
          select: { userId: true },
        },
        reports: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });
  }

  async findValidReportIds(reportIds: string[]): Promise<string[]> {
    if (reportIds.length === 0) {
      return [];
    }

    const reports = await this.prisma.report.findMany({
      where: {
        id: { in: reportIds },
        deletedAt: null,
      },
      select: { id: true },
    });

    return reports.map((report) => report.id);
  }

  async clearCampaignReports(campaignId: string): Promise<void> {
    await this.prisma.report.updateMany({
      where: {
        campaignId,
        deletedAt: null,
      },
      data: {
        campaignId: null,
      },
    });
  }

  async assignReports(campaignId: string, reportIds: string[]): Promise<void> {
    if (reportIds.length === 0) {
      return;
    }

    await this.prisma.report.updateMany({
      where: {
        id: { in: reportIds },
        deletedAt: null,
      },
      data: {
        campaignId,
      },
    });
  }

  async unassignReports(campaignId: string): Promise<void> {
    await this.prisma.report.updateMany({
      where: {
        campaignId,
        deletedAt: null,
      },
      data: {
        campaignId: null,
      },
    });
  }

}

export const campaignRepository = new CampaignRepository();
