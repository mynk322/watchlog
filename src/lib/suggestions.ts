import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import { resolveTitleMeta } from "./title-meta";
import { createNotification } from "./notifications";
import type { MediaType, SuggestionDTO } from "./types";

export const MAX_SUGGESTION_MESSAGE = 500;

export type SendSuggestionResult = "sent" | "self" | "no-recipient" | "invalid";

/** One user recommends a title to another. Idempotent per (from, to, title): re-sending refreshes
 *  the note and un-dismisses it, and re-notifies. Metadata is snapshotted from any Title row. */
export async function sendSuggestion(
  fromUserId: string,
  toUserId: string,
  tmdbId: number,
  mediaType: MediaType,
  message: string | null
): Promise<SendSuggestionResult> {
  if (fromUserId === toUserId) return "self";
  if (message && message.length > MAX_SUGGESTION_MESSAGE) return "invalid";

  const recipient = await prisma.profile.findUnique({ where: { userId: toUserId }, select: { userId: true } });
  if (!recipient) return "no-recipient";

  const meta = await resolveTitleMeta(tmdbId, mediaType);
  const note = message?.trim() || null;

  await prisma.suggestion.upsert({
    where: { fromUserId_toUserId_tmdbId_mediaType: { fromUserId, toUserId, tmdbId, mediaType } },
    create: {
      fromUserId,
      toUserId,
      tmdbId,
      mediaType,
      title: meta.title,
      posterUrl: meta.posterUrl,
      releaseYear: meta.releaseYear,
      message: note,
    },
    update: { message: note, dismissedAt: null, createdAt: new Date() },
  });

  await createNotification({ userId: toUserId, actorId: fromUserId, type: "SUGGESTION", tmdbId, mediaType });
  return "sent";
}

/** The recipient's active (undismissed) suggestions, newest first, enriched for display. */
export async function getReceivedSuggestions(userId: string): Promise<SuggestionDTO[]> {
  const rows = await prisma.suggestion.findMany({
    where: { toUserId: userId, dismissedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (rows.length === 0) return [];

  const [authors, viewerTitles, linkTitles] = await Promise.all([
    resolveReviewAuthors(rows.map((r) => r.fromUserId)),
    prisma.title.findMany({
      where: { userId, OR: rows.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType })) },
      select: { tmdbId: true, mediaType: true },
    }),
    prisma.title.findMany({
      where: { OR: rows.map((r) => ({ tmdbId: r.tmdbId, mediaType: r.mediaType })) },
      select: { id: true, tmdbId: true, mediaType: true },
    }),
  ]);

  const key = (t: number, m: MediaType) => `${t}:${m}`;
  const inLibrary = new Set(viewerTitles.map((t) => key(t.tmdbId, t.mediaType)));
  const linkIdByKey = new Map<string, string>();
  for (const t of linkTitles) if (!linkIdByKey.has(key(t.tmdbId, t.mediaType))) linkIdByKey.set(key(t.tmdbId, t.mediaType), t.id);

  return rows.map((r) => ({
    id: r.id,
    from: authors.get(r.fromUserId)!,
    tmdbId: r.tmdbId,
    mediaType: r.mediaType,
    title: r.title,
    posterUrl: r.posterUrl,
    releaseYear: r.releaseYear,
    message: r.message,
    createdAt: r.createdAt.toISOString(),
    titleId: linkIdByKey.get(key(r.tmdbId, r.mediaType)) ?? null,
    inLibrary: inLibrary.has(key(r.tmdbId, r.mediaType)),
  }));
}

/** Count of active suggestions in the recipient's inbox, for a nav badge. */
export async function getReceivedSuggestionCount(userId: string): Promise<number> {
  return prisma.suggestion.count({ where: { toUserId: userId, dismissedAt: null } });
}

/** Dismisses a suggestion from the recipient's inbox. No-op if not theirs. */
export async function dismissSuggestion(userId: string, id: string): Promise<boolean> {
  const row = await prisma.suggestion.findUnique({ where: { id }, select: { toUserId: true } });
  if (!row || row.toUserId !== userId) return false;
  await prisma.suggestion.update({ where: { id }, data: { dismissedAt: new Date() } });
  return true;
}
