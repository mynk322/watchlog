"use client";

import { useEffect, useState } from "react";
import { Bookmark, Eye, Check } from "lucide-react";
import { PosterCard } from "./poster-card";
import { PillButton } from "./pill-button";
import { titleHref } from "@/lib/tmdb-shared";
import type { TrendingDTO, TitleStatus } from "@/lib/types";

// Manual "Load more" (no auto-infinite-scroll). 18 reads well on mobile (2-col) and desktop (6-col).
const INITIAL_VISIBLE = 18;
const STEP = 18;

export function RecommendationsRow() {
  const [items, setItems] = useState<TrendingDTO[]>([]);
  const [personalized, setPersonalized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/recommendations", { cache: "no-store" }).catch(() => null);
      if (res && res.ok && !cancelled) {
        const data = await res.json();
        setItems(data.items ?? []);
        setPersonalized(Boolean(data.personalized));
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function addTitle(item: TrendingDTO, status: TitleStatus) {
    const key = `${item.tmdbId}-${item.mediaType}`;
    setPending(key);
    try {
      const res = await fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: item.tmdbId, mediaType: item.mediaType, status }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) =>
            i.tmdbId === item.tmdbId && i.mediaType === item.mediaType ? { ...i, alreadyAdded: status } : i
          )
        );
        window.dispatchEvent(new CustomEvent("titles:changed"));
      }
    } finally {
      setPending(null);
    }
  }

  function renderCard(item: TrendingDTO) {
    const key = `${item.tmdbId}-${item.mediaType}`;
    const isPending = pending === key;
    return (
      <PosterCard
        key={key}
        posterUrl={item.posterUrl}
        title={item.title}
        releaseYear={item.releaseYear}
        overview={item.overview}
        voteAverage={item.voteAverage}
        mediaType={item.mediaType}
        watchUrl={null}
        detailHref={titleHref(item.tmdbId, item.mediaType)}
        actions={
          item.alreadyAdded ? (
            <PillButton icon={<Check size={12} />} disabled>
              {item.alreadyAdded === "WATCHED" ? "Watched" : "On watchlist"}
            </PillButton>
          ) : (
            <>
              <PillButton
                icon={<Eye size={12} />}
                variant="solid"
                disabled={isPending}
                onClick={() => addTitle(item, "WATCHED")}
              >
                Watched
              </PillButton>
              <PillButton
                icon={<Bookmark size={12} />}
                disabled={isPending}
                onClick={() => addTitle(item, "WATCHLIST")}
              >
                Watchlist
              </PillButton>
            </>
          )
        }
      />
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: INITIAL_VISIBLE }).map((_, i) => (
          <div key={i} className="skeleton aspect-2/3 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted">
        Rate a few titles you&rsquo;ve watched and recommendations will show up here.
      </p>
    );
  }

  const hasMore = visible < items.length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        {personalized ? "Based on titles you’ve watched and rated." : "Popular on Watchlog right now."}
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {items.slice(0, visible).map(renderCard)}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={() => setVisible((v) => Math.min(v + STEP, items.length))}
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated cursor-pointer"
          >
            Load more ({items.length - visible} left)
          </button>
        </div>
      )}
    </div>
  );
}
