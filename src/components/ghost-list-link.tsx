"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import { getGhostServerSnapshot, getGhostSnapshot, subscribeGhost } from "@/lib/ghost-watchlist";
import { cn } from "@/lib/utils";

/** "Your list" link for logged-out visitors, with a live count of browser-saved titles. */
export function GhostListLink({ className }: { className?: string }) {
  const count = useSyncExternalStore(subscribeGhost, getGhostSnapshot, getGhostServerSnapshot).length;

  return (
    <Link
      href="/list"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-foreground",
        className
      )}
    >
      <ListChecks size={16} />
      List
      {count > 0 && (
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-accent-foreground">
          {count}
        </span>
      )}
    </Link>
  );
}
