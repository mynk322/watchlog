import "server-only";
import { prisma } from "./prisma";

export async function likeReview(userId: string, reviewId: string): Promise<void> {
  await prisma.reviewLike.upsert({
    where: { userId_reviewId: { userId, reviewId } },
    create: { userId, reviewId },
    update: {},
  });
}

export async function unlikeReview(userId: string, reviewId: string): Promise<void> {
  await prisma.reviewLike
    .delete({ where: { userId_reviewId: { userId, reviewId } } })
    .catch(() => {}); // unliking something not liked is a no-op, not an error
}

/** Removes all likes for a review — called when the review itself is deleted (no DB cascade). */
export async function deleteLikesForReview(reviewId: string): Promise<void> {
  await prisma.reviewLike.deleteMany({ where: { reviewId } });
}

export interface ReviewLikeInfo {
  count: number;
  likedByViewer: boolean;
}

/** Batched like counts + the viewer's liked-state for a set of reviews. Reviews with no likes are absent from the map. */
export async function resolveLikes(reviewIds: string[], viewerId: string | null): Promise<Map<string, ReviewLikeInfo>> {
  const result = new Map<string, ReviewLikeInfo>();
  if (reviewIds.length === 0) return result;

  const [counts, viewerLikes] = await Promise.all([
    prisma.reviewLike.groupBy({ by: ["reviewId"], where: { reviewId: { in: reviewIds } }, _count: { reviewId: true } }),
    // A logged-out viewer has no likes of their own — skip the query entirely.
    viewerId
      ? prisma.reviewLike.findMany({ where: { userId: viewerId, reviewId: { in: reviewIds } }, select: { reviewId: true } })
      : Promise.resolve([] as { reviewId: string }[]),
  ]);

  const likedByViewer = new Set(viewerLikes.map((l) => l.reviewId));
  for (const id of reviewIds) result.set(id, { count: 0, likedByViewer: likedByViewer.has(id) });
  for (const row of counts) {
    result.set(row.reviewId, { count: row._count.reviewId, likedByViewer: likedByViewer.has(row.reviewId) });
  }
  return result;
}
