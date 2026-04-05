import prisma from "../../config/prisma.client";
import {
  DifficultyResponse,
  toDifficultyResponse,
  UpdateDifficultyBody,
} from "./difficulty.dto";

export class DifficultyService {
  async listActive(): Promise<DifficultyResponse[]> {
    const rows = await prisma.difficulty.findMany({
      where: { deletedAt: null },
      orderBy: { level: "asc" },
    });
    return rows.map(toDifficultyResponse);
  }

  async findByLevel(level: number): Promise<DifficultyResponse | null> {
    const row = await prisma.difficulty.findFirst({
      where: { level, deletedAt: null },
    });
    return row ? toDifficultyResponse(row) : null;
  }

  async updateById(
    id: string,
    body: UpdateDifficultyBody,
  ): Promise<DifficultyResponse | null> {
    const existing = await prisma.difficulty.findFirst({
      where: { id, deletedAt: null },
    });
    if (!existing) {
      return null;
    }

    const updated = await prisma.difficulty.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.maxVolunteers !== undefined
          ? { maxVolunteers: body.maxVolunteers }
          : {}),
        ...(body.greenPoints !== undefined
          ? { greenPoints: body.greenPoints }
          : {}),
      },
    });
    return toDifficultyResponse(updated);
  }
}

export const difficultyService = new DifficultyService();
