import { PrismaClient, Prisma } from "@prisma/client";
import prisma from "../../config/prisma.client";

export class ReportMediaRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async create(data: {
    reportId?: string;
    reportResultId?: string;
    fileUrl: string;
    stage?: string;
    uploadedBy?: string;
  }) {
    return this.prisma.reportMediaFile.create({
      data: {
        reportId: data.reportId,
        reportResultId: data.reportResultId,
        fileUrl: data.fileUrl,
        stage: data.stage,
        uploadedBy: data.uploadedBy,
      },
    });
  }

  async createMany(
    data: {
      reportId?: string;
      reportResultId?: string;
      fileUrl: string;
      stage?: string;
      uploadedBy?: string;
    }[],
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prisma;
    return db.reportMediaFile.createMany({
      data: data.map((item) => ({
        reportId: item.reportId,
        reportResultId: item.reportResultId,
        fileUrl: item.fileUrl,
        stage: item.stage,
        uploadedBy: item.uploadedBy,
      })),
    });
  }

  async findByReportId(reportId: string) {
    return this.prisma.reportMediaFile.findMany({
      where: { reportId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async findByReportResultId(reportResultId: string) {
    return this.prisma.reportMediaFile.findMany({
      where: { reportResultId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  async findById(id: string) {
    return this.prisma.reportMediaFile.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async update(id: string, data: { fileUrl?: string; stage?: string }) {
    return this.prisma.reportMediaFile.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.reportMediaFile.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async softDeleteByReportId(reportId: string, tx?: Prisma.TransactionClient) {
    const db = tx ?? this.prisma;
    return db.reportMediaFile.updateMany({
      where: { reportId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }
}

// Singleton instance
export const reportMediaRepository = new ReportMediaRepository();
