"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Pencil, Star, Heart } from "lucide-react";
import {
  BIO_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  HANDLE_MAX_LENGTH,
  isValidBio,
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
  const [bio, setBio] = useState(profile.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizedHandle = normalizeHandle(handle);
  const changed =
    displayName.trim() !== profile.displayName ||
    normalizedHandle !== profile.handle ||
    bio.trim() !== (profile.bio ?? "");
  const canSave = isValidDisplayName(displayName) && isValidHandle(normalizedHandle) && isValidBio(bio) && changed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim(), handle: normalizedHandle, bio: bio.trim() }),
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
    setBio(profile.bio ?? "");
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
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted">Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={BIO_MAX_LENGTH}
              rows={3}
              placeholder="A line or two about your taste in movies…"
              className="resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
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
    <div className="flex items-start gap-4">
      {avatar}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{profile.displayName}</h1>
        <p className="truncate text-sm text-muted">@{profile.handle}</p>

        {profile.bio && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">{profile.bio}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>
            <span className="font-semibold text-foreground">{profile.reviewCount}</span>{" "}
            {profile.reviewCount === 1 ? "review" : "reviews"}
          </span>
          {profile.avgRating != null && (
            <span className="inline-flex items-center gap-1">
              <Star size={13} className="fill-gold text-gold" />
              <span className="font-semibold text-foreground">{profile.avgRating.toFixed(1)}</span> avg
            </span>
          )}
          {profile.likesReceived > 0 && (
            <span className="inline-flex items-center gap-1">
              <Heart size={13} className="fill-accent text-accent" />
              <span className="font-semibold text-foreground">{profile.likesReceived}</span>
            </span>
          )}
          {isOwner && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground cursor-pointer"
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
