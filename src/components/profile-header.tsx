"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Pencil } from "lucide-react";
import {
  DISPLAY_NAME_MAX_LENGTH,
  HANDLE_MAX_LENGTH,
  isValidDisplayName,
  isValidHandle,
  normalizeHandle,
} from "@/lib/validation";
import type { ProfileDTO } from "@/lib/types";

export function ProfileHeader({ profile, isOwner }: { profile: ProfileDTO; isOwner: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [handle, setHandle] = useState(profile.handle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedHandle = normalizeHandle(handle);
  const canSave =
    isValidDisplayName(displayName) &&
    isValidHandle(normalizedHandle) &&
    (displayName.trim() !== profile.displayName || normalizedHandle !== profile.handle);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), handle: normalizedHandle }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        setError(payload?.error ?? "Failed to save profile");
        return;
      }
      setEditing(false);
      // The handle is the page's own URL — navigate to the new one if it changed, otherwise just refresh.
      if (normalizedHandle !== profile.handle) {
        router.push(`/u/${normalizedHandle}`);
      } else {
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDisplayName(profile.displayName);
    setHandle(profile.handle);
    setError(null);
    setEditing(false);
  }

  const avatar = (
    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-surface-elevated sm:h-20 sm:w-20">
      {profile.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatar from Clerk, not worth the Image optimizer overhead
        <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <User size={28} className="text-muted" />
        </div>
      )}
    </div>
  );

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="flex items-start gap-4">
        {avatar}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Handle</span>
            <div className="flex items-center rounded-xl border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-ring">
              <span className="text-sm text-muted">@</span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                maxLength={HANDLE_MAX_LENGTH}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-transparent py-2 pl-1 text-sm text-foreground focus:outline-none"
              />
            </div>
          </label>
          {error && <p className="text-xs text-accent">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={saving || !canSave}
              className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={cancel}
              className="rounded-full px-4 py-2 text-xs font-medium text-muted transition-colors hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {avatar}
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{profile.displayName}</h1>
        <p className="truncate text-sm text-muted">@{profile.handle}</p>
        <div className="mt-1 flex items-center gap-3">
          <p className="text-sm text-muted">
            {profile.reviewCount} {profile.reviewCount === 1 ? "review" : "reviews"}
          </p>
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-foreground cursor-pointer"
            >
              <Pencil size={13} />
              Edit profile
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
