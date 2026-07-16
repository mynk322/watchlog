"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Film, Tv, Check, Trophy, Lock, Trash2, Plus, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MovieNightDTO, MovieNightCandidateDTO, SearchResultDTO } from "@/lib/types";

export function MovieNightView({ night }: { night: MovieNightDTO }) {
  const router = useRouter();
  const open = night.status === "OPEN";
  const [candidates, setCandidates] = useState(night.candidates);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep candidates ranked by votes (ties keep order) for live re-sorting after a vote.
  function resort(list: MovieNightCandidateDTO[]) {
    return [...list].sort((a, b) => b.voteCount - a.voteCount);
  }

  async function vote(candidate: MovieNightCandidateDTO) {
    if (!open) return;
    const next = !candidate.votedByViewer;
    setCandidates((prev) =>
      resort(
        prev.map((c) =>
          c.id === candidate.id ? { ...c, votedByViewer: next, voteCount: c.voteCount + (next ? 1 : -1) } : c
        )
      )
    );
    const res = await fetch(`/api/movie-nights/${night.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: candidate.id }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setCandidates(night.candidates); // roll back to server truth
      setError("Couldn't record your vote");
    }
  }

  async function removeCandidate(candidate: MovieNightCandidateDTO) {
    setCandidates((prev) => prev.filter((c) => c.id !== candidate.id)); // optimistic
    const res = await fetch(`/api/movie-nights/${night.id}/candidates`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateId: candidate.id }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setCandidates(night.candidates);
      setError("Couldn't remove that title");
      return;
    }
    router.refresh();
  }

  async function close() {
    if (!confirm("Close voting and lock in the winner?")) return;
    setBusy(true);
    const res = await fetch(`/api/movie-nights/${night.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      setError("Couldn't close the movie night");
      return;
    }
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this movie night? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/movie-nights/${night.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      setError("Couldn't delete");
      return;
    }
    router.push("/movie-nights");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">{night.name}</h1>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-semibold",
                open ? "bg-accent/15 text-accent" : "bg-surface-elevated text-muted"
              )}
            >
              {open ? "Open" : "Closed"}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Hosted by{" "}
            <Link href={`/u/${night.host.handle}`} className="font-medium text-foreground hover:text-accent">
              {night.host.displayName}
            </Link>
          </p>
        </div>
        {night.isHost && (
          <div className="flex items-center gap-2">
            {open && (
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50 cursor-pointer"
              >
                <Lock size={14} /> Close voting
              </button>
            )}
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              aria-label="Delete movie night"
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-accent disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {night.winner && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-4">
          <Trophy size={22} className="shrink-0 text-gold" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gold">Winner</p>
            <p className="font-bold text-foreground">
              {night.winner.title} <span className="font-normal text-muted">· {night.winner.voteCount} votes</span>
            </p>
          </div>
        </div>
      )}

      {open && <AddCandidate nightId={night.id} onAdded={() => router.refresh()} />}

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}

      <div className="mt-6 flex flex-col gap-2">
        {candidates.length === 0 ? (
          <p className="text-sm text-muted">No titles yet{open ? " — add some above to start voting." : "."}</p>
        ) : (
          candidates.map((c) => (
            <CandidateRow
              key={c.id}
              candidate={c}
              open={open}
              canRemove={open && (night.isHost || c.addedByViewer)}
              onVote={() => vote(c)}
              onRemove={() => removeCandidate(c)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function CandidateRow({
  candidate,
  open,
  canRemove,
  onVote,
  onRemove,
}: {
  candidate: MovieNightCandidateDTO;
  open: boolean;
  canRemove: boolean;
  onVote: () => void;
  onRemove: () => void;
}) {
  const MediaIcon = candidate.mediaType === "TV" ? Tv : Film;
  const poster = (
    <div className="relative aspect-2/3 w-12 shrink-0 overflow-hidden rounded-md bg-surface-elevated">
      {candidate.posterUrl ? (
        <Image src={candidate.posterUrl} alt="" fill sizes="48px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MediaIcon size={16} className="text-muted" />
        </div>
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      {candidate.titleId ? (
        <Link href={`/t/${candidate.titleId}`} className="transition-opacity hover:opacity-80">
          {poster}
        </Link>
      ) : (
        poster
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground" title={candidate.title}>
          {candidate.title}
          {candidate.releaseYear ? <span className="font-normal text-muted"> ({candidate.releaseYear})</span> : null}
        </p>
        <p className="text-xs text-muted">
          {candidate.voteCount} {candidate.voteCount === 1 ? "vote" : "votes"}
        </p>
      </div>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${candidate.title}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:text-accent cursor-pointer"
        >
          <X size={15} />
        </button>
      )}
      <button
        type="button"
        onClick={onVote}
        disabled={!open}
        aria-pressed={candidate.votedByViewer}
        aria-label={candidate.votedByViewer ? `Remove vote for ${candidate.title}` : `Vote for ${candidate.title}`}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
          open && "cursor-pointer",
          candidate.votedByViewer
            ? "border-accent/40 bg-accent/10 text-accent"
            : "border-border bg-surface text-foreground hover:bg-surface-elevated"
        )}
      >
        <Check size={14} className={cn(!candidate.votedByViewer && "opacity-40")} />
        {candidate.votedByViewer ? "Voted" : "Vote"}
      </button>
    </div>
  );
}

function AddCandidate({ nightId, onAdded }: { nightId: string; onAdded: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultDTO[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`).catch(() => null);
    setSearching(false);
    if (!res || !res.ok) return;
    const data = await res.json();
    setResults((data.results as SearchResultDTO[]).slice(0, 6));
  }

  async function add(r: SearchResultDTO) {
    setAddingId(r.tmdbId);
    const res = await fetch(`/api/movie-nights/${nightId}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: r.tmdbId, mediaType: r.mediaType }),
    }).catch(() => null);
    setAddingId(null);
    if (res && res.ok) {
      setResults((prev) => prev.filter((x) => x.tmdbId !== r.tmdbId));
      setQuery("");
      onAdded();
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-3">
      <form onSubmit={search} className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-lg bg-surface-elevated px-3">
          <Search size={15} className="text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search a movie or show to add…"
            className="flex-1 bg-transparent py-2 text-sm text-foreground outline-none placeholder:text-muted"
          />
        </div>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {searching ? <Loader2 size={14} className="animate-spin" /> : "Search"}
        </button>
      </form>

      {results.length > 0 && (
        <div className="mt-2 flex flex-col gap-0.5">
          {results.map((r) => (
            <div key={`${r.tmdbId}:${r.mediaType}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 truncate text-foreground">
                {r.title}
                {r.releaseYear ? <span className="text-muted"> ({r.releaseYear})</span> : null}
              </span>
              <button
                type="button"
                onClick={() => add(r)}
                disabled={addingId === r.tmdbId}
                aria-label={`Add ${r.title}`}
                className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50 cursor-pointer"
              >
                {addingId === r.tmdbId ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
