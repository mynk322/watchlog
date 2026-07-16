import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import type { NotificationDTO, NotificationType } from "./types";

const NOTIFICATION_LIMIT = 50;

/** Records a notification for `userId`, triggered by `actorId`. Self-triggered events are ignored. */
export async function createNotification(params: {
  userId: string;
  actorId: string;
  type: NotificationType;
  reviewId?: string | null;
}): Promise<void> {
  if (params.userId === params.actorId) return; // never notify yourself about your own action
  await prisma.notification.create({
    data: { userId: params.userId, actorId: params.actorId, type: params.type, reviewId: params.reviewId ?? null },
  });
}

function titleKey(tmdbId: number, mediaType: string): string {
  return `${tmdbId}:${mediaType}`;
}

/**
 * The recipient's most recent notifications, newest first. Each is enriched with the actor's
 * identity, and — for LIKE/COMMENT — the reviewed title's name plus a deep link. The link points
 * at the review author's profile (where the review and its thread are visible to anyone), so it
 * works whether the recipient is the review's author or just a thread participant. FOLLOW links to
 * the follower's profile.
 */
export async function getNotifications(userId: string): Promise<NotificationDTO[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATION_LIMIT,
  });

  const reviewIds = [...new Set(rows.map((r) => r.reviewId).filter((id): id is string => id != null))];
  const reviews = reviewIds.length
    ? await prisma.review.findMany({
        where: { id: { in: reviewIds } },
        select: { id: true, tmdbId: true, mediaType: true, userId: true },
      })
    : [];
  const reviewById = new Map(reviews.map((r) => [r.id, r]));

  // Resolve actors and review authors (for the deep link) in one identity lookup.
  const authors = await resolveReviewAuthors([...rows.map((r) => r.actorId), ...reviews.map((r) => r.userId)]);

  const titleRows = reviews.length
    ? await prisma.title.findMany({
        where: { OR: reviews.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType })) },
        select: { tmdbId: true, mediaType: true, title: true },
      })
    : [];
  const titleByKey = new Map<string, string>();
  for (const t of titleRows) titleByKey.set(titleKey(t.tmdbId, t.mediaType), t.title);

  return rows.map((r) => {
    const actor = authors.get(r.actorId)!;
    const review = r.reviewId ? reviewById.get(r.reviewId) : undefined;
    const reviewAuthor = review ? authors.get(review.userId) : undefined;
    const reviewTitle = review ? (titleByKey.get(titleKey(review.tmdbId, review.mediaType)) ?? null) : null;
    // LIKE/COMMENT → the review author's profile (review + thread live there); FOLLOW → the follower.
    const href = review && reviewAuthor ? `/u/${reviewAuthor.handle}` : `/u/${actor.handle}`;
    return {
      id: r.id,
      type: r.type as NotificationType,
      actor,
      reviewId: r.reviewId,
      reviewTitle,
      href,
      read: r.read,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
