import { createHash, randomBytes } from "crypto";

export const hashOpaqueToken = (plainToken: string): string =>
  createHash("sha256").update(plainToken, "utf8").digest("hex");

/** Cryptographically strong opaque token (store only `hashOpaqueToken` in the database). */
export const generateOpaqueToken = (): string =>
  randomBytes(32).toString("base64url");
