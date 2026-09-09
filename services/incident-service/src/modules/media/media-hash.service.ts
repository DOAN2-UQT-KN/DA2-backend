import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import prisma from "../../config/prisma.client";
import { MediaHashAlgorithm } from "./media-hash.constants";
import { computePHash, computeSha256 } from "./media-hash.util";

/**
 * Runs the image hash step for a media row. Persists only non-null results.
 * SHA-256 is computed; pHash stub yields no row until implemented.
 */
export async function processImageHashes(
  mediaId: string,
  buffer: Buffer,
  tx?: Prisma.TransactionClient,
): Promise<void> {
  const rows: {
    id: string;
    mediaId: string;
    algorithm: string;
    hash: string;
  }[] = [];

  const sha256 = computeSha256(buffer);
  if (sha256) {
    rows.push({
      id: randomUUID(),
      mediaId,
      algorithm: MediaHashAlgorithm.SHA256,
      hash: sha256,
    });
  }

  const phash = computePHash(buffer);
  if (phash) {
    rows.push({
      id: randomUUID(),
      mediaId,
      algorithm: MediaHashAlgorithm.PHASH,
      hash: phash,
    });
  }

  if (rows.length === 0) {
    return;
  }

  const db = tx ?? prisma;
  await db.mediaHash.createMany({
    data: rows,
    skipDuplicates: true,
  });
}
