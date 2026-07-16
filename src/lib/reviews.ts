import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import { toReviewDTO } from "./dto";
import type { MediaType, ProfileDTO, ProfileReviewDTO, ReviewDTO } from "./types";

export async function getReviewsForTitle(tmdbId: number, mediaType: MediaType, viewerId: string): Promise<ReviewDTO[]> {
  const reviews = await prisma.review.findMany({
    where: { tmdbId, mediaType },
    orderBy: { createdAt: "desc" },
  });
  const authors = await resolveReviewAuthors(reviews.map((r) => r.userId));
  return reviews.map((r) => toReviewDTO(r, authors.get(r.userId)!, viewerId));
}

function titleKey(tmdbId: number, mediaType: MediaType): string {
  return `${tmdbId}:${mediaType}`;
}

/**
 * Loads a public profile page: the profile identity plus every review its owner has written,
 * newest first, each carrying the title it's about. Title rows are per-user, so title metadata
 * is resolved from whichever user's row has it, and viewerTitleId is set only for titles the
 * viewer themselves has added (so the card can deep-link into their own /t/[id]).
 * Returns null when no profile owns the handle.
 */
export async function getProfilePage(
  handle: string,
  viewerId: string
): Promise<{ profile: ProfileDTO; reviews: ProfileReviewDTO[] } | null> {
  const profile = await prisma.profile.findUnique({ where: { handle } });
  if (!profile) return null;

  const reviews = await prisma.review.findMany({
    where: { userId: profile.userId },
    orderBy: { createdAt: "desc" },
  });

  const author = (await resolveReviewAuthors([profile.userId])).get(profile.userId)!;

  // One query covers every distinct title the reviews reference; a review may outlive all
  // Title rows for its tmdbId (titles and reviews aren't FK-linked), so metadata can be absent.
  const distinctKeys = [...new Map(reviews.map((r) => [titleKey(r.tmdbId, r.mediaType), r])).values()];
  const titleRows = distinctKeys.length
    ? await prisma.title.findMany({
        where: { OR: distinctKeys.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType })) },
        select: { id: true, userId: true, tmdbId: true, mediaType: true, title: true, releaseYear: true, posterUrl: true },
      })
    : [];

  const metaByKey = new Map<string, { title: string; releaseYear: number | null; posterUrl: string | null }>();
  const viewerTitleIdByKey = new Map<string, string>();
  for (const t of titleRows) {
    const key = titleKey(t.tmdbId, t.mediaType);
    const existing = metaByKey.get(key);
    // Prefer a row that actually has a poster when multiple users hold the same title.
    if (!existing || (!existing.posterUrl && t.posterUrl)) {
      metaByKey.set(key, { title: t.title, releaseYear: t.releaseYear, posterUrl: t.posterUrl });
    }
    if (t.userId === viewerId) viewerTitleIdByKey.set(key, t.id);
  }

  const profileReviews: ProfileReviewDTO[] = reviews.map((r) => {
    const key = titleKey(r.tmdbId, r.mediaType);
    const meta = metaByKey.get(key);
    return {
      ...toReviewDTO(r, author, viewerId),
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

  return {
    profile: {
      userId: profile.userId,
      displayName: author.displayName,
      handle: author.handle,
      avatarUrl: author.avatarUrl,
      reviewCount: reviews.length,
    },
    reviews: profileReviews,
  };
}
