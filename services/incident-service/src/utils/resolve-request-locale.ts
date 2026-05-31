import type { Request } from "express";
import { normalizeAppLocale, type AppLocale } from "@da2/constants";

/** Resolve `en` | `vi` from query `lang` or Accept-Language header. */
export function resolveRequestLocale(req: Request): AppLocale {
  const q = req.query?.lang;
  if (typeof q === "string" && q.trim()) {
    return normalizeAppLocale(q);
  }
  const accept = req.headers["accept-language"];
  if (typeof accept === "string" && accept.trim()) {
    return normalizeAppLocale(accept.split(",")[0]?.trim());
  }
  return "en";
}
