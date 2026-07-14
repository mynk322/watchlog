import "server-only";
import { posterUrl, backdropUrl } from "./tmdb-shared";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export type MediaType = "movie" | "tv";

export { posterUrl, backdropUrl, googleSearchUrl } from "./tmdb-shared";

export interface TmdbListItem {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  releaseYear: number | null;
  releaseDate: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string;
  voteAverage: number;
}

export interface TmdbDetails extends TmdbListItem {
  genres: string[];
  runtime: number | null;
  watchUrl: string | null;
}

function authHeaders(): HeadersInit {
  const token = process.env.TMDB_API_KEY;
  if (!token) {
    throw new Error("TMDB_API_KEY is not set");
  }
  return {
    Authorization: `Bearer ${token}`,
    accept: "application/json",
  };
}

async function tmdbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url, { headers: authHeaders(), next: { revalidate: 0 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`TMDB request failed (${res.status}): ${path} ${body}`);
  }
  return res.json() as Promise<T>;
}

interface RawMultiSearchResult {
  id: number;
  media_type: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview?: string;
  vote_average?: number;
}

function normalizeMulti(item: RawMultiSearchResult): TmdbListItem | null {
  if (item.media_type !== "movie" && item.media_type !== "tv") return null;
  const title = item.title ?? item.name ?? "Untitled";
  const dateStr = item.release_date || item.first_air_date || null;
  const releaseYear = dateStr ? Number(dateStr.slice(0, 4)) || null : null;
  return {
    tmdbId: item.id,
    mediaType: item.media_type,
    title,
    releaseYear,
    releaseDate: dateStr,
    posterUrl: posterUrl(item.poster_path),
    backdropUrl: backdropUrl(item.backdrop_path),
    overview: item.overview ?? "",
    voteAverage: item.vote_average ?? 0,
  };
}

export async function searchTitles(query: string): Promise<TmdbListItem[]> {
  if (!query.trim()) return [];
  const data = await tmdbFetch<{ results: RawMultiSearchResult[] }>("/search/multi", {
    query,
    include_adult: "false",
  });
  return data.results
    .map(normalizeMulti)
    .filter((item): item is TmdbListItem => item !== null)
    .sort((a, b) => b.voteAverage - a.voteAverage);
}

interface RawWatchProviderRegion {
  link: string;
}

/** Preferred watch-provider regions, in priority order: India first (primary audience), then US/UK as fallback. */
const WATCH_REGION_PRIORITY = ["IN", "US", "GB"];

async function getWatchLink(tmdbId: number, mediaType: MediaType): Promise<string | null> {
  try {
    const data = await tmdbFetch<{ results: Record<string, RawWatchProviderRegion> }>(
      `/${mediaType}/${tmdbId}/watch/providers`
    );
    for (const region of WATCH_REGION_PRIORITY) {
      const link = data.results?.[region]?.link;
      if (link) return link;
    }
    return Object.values(data.results ?? {})[0]?.link ?? null;
  } catch {
    return null;
  }
}

interface RawDetails {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview?: string;
  vote_average?: number;
  genres?: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  homepage?: string;
}

export async function getDetails(tmdbId: number, mediaType: MediaType): Promise<TmdbDetails> {
  const [raw, watchUrl] = await Promise.all([
    tmdbFetch<RawDetails>(`/${mediaType}/${tmdbId}`),
    getWatchLink(tmdbId, mediaType),
  ]);
  const title = raw.title ?? raw.name ?? "Untitled";
  const dateStr = raw.release_date || raw.first_air_date || null;
  const releaseYear = dateStr ? Number(dateStr.slice(0, 4)) || null : null;
  const runtime = raw.runtime ?? raw.episode_run_time?.[0] ?? null;
  return {
    tmdbId: raw.id,
    mediaType,
    title,
    releaseYear,
    releaseDate: dateStr,
    posterUrl: posterUrl(raw.poster_path),
    backdropUrl: backdropUrl(raw.backdrop_path),
    overview: raw.overview ?? "",
    voteAverage: raw.vote_average ?? 0,
    genres: raw.genres?.map((g) => g.name) ?? [],
    runtime,
    watchUrl: watchUrl ?? raw.homepage ?? null,
  };
}

export async function getTrending(window: "day" | "week" = "week"): Promise<TmdbListItem[]> {
  const data = await tmdbFetch<{ results: RawMultiSearchResult[] }>(`/trending/all/${window}`);
  return data.results
    .map(normalizeMulti)
    .filter((item): item is TmdbListItem => item !== null);
}
