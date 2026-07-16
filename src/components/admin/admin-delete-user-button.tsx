"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Deletes a user's entire DB footprint AND their Clerk account. Requires typing the handle/email to confirm. */
export function AdminDeleteUserButton({
  userId,
  label,
  redirectTo,
}: {
  userId: string;
  /** What the admin must type to confirm (handle or email or userId). */
  label: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    const typed = window.prompt(`This deletes ALL of this user's data AND their Clerk account — irreversible.\n\nType "${label}" to confirm:`);
    if (typed !== label) {
      if (typed !== null) alert("Confirmation did not match — cancelled.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (res && res.ok) {
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } else {
      alert(`Delete failed: ${(res && (await res.json().catch(() => null))?.error) || "error"}`);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 cursor-pointer"
    >
      {busy ? "Deleting…" : "Delete user + Clerk account"}
    </button>
  );
}
