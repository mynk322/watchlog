"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Deletes one row via the admin mutate endpoint. `where` must be the row's identifying key(s). */
export function AdminDeleteButton({
  model,
  where,
  label = "Delete",
}: {
  model: string;
  where: Record<string, unknown>;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(`Delete this ${model}? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "delete", model, where }),
    }).catch(() => null);
    setBusy(false);
    if (res && res.ok) router.refresh();
    else alert(`Delete failed: ${(res && (await res.json().catch(() => null))?.error) || "error"}`);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-md border border-accent/40 px-2 py-1 text-xs font-medium text-accent transition-colors hover:bg-accent/10 disabled:opacity-50 cursor-pointer"
    >
      {busy ? "…" : label}
    </button>
  );
}
