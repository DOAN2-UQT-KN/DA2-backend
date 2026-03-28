import { PrismaClient } from "@prisma/client";
import prisma from "../../../config/prisma.client";
import { JoinRequestStatus } from "../../../constants/status.enum";

export class CampaignJoiningRequestRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = prisma;
    }

    async createJoinRequest(data: { campaignId: string; volunteerId: string }) {
        return this.prisma.campaignJoiningRequest.create({
            data: {
                campaignId: data.campaignId,
                volunteerId: data.volunteerId,
                status: JoinRequestStatus._STATUS_PENDING,
            },
        });
    }

    async findById(id: string) {
        return this.prisma.campaignJoiningRequest.findFirst({
            where: { id, deletedAt: null },
        });
    }

    async findByIdWithCampaign(id: string) {
        return this.prisma.campaignJoiningRequest.findFirst({
            where: { id, deletedAt: null },
            include: {
                campaign: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
            },
        });
    }

    async findExisting(campaignId: string, volunteerId: string) {
        return this.prisma.campaignJoiningRequest.findFirst({
            where: { campaignId, volunteerId, deletedAt: null },
        });
    }

    async findByCampaignId(campaignId: string) {
        return this.prisma.campaignJoiningRequest.findMany({
            where: { campaignId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
    }

    async findPendingByCampaignId(campaignId: string) {
        return this.prisma.campaignJoiningRequest.findMany({
            where: {
                campaignId,
                status: JoinRequestStatus._STATUS_PENDING,
                deletedAt: null,
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async findByVolunteerId(volunteerId: string) {
        return this.prisma.campaignJoiningRequest.findMany({
            where: { volunteerId, deletedAt: null },
            include: {
                campaign: {
                    select: {
                        id: true,
                        title: true,
                        status: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
    }

    async updateStatus(id: string, status: number) {
        return this.prisma.campaignJoiningRequest.update({
            where: { id },
            data: { status },
        });
    }

    async softDelete(id: string) {
        return this.prisma.campaignJoiningRequest.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async isVolunteerApproved(
        campaignId: string,
        volunteerId: string,
    ): Promise<boolean> {
        const request = await this.prisma.campaignJoiningRequest.findFirst({
            where: {
                campaignId,
                volunteerId,
                status: JoinRequestStatus._STATUS_APPROVED,
                deletedAt: null,
            },
        });
        return !!request;
    }

    async getApprovedVolunteers(campaignId: string) {
        return this.prisma.campaignJoiningRequest.findMany({
            where: {
                campaignId,
                status: JoinRequestStatus._STATUS_APPROVED,
                deletedAt: null,
            },
        });
    }
}

export const campaignJoiningRequestRepository =
    new CampaignJoiningRequestRepository();
