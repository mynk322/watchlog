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

/** The recipient's most recent notifications, newest first, with actor identities resolved. */
export async function getNotifications(userId: string): Promise<NotificationDTO[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: NOTIFICATION_LIMIT,
  });
  const actors = await resolveReviewAuthors(rows.map((r) => r.actorId));
  return rows.map((r) => ({
    id: r.id,
    type: r.type as NotificationType,
    actor: actors.get(r.actorId)!,
    reviewId: r.reviewId,
    read: r.read,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, read: false } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
