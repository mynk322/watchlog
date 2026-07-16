import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@clerk/nextjs/server";
import { isAdmin, getAdminUserDetail } from "@/lib/admin";
import { AdminField } from "@/components/admin/admin-field";
import { AdminDeleteButton } from "@/components/admin/admin-delete-button";
import { AdminDeleteUserButton } from "@/components/admin/admin-delete-user-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin · User — Watchlog", robots: { index: false, follow: false } };

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 border-b border-border pb-2 text-sm font-semibold text-foreground">
        {title} <span className="text-muted">({count})</span>
      </h2>
      {count === 0 ? <p className="text-xs text-muted">None.</p> : <div className="flex flex-col gap-2">{children}</div>}
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">{children}</div>;
}

export default async function AdminUserPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId: adminId } = await auth();
  if (!(await isAdmin(adminId))) notFound();

  const { userId } = await params;
  const d = await getAdminUserDetail(userId);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-24 sm:px-8">
      <Link href="/admin" className="text-sm text-muted hover:text-foreground">
        ← All users
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">{d.clerk?.name || d.profile?.displayName || "(no name)"}</h1>
          <p className="text-sm text-muted">
            {d.profile?.handle ? `@${d.profile.handle} · ` : ""}
            {d.clerk?.email ?? "no Clerk email"}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted">{userId}</p>
        </div>
        {userId !== adminId && (
          <AdminDeleteUserButton userId={userId} label={d.profile?.handle || d.clerk?.email || userId} redirectTo="/admin" />
        )}
      </div>

      {/* Profile */}
      <Section title="Profile" count={d.profile ? 1 : 0}>
        {d.profile && (
          <Row>
            <AdminField model="profile" where={{ userId }} field="displayName" value={d.profile.displayName} label="name" />
            <AdminField model="profile" where={{ userId }} field="handle" value={d.profile.handle} label="handle" />
            <AdminField model="profile" where={{ userId }} field="bio" value={d.profile.bio} label="bio" />
            <AdminDeleteButton model="profile" where={{ userId }} />
          </Row>
        )}
      </Section>

      {/* Settings */}
      <Section title="Settings" count={d.settings ? 1 : 0}>
        {d.settings && (
          <Row>
            <AdminField model="userSettings" where={{ userId }} field="theme" value={d.settings.theme} label="theme" />
            <AdminField model="userSettings" where={{ userId }} field="region" value={d.settings.region} label="region" />
            <AdminDeleteButton model="userSettings" where={{ userId }} label="Delete settings" />
          </Row>
        )}
      </Section>

      {/* Titles */}
      <Section title="Titles" count={d.titles.length}>
        {d.titles.map((t) => (
          <Row key={t.id}>
            <span className="min-w-0 flex-1 truncate">
              <AdminField model="title" where={{ id: t.id }} field="title" value={t.title} />
            </span>
            <AdminField model="title" where={{ id: t.id }} field="status" value={t.status} kind="select" options={["WATCHED", "WATCHLIST"]} />
            <AdminField model="title" where={{ id: t.id }} field="rating" value={t.rating} kind="number" label="★" />
            <AdminDeleteButton model="title" where={{ id: t.id }} />
          </Row>
        ))}
      </Section>

      {/* Reviews */}
      <Section title="Reviews" count={d.reviews.length}>
        {d.reviews.map((r) => (
          <Row key={r.id}>
            <span className="text-xs text-muted">tmdb {r.tmdbId}</span>
            <AdminField model="review" where={{ id: r.id }} field="rating" value={r.rating} kind="number" label="★" />
            <span className="min-w-0 flex-1">
              <AdminField model="review" where={{ id: r.id }} field="body" value={r.body} />
            </span>
            <AdminDeleteButton model="review" where={{ id: r.id }} />
          </Row>
        ))}
      </Section>

      {/* Comments */}
      <Section title="Comments" count={d.comments.length}>
        {d.comments.map((c) => (
          <Row key={c.id}>
            <span className="text-xs text-muted">review {c.reviewId.slice(0, 8)}</span>
            <span className="min-w-0 flex-1">
              <AdminField model="comment" where={{ id: c.id }} field="body" value={c.body} />
            </span>
            <AdminDeleteButton model="comment" where={{ id: c.id }} />
          </Row>
        ))}
      </Section>

      {/* Favorites */}
      <Section title="Favorites" count={d.favorites.length}>
        {d.favorites.map((f) => (
          <Row key={`${f.tmdbId}:${f.mediaType}`}>
            <span className="min-w-0 flex-1 truncate">
              {f.title} <span className="text-xs text-muted">({f.mediaType} {f.tmdbId})</span>
            </span>
            <AdminDeleteButton model="favorite" where={{ userId, tmdbId: f.tmdbId, mediaType: f.mediaType }} />
          </Row>
        ))}
      </Section>

      {/* Likes */}
      <Section title="Likes" count={d.likes.length}>
        {d.likes.map((l) => (
          <Row key={l.reviewId}>
            <span className="min-w-0 flex-1 font-mono text-xs text-muted">review {l.reviewId}</span>
            <AdminDeleteButton model="like" where={{ userId, reviewId: l.reviewId }} />
          </Row>
        ))}
      </Section>

      {/* Following */}
      <Section title="Following" count={d.following.length}>
        {d.following.map((f) => (
          <Row key={f.followingId}>
            <span className="min-w-0 flex-1 font-mono text-xs text-muted">{f.followingId}</span>
            <AdminDeleteButton model="follow" where={{ followerId: userId, followingId: f.followingId }} label="Unfollow" />
          </Row>
        ))}
      </Section>

      {/* Followers */}
      <Section title="Followers" count={d.followers.length}>
        {d.followers.map((f) => (
          <Row key={f.followerId}>
            <span className="min-w-0 flex-1 font-mono text-xs text-muted">{f.followerId}</span>
            <AdminDeleteButton model="follow" where={{ followerId: f.followerId, followingId: userId }} label="Remove" />
          </Row>
        ))}
      </Section>

      {/* Notifications */}
      <Section title="Notifications" count={d.notifications.length}>
        {d.notifications.map((n) => (
          <Row key={n.id}>
            <span className="min-w-0 flex-1 text-xs text-muted">
              {n.type} {n.read ? "(read)" : "(unread)"} · actor {n.actorId.slice(0, 10)}
            </span>
            <AdminDeleteButton model="notification" where={{ id: n.id }} />
          </Row>
        ))}
      </Section>
    </div>
  );
}
