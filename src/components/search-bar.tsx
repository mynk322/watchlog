"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Search, Plus, Check, Loader2, X } from "lucide-react";
import type { SearchResultDTO, TitleStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 350;
const CLIENT_CACHE_MAX_ENTRIES = 100;

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Session-lived cache: re-typing or backspacing back to an already-seen query skips the network entirely.
  const cacheRef = useRef<Map<string, SearchResultDTO[]>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results below the minimum query length
      setResults([]);
      setLoading(false);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
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
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
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
  }, [query]);

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

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-surface-elevated shadow-2xl shadow-black/50">
          {query.trim().length < MIN_QUERY_LENGTH ? (
            <p className="p-4 text-sm text-muted">Keep typing to search&hellip;</p>
          ) : (
            results.length === 0 &&
            !loading && <p className="p-4 text-sm text-muted">No matches on TMDB for &ldquo;{query}&rdquo;.</p>
          )}
          {results.map((item) => {
            const key = `${item.tmdbId}-${item.mediaType}`;
            const pending = pendingKey === key;
            return (
              <div key={key} className="flex items-center gap-3 border-b border-border p-3 last:border-b-0">
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-md bg-surface">
                  {item.posterUrl && (
                    <Image src={item.posterUrl} alt={item.title} fill sizes="44px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted">
                    {item.releaseYear ?? "—"} · {item.mediaType === "TV" ? "Series" : "Movie"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    disabled={pending || item.alreadyAdded === "WATCHED"}
                    onClick={() => addTitle(item, "WATCHED")}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer disabled:cursor-not-allowed",
                      item.alreadyAdded === "WATCHED"
                        ? "bg-accent/20 text-accent"
                        : "border border-border text-foreground hover:bg-surface"
                    )}
                  >
                    {item.alreadyAdded === "WATCHED" ? <Check size={12} /> : "Watched"}
                  </button>
                  <button
                    type="button"
                    disabled={pending || item.alreadyAdded === "WATCHLIST"}
                    onClick={() => addTitle(item, "WATCHLIST")}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors cursor-pointer disabled:cursor-not-allowed",
                      item.alreadyAdded === "WATCHLIST"
                        ? "bg-accent/20 text-accent"
                        : "border border-border text-foreground hover:bg-surface"
                    )}
                  >
                    {item.alreadyAdded === "WATCHLIST" ? <Check size={12} /> : <Plus size={12} />}
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
