"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { UserButton, useAuth } from "@clerk/nextjs";
import { Clapperboard, Menu, User, X } from "lucide-react";
import { SearchBar } from "./search-bar";
import { ThemeToggle } from "./theme-toggle";
import { GhostListLink } from "./ghost-list-link";
import { NotificationBell } from "./notification-bell";
import { cn } from "@/lib/utils";

// Notifications live in the header as a bell (with unread badge), not a plain nav link.
const NAV_LINKS = [
  { href: "/#watched", label: "Watched" },
  { href: "/#watchlist", label: "Watchlist" },
  { href: "/#discover", label: "Discover" },
  { href: "/feed", label: "Feed" },
  { href: "/stats", label: "Stats" },
  { href: "/me", label: "My profile" },
];

/**
 * The Clerk avatar menu with "Profile" surfaced as the first item — the pattern GitHub/Reddit/
 * Letterboxd use: the avatar opens the account menu rather than navigating, so Sign out stays
 * reachable. Re-declaring the default actions after the link fixes their order below Profile.
 * Points at /me, which resolves to the viewer's canonical /u/[handle].
 */
function AccountMenu() {
  return (
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link label="Profile" labelIcon={<User size={16} />} href="/me" />
        <UserButton.Action label="manageAccount" />
        <UserButton.Action label="signOut" />
      </UserButton.MenuItems>
    </UserButton>
  );
}

export function SiteHeader() {
  const { isLoaded, isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Until Clerk resolves, render neither the authed nav nor the guest CTAs — avoids a flash of the
  // wrong header. `<Show>` is a server-only async component, so a client header gates on useAuth.
  const signedIn = isLoaded && isSignedIn === true;
  const signedOut = isLoaded && isSignedIn === false;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-xl transition-colors",
        scrolled || menuOpen ? "border-border bg-background/80" : "border-transparent bg-transparent"
      )}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-6 sm:px-8">
        <div className="flex shrink-0 items-center justify-between gap-6">
          <Link href="/#top" className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <Clapperboard size={22} className="text-accent" />
            Watchlog
          </Link>
          {signedIn && (
            <>
              <nav className="hidden items-center gap-5 text-sm font-medium text-muted sm:flex">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                ))}
              </nav>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-foreground sm:hidden"
              >
                {menuOpen ? <X size={16} /> : <Menu size={16} />}
              </button>
            </>
          )}
          {/* Logged-out visitors (e.g. someone opening a shared link) get sign-in/up instead of the
              authed nav, which points at pages that would just bounce them back to sign-in. */}
          {signedOut && (
            <div className="flex items-center gap-1 sm:hidden">
              <GhostListLink />
              <Link href="/sign-up" className="rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90">
                Sign up
              </Link>
            </div>
          )}
        </div>
        <div className="flex flex-1 items-center gap-3 sm:justify-end">
          {signedIn && <SearchBar />}
          <div className="hidden items-center gap-3 sm:flex">
            <ThemeToggle />
            {signedIn && <NotificationBell />}
            {signedIn && <AccountMenu />}
            {signedOut && (
              <>
                <GhostListLink />
                <Link href="/sign-in" className="rounded-full px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground">
                  Sign in
                </Link>
                <Link href="/sign-up" className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 sm:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-2 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
            >
              {link.label}
            </Link>
          ))}
          {signedIn && (
            <div className="px-2 py-2.5">
              <NotificationBell showLabel onNavigate={() => setMenuOpen(false)} />
            </div>
          )}
          <div className="mt-1 flex items-center justify-between border-t border-border px-2 pt-3">
            <span className="text-sm text-muted">Theme</span>
            <ThemeToggle />
          </div>
          <div className="flex items-center justify-between border-t border-border px-2 pt-3">
            <span className="text-sm text-muted">Account</span>
            <AccountMenu />
          </div>
        </nav>
      )}
    </header>
  );
}
