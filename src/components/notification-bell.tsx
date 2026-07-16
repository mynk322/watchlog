"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nav entry to /notifications with an unread-count badge. Refetches the count on every route change
 * (so visiting /notifications, which marks everything read, clears the badge on the next navigation).
 */
export function NotificationBell({ showLabel = false, onNavigate }: { showLabel?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    fetch("/api/notifications/unread-count")
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((d) => {
        if (active) setCount(typeof d.count === "number" ? d.count : 0);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <Link
      href="/notifications"
      onClick={onNavigate}
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className={cn(
        "relative inline-flex items-center gap-2 text-muted transition-colors hover:text-foreground",
        showLabel && "text-sm font-medium text-foreground"
      )}
    >
      <span className="relative inline-flex">
        <Bell size={showLabel ? 16 : 18} />
        {count > 0 && (
          <span
            data-testid="notification-badge"
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-none text-accent-foreground"
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </span>
      {showLabel && <span>Notifications</span>}
    </Link>
  );
}
