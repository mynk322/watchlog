interface BarChartItem {
  label: string;
  value: number;
}

interface BarChartProps {
  items: BarChartItem[];
  color: "accent" | "gold" | "chart-blue";
}

const COLOR_VAR: Record<BarChartProps["color"], string> = {
  accent: "var(--accent)",
  gold: "var(--gold)",
  "chart-blue": "var(--chart-blue)",
};

export function BarChart({ items, color }: BarChartProps) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const barColor = COLOR_VAR[color];

  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item) => {
        const pct = Math.max(2, (item.value / max) * 100);
        return (
          <div
            key={item.label}
            className="group flex items-center gap-3 rounded-md px-1.5 py-0.5 -mx-1.5 transition-colors hover:bg-surface-elevated"
          >
            <span className="w-28 shrink-0 truncate text-xs text-muted" title={item.label}>
              {item.label}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-r bg-surface-elevated/50">
              <div
                className="h-full rounded-r transition-[filter] duration-150 group-hover:brightness-110"
                style={{ width: `${pct}%`, backgroundColor: barColor }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
