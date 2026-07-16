import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import { resolveLikes } from "./likes";
import type { MediaType } from "./types";

/** Public author identity shown on read-only pages. Deliberately no email/userId beyond the handle. */
export interface PublicAuthor {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
}

export interface PublicCommentDTO {
  id: string;
  body: string;
  createdAt: string;
  author: PublicAuthor;
}

export interface PublicTitleReviewDTO {
  id: string;
  author: PublicAuthor;
  rating: number | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  comments: PublicCommentDTO[];
}

/**
 * Reviews for a title, with their authors, like counts, and comment threads, for the logged-out
 * public page. Everything is read-only: no viewer-specific state (likedByViewer / isOwn) is
 * included, and there are no write affordances. Author identity is the same public info already
 * shown on /u/[handle].
 */
export async function getPublicTitleReviews(tmdbId: number, mediaType: MediaType): Promise<PublicTitleReviewDTO[]> {
  const reviews = await prisma.review.findMany({
    where: { tmdbId, mediaType },
    orderBy: { createdAt: "desc" },
  });
  if (reviews.length === 0) return [];

  const reviewIds = reviews.map((r) => r.id);
  const comments = await prisma.comment.findMany({
    where: { reviewId: { in: reviewIds } },
    orderBy: { createdAt: "asc" },
  });

  const [authors, likes] = await Promise.all([
    resolveReviewAuthors([...reviews.map((r) => r.userId), ...comments.map((c) => c.userId)]),
    resolveLikes(reviewIds, null),
  ]);

  const toAuthor = (userId: string): PublicAuthor => {
    const a = authors.get(userId)!;
    return { displayName: a.displayName, handle: a.handle, avatarUrl: a.avatarUrl };
  };

  const commentsByReview = new Map<string, PublicCommentDTO[]>();
  for (const c of comments) {
    const list = commentsByReview.get(c.reviewId) ?? [];
    list.push({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), author: toAuthor(c.userId) });
    commentsByReview.set(c.reviewId, list);
  }

  return reviews.map((r) => ({
    id: r.id,
    author: toAuthor(r.userId),
    rating: r.rating,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    likeCount: likes.get(r.id)?.count ?? 0,
    comments: commentsByReview.get(r.id) ?? [],
  }));
}
