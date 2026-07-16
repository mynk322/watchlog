import "server-only";
import { prisma } from "./prisma";
import type { FavoriteTitleDTO, MediaType } from "./types";

export const MAX_FAVORITES = 12;

export type AddFavoriteResult = "added" | "no-title" | "at-limit";

/**
 * Pins one of the user's own titles to their profile. Metadata is copied from the user's Title row,
 * so you can only favorite a title you've actually added. Idempotent, and capped at MAX_FAVORITES.
 */
export async function addFavorite(userId: string, tmdbId: number, mediaType: MediaType): Promise<AddFavoriteResult> {
  const title = await prisma.title.findUnique({
    where: { tmdbId_mediaType_userId: { tmdbId, mediaType, userId } },
    select: { title: true, posterUrl: true, releaseYear: true },
  });
  if (!title) return "no-title";

  const already = await prisma.profileFavorite.findUnique({
    where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
  });
  if (!already) {
    const count = await prisma.profileFavorite.count({ where: { userId } });
    if (count >= MAX_FAVORITES) return "at-limit";
  }

  await prisma.profileFavorite.upsert({
    where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
    create: { userId, tmdbId, mediaType, title: title.title, posterUrl: title.posterUrl, releaseYear: title.releaseYear },
    update: { title: title.title, posterUrl: title.posterUrl, releaseYear: title.releaseYear },
  });
  return "added";
}

export async function removeFavorite(userId: string, tmdbId: number, mediaType: MediaType): Promise<void> {
  await prisma.profileFavorite
    .delete({ where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } } })
    .catch(() => {}); // un-pinning something not pinned is a no-op
}

export async function isFavorited(userId: string, tmdbId: number, mediaType: MediaType): Promise<boolean> {
  const row = await prisma.profileFavorite.findUnique({
    where: { userId_tmdbId_mediaType: { userId, tmdbId, mediaType } },
  });
  return row !== null;
}

/**
 * A profile's pinned favorites, newest first. viewerTitleId is set only for titles the viewer has
 * added, so the card can deep-link into the viewer's own /t/[id].
 */
export async function getFavorites(profileUserId: string, viewerId: string | null): Promise<FavoriteTitleDTO[]> {
  const favorites = await prisma.profileFavorite.findMany({
    where: { userId: profileUserId },
    orderBy: { createdAt: "desc" },
  });
  if (favorites.length === 0) return [];

  // Which of these does the viewer own (for linking)?
  const viewerTitles = viewerId
    ? await prisma.title.findMany({
        where: { userId: viewerId, OR: favorites.map((f) => ({ tmdbId: f.tmdbId, mediaType: f.mediaType })) },
        select: { id: true, tmdbId: true, mediaType: true },
      })
    : [];
  const viewerTitleIdByKey = new Map(viewerTitles.map((t) => [`${t.tmdbId}:${t.mediaType}`, t.id]));

  return favorites.map((f) => ({
    tmdbId: f.tmdbId,
    mediaType: f.mediaType,
    title: f.title,
    posterUrl: f.posterUrl,
    releaseYear: f.releaseYear,
    viewerTitleId: viewerTitleIdByKey.get(`${f.tmdbId}:${f.mediaType}`) ?? null,
  }));
}
