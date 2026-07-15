interface SplitBarProps {
  segments: { label: string; value: number; color: "accent" | "chart-blue" }[];
}

const COLOR_VAR: Record<"accent" | "chart-blue", string> = {
  accent: "var(--accent)",
  "chart-blue": "var(--chart-blue)",
};

export function SplitBar({ segments }: SplitBarProps) {
  const total = Math.max(1, segments.reduce((sum, s) => sum + s.value, 0));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted">
        {segments.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: COLOR_VAR[s.color] }}
            />
            {s.label} <span className="font-medium text-foreground">{s.value}</span>
          </span>
        ))}
      </div>
      <div className="flex h-5 w-full gap-[2px] overflow-hidden rounded-full bg-surface">
        {segments.map((s) => (
          <div
            key={s.label}
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: COLOR_VAR[s.color] }}
          />
        ))}
      </div>
    </div>
  );
}
