"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clapperboard, Menu, X } from "lucide-react";
import { SearchBar } from "./search-bar";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/#watched", label: "Watched" },
  { href: "/#watchlist", label: "Watchlist" },
  { href: "/#discover", label: "Discover" },
  { href: "/stats", label: "Stats" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
        </div>
        <div className="flex flex-1 items-center gap-3 sm:justify-end">
          <SearchBar />
          <div className="hidden sm:block">
            <ThemeToggle />
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
          <div className="mt-1 flex items-center justify-between border-t border-border px-2 pt-3">
            <span className="text-sm text-muted">Theme</span>
            <ThemeToggle />
          </div>
        </nav>
      )}
    </header>
  );
}
