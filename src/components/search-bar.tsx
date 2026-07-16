"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Search, Plus, Check, Loader2, X } from "lucide-react";
import type { SearchResultDTO, TitleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MIN_YEAR, MAX_YEAR, parseYear, titleHref } from "@/lib/tmdb-shared";
import {
  addGhostItem,
  getGhostServerSnapshot,
  getGhostSnapshot,
  subscribeGhost,
} from "@/lib/ghost-watchlist";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;
const CLIENT_CACHE_MAX_ENTRIES = 100;

type SortMode = "relevance" | "popularity" | "rating";

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: "relevance", label: "Relevance" },
  { key: "popularity", label: "Popularity" },
  { key: "rating", label: "Rating" },
];

function sortResults(results: SearchResultDTO[], mode: SortMode): SearchResultDTO[] {
  if (mode === "relevance") return results;
  const key = mode === "popularity" ? "popularity" : "voteAverage";
  return [...results].sort((a, b) => b[key] - a[key]);
}

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [yearInput, setYearInput] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("relevance");
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [limitedMessage, setLimitedMessage] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Session-lived cache: re-typing or backspacing back to an already-seen query skips the network entirely.
  const cacheRef = useRef<Map<string, SearchResultDTO[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  const { isSignedIn } = useAuth();
  // Guests don't have a server collection; their "already added" state lives in the ghost store.
  const ghostItems = useSyncExternalStore(subscribeGhost, getGhostSnapshot, getGhostServerSnapshot);

  /** The add-state to show for a result: server collection when signed in, ghost store when not. */
  function effectiveStatus(item: SearchResultDTO): TitleStatus | null {
    if (isSignedIn) return item.alreadyAdded;
    return ghostItems.find((g) => g.tmdbId === item.tmdbId && g.mediaType === item.mediaType)?.status ?? null;
  }

  const year = parseYear(yearInput);
  const sortedResults = useMemo(() => sortResults(results, sortMode), [results, sortMode]);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results below the minimum query length
      setResults([]);
      setLoading(false);
      return;
    }

    const cacheKey = year ? `${trimmed.toLowerCase()}|y:${year}` : trimmed.toLowerCase();
    const cached = cacheRef.current.get(cacheKey);
    if (cached) {
       
      setResults(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const params = new URLSearchParams({ q: trimmed });
        if (year) params.set("year", String(year));
        const res = await fetch(`/api/search?${params}`, { signal: controller.signal });
        if (res.status === 429) {
          const payload = await res.json().catch(() => null);
          setLimitedMessage(payload?.error ?? "Search limit reached. Sign up free to keep searching.");
          setResults([]);
          return;
        }
        setLimitedMessage(null);
        const data = await res.json();
        const found: SearchResultDTO[] = data.results ?? [];
        if (cacheRef.current.size >= CLIENT_CACHE_MAX_ENTRIES) {
          const oldestKey = cacheRef.current.keys().next().value;
          if (oldestKey !== undefined) cacheRef.current.delete(oldestKey);
        }
        cacheRef.current.set(cacheKey, found);
        setResults(found);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query, year]);

  useEffect(() => {
    function handleClickOutside(e: globalThis.MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function addTitle(item: SearchResultDTO, status: TitleStatus) {
    // Guests save to the browser ghost store (merged into their account on sign-in); the
    // useSyncExternalStore subscription re-renders the button state.
    if (!isSignedIn) {
      addGhostItem({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        status,
        title: item.title,
        posterUrl: item.posterUrl,
      });
      return;
    }

    const key = `${item.tmdbId}-${item.mediaType}`;
    setPendingKey(key);
    try {
      const res = await fetch("/api/titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: item.tmdbId, mediaType: item.mediaType, status }),
      });
      if (res.ok) {
        setResults((prev) =>
          prev.map((r) =>
            r.tmdbId === item.tmdbId && r.mediaType === item.mediaType ? { ...r, alreadyAdded: status } : r
          )
        );
        window.dispatchEvent(new CustomEvent("titles:changed"));
      }
    } finally {
      setPendingKey(null);
    }
  }

  const showPanel = open && query.trim().length >= MIN_QUERY_LENGTH;

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2">
        <Search size={16} className="shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search your collection or add something new…"
          className="w-full bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
        {loading && <Loader2 size={14} className="shrink-0 animate-spin text-muted" />}
        {query && !loading && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 text-muted hover:text-foreground cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && query.trim() && query.trim().length < MIN_QUERY_LENGTH && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-2xl border border-border bg-surface-elevated p-4 shadow-2xl shadow-black/50">
          <p className="text-sm text-muted">Keep typing to search&hellip;</p>
        </div>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[75vh] overflow-y-auto rounded-2xl border border-border bg-surface-elevated shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 border-b border-border p-2.5">
            <input
              type="number"
              inputMode="numeric"
              min={MIN_YEAR}
              max={MAX_YEAR}
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value.slice(0, 4))}
              placeholder={`e.g. ${MAX_YEAR - 2}`}
              aria-label="Filter by release year"
              className="w-20 rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              aria-label="Sort results"
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  Sort: {o.label}
                </option>
              ))}
            </select>
          </div>

          {limitedMessage && (
            <div className="flex flex-col gap-2 p-4">
              <p className="text-sm text-foreground">{limitedMessage}</p>
              <Link
                href="/sign-up"
                className="self-start rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90"
              >
                Sign up free
              </Link>
            </div>
          )}
          {!limitedMessage && sortedResults.length === 0 && !loading && (
            <p className="p-4 text-sm text-muted">No matches on TMDB for &ldquo;{query}&rdquo;.</p>
          )}
          {sortedResults.map((item) => {
            const key = `${item.tmdbId}-${item.mediaType}`;
            const pending = pendingKey === key;
            const added = effectiveStatus(item);
            return (
              <div key={key} className="flex items-center gap-3 border-b border-border p-3 last:border-b-0">
                <Link
                  href={titleHref(item.tmdbId, item.mediaType)}
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface">
                    {item.posterUrl && (
                      <Image src={item.posterUrl} alt={item.title} fill sizes="44px" className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground hover:underline">{item.title}</p>
                    <p className="text-xs text-muted">
                      {item.releaseYear ?? "—"} · {item.mediaType === "TV" ? "Series" : "Movie"}
                    </p>
                  </div>
                </Link>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={pending || added === "WATCHED"}
                    onClick={() => addTitle(item, "WATCHED")}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer disabled:cursor-not-allowed",
                      added === "WATCHED"
                        ? "bg-accent/20 text-accent"
                        : "border border-border text-foreground hover:bg-surface"
                    )}
                  >
                    {added === "WATCHED" ? <Check size={12} /> : "Watched"}
                  </button>
                  <button
                    type="button"
                    disabled={pending || added === "WATCHLIST"}
                    onClick={() => addTitle(item, "WATCHLIST")}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer disabled:cursor-not-allowed",
                      added === "WATCHLIST"
                        ? "bg-accent/20 text-accent"
                        : "border border-border text-foreground hover:bg-surface"
                    )}
                  >
                    {added === "WATCHLIST" ? <Check size={12} /> : <Plus size={12} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
