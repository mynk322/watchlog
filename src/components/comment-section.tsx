"use client";

import { useState } from "react";
import { MessageCircle, User, Trash2, Pencil } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { CommentDTO } from "@/lib/types";

const MAX_COMMENT_LENGTH = 2000;

/**
 * Lazily-loaded comment thread for a review. Comments are fetched only when the thread is first
 * expanded, so this drops onto any review card without changing the review payload.
 */
export function CommentSection({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !loaded) {
      setLoading(true);
      const res = await fetch(`/api/reviews/${reviewId}/comments`).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setComments(data.comments);
        setLoaded(true);
      }
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text }),
      }).catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setBody("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this comment?")) return;
    const previous = comments;
    setComments((c) => c.filter((x) => x.id !== id));
    const res = await fetch(`/api/comments/${id}`, { method: "DELETE" }).catch(() => null);
    if (!res || !res.ok) setComments(previous); // roll back on failure
  }

  /** Saves an edit; returns whether it succeeded so the row can exit edit mode only on success. */
  async function edit(id: string, body: string): Promise<boolean> {
    const text = body.trim();
    if (!text) return false;
    const res = await fetch(`/api/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    }).catch(() => null);
    if (!res || !res.ok) return false;
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, body: text } : c)));
    return true;
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground cursor-pointer"
      >
        <MessageCircle size={14} />
        {loaded && comments.length > 0 ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Comments"}
      </button>

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {loading ? (
            <p className="text-xs text-muted">Loading…</p>
          ) : (
            <>
              {comments.map((c) => (
                <CommentItem key={c.id} comment={c} onDelete={remove} onEdit={edit} />
              ))}
              <form onSubmit={submit} className="flex items-center gap-2">
                <input
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={MAX_COMMENT_LENGTH}
                  placeholder="Add a comment…"
                  className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  disabled={posting || !body.trim()}
                  className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                >
                  {posting ? "…" : "Post"}
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  onDelete,
  onEdit,
}: {
  comment: CommentDTO;
  onDelete: (id: string) => void;
  onEdit: (id: string, body: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const ok = await onEdit(comment.id, draft);
    setSaving(false);
    if (ok) setEditing(false);
  }

  return (
    <div className="flex items-start gap-2">
      <div className="relative mt-0.5 h-6 w-6 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
        {comment.author.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- small avatar, not worth the Image optimizer overhead
          <img src={comment.author.avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User size={12} className="text-muted" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs">
          <span className="font-semibold text-foreground">{comment.author.displayName}</span>{" "}
          <span className="text-muted" suppressHydrationWarning>
            {formatRelativeTime(comment.createdAt)}
          </span>
        </p>
        {editing ? (
          <div className="mt-1 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={MAX_COMMENT_LENGTH}
              aria-label="Edit comment text"
              className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !draft.trim()}
              className="shrink-0 text-xs font-semibold text-accent disabled:opacity-50 cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(comment.body);
                setEditing(false);
              }}
              className="shrink-0 text-xs text-muted hover:text-foreground cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">{comment.body}</p>
        )}
      </div>
      {comment.isOwn && !editing && (
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Edit comment"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors",
              "hover:bg-surface-elevated hover:text-foreground cursor-pointer"
            )}
          >
            <Pencil size={12} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(comment.id)}
            aria-label="Delete comment"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-muted transition-colors",
              "hover:bg-surface-elevated hover:text-foreground cursor-pointer"
            )}
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
