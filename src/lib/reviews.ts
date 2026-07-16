import "server-only";
import type { ReviewModel } from "@/generated/prisma/models";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import { resolveLikes } from "./likes";
import { toPublicReviewDTO, toReviewDTO } from "./dto";
import type { MediaType, ProfileDTO, ProfileReviewDTO, PublicReviewDTO, ReviewDTO } from "./types";

export async function getReviewsForTitle(tmdbId: number, mediaType: MediaType, viewerId: string): Promise<ReviewDTO[]> {
  const reviews = await prisma.review.findMany({
    where: { tmdbId, mediaType },
    orderBy: { createdAt: "desc" },
  });
  const [authors, likes] = await Promise.all([
    resolveReviewAuthors(reviews.map((r) => r.userId)),
    resolveLikes(reviews.map((r) => r.id), viewerId),
  ]);
  return reviews.map((r) => toReviewDTO(r, authors.get(r.userId)!, viewerId, likes.get(r.id)));
}

/**
 * Reviews for a title, stripped of all author identity, for the logged-out public share page.
 * Skips the Clerk author/avatar resolution entirely — nothing identifying reaches the client.
 */
export async function getPublicReviewsForTitle(tmdbId: number, mediaType: MediaType): Promise<PublicReviewDTO[]> {
  const reviews = await prisma.review.findMany({
    where: { tmdbId, mediaType },
    orderBy: { createdAt: "desc" },
  });
  return reviews.map(toPublicReviewDTO);
}

function titleKey(tmdbId: number, mediaType: MediaType): string {
  return `${tmdbId}:${mediaType}`;
}

/**
 * Turns raw Review rows into display DTOs carrying both author and title. Title rows are per-user,
 * so title metadata is resolved from whichever user's row has it, and viewerTitleId is set only for
 * titles the viewer has added (so a card can deep-link into their own /t/[id]). A review can outlive
 * every Title row for its tmdbId (they aren't FK-linked), so metadata may be absent.
 */
async function buildProfileReviews(reviews: ReviewModel[], viewerId: string | null): Promise<ProfileReviewDTO[]> {
  if (reviews.length === 0) return [];

  const distinctKeys = [...new Map(reviews.map((r) => [titleKey(r.tmdbId, r.mediaType), r])).values()];
  const [authors, likes, titleRows] = await Promise.all([
    resolveReviewAuthors(reviews.map((r) => r.userId)),
    resolveLikes(reviews.map((r) => r.id), viewerId),
    prisma.title.findMany({
      where: { OR: distinctKeys.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType })) },
      select: { id: true, userId: true, tmdbId: true, mediaType: true, title: true, releaseYear: true, posterUrl: true },
    }),
  ]);

  const metaByKey = new Map<string, { title: string; releaseYear: number | null; posterUrl: string | null }>();
  const viewerTitleIdByKey = new Map<string, string>();
  for (const t of titleRows) {
    const key = titleKey(t.tmdbId, t.mediaType);
    const existing = metaByKey.get(key);
    // Prefer a row that actually has a poster when multiple users hold the same title.
    if (!existing || (!existing.posterUrl && t.posterUrl)) {
      metaByKey.set(key, { title: t.title, releaseYear: t.releaseYear, posterUrl: t.posterUrl });
    }
    if (viewerId && t.userId === viewerId) viewerTitleIdByKey.set(key, t.id);
  }

  return reviews.map((r) => {
    const key = titleKey(r.tmdbId, r.mediaType);
    const meta = metaByKey.get(key);
    return {
      ...toReviewDTO(r, authors.get(r.userId)!, viewerId, likes.get(r.id)),
      title: {
        tmdbId: r.tmdbId,
        mediaType: r.mediaType,
        title: meta?.title ?? "Title unavailable",
        releaseYear: meta?.releaseYear ?? null,
        posterUrl: meta?.posterUrl ?? null,
        viewerTitleId: viewerTitleIdByKey.get(key) ?? null,
      },
    };
  });
}

/**
 * Loads a public profile page: the profile identity plus every review its owner has written,
 * newest first. Returns null when no profile owns the handle.
 */
export async function getProfilePage(
  handle: string,
  viewerId: string | null
): Promise<{ profile: ProfileDTO; reviews: ProfileReviewDTO[] } | null> {
  const profile = await prisma.profile.findUnique({ where: { handle } });
  if (!profile) return null;

  const reviews = await prisma.review.findMany({
    where: { userId: profile.userId },
    orderBy: { createdAt: "desc" },
  });

  const author = (await resolveReviewAuthors([profile.userId])).get(profile.userId)!;
  const profileReviews = await buildProfileReviews(reviews, viewerId);

  const rated = reviews.filter((r) => r.rating != null);
  const avgRating = rated.length ? rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length : null;
  // buildProfileReviews already resolved per-review like counts — sum them rather than re-querying.
  const likesReceived = profileReviews.reduce((sum, r) => sum + r.likeCount, 0);

  return {
    profile: {
      userId: profile.userId,
      displayName: author.displayName,
      handle: author.handle,
      avatarUrl: author.avatarUrl,
      bio: profile.bio,
      reviewCount: reviews.length,
      avgRating: avgRating == null ? null : Math.round(avgRating * 10) / 10,
      likesReceived,
    },
    reviews: profileReviews,
  };
}

const FEED_LIMIT = 100;

/** Reviews written by the users the viewer follows, newest first. Empty when the viewer follows no one. */
export async function getFeedReviews(viewerId: string): Promise<ProfileReviewDTO[]> {
  const following = await prisma.follow.findMany({
    where: { followerId: viewerId },
    select: { followingId: true },
  });
  if (following.length === 0) return [];

  const reviews = await prisma.review.findMany({
    where: { userId: { in: following.map((f) => f.followingId) } },
    orderBy: { createdAt: "desc" },
    take: FEED_LIMIT,
  });
  return buildProfileReviews(reviews, viewerId);
}
