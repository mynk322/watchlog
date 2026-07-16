"use client";

import { useState, useSyncExternalStore } from "react";
import { useAuth } from "@clerk/nextjs";
import { Plus, Check, Loader2 } from "lucide-react";
import {
  addGhostItem,
  getGhostServerSnapshot,
  getGhostSnapshot,
  removeGhostItem,
  subscribeGhost,
} from "@/lib/ghost-watchlist";
import type { MediaType } from "@/lib/types";

interface AddToWatchlistButtonProps {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
}

/**
 * Dual-mode "Add to Watchlist". Signed in → real POST to /api/titles. Signed out → the title is
 * saved to the browser-only ghost watchlist, which merges into the account on the next login.
 */
export function AddToWatchlistButton({ tmdbId, mediaType, title, posterUrl }: AddToWatchlistButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [addedSignedIn, setAddedSignedIn] = useState(false);
  const [pending, setPending] = useState(false);

  // Logged-out state comes straight from the ghost store, kept in sync across tabs.
  const ghostItems = useSyncExternalStore(subscribeGhost, getGhostSnapshot, getGhostServerSnapshot);
  const inGhostList = ghostItems.some((i) => i.tmdbId === tmdbId && i.mediaType === mediaType);
  const added = isSignedIn ? addedSignedIn : inGhostList;

  async function handleClick() {
    if (pending) return;

    if (!isSignedIn) {
      if (inGhostList) removeGhostItem(tmdbId, mediaType);
      else addGhostItem({ tmdbId, mediaType, status: "WATCHLIST", title, posterUrl });
      return; // the external store updates `inGhostList`
    }

    if (added) return; // signed-in add is one-way here; manage it from the grids afterwards
    setPending(true);
    try {
      const res = await fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, mediaType, status: "WATCHLIST" }),
      }).catch(() => null);
      if (res?.ok) {
        setAddedSignedIn(true);
        window.dispatchEvent(new CustomEvent("titles:changed"));
      }
    } finally {
      setPending(false);
    }
  }

  // Avoid a label flash before Clerk resolves auth state.
  if (!isLoaded) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-muted">
        <Loader2 size={16} className="animate-spin" />
        Watchlist
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-60 cursor-pointer"
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : added ? (
        <Check size={16} className="text-accent" />
      ) : (
        <Plus size={16} />
      )}
      {added ? (isSignedIn ? "Added" : "In your list") : "Watchlist"}
    </button>
  );
}
