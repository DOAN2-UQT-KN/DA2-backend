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
                        difficulty: true,
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

    /** Most recent join request for this campaign and volunteer (e.g. `request_status` on campaign detail). */
    async findLatestByCampaignAndVolunteer(
        campaignId: string,
        volunteerId: string,
    ) {
        return this.prisma.campaignJoiningRequest.findFirst({
            where: {
                campaignId,
                volunteerId,
                deletedAt: null,
            },
            orderBy: { updatedAt: "desc" },
        });
    }

    /**
     * Latest join-request status per campaign for this volunteer (by `updatedAt` desc).
     * Used to attach `request_status` on campaign list responses without N+1 queries.
     */
    async findLatestStatusByCampaignForVolunteer(
        volunteerId: string,
        campaignIds: string[],
    ): Promise<Map<string, number>> {
        const map = new Map<string, number>();
        if (campaignIds.length === 0) {
            return map;
        }
        const rows = await this.prisma.campaignJoiningRequest.findMany({
            where: {
                volunteerId,
                campaignId: { in: campaignIds },
                deletedAt: null,
            },
            orderBy: { updatedAt: "desc" },
            select: { campaignId: true, status: true },
        });
        for (const row of rows) {
            if (row.campaignId != null && !map.has(row.campaignId)) {
                map.set(row.campaignId, row.status);
            }
        }
        return map;
    }

    async findByCampaignId(campaignId: string) {
        return this.prisma.campaignJoiningRequest.findMany({
            where: { campaignId, deletedAt: null },
            orderBy: { createdAt: "desc" },
        });
    }

    async findByCampaignIdPaginated(
        campaignId: string,
        filters: { status?: number; volunteerId?: string },
        options: {
            skip: number;
            take: number;
            sortBy: "createdAt" | "updatedAt";
            sortOrder: "asc" | "desc";
        },
    ) {
        const where = {
            campaignId,
            deletedAt: null as null,
            ...(filters.status !== undefined ? { status: filters.status } : {}),
            ...(filters.volunteerId ? { volunteerId: filters.volunteerId } : {}),
        };
        const orderBy =
            options.sortBy === "updatedAt"
                ? { updatedAt: options.sortOrder }
                : { createdAt: options.sortOrder };

        const [rows, total] = await Promise.all([
            this.prisma.campaignJoiningRequest.findMany({
                where,
                orderBy,
                skip: options.skip,
                take: options.take,
            }),
            this.prisma.campaignJoiningRequest.count({ where }),
        ]);
        return { rows, total };
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

    async findByVolunteerIdPaginated(
        volunteerId: string,
        filters: { campaignId?: string; status?: number },
        options: {
            skip: number;
            take: number;
            sortBy: "createdAt" | "updatedAt";
            sortOrder: "asc" | "desc";
        },
    ) {
        const where = {
            volunteerId,
            deletedAt: null as null,
            ...(filters.campaignId ? { campaignId: filters.campaignId } : {}),
            ...(filters.status !== undefined ? { status: filters.status } : {}),
        };
        const orderBy =
            options.sortBy === "updatedAt"
                ? { updatedAt: options.sortOrder }
                : { createdAt: options.sortOrder };
        const include = {
            campaign: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    difficulty: true,
                },
            },
        };

        const [rows, total] = await Promise.all([
            this.prisma.campaignJoiningRequest.findMany({
                where,
                include,
                orderBy,
                skip: options.skip,
                take: options.take,
            }),
            this.prisma.campaignJoiningRequest.count({ where }),
        ]);
        return { rows, total };
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

    async countApprovedByCampaignId(campaignId: string): Promise<number> {
        return this.prisma.campaignJoiningRequest.count({
            where: {
                campaignId,
                status: JoinRequestStatus._STATUS_APPROVED,
                deletedAt: null,
            },
        });
    }

    /** Approved join counts per campaign; campaigns with zero approved are omitted. */
    async countApprovedByCampaignIds(
        campaignIds: string[],
    ): Promise<Map<string, number>> {
        if (campaignIds.length === 0) {
            return new Map();
        }
        const groups = await this.prisma.campaignJoiningRequest.groupBy({
            by: ["campaignId"],
            where: {
                campaignId: { in: campaignIds },
                status: JoinRequestStatus._STATUS_APPROVED,
                deletedAt: null,
            },
            _count: { _all: true },
        });
        const out = new Map<string, number>();
        for (const g of groups) {
            if (g.campaignId != null) {
                out.set(g.campaignId, g._count._all);
            }
        }
        return out;
    }

    /** Distinct approved volunteer user IDs for campaign completion rewards. */
    async findApprovedVolunteerIdsByCampaignId(
        campaignId: string,
    ): Promise<string[]> {
        const rows = await this.prisma.campaignJoiningRequest.findMany({
            where: {
                campaignId,
                status: JoinRequestStatus._STATUS_APPROVED,
                deletedAt: null,
            },
            select: { volunteerId: true },
        });
        const ids = rows
            .map((r) => r.volunteerId)
            .filter((id): id is string => id != null && id.length > 0);
        return [...new Set(ids)];
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

    async getApprovedVolunteersPaginated(
        campaignId: string,
        filters: { volunteerId?: string },
        options: {
            skip: number;
            take: number;
            sortBy: "createdAt" | "updatedAt";
            sortOrder: "asc" | "desc";
        },
    ) {
        const where = {
            campaignId,
            status: JoinRequestStatus._STATUS_APPROVED,
            deletedAt: null as null,
            ...(filters.volunteerId ? { volunteerId: filters.volunteerId } : {}),
        };
        const orderBy =
            options.sortBy === "updatedAt"
                ? { updatedAt: options.sortOrder }
                : { createdAt: options.sortOrder };

        const [rows, total] = await Promise.all([
            this.prisma.campaignJoiningRequest.findMany({
                where,
                orderBy,
                skip: options.skip,
                take: options.take,
            }),
            this.prisma.campaignJoiningRequest.count({ where }),
        ]);
        return { rows, total };
    }
}

export const campaignJoiningRequestRepository =
    new CampaignJoiningRequestRepository();
