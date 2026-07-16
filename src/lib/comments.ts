import "server-only";
import type { CommentModel } from "@/generated/prisma/models";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import type { CommentDTO } from "./types";

export const MAX_COMMENT_LENGTH = 2000;

function toCommentDTO(
  comment: CommentModel,
  author: { userId: string; displayName: string; handle: string; avatarUrl: string | null },
  viewerId: string | null
): CommentDTO {
  return {
    id: comment.id,
    reviewId: comment.reviewId,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString(),
    author,
    isOwn: comment.userId === viewerId,
  };
}

/** All comments on a review, oldest first (conversation order). */
export async function getCommentsForReview(reviewId: string, viewerId: string | null): Promise<CommentDTO[]> {
  const comments = await prisma.comment.findMany({ where: { reviewId }, orderBy: { createdAt: "asc" } });
  const authors = await resolveReviewAuthors(comments.map((c) => c.userId));
  return comments.map((c) => toCommentDTO(c, authors.get(c.userId)!, viewerId));
}

export async function createComment(reviewId: string, userId: string, body: string): Promise<CommentDTO> {
  const comment = await prisma.comment.create({ data: { reviewId, userId, body } });
  const author = (await resolveReviewAuthors([userId])).get(userId)!;
  return toCommentDTO(comment, author, userId);
}

/** Removes all comments on a review — called when the review itself is deleted (no DB cascade). */
export async function deleteCommentsForReview(reviewId: string): Promise<void> {
  await prisma.comment.deleteMany({ where: { reviewId } });
}

/** Distinct userIds of everyone who has commented on a review — used to notify thread participants. */
export async function getCommentParticipants(reviewId: string): Promise<string[]> {
  const rows = await prisma.comment.findMany({ where: { reviewId }, select: { userId: true }, distinct: ["userId"] });
  return rows.map((r) => r.userId);
}
