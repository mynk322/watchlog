"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Check, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListMembershipDTO, MediaType } from "@/lib/types";

interface AddToListMenuProps {
  tmdbId: number;
  mediaType: MediaType;
}

/** A dropdown to add/remove a title to/from the viewer's lists, and to create a new list on the fly. */
export function AddToListMenu({ tmdbId, mediaType }: AddToListMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [lists, setLists] = useState<ListMembershipDTO[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
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

  async function loadLists() {
    setError(null);
    const res = await fetch(`/api/lists/for-title?tmdbId=${tmdbId}&mediaType=${mediaType}`).catch(() => null);
    if (!res || !res.ok) {
      setError("Couldn't load your lists");
      setLists([]);
      return;
    }
    const data = await res.json();
    setLists(data.lists as ListMembershipDTO[]);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && lists === null) void loadLists();
  }

  async function toggleMembership(list: ListMembershipDTO) {
    setBusyId(list.id);
    setError(null);
    const method = list.contains ? "DELETE" : "POST";
    const res = await fetch(`/api/lists/${list.id}/items`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, mediaType }),
    }).catch(() => null);
    setBusyId(null);
    if (!res || !res.ok) {
      const payload = res ? await res.json().catch(() => null) : null;
      setError(payload?.error ?? "Couldn't update the list");
      return;
    }
    setLists((prev) => prev?.map((l) => (l.id === list.id ? { ...l, contains: !l.contains } : l)) ?? prev);
    router.refresh();
  }

  async function createAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setCreating(false);
      const payload = res ? await res.json().catch(() => null) : null;
      setError(payload?.error ?? "Couldn't create the list");
      return;
    }
    const { id } = await res.json();
    // Add this title to the freshly created list.
    await fetch(`/api/lists/${id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId, mediaType }),
    }).catch(() => null);
    setCreating(false);
    setNewName("");
    setLists((prev) => [{ id, name, contains: true }, ...(prev ?? [])]);
    router.refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated cursor-pointer"
      >
        <ListPlus size={16} />
        Add to list
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 z-20 mt-2 w-64 rounded-xl border border-border bg-surface p-2 shadow-xl shadow-black/30"
        >
          {lists === null ? (
            <div className="flex items-center justify-center py-4 text-muted">
              <Loader2 size={16} className="animate-spin" />
            </div>
          ) : (
            <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto">
              {lists.map((list) => (
                <button
                  key={list.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={list.contains}
                  disabled={busyId === list.id}
                  onClick={() => toggleMembership(list)}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-elevated disabled:opacity-50 cursor-pointer"
                >
                  <span className="truncate">{list.name}</span>
                  {busyId === list.id ? (
                    <Loader2 size={14} className="shrink-0 animate-spin text-muted" />
                  ) : (
                    <Check size={14} className={cn("shrink-0", list.contains ? "text-accent" : "text-transparent")} />
                  )}
                </button>
              ))}
              {lists.length === 0 && <p className="px-3 py-2 text-xs text-muted">No lists yet — create one below.</p>}
            </div>
          )}

          <form onSubmit={createAndAdd} className="mt-1 flex items-center gap-1 border-t border-border pt-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New list…"
              maxLength={100}
              className="min-w-0 flex-1 rounded-lg bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              aria-label="Create list and add"
              className="inline-flex shrink-0 items-center justify-center rounded-lg bg-accent p-2 text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            </button>
          </form>

          {error && <p className="px-3 pt-2 text-xs text-accent">{error}</p>}
        </div>
      )}
    </div>
  );
}
