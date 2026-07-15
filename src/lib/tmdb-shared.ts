const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export const MIN_YEAR = 1900;
export const MAX_YEAR = new Date().getFullYear() + 2;

/** 4-digit year within a sane range, or undefined if empty/incomplete/out of range. */
export function parseYear(raw: string | null | undefined): number | undefined {
  if (!raw || !/^\d{4}$/.test(raw)) return undefined;
  const year = Number(raw);
  return year >= MIN_YEAR && year <= MAX_YEAR ? year : undefined;
}

/** Highest-resolution poster TMDB serves. Safe to import from client components. */
export function posterUrl(path: string | null, size: "w500" | "original" = "original") {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Highest-resolution backdrop TMDB serves. Safe to import from client components. */
export function backdropUrl(path: string | null, size: "w1280" | "original" = "original") {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Cast/crew profile photo. Safe to import from client components. */
export function profileUrl(path: string | null, size: "w185" | "h632" = "w185") {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Google search fallback for titles without a known watch link. */
export function googleSearchUrl(title: string, releaseYear: number | null) {
  const q = `watch ${title}${releaseYear ? ` ${releaseYear}` : ""}`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
