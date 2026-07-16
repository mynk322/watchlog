import "server-only";
import { prisma } from "./prisma";
import { resolveReviewAuthors } from "./profile";
import { resolveTitleMeta } from "./title-meta";
import { recordActivity } from "./activity";
import type {
  ListDetailDTO,
  ListItemDTO,
  ListMembershipDTO,
  ListSummaryDTO,
  MediaType,
} from "./types";

export const MAX_LISTS_PER_USER = 50;
export const MAX_ITEMS_PER_LIST = 500;
export const MAX_LIST_NAME = 100;
export const MAX_LIST_DESCRIPTION = 500;
export const MAX_ITEM_NOTE = 500;

const PREVIEW_POSTER_COUNT = 4;

function key(tmdbId: number, mediaType: MediaType): string {
  return `${tmdbId}:${mediaType}`;
}

export type CreateListResult = { id: string } | "at-limit" | "invalid";

export async function createList(
  userId: string,
  name: string,
  description: string | null
): Promise<CreateListResult> {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_LIST_NAME) return "invalid";
  if (description && description.length > MAX_LIST_DESCRIPTION) return "invalid";

  const count = await prisma.list.count({ where: { userId } });
  if (count >= MAX_LISTS_PER_USER) return "at-limit";

  const list = await prisma.list.create({
    data: { userId, name: trimmed, description: description?.trim() || null },
    select: { id: true },
  });
  await recordActivity({ userId, type: "LIST_CREATED", listId: list.id, listName: trimmed });
  return { id: list.id };
}

/** Updates a list's name/description. Returns false if the list isn't owned by userId or input is invalid. */
export async function updateList(
  userId: string,
  listId: string,
  patch: { name?: string; description?: string | null }
): Promise<boolean> {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list || list.userId !== userId) return false;

  const data: { name?: string; description?: string | null } = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed || trimmed.length > MAX_LIST_NAME) return false;
    data.name = trimmed;
  }
  if (patch.description !== undefined) {
    if (patch.description && patch.description.length > MAX_LIST_DESCRIPTION) return false;
    data.description = patch.description?.trim() || null;
  }
  if (Object.keys(data).length === 0) return true;

  await prisma.list.update({ where: { id: listId }, data });
  return true;
}

/** Deletes a list and all its items. No-op (returns false) if not owned by userId. */
export async function deleteList(userId: string, listId: string): Promise<boolean> {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list || list.userId !== userId) return false;
  await prisma.$transaction([
    prisma.listItem.deleteMany({ where: { listId } }),
    prisma.list.delete({ where: { id: listId } }),
  ]);
  return true;
}

export type AddToListResult = "added" | "already" | "not-owner" | "at-limit";

/** Adds a title to a list (idempotent), appending it to the end. Only the list owner may add. */
export async function addToList(
  userId: string,
  listId: string,
  tmdbId: number,
  mediaType: MediaType,
  note?: string | null
): Promise<AddToListResult> {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list || list.userId !== userId) return "not-owner";

  const existing = await prisma.listItem.findUnique({
    where: { listId_tmdbId_mediaType: { listId, tmdbId, mediaType } },
    select: { id: true },
  });
  if (existing) return "already";

  const count = await prisma.listItem.count({ where: { listId } });
  if (count >= MAX_ITEMS_PER_LIST) return "at-limit";

  const meta = await resolveTitleMeta(tmdbId, mediaType);
  const max = await prisma.listItem.aggregate({ where: { listId }, _max: { position: true } });
  const position = (max._max.position ?? -1) + 1;

  await prisma.$transaction([
    prisma.listItem.create({
      data: {
        listId,
        tmdbId,
        mediaType,
        title: meta.title,
        posterUrl: meta.posterUrl,
        releaseYear: meta.releaseYear,
        note: note?.trim() || null,
        position,
      },
    }),
    prisma.list.update({ where: { id: listId }, data: { updatedAt: new Date() } }),
  ]);
  return "added";
}

/** Removes a title from a list. No-op if not owned or not present. */
export async function removeFromList(
  userId: string,
  listId: string,
  tmdbId: number,
  mediaType: MediaType
): Promise<boolean> {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list || list.userId !== userId) return false;
  await prisma.listItem
    .delete({ where: { listId_tmdbId_mediaType: { listId, tmdbId, mediaType } } })
    .catch(() => {}); // removing something not present is a no-op
  await prisma.list.update({ where: { id: listId }, data: { updatedAt: new Date() } });
  return true;
}

/** Reorders a list to match the given item-id order. Ignores ids not in the list. Owner only. */
export async function reorderList(userId: string, listId: string, orderedItemIds: string[]): Promise<boolean> {
  const list = await prisma.list.findUnique({ where: { id: listId }, select: { userId: true } });
  if (!list || list.userId !== userId) return false;

  const items = await prisma.listItem.findMany({ where: { listId }, select: { id: true } });
  const valid = new Set(items.map((i) => i.id));
  const ordered = orderedItemIds.filter((id) => valid.has(id));

  await prisma.$transaction([
    ...ordered.map((id, i) => prisma.listItem.update({ where: { id }, data: { position: i } })),
    prisma.list.update({ where: { id: listId }, data: { updatedAt: new Date() } }),
  ]);
  return true;
}

/** All of a user's lists, newest-updated first, with a poster preview and item count. */
export async function getListsForUser(ownerUserId: string, viewerId: string | null): Promise<ListSummaryDTO[]> {
  const lists = await prisma.list.findMany({
    where: { userId: ownerUserId },
    orderBy: { updatedAt: "desc" },
  });
  if (lists.length === 0) return [];

  const items = await prisma.listItem.findMany({
    where: { listId: { in: lists.map((l) => l.id) } },
    orderBy: [{ listId: "asc" }, { position: "asc" }],
    select: { listId: true, posterUrl: true },
  });
  const byList = new Map<string, { count: number; posters: string[] }>();
  for (const l of lists) byList.set(l.id, { count: 0, posters: [] });
  for (const it of items) {
    const agg = byList.get(it.listId)!;
    agg.count += 1;
    if (it.posterUrl && agg.posters.length < PREVIEW_POSTER_COUNT) agg.posters.push(it.posterUrl);
  }

  return lists.map((l) => {
    const agg = byList.get(l.id)!;
    return {
      id: l.id,
      name: l.name,
      description: l.description,
      itemCount: agg.count,
      previewPosters: agg.posters,
      updatedAt: l.updatedAt.toISOString(),
      isOwn: viewerId === ownerUserId,
    };
  });
}

/** A single list with its ordered items and owner identity. viewerTitleId deep-links owned titles. */
export async function getList(listId: string, viewerId: string | null): Promise<ListDetailDTO | null> {
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list) return null;

  const [items, authors] = await Promise.all([
    prisma.listItem.findMany({ where: { listId }, orderBy: { position: "asc" } }),
    resolveReviewAuthors([list.userId]),
  ]);

  const viewerTitles = viewerId
    ? await prisma.title.findMany({
        where: { userId: viewerId, OR: items.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType })) },
        select: { id: true, tmdbId: true, mediaType: true },
      })
    : [];
  const viewerTitleIdByKey = new Map(viewerTitles.map((t) => [key(t.tmdbId, t.mediaType), t.id]));

  const itemDtos: ListItemDTO[] = items.map((i) => ({
    id: i.id,
    tmdbId: i.tmdbId,
    mediaType: i.mediaType,
    title: i.title,
    posterUrl: i.posterUrl,
    releaseYear: i.releaseYear,
    note: i.note,
    position: i.position,
    viewerTitleId: viewerTitleIdByKey.get(key(i.tmdbId, i.mediaType)) ?? null,
  }));

  return {
    id: list.id,
    name: list.name,
    description: list.description,
    updatedAt: list.updatedAt.toISOString(),
    owner: authors.get(list.userId)!,
    isOwn: viewerId === list.userId,
    items: itemDtos,
  };
}

/** The viewer's own lists, each flagged with whether it already contains the given title. */
export async function getListMembershipForTitle(
  userId: string,
  tmdbId: number,
  mediaType: MediaType
): Promise<ListMembershipDTO[]> {
  const lists = await prisma.list.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
  if (lists.length === 0) return [];

  const containing = await prisma.listItem.findMany({
    where: { tmdbId, mediaType, listId: { in: lists.map((l) => l.id) } },
    select: { listId: true },
  });
  const containingIds = new Set(containing.map((c) => c.listId));

  return lists.map((l) => ({ id: l.id, name: l.name, contains: containingIds.has(l.id) }));
}
