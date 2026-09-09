/**
 * Image content hashing.
 * SHA-256 is implemented; pHash remains a stub for later.
 */

import { createHash } from "node:crypto";

export function computeSha256(buffer: Buffer): string | null {
  if (!buffer || buffer.byteLength === 0) {
    return null;
  }
  return createHash("sha256").update(buffer).digest("hex");
}

export function computePHash(_buffer: Buffer): string | null {
  // TODO: implement perceptual hash
  return null;
}
