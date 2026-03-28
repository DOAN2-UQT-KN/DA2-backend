import { PrismaClient } from "@prisma/client";
import prisma from "../../../config/prisma.client";

export class CampaignSubmissionRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: {
    campaignId: string;
    submittedBy: string;
    title?: string;
    description?: string;
  }) {
    return this.prisma.campaignSubmission.create({
      data: {
        campaignId: data.campaignId,
        submittedBy: data.submittedBy,
        title: data.title,
        description: data.description,
        status: 12, // pending
        createdBy: data.submittedBy,
        updatedBy: data.submittedBy,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.campaignSubmission.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithResults(id: string) {
    return this.prisma.campaignSubmission.findFirst({
      where: { id, deletedAt: null },
      include: {
        campaignResults: {
          where: { deletedAt: null },
          include: {
            campaignResultFiles: true,
          },
        },
      },
    });
  }

  async findByCampaignId(campaignId: string) {
    return this.prisma.campaignSubmission.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        campaignResults: {
          where: { deletedAt: null },
          include: { campaignResultFiles: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updateStatus(id: string, status: number) {
    return this.prisma.campaignSubmission.update({
      where: { id },
      data: { status },
    });
  }

  async softDelete(id: string) {
    return this.prisma.campaignSubmission.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Results for this campaign not yet linked to any submission (draft / current). */
  async findUnsubmittedResultsByCampaignId(campaignId: string) {
    return this.prisma.campaignResult.findMany({
      where: {
        campaignId,
        campaignSubmissionId: { equals: null },
        deletedAt: null,
      },
      include: { campaignResultFiles: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Attach all draft results for the campaign to a new submission. */
  async attachUnsubmittedResultsToSubmission(
    campaignId: string,
    submissionId: string,
    updatedBy: string,
  ) {
    return this.prisma.campaignResult.updateMany({
      where: {
        campaignId,
        campaignSubmissionId: { equals: null },
        deletedAt: null,
      },
      data: {
        campaignSubmissionId: submissionId,
        updatedBy,
      },
    });
  }
}

export const campaignSubmissionRepository =
  new CampaignSubmissionRepository();
