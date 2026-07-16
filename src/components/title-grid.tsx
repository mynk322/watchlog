"use client";

import { useMemo, useState } from "react";
import { Eye, Bookmark, Trash2, Plus, SkipForward } from "lucide-react";
import { PosterCard } from "./poster-card";
import { PillButton } from "./pill-button";
import { ShareButton } from "./share-button";
import { useTitles } from "@/hooks/use-titles";
import type { TitleDTO, TitleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

type SortKey = "releaseYear" | "myRating" | "tmdbRating" | "dateAdded" | "dateWatched" | "titleAz";

const SORT_OPTIONS: { key: SortKey; label: string; statuses: TitleStatus[] }[] = [
  { key: "releaseYear", label: "Release year", statuses: ["WATCHED", "WATCHLIST"] },
  { key: "myRating", label: "My rating", statuses: ["WATCHED"] },
  { key: "tmdbRating", label: "TMDB rating", statuses: ["WATCHED", "WATCHLIST"] },
  { key: "dateWatched", label: "Date watched", statuses: ["WATCHED"] },
  { key: "dateAdded", label: "Date added", statuses: ["WATCHED", "WATCHLIST"] },
  { key: "titleAz", label: "Title A–Z", statuses: ["WATCHED", "WATCHLIST"] },
];

function sortTitles(items: TitleDTO[], key: SortKey): TitleDTO[] {
  return [...items].sort((a, b) => {
    switch (key) {
      case "releaseYear":
        return (b.releaseYear ?? -Infinity) - (a.releaseYear ?? -Infinity);
      case "myRating":
        return (b.rating ?? -Infinity) - (a.rating ?? -Infinity);
      case "tmdbRating":
        return (b.voteAverage ?? -Infinity) - (a.voteAverage ?? -Infinity);
      case "dateAdded":
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      case "dateWatched":
        return new Date(b.watchedAt ?? 0).getTime() - new Date(a.watchedAt ?? 0).getTime();
      case "titleAz":
        return a.title.localeCompare(b.title);
    }
  });
}

/** Episode count for the season the title is currently on, or null if unknown (not yet backfilled from TMDB). */
function currentSeasonEpisodeCount(item: TitleDTO): number | null {
  const season = item.currentSeason ?? 1;
  return item.seasonEpisodeCounts[season - 1] ?? null;
}

function resolveInitialSortKey(status: TitleStatus, initial: string | null | undefined): SortKey {
  const match = SORT_OPTIONS.find((o) => o.key === initial && o.statuses.includes(status));
  return match ? match.key : "releaseYear";
}

function groupByYear(items: TitleDTO[]) {
  const groups = new Map<string, TitleDTO[]>();
  for (const item of items) {
    const key = item.releaseYear ? String(item.releaseYear) : "Unknown year";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.entries()].sort((a, b) => {
    if (a[0] === "Unknown year") return 1;
    if (b[0] === "Unknown year") return -1;
    return Number(b[0]) - Number(a[0]);
  });
}

export function TitleGrid({
  status,
  emptyHint,
  initialSortKey,
}: {
  status: TitleStatus;
  emptyHint: string;
  initialSortKey?: string | null;
}) {
  const { titles, loading, updateStatus, removeTitle, updateRating, updateProgress } = useTitles(status);
  const [sortKey, setSortKey] = useState<SortKey>(() => resolveInitialSortKey(status, initialSortKey));
  const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());

  function changeSortKey(key: SortKey) {
    setSortKey(key);
    const field = status === "WATCHED" ? "watchedSortKey" : "watchlistSortKey";
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: key }),
    }).catch(() => {});
  }

  const availableGenres = useMemo(() => {
    const set = new Set<string>();
    for (const t of titles) for (const g of t.genres) set.add(g);
    return [...set].sort();
  }, [titles]);

  const filtered = useMemo(() => {
    if (selectedGenres.size === 0) return titles;
    return titles.filter((t) => t.genres.some((g) => selectedGenres.has(g)));
  }, [titles, selectedGenres]);

  const sorted = useMemo(() => sortTitles(filtered, sortKey), [filtered, sortKey]);
  const grouped = useMemo(() => (sortKey === "releaseYear" ? groupByYear(sorted) : null), [sorted, sortKey]);

  function toggleGenre(genre: string) {
    setSelectedGenres((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) next.delete(genre);
      else next.add(genre);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton aspect-2/3 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (titles.length === 0) {
    return <p className="text-sm text-muted">{emptyHint}</p>;
  }

  function renderCard(item: TitleDTO) {
    const episodeCap = currentSeasonEpisodeCount(item);
    const atEpisodeCap = episodeCap !== null && (item.currentEpisode ?? 0) >= episodeCap;

    return (
      <PosterCard
        key={item.id}
        posterUrl={item.posterUrl}
        title={item.title}
        releaseYear={item.releaseYear}
        overview={item.overview}
        voteAverage={item.voteAverage}
        genres={item.genres}
        runtime={item.runtime}
        mediaType={item.mediaType}
        watchUrl={item.watchUrl}
        detailHref={`/t/${item.id}`}
        myRating={status === "WATCHED" ? item.rating : undefined}
        onRateChange={status === "WATCHED" ? (value) => updateRating(item.id, value) : undefined}
        progress={
          status === "WATCHED" && item.mediaType === "TV"
            ? {
                currentSeason: item.currentSeason,
                currentEpisode: item.currentEpisode,
                totalSeasons: item.totalSeasons,
                seasonEpisodeCounts: item.seasonEpisodeCounts,
              }
            : undefined
        }
        actions={
          <>
            {status === "WATCHED" && item.mediaType === "TV" && (
              <>
                <PillButton
                  icon={<Plus size={12} />}
                  disabled={atEpisodeCap}
                  onClick={() =>
                    updateProgress(item.id, {
                      currentSeason: item.currentSeason ?? 1,
                      currentEpisode: (item.currentEpisode ?? 0) + 1,
                    })
                  }
                >
                  Episode
                </PillButton>
                <PillButton
                  icon={<SkipForward size={12} />}
                  disabled={!!item.totalSeasons && (item.currentSeason ?? 1) >= item.totalSeasons}
                  onClick={() =>
                    updateProgress(item.id, {
                      currentSeason: (item.currentSeason ?? 1) + 1,
                      currentEpisode: 1,
                    })
                  }
                >
                  Season
                </PillButton>
              </>
            )}
            {status === "WATCHLIST" ? (
              <PillButton icon={<Eye size={12} />} variant="solid" onClick={() => updateStatus(item.id, "WATCHED")}>
                Watched
              </PillButton>
            ) : (
              <PillButton icon={<Bookmark size={12} />} onClick={() => updateStatus(item.id, "WATCHLIST")}>
                Watchlist
              </PillButton>
            )}
            <PillButton icon={<Trash2 size={12} />} onClick={() => removeTitle(item.id)}>
              Remove
            </PillButton>
            <ShareButton
              variant="pill"
              url={`/t/${item.id}`}
              title={item.title}
              text={item.rating ? `I watched ${item.title} — ${item.rating}★` : `Check out ${item.title}`}
            />
          </>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {availableGenres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
                selectedGenres.has(genre)
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted hover:text-foreground"
              )}
            >
              {genre}
            </button>
          ))}
        </div>
        <select
          value={sortKey}
          onChange={(e) => changeSortKey(e.target.value as SortKey)}
          className="w-fit rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {SORT_OPTIONS.filter((o) => o.statuses.includes(status)).map((o) => (
            <option key={o.key} value={o.key}>
              Sort: {o.label}
            </option>
          ))}
        </select>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted">No titles match the selected genres.</p>
      ) : grouped ? (
        <div className="flex flex-col gap-10">
          {grouped.map(([year, items]) => (
            <div key={year}>
              <h3 className="mb-4 text-lg font-semibold text-foreground">{year}</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{items.map(renderCard)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">{sorted.map(renderCard)}</div>
      )}
    </div>
  );
}
