const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

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
