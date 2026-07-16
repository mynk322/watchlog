import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { isAdmin, listAdminUsers } from "@/lib/admin";
import { AdminDeleteUserButton } from "@/components/admin/admin-delete-user-button";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin — Watchlog", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const { userId } = await auth();
  if (!(await isAdmin(userId))) notFound(); // 404 for everyone but the admin

  const users = await listAdminUsers();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-8">
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-foreground">Admin · Users</h1>
        <span className="text-sm text-muted">{users.length} users with data</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Titles</th>
              <th className="p-3">Reviews</th>
              <th className="p-3">Comments</th>
              <th className="p-3">Likes</th>
              <th className="p-3">Favs</th>
              <th className="p-3">Followers</th>
              <th className="p-3">Following</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.userId} className="border-t border-border hover:bg-surface/50">
                <td className="p-3">
                  <Link href={`/admin/users/${u.userId}`} className="font-medium text-foreground hover:underline">
                    {u.displayName || u.clerkName || u.handle || "(no profile)"}
                  </Link>
                  <div className="text-xs text-muted">
                    {u.handle ? `@${u.handle} · ` : ""}
                    {u.email ?? u.userId}
                  </div>
                </td>
                <td className="p-3">{u.counts.titles}</td>
                <td className="p-3">{u.counts.reviews}</td>
                <td className="p-3">{u.counts.comments}</td>
                <td className="p-3">{u.counts.likes}</td>
                <td className="p-3">{u.counts.favorites}</td>
                <td className="p-3">{u.counts.followers}</td>
                <td className="p-3">{u.counts.following}</td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/users/${u.userId}`}
                      className="rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-surface-elevated"
                    >
                      Manage
                    </Link>
                    {u.userId !== userId && (
                      <AdminDeleteUserButton userId={u.userId} label={u.handle || u.email || u.userId} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
