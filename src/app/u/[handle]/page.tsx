import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { ProfileHeader } from "@/components/profile-header";
import { ProfileReviewCard } from "@/components/profile-review-card";
import { FollowButton } from "@/components/follow-button";
import { getProfilePage } from "@/lib/reviews";
import { getFollowStats } from "@/lib/follows";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { userId } = await auth();
  const { handle } = await params;
  const data = await getProfilePage(handle, userId);
  if (!data) return {};
  return {
    title: `${data.profile.displayName} — Watchlog`,
    description: `${data.profile.displayName}'s reviews on Watchlog.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  // Public, shareable page: a logged-out visitor sees the profile and its reviews, but no
  // follow/edit affordances. The follower/following sub-pages stay auth-protected.
  const { userId } = await auth();
  const { handle } = await params;
  const data = await getProfilePage(handle, userId);
  if (!data) notFound();

  const { profile, reviews } = data;
  const isOwner = userId != null && profile.userId === userId;
  const followStats = await getFollowStats(profile.userId, userId);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-8">
      <ProfileHeader profile={profile} isOwner={isOwner} />

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Link href={`/u/${profile.handle}/followers`} className="text-sm text-muted hover:text-foreground">
          <span className="font-semibold text-foreground">{followStats.followerCount}</span>{" "}
          {followStats.followerCount === 1 ? "follower" : "followers"}
        </Link>
        <Link href={`/u/${profile.handle}/following`} className="text-sm text-muted hover:text-foreground">
          <span className="font-semibold text-foreground">{followStats.followingCount}</span> following
        </Link>
        {userId == null ? (
          <Link
            href="/sign-in"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          >
            Sign in to follow
          </Link>
        ) : (
          !isOwner && <FollowButton targetUserId={profile.userId} initialIsFollowing={followStats.isFollowing} />
        )}
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">No reviews yet.</p>
        ) : (
          reviews.map((review) => <ProfileReviewCard key={review.id} review={review} />)
        )}
      </div>
    </div>
  );
}
