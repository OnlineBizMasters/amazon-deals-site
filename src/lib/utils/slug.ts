/** Converts arbitrary text into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * Returns a slug that does not collide with anything `exists` reports as taken.
 * Suffixes are numeric so URLs stay readable (`nike-20-off`, `nike-20-off-2`).
 */
export function uniqueSlug(base: string, exists: (candidate: string) => boolean): string {
  const root = slugify(base) || "offer";
  if (!exists(root)) return root;

  for (let i = 2; i < 500; i += 1) {
    const candidate = `${root}-${i}`;
    if (!exists(candidate)) return candidate;
  }

  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Normalises a merchant name so that "Nike ", "NIKE" and "nike" resolve to the
 * same merchant during imports.
 */
export function merchantKey(name: string): string {
  return slugify(name);
}
