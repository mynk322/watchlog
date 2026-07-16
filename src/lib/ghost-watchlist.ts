import type { MediaType, TitleStatus } from "./types";

/**
 * A logged-out ("ghost") visitor's watchlist, stored in the browser only. It holds enough metadata
 * to render the list offline, and enough identity ({tmdbId, mediaType, status}) to replay each item
 * through /api/titles/merge when the visitor signs in. No server row exists until then.
 */
export interface GhostItem {
  tmdbId: number;
  mediaType: MediaType;
  status: TitleStatus;
  title: string;
  posterUrl: string | null;
  /** ISO timestamp; used only for display ordering. */
  addedAt: string;
}

const STORAGE_KEY = "watchlog:ghost-watchlist";
export const GHOST_CHANGED_EVENT = "ghost:changed";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getGhostItems(): GhostItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GhostItem[]) : [];
  } catch {
    return [];
  }
}

const EMPTY: GhostItem[] = [];
let cachedRaw: string | null = null;
let cachedItems: GhostItem[] = EMPTY;

/**
 * Stable-reference snapshot for `useSyncExternalStore`: returns the same array instance until the
 * underlying localStorage string changes, so React doesn't loop on a fresh array every render.
 */
export function getGhostSnapshot(): GhostItem[] {
  if (!isBrowser()) return EMPTY;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedItems;
  cachedRaw = raw;
  cachedItems = getGhostItems();
  return cachedItems;
}

/** Server snapshot for `useSyncExternalStore` — always the stable empty array. */
export function getGhostServerSnapshot(): GhostItem[] {
  return EMPTY;
}

function write(items: GhostItem[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  // Notify same-tab listeners (the storage event only fires in *other* tabs).
  window.dispatchEvent(new CustomEvent(GHOST_CHANGED_EVENT));
}

function sameTitle(a: { tmdbId: number; mediaType: MediaType }, b: { tmdbId: number; mediaType: MediaType }): boolean {
  return a.tmdbId === b.tmdbId && a.mediaType === b.mediaType;
}

/** Adds (or updates the status of) a title. Deduped by tmdbId+mediaType. */
export function addGhostItem(item: Omit<GhostItem, "addedAt">): void {
  const items = getGhostItems();
  const existing = items.find((i) => sameTitle(i, item));
  if (existing) {
    existing.status = item.status;
    write(items);
    return;
  }
  write([{ ...item, addedAt: new Date().toISOString() }, ...items]);
}

export function removeGhostItem(tmdbId: number, mediaType: MediaType): void {
  write(getGhostItems().filter((i) => !sameTitle(i, { tmdbId, mediaType })));
}

export function hasGhostItem(tmdbId: number, mediaType: MediaType): boolean {
  return getGhostItems().some((i) => sameTitle(i, { tmdbId, mediaType }));
}

export function clearGhost(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(GHOST_CHANGED_EVENT));
}

/** Subscribe to ghost-store changes (same tab and other tabs). Returns an unsubscribe fn. */
export function subscribeGhost(callback: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener(GHOST_CHANGED_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(GHOST_CHANGED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}
