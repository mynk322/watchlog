import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { SuggestionCard } from "@/components/suggestion-card";
import { getReceivedSuggestions } from "@/lib/suggestions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inbox — Watchlog",
};

export default async function InboxPage() {
  const { userId } = await auth.protect();
  const suggestions = await getReceivedSuggestions(userId);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-24 sm:px-8">
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Inbox</h1>
      <p className="mt-1 text-sm text-muted">Titles friends have recommended to you.</p>

      <div className="mt-6 flex flex-col gap-3">
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing yet. When someone recommends a title to you, it shows up here.
          </p>
        ) : (
          suggestions.map((s) => <SuggestionCard key={s.id} suggestion={s} />)
        )}
      </div>
    </div>
  );
}
