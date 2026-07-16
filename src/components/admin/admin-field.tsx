"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "text" | "number" | "select";

/** An inline-editable field that saves one field of one row via the admin mutate endpoint. */
export function AdminField({
  model,
  where,
  field,
  value,
  kind = "text",
  options,
  label,
}: {
  model: string;
  where: Record<string, unknown>;
  field: string;
  value: string | number | null;
  kind?: Kind;
  options?: string[];
  label?: string;
}) {
  const router = useRouter();
  const initial = value == null ? "" : String(value);
  const [val, setVal] = useState(initial);
  const [busy, setBusy] = useState(false);
  const dirty = val !== initial;

  async function save() {
    setBusy(true);
    const payloadValue = kind === "number" ? (val === "" ? null : Number(val)) : val;
    const res = await fetch("/api/admin/mutate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "update", model, where, data: { [field]: payloadValue } }),
    }).catch(() => null);
    setBusy(false);
    if (res && res.ok) router.refresh();
    else alert(`Update failed: ${(res && (await res.json().catch(() => null))?.error) || "error"}`);
  }

  const inputClass =
    "min-w-0 rounded border border-border bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  return (
    <span className="inline-flex items-center gap-1">
      {label && <span className="text-[11px] text-muted">{label}</span>}
      {kind === "select" ? (
        <select value={val} onChange={(e) => setVal(e.target.value)} className={inputClass}>
          {(options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={kind === "number" ? "number" : "text"}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className={`${inputClass} ${kind === "text" ? "w-full" : "w-20"}`}
          step={kind === "number" ? "0.5" : undefined}
        />
      )}
      {dirty && (
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded bg-accent px-2 py-1 text-[11px] font-semibold text-accent-foreground disabled:opacity-50 cursor-pointer"
        >
          {busy ? "…" : "Save"}
        </button>
      )}
    </span>
  );
}
