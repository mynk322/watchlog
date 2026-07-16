"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";

/** A small inline form to create a list, then navigate to it. Shown to the profile owner. */
export function NewListButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setPending(true);
    setError(null);
    const res = await fetch("/api/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    }).catch(() => null);
    if (!res || !res.ok) {
      setPending(false);
      const payload = res ? await res.json().catch(() => null) : null;
      setError(payload?.error ?? "Couldn't create the list");
      return;
    }
    const { id } = await res.json();
    router.push(`/lists/${id}`);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated cursor-pointer"
      >
        <Plus size={15} />
        New list
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="List name…"
          maxLength={100}
          className="rounded-lg bg-surface-elevated px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={pending || !name.trim()}
          className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : "Create"}
        </button>
      </div>
      {error && <p className="text-xs text-accent">{error}</p>}
    </form>
  );
}
