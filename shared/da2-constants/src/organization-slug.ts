/**
 * URL slug from an organization display name.
 *
 * Examples:
 *   "Mùa Hè Xanh" → "mua-he-xanh"
 *   "Câu lạc bộ ABC" → "cau-lac-bo-abc"
 *   "Fashion & Design 2026" → "fashion-design-2026"
 */
export function slugifyOrganizationName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "organization";
}

/**
 * First unused slug: `base`, then `base-2`, `base-3`, …
 */
export function nextUniqueOrganizationSlug(
  base: string,
  taken: ReadonlySet<string>,
  maxAttempts = 10_000,
): string {
  if (!taken.has(base)) {
    return base;
  }
  for (let n = 2; n <= maxAttempts; n += 1) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  throw new Error("organization_slug_exhausted");
}
