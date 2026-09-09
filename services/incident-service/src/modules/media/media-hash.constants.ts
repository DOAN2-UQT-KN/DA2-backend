/** Algorithms stored in `media_hashes.algorithm`. */
export const MediaHashAlgorithm = {
  SHA256: "SHA256",
  PHASH: "PHASH",
} as const;

export type MediaHashAlgorithm =
  (typeof MediaHashAlgorithm)[keyof typeof MediaHashAlgorithm];
