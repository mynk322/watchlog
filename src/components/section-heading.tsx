import type { ReactNode } from "react";

/** Consistent profile section header: bold title, optional right-side meta, bottom divider. */
export function SectionHeading({ title, meta }: { title: string; meta?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border pb-2">
      <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
      {meta != null && <span className="shrink-0 text-xs text-muted">{meta}</span>}
    </div>
  );
}
