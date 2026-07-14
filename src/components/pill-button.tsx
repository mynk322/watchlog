"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: "solid" | "outline";
}

export function PillButton({ icon, variant = "outline", className, children, ...props }: PillButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        variant === "solid"
          ? "bg-accent text-accent-foreground hover:brightness-110"
          : "border border-white/30 bg-white/10 text-white backdrop-blur hover:bg-white/20",
        className
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
