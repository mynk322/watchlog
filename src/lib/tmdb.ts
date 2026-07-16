import "server-only";
import { prisma } from "./prisma";
import { posterUrl, backdropUrl } from "./tmdb-shared";

const TMDB_API_BASE = "https://api.themoviedb.org/3";

export type MediaType = "movie" | "tv";

export { posterUrl, backdropUrl, profileUrl, googleSearchUrl } from "./tmdb-shared";

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
  popularity: number;
}

export interface DirectorCredit {
  id: number;
  name: string;
  role: "Director" | "Creator";
  profilePath: string | null;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
}

export interface TmdbDetails extends TmdbListItem {
  genres: string[];
  runtime: number | null;
  watchUrl: string | null;
  numberOfSeasons: number | null;
  /** TV only — episode count per season, 1-indexed (index 0 = season 1). Excludes season 0 (specials). */
  seasonEpisodeCounts: number[];
  /** TV only — from `created_by`, already present on the details response at no extra call cost. */
  creators: DirectorCredit[];
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

interface RawSearchItem {
  id: number;
  media_type?: "movie" | "tv" | "person";
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview?: string;
  vote_average?: number;
  popularity?: number;
}

function normalizeItem(item: RawSearchItem, mediaType: MediaType): TmdbListItem {
  const title = item.title ?? item.name ?? "Untitled";
  const dateStr = item.release_date || item.first_air_date || null;
  const releaseYear = dateStr ? Number(dateStr.slice(0, 4)) || null : null;
  return {
    tmdbId: item.id,
    mediaType,
    title,
    releaseYear,
    releaseDate: dateStr,
    posterUrl: posterUrl(item.poster_path),
    backdropUrl: backdropUrl(item.backdrop_path),
    overview: item.overview ?? "",
    voteAverage: item.vote_average ?? 0,
    popularity: item.popularity ?? 0,
  };
}

function normalizeMulti(item: RawSearchItem): TmdbListItem | null {
  if (item.media_type !== "movie" && item.media_type !== "tv") return null;
  return normalizeItem(item, item.media_type);
}

/**
 * Search results are persisted in Postgres rather than kept in memory — TMDB's catalog for a
 * given query barely changes month to month, so there's no need to keep re-asking. A cache entry
 * is treated as stale (and re-fetched) only after 30 days.
 */
const SEARCH_CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

async function readSearchCache(key: string): Promise<TmdbListItem[] | null> {
  const entry = await prisma.searchCache.findUnique({ where: { query: key } });
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt.getTime() > SEARCH_CACHE_MAX_AGE_MS) return null;
  return entry.results as unknown as TmdbListItem[];
}

async function writeSearchCache(key: string, results: TmdbListItem[]): Promise<void> {
  await prisma.searchCache.upsert({
    where: { query: key },
    create: { query: key, results: results as unknown as object },
    update: { results: results as unknown as object, fetchedAt: new Date() },
  });
}

/**
 * TMDB's multi-search endpoint doesn't support a year filter, so a year-scoped search calls the
 * dedicated movie/tv search endpoints (which do) in parallel and merges the results, sorted by
 * popularity since there's no single relevance ordering across two separate result sets.
 */
export async function searchTitles(query: string, options: { year?: number } = {}): Promise<TmdbListItem[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const cacheKey = options.year ? `${trimmed.toLowerCase()}|y:${options.year}` : trimmed.toLowerCase();
  const cached = await readSearchCache(cacheKey);
  if (cached) return cached;

  let results: TmdbListItem[];
  if (options.year) {
    const [movies, tv] = await Promise.all([
      tmdbFetch<{ results: RawSearchItem[] }>("/search/movie", {
        query: trimmed,
        include_adult: "false",
        // primary_release_year (not year) — `year` matches any release date incl. re-releases,
        // which surfaced e.g. a 1984 result under a 2021 filter.
        primary_release_year: String(options.year),
      }),
      tmdbFetch<{ results: RawSearchItem[] }>("/search/tv", {
        query: trimmed,
        include_adult: "false",
        first_air_date_year: String(options.year),
      }),
    ]);
    results = [
      ...movies.results.map((r) => normalizeItem(r, "movie")),
      ...tv.results.map((r) => normalizeItem(r, "tv")),
    ].sort((a, b) => b.popularity - a.popularity);
  } else {
    const data = await tmdbFetch<{ results: RawSearchItem[] }>("/search/multi", {
      query: trimmed,
      include_adult: "false",
    });
    results = data.results.map(normalizeMulti).filter((item): item is TmdbListItem => item !== null);
  }

  await writeSearchCache(cacheKey, results);
  return results;
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
  popularity?: number;
  genres?: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  /** TMDB stopped populating episode_run_time for most TV shows; this is the fallback source for per-episode runtime. */
  last_episode_to_air?: { runtime?: number | null } | null;
  homepage?: string;
  number_of_seasons?: number;
  seasons?: { season_number: number; episode_count: number }[];
  created_by?: { id: number; name: string; profile_path: string | null }[];
}

/** Builds a 1-indexed (index 0 = season 1) episode-count array from TMDB's seasons list, dropping season 0 (specials). */
function extractSeasonEpisodeCounts(seasons: RawDetails["seasons"]): number[] {
  const numbered = (seasons ?? []).filter((s) => s.season_number >= 1);
  if (numbered.length === 0) return [];
  const maxSeason = Math.max(...numbered.map((s) => s.season_number));
  const counts = new Array(maxSeason).fill(0);
  for (const s of numbered) counts[s.season_number - 1] = s.episode_count;
  return counts;
}

export async function getDetails(tmdbId: number, mediaType: MediaType): Promise<TmdbDetails> {
  const [raw, watchUrl] = await Promise.all([
    tmdbFetch<RawDetails>(`/${mediaType}/${tmdbId}`),
    getWatchLink(tmdbId, mediaType),
  ]);
  const title = raw.title ?? raw.name ?? "Untitled";
  const dateStr = raw.release_date || raw.first_air_date || null;
  const releaseYear = dateStr ? Number(dateStr.slice(0, 4)) || null : null;
  const runtime = raw.runtime ?? raw.episode_run_time?.[0] ?? raw.last_episode_to_air?.runtime ?? null;
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
    popularity: raw.popularity ?? 0,
    genres: raw.genres?.map((g) => g.name) ?? [],
    runtime,
    watchUrl: watchUrl ?? raw.homepage ?? null,
    numberOfSeasons: mediaType === "tv" ? raw.number_of_seasons ?? null : null,
    seasonEpisodeCounts: mediaType === "tv" ? extractSeasonEpisodeCounts(raw.seasons) : [],
    creators:
      mediaType === "tv"
        ? (raw.created_by ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            role: "Creator" as const,
            profilePath: c.profile_path,
          }))
        : [],
  };
}

interface RawCredits {
  cast?: { id: number; name: string; character?: string; profile_path: string | null; order?: number }[];
  crew?: { id: number; name: string; job?: string; profile_path: string | null }[];
}

/**
 * Cast & crew are genuinely static once a title is released — callers fetch this once (at add
 * time, or a one-time cron backfill) and persist the result; there's no ongoing-refresh case.
 */
export async function getCredits(
  tmdbId: number,
  mediaType: MediaType
): Promise<{ cast: CastMember[]; directors: DirectorCredit[] }> {
  try {
    const data = await tmdbFetch<RawCredits>(`/${mediaType}/${tmdbId}/credits`);
    const cast = (data.cast ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
      .slice(0, 5)
      .map((c) => ({ id: c.id, name: c.name, character: c.character ?? "", profilePath: c.profile_path }));
    const directors =
      mediaType === "movie"
        ? (data.crew ?? [])
            .filter((c) => c.job === "Director")
            .slice(0, 2)
            .map((c) => ({ id: c.id, name: c.name, role: "Director" as const, profilePath: c.profile_path }))
        : [];
    return { cast, directors };
  } catch {
    return { cast: [], directors: [] };
  }
}

const TRENDING_CACHE_TTL_MS = 30 * 60 * 1000;
const trendingCacheStore = new Map<string, { data: TmdbListItem[]; expiresAt: number }>();

export async function getTrending(window: "day" | "week" = "week"): Promise<TmdbListItem[]> {
  const cached = trendingCacheStore.get(window);
  if (cached && Date.now() < cached.expiresAt) return cached.data;

  const data = await tmdbFetch<{ results: RawSearchItem[] }>(`/trending/all/${window}`);
  const results = data.results.map(normalizeMulti).filter((item): item is TmdbListItem => item !== null);

  trendingCacheStore.set(window, { data: results, expiresAt: Date.now() + TRENDING_CACHE_TTL_MS });
  return results;
}
