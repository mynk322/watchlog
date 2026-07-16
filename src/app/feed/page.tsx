import Link from "next/link";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { ProfileReviewCard } from "@/components/profile-review-card";
import { ActivityCard } from "@/components/activity-card";
import { getFeedReviews } from "@/lib/reviews";
import { getActivityFeed } from "@/lib/activity";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Feed — Watchlog",
};

export default async function FeedPage() {
  const { userId } = await auth.protect();
  const [reviews, activities] = await Promise.all([getFeedReviews(userId), getActivityFeed(userId)]);

  // One chronological timeline blending rich review cards with lightweight activity rows.
  const items = [
    ...reviews.map((r) => ({ kind: "review" as const, at: r.createdAt, review: r })),
    ...activities.map((a) => ({ kind: "activity" as const, at: a.createdAt, activity: a })),
  ].sort((x, y) => (x.at < y.at ? 1 : x.at > y.at ? -1 : 0));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-24 sm:px-8">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Feed</h1>
      <p className="mt-1 text-sm text-muted">Recent activity from people you follow.</p>

      <div className="mt-8 flex flex-col gap-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">
            Your feed is empty. Follow people from their profile — open a title, tap a reviewer&rsquo;s name, and hit{" "}
            <span className="font-medium text-foreground">Follow</span>. You can also browse{" "}
            <Link href="/#discover" className="text-accent hover:underline">
              Discover
            </Link>{" "}
            to find titles and reviewers.
          </div>
        ) : (
          items.map((item) =>
            item.kind === "review" ? (
              <ProfileReviewCard key={`r:${item.review.id}`} review={item.review} showAuthor />
            ) : (
              <ActivityCard key={`a:${item.activity.id}`} activity={item.activity} />
            )
          )
        )}
      </div>
    </div>
  );
}
