"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Check, User } from "lucide-react";
import type { MediaType, PersonDTO } from "@/lib/types";

interface RecommendButtonProps {
  tmdbId: number;
  mediaType: MediaType;
  title: string;
}

/** Recommends a title to another person, with an optional note. Lists everyone with a profile. */
export function RecommendButton({ tmdbId, mediaType, title }: RecommendButtonProps) {
  const [open, setOpen] = useState(false);
  const [people, setPeople] = useState<PersonDTO[] | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && people === null) void loadPeople();
  }

  async function loadPeople() {
    setError(null);
    const res = await fetch("/api/people").catch(() => null);
    if (!res || !res.ok) {
      setError("Couldn't load people");
      setPeople([]);
      return;
    }
    const data = await res.json();
    setPeople(data.people as PersonDTO[]);
  }

  async function sendTo(person: PersonDTO) {
    setBusyId(person.userId);
    setError(null);
    const res = await fetch("/api/suggestions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: person.userId, tmdbId, mediaType, message: message.trim() || null }),
    }).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) {
      const payload = res ? await res.json().catch(() => null) : null;
      setError(payload?.error ?? "Couldn't send");
      return;
    }
    setSentTo((prev) => new Set(prev).add(person.userId));
  }

  const filtered = (people ?? []).filter(
    (p) => p.displayName.toLowerCase().includes(query.toLowerCase()) || p.handle.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated cursor-pointer"
      >
        <Send size={16} />
        Recommend
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-2 w-72 rounded-xl border border-border bg-surface p-2 shadow-xl shadow-black/30"
        >
          <p className="px-2 pb-2 text-xs text-muted">
            Recommend <span className="text-foreground">{title}</span> to…
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note (optional)"
            rows={2}
            maxLength={500}
            className="mb-2 w-full rounded-lg bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people…"
            className="mb-1 w-full rounded-lg bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
          />

          {people === null ? (
            <div className="flex items-center justify-center py-4 text-muted">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : (
            <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              {filtered.map((person) => {
                const sent = sentTo.has(person.userId);
                return (
                  <button
                    key={person.userId}
                    type="button"
                    disabled={busyId === person.userId || sent}
                    onClick={() => sendTo(person)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-60 cursor-pointer"
                  >
                    <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
                      {person.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- tiny avatar
                        <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center">
                          <User size={14} className="text-muted" />
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{person.displayName}</span>
                    {busyId === person.userId ? (
                      <Loader2 size={14} className="shrink-0 animate-spin text-muted" />
                    ) : sent ? (
                      <Check size={14} className="shrink-0 text-accent" />
                    ) : null}
                  </button>
                );
              })}
              {filtered.length === 0 && <p className="px-2 py-3 text-xs text-muted">No one to recommend to yet.</p>}
            </div>
          )}

          {error && <p className="px-2 pt-2 text-xs text-accent">{error}</p>}
        </div>
      )}
    </div>
  );
}
