import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import type { ActivityDTO, ActivityType, MediaType } from "./types";

const FEED_LIMIT = 60;

export interface RecordActivityInput {
  userId: string;
  type: ActivityType;
  tmdbId?: number | null;
  mediaType?: MediaType | null;
  title?: string | null;
  posterUrl?: string | null;
  releaseYear?: number | null;
  rating?: number | null;
  season?: number | null;
  listId?: string | null;
  listName?: string | null;
}

/**
 * Records a feed activity. Best-effort: it never throws, so a logging failure can't break the
 * mutation that triggered it (adding a title, rating, etc.).
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        userId: input.userId,
        type: input.type,
        tmdbId: input.tmdbId ?? null,
        mediaType: input.mediaType ?? null,
        title: input.title ?? null,
        posterUrl: input.posterUrl ?? null,
        releaseYear: input.releaseYear ?? null,
        rating: input.rating ?? null,
        season: input.season ?? null,
        listId: input.listId ?? null,
        listName: input.listName ?? null,
      },
    });
  } catch (err) {
    console.error("[recordActivity] failed", err);
  }
}

/** Recent activity from the people the viewer follows, newest first. */
export async function getActivityFeed(viewerId: string): Promise<ActivityDTO[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  if (following.length === 0) return [];

  const rows = await prisma.activity.findMany({
    where: { userId: { in: following.map((f) => f.followingId) } },
    orderBy: { createdAt: "desc" },
    take: FEED_LIMIT,
  });
  if (rows.length === 0) return [];

  const key = (t: number, m: MediaType) => `${t}:${m}`;
  const titleFilters = rows
    .filter((r) => r.tmdbId != null && r.mediaType != null)
    .map((r) => ({ tmdbId: r.tmdbId!, mediaType: r.mediaType! }));

  const [authors, linkTitles] = await Promise.all([
    resolveReviewAuthors(rows.map((r) => r.userId)),
    titleFilters.length
      ? prisma.title.findMany({ where: { OR: titleFilters }, select: { id: true, tmdbId: true, mediaType: true } })
      : Promise.resolve([]),
  ]);
  const linkIdByKey = new Map<string, string>();
  for (const t of linkTitles) if (!linkIdByKey.has(key(t.tmdbId, t.mediaType))) linkIdByKey.set(key(t.tmdbId, t.mediaType), t.id);

  return rows.map((r) => ({
    id: r.id,
    type: r.type as ActivityType,
    actor: authors.get(r.userId)!,
    createdAt: r.createdAt.toISOString(),
    tmdbId: r.tmdbId,
    mediaType: r.mediaType,
    title: r.title,
    posterUrl: r.posterUrl,
    releaseYear: r.releaseYear,
    rating: r.rating,
    season: r.season,
    titleId: r.tmdbId != null && r.mediaType != null ? (linkIdByKey.get(key(r.tmdbId, r.mediaType)) ?? null) : null,
    listId: r.listId,
    listName: r.listName,
  }));
}
