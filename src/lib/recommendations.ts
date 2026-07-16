import "server-only";
import { prisma } from "./prisma";
import { getRecommendations as tmdbRecommendations, type TmdbListItem } from "./tmdb";
import { getTrendingItems } from "./trending";
import { toTmdbMediaType } from "./dto";
import type { MediaType, TrendingDTO } from "./types";

// Seeding from more than a handful of titles adds TMDB calls for diminishing signal.
const MAX_SEEDS = 6;
const MAX_RESULTS = 30;
const CACHE_TTL_MS = 30 * 60 * 1000;

export interface RecommendationResult {
  items: TrendingDTO[];
  /** True when tailored to the user's ratings; false when we fell back to trending. */
  personalized: boolean;
}

// Per-user in-memory cache keyed by a signature of the seed set, so recomputation only happens
// when the user's watched/rated titles actually change (or the TTL lapses).
const cache = new Map<string, { result: RecommendationResult; expiresAt: number }>();

function ownedKey(tmdbId: number, mediaType: MediaType): string {
  return `${tmdbId}:${mediaType}`;
}

function toDTO(item: TmdbListItem): TrendingDTO {
  return {
    tmdbId: item.tmdbId,
    mediaType: item.mediaType === "tv" ? "TV" : "MOVIE",
    title: item.title,
    releaseYear: item.releaseYear,
    posterUrl: item.posterUrl,
    backdropUrl: item.backdropUrl,
    overview: item.overview,
    voteAverage: item.voteAverage,
    alreadyAdded: null,
  };
}

async function trendingFallback(ownedKeys: Set<string>): Promise<TrendingDTO[]> {
  const items = await getTrendingItems();
  return items
    .filter((i) => !ownedKeys.has(ownedKey(i.tmdbId, i.mediaType)))
    .slice(0, MAX_RESULTS)
    .map((i) => ({
      tmdbId: i.tmdbId,
      mediaType: i.mediaType,
      title: i.title,
      releaseYear: i.releaseYear,
      posterUrl: i.posterUrl,
      backdropUrl: i.backdropUrl,
      overview: i.overview ?? "",
      voteAverage: i.voteAverage ?? 0,
      alreadyAdded: null,
    }));
}

/**
 * Personalized recommendations. We seed from the user's highest-rated watched titles, pull TMDB's
 * recommendations for each, and aggregate: a candidate's score is the sum, over every seed that
 * recommended it, of (seed rating) × (that seed's rank weight) × (the candidate's position weight).
 * So titles that show up across several of your favourites — and higher up each list — rise to the
 * top. Titles you already have are excluded; ties break on TMDB rating. New users get trending.
 */
export async function getRecommendationsForUser(userId: string): Promise<RecommendationResult> {
  const owned = await prisma.title.findMany({
    where: { userId },
    select: { tmdbId: true, mediaType: true, status: true, rating: true, watchedAt: true },
  });
  const ownedKeys = new Set(owned.map((t) => ownedKey(t.tmdbId, t.mediaType)));

  const seeds = owned
    .filter((t) => t.status === "WATCHED")
    .sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.watchedAt?.getTime() ?? 0) - (a.watchedAt?.getTime() ?? 0)
    )
    .slice(0, MAX_SEEDS);

  if (seeds.length === 0) {
    return { items: await trendingFallback(ownedKeys), personalized: false };
  }

  // Signature includes the user, their seeds and ratings — so a fresh rating invalidates the cache.
  const signature = `${userId}|${seeds.map((s) => `${s.tmdbId}:${s.mediaType}:${s.rating ?? ""}`).join(",")}`;
  const hit = cache.get(signature);
  if (hit && hit.expiresAt > Date.now()) return hit.result;

  const perSeed = await Promise.all(
    seeds.map(async (seed, idx) => {
      const recs = await tmdbRecommendations(seed.tmdbId, toTmdbMediaType(seed.mediaType));
      // Higher-rated seeds (and earlier ones in the sorted list) carry more weight.
      const seedWeight = ((seed.rating ?? 3) / 5) * (1 - idx * 0.08);
      return { recs, seedWeight };
    })
  );

  const scored = new Map<string, { item: TmdbListItem; score: number }>();
  for (const { recs, seedWeight } of perSeed) {
    recs.forEach((rec, rank) => {
      const key = ownedKey(rec.tmdbId, rec.mediaType === "tv" ? "TV" : "MOVIE");
      if (ownedKeys.has(key)) return;
      const positionWeight = 1 / (1 + rank * 0.1);
      const delta = seedWeight * positionWeight;
      const prev = scored.get(key);
      if (prev) prev.score += delta;
      else scored.set(key, { item: rec, score: delta });
    });
  }

  const ranked = [...scored.values()]
    .sort((a, b) => b.score - a.score || b.item.voteAverage - a.item.voteAverage)
    .slice(0, MAX_RESULTS)
    .map(({ item }) => toDTO(item));

  // No usable TMDB recs (e.g. TMDB down) — don't show an empty section.
  if (ranked.length === 0) {
    return { items: await trendingFallback(ownedKeys), personalized: false };
  }

  const result: RecommendationResult = { items: ranked, personalized: true };
  cache.set(signature, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
