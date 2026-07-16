import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getFollowers } from "@/lib/follows";
import { UserListItem } from "@/components/user-list-item";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Followers — Watchlog",
};

export default async function FollowersPage({ params }: { params: Promise<{ handle: string }> }) {
  const { userId } = await auth.protect();
  const { handle } = await params;

  const profile = await prisma.profile.findUnique({ where: { handle } });
  if (!profile) notFound();

  const followers = await getFollowers(profile.userId, userId);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-8">
      <Link
        href={`/u/${profile.handle}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft size={14} />
        {profile.displayName}
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-foreground">Followers</h1>

      <div className="mt-6 flex flex-col gap-3">
        {followers.length === 0 ? (
          <p className="text-sm text-muted">No followers yet.</p>
        ) : (
          followers.map((user) => <UserListItem key={user.userId} user={user} />)
        )}
      </div>
    </div>
  );
}
