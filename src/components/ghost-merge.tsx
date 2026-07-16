"use client";

import { useEffect, useRef } from "react";
import { clearGhost, getGhostItems } from "@/lib/ghost-watchlist";

/**
 * Mounted inside <SignedIn> in the root layout. On the first signed-in render, it flushes any
 * browser-stored ghost watchlist to /api/titles/merge, then clears it and refreshes the grids.
 * Runs once per page load; leaves the ghost store intact on failure so it retries next time.
 */
export function GhostMerge() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const items = getGhostItems();
    if (items.length === 0) return;

    const payload = items.map((i) => ({ tmdbId: i.tmdbId, mediaType: i.mediaType, status: i.status }));

    (async () => {
      const res = await fetch("/api/titles/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      }).catch(() => null);
      if (res?.ok) {
        clearGhost();
        window.dispatchEvent(new CustomEvent("titles:changed"));
      }
    })();
  }, []);

  return null;
}
