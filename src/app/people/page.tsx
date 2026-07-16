import Link from "next/link";
import type { Metadata } from "next";
import { User } from "lucide-react";
import { listPeople } from "@/lib/people";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "People — Watchlog",
  description: "Browse everyone sharing what they watch on Watchlog.",
};

// Public directory of everyone with a profile. Reachable logged out (see src/proxy.ts).
export default async function PeoplePage() {
  const people = await listPeople();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">People</h1>
        <p className="text-sm text-muted">Everyone sharing what they watch on Watchlog.</p>
      </div>

      {people.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">No profiles yet.</p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {people.map((person) => (
            <li key={person.userId}>
              <Link
                href={`/u/${person.handle}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-elevated"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
                  {person.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- avatar from Clerk, not worth the Image optimizer overhead
                    <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User size={20} className="text-muted" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{person.displayName}</p>
                  <p className="truncate text-xs text-muted">@{person.handle}</p>
                </div>
                <span className="shrink-0 text-xs text-muted">
                  {person.reviewCount} {person.reviewCount === 1 ? "review" : "reviews"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
