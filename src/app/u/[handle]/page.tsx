import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { User } from "lucide-react";
import { auth } from "@clerk/nextjs/server";
import { ProfileReviewCard } from "@/components/profile-review-card";
import { getProfilePage } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { userId } = await auth();
  if (!userId) return {};
  const { handle } = await params;
  const data = await getProfilePage(handle, userId);
  if (!data) return {};
  return {
    title: `${data.profile.displayName} — Watchlog`,
    description: `${data.profile.displayName}'s reviews on Watchlog.`,
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { userId } = await auth.protect();
  const { handle } = await params;
  const data = await getProfilePage(handle, userId);
  if (!data) notFound();

  const { profile, reviews } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-8">
      <header className="flex items-center gap-4">
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
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-foreground sm:text-3xl">{profile.displayName}</h1>
          <p className="truncate text-sm text-muted">@{profile.handle}</p>
          <p className="mt-1 text-sm text-muted">
            {profile.reviewCount} {profile.reviewCount === 1 ? "review" : "reviews"}
          </p>
        </div>
      </header>

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
