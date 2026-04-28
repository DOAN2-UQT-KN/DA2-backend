import { Difficulty } from "@prisma/client";

export interface DifficultyResponse {
  id: string;
  level: number;
  name: string;
  maxVolunteers: number | null;
  greenPoints: number;
}

export const toDifficultyResponse = (row: Difficulty): DifficultyResponse => ({
  id: row.id,
  level: row.level,
  name: row.name,
  maxVolunteers: row.maxVolunteers,
  greenPoints: row.greenPoints,
});

export interface UpdateDifficultyBody {
  name?: string;
  maxVolunteers?: number | null;
  greenPoints?: number;
}

export interface DifficultyListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** OpenAPI / success envelope: list difficulties */
export interface DifficultiesListEnvelopeData extends DifficultyListMeta {
  difficulties: DifficultyResponse[];
}

/** OpenAPI / success envelope: single difficulty */
export interface DifficultyOneEnvelopeData {
  difficulty: DifficultyResponse;
}
