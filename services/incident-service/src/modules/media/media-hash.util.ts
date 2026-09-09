/**
 * Image content hashing: SHA-256 (exact) and DCT pHash (perceptual).
 */

import { createHash } from "node:crypto";
import phash from "sharp-phash";

export function computeSha256(buffer: Buffer): string | null {
  if (!buffer || buffer.byteLength === 0) {
    return null;
  }
  return createHash("sha256").update(buffer).digest("hex");
}

/** Convert sharp-phash 64-char "01" string → 16-char lowercase hex. */
function binaryHashToHex(bits: string): string {
  let hex = "";
  for (let i = 0; i < bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

/**
 * DCT perceptual hash (classic pHash via sharp-phash).
 * Returns 16-char lowercase hex, or null on empty/invalid image.
 */
export async function computePHash(buffer: Buffer): Promise<string | null> {
  if (!buffer || buffer.byteLength === 0) {
    return null;
  }
  try {
    const bits = await phash(buffer);
    if (typeof bits !== "string" || bits.length !== 64 || !/^[01]+$/.test(bits)) {
      return null;
    }
    return binaryHashToHex(bits);
  } catch {
    return null;
  }
}
