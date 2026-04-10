import { PrismaClient } from "@prisma/client";
import prisma from "../../config/prisma.client";
import { JoinRequestStatus } from "../../constants/status.enum";

export class OrganizationJoiningRequestRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: { organizationId: string; requesterId: string }) {
    return this.prisma.organizationJoiningRequest.create({
      data: {
        organizationId: data.organizationId,
        requesterId: data.requesterId,
        status: JoinRequestStatus._STATUS_PENDING,
        createdBy: data.requesterId,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.organizationJoiningRequest.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByIdWithOrganization(id: string) {
    return this.prisma.organizationJoiningRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            deletedAt: true,
          },
        },
      },
    });
  }

  async findPending(organizationId: string, requesterId: string) {
    return this.prisma.organizationJoiningRequest.findFirst({
      where: {
        organizationId,
        requesterId,
        status: JoinRequestStatus._STATUS_PENDING,
        deletedAt: null,
      },
    });
  }

  async findByOrganizationPaginated(
    organizationId: string,
    filters: { status?: number; requesterId?: string },
    options: {
      skip: number;
      take: number;
      sortBy: "createdAt" | "updatedAt";
      sortOrder: "asc" | "desc";
    },
  ) {
    const where = {
      organizationId,
      deletedAt: null as null,
      ...(filters.status !== undefined ? { status: filters.status } : {}),
      ...(filters.requesterId ? { requesterId: filters.requesterId } : {}),
    };
    const orderBy =
      options.sortBy === "updatedAt"
        ? { updatedAt: options.sortOrder }
        : { createdAt: options.sortOrder };

    const [rows, total] = await Promise.all([
      this.prisma.organizationJoiningRequest.findMany({
        where,
        orderBy,
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.organizationJoiningRequest.count({ where }),
    ]);
    return { rows, total };
  }

  async findByRequesterPaginated(
    requesterId: string,
    filters: { organizationId?: string; status?: number },
    options: {
      skip: number;
      take: number;
      sortBy: "createdAt" | "updatedAt";
      sortOrder: "asc" | "desc";
    },
  ) {
    const where = {
      requesterId,
      deletedAt: null as null,
      ...(filters.organizationId
        ? { organizationId: filters.organizationId }
        : {}),
      ...(filters.status !== undefined ? { status: filters.status } : {}),
    };
    const orderBy =
      options.sortBy === "updatedAt"
        ? { updatedAt: options.sortOrder }
        : { createdAt: options.sortOrder };
    const include = {
      organization: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    };

    const [rows, total] = await Promise.all([
      this.prisma.organizationJoiningRequest.findMany({
        where,
        include,
        orderBy,
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.organizationJoiningRequest.count({ where }),
    ]);
    return { rows, total };
  }

  async updateStatus(id: string, status: number) {
    return this.prisma.organizationJoiningRequest.update({
      where: { id },
      data: { status },
    });
  }

  async softDelete(id: string) {
    return this.prisma.organizationJoiningRequest.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

export const organizationJoiningRequestRepository =
  new OrganizationJoiningRequestRepository();
