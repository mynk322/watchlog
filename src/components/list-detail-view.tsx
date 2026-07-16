"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Film, Tv, X, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import type { ListDetailDTO, ListItemDTO } from "@/lib/types";

export function ListDetailView({ list }: { list: ListDetailDTO }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [description, setDescription] = useState(list.description ?? "");
  const [items, setItems] = useState<ListItemDTO[]>(list.items);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveEdits(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/lists/${list.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) {
      const payload = res ? await res.json().catch(() => null) : null;
      setError(payload?.error ?? "Couldn't save changes");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function deleteList() {
    if (!confirm("Delete this list? This can't be undone.")) return;
    setBusy(true);
    const res = await fetch(`/api/lists/${list.id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) {
      setBusy(false);
      setError("Couldn't delete the list");
      return;
    }
    router.push(`/u/${list.owner.handle}`);
  }

  async function removeItem(item: ListItemDTO) {
    setItems((prev) => prev.filter((i) => i.id !== item.id)); // optimistic
    const res = await fetch(`/api/lists/${list.id}/items`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId: item.tmdbId, mediaType: item.mediaType }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setItems(list.items); // roll back to server truth
      setError("Couldn't remove that title");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-8">
      {editing ? (
        <form onSubmit={saveEdits} className="flex flex-col gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="rounded-lg bg-surface-elevated px-3 py-2 text-2xl font-bold text-foreground outline-none focus:ring-1 focus:ring-accent"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Description (optional)"
            rows={2}
            className="rounded-lg bg-surface-elevated px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy || !name.trim()}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-foreground">{list.name}</h1>
            {list.description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{list.description}</p>}
            <p className="mt-2 text-sm text-muted">
              A list by{" "}
              <Link href={`/u/${list.owner.handle}`} className="font-medium text-foreground hover:text-accent">
                {list.owner.displayName}
              </Link>{" "}
              · {items.length} {items.length === 1 ? "title" : "titles"}
            </p>
          </div>
          {list.isOwn && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated cursor-pointer"
              >
                <Pencil size={14} />
                Edit
              </button>
              <button
                type="button"
                onClick={deleteList}
                disabled={busy}
                aria-label="Delete list"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-accent disabled:opacity-50 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-accent">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-10 text-sm text-muted">
          This list is empty{list.isOwn ? " — add titles from any title page." : "."}
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {items.map((item) => (
            <ListItemCard key={item.id} item={item} isOwner={list.isOwn} onRemove={() => removeItem(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ListItemCard({
  item,
  isOwner,
  onRemove,
}: {
  item: ListItemDTO;
  isOwner: boolean;
  onRemove: () => void;
}) {
  const MediaIcon = item.mediaType === "TV" ? Tv : Film;
  const poster = (
    <div className="relative aspect-2/3 overflow-hidden rounded-lg bg-surface-elevated transition-opacity group-hover:opacity-80">
      {item.posterUrl ? (
        <Image src={item.posterUrl} alt="" fill sizes="160px" className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <MediaIcon size={20} className="text-muted" />
        </div>
      )}
    </div>
  );

  return (
    <div className="group relative flex flex-col gap-1">
      {isOwner && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.title}`}
          className="absolute right-1 top-1 z-10 inline-flex items-center justify-center rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity hover:bg-black group-hover:opacity-100 cursor-pointer"
        >
          <X size={13} />
        </button>
      )}
      {item.viewerTitleId ? (
        <Link href={`/t/${item.viewerTitleId}`} className="flex flex-col gap-1">
          {poster}
        </Link>
      ) : (
        poster
      )}
      <p className="truncate text-xs text-muted group-hover:text-foreground" title={item.title}>
        {item.title}
      </p>
    </div>
  );
}
