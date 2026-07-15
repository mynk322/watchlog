"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

interface ShareButtonProps {
  /** Path (e.g. "/t/abc123") or absolute URL to share. */
  url: string;
  title: string;
  text?: string;
  className?: string;
  variant?: "default" | "pill";
}

const VARIANT_CLASSES: Record<NonNullable<ShareButtonProps["variant"]>, string> = {
  default:
    "inline-flex items-center gap-2 rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-elevated cursor-pointer",
  pill: "inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-3 py-1.5 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20 cursor-pointer",
};

export function ShareButton({ url, title, text, className, variant = "default" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const absoluteUrl = new URL(url, window.location.origin).toString();

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: absoluteUrl });
        return;
      } catch {
        // user cancelled or share failed — fall through to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing more we can do
    }
  }

  const iconSize = variant === "pill" ? 12 : 16;

  return (
    <button type="button" onClick={handleShare} className={className ?? VARIANT_CLASSES[variant]}>
      {copied ? <Check size={iconSize} /> : <Share2 size={iconSize} />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
