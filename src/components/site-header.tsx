"use client";

import { useEffect, useState } from "react";
import { Clapperboard } from "lucide-react";
import { SearchBar } from "./search-bar";
import { ThemeToggle } from "./theme-toggle";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#watched", label: "Watched" },
  { href: "#watchlist", label: "Watchlist" },
  { href: "#discover", label: "Discover" },
];

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

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
        "sticky top-0 z-40 flex flex-col gap-3 border-b px-4 py-3 backdrop-blur-xl transition-colors sm:flex-row sm:items-center sm:gap-6 sm:px-8",
        scrolled ? "border-border bg-background/80" : "border-transparent bg-transparent"
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-6">
        <a href="#top" className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
          <Clapperboard size={22} className="text-accent" />
          Watchlog
        </a>
        <nav className="hidden items-center gap-5 text-sm font-medium text-muted sm:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex flex-1 items-center gap-3 sm:justify-end">
        <SearchBar />
        <ThemeToggle />
      </div>
    </header>
  );
}
