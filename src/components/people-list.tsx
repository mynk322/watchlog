import { User } from "lucide-react";
import { profileUrl } from "@/lib/tmdb-shared";
import type { PersonStat } from "@/lib/stats";

interface PeopleListProps {
  people: PersonStat[];
  color: "accent" | "gold" | "chart-blue";
}

const COLOR_VAR: Record<PeopleListProps["color"], string> = {
  accent: "var(--accent)",
  gold: "var(--gold)",
  "chart-blue": "var(--chart-blue)",
};

export function PeopleList({ people, color }: PeopleListProps) {
  const max = Math.max(1, ...people.map((p) => p.count));
  const barColor = COLOR_VAR[color];

  return (
    <div className="flex flex-col gap-3">
      {people.map((person) => {
        const pct = Math.max(4, (person.count / max) * 100);
        const photo = profileUrl(person.profilePath);
        return (
          <div key={person.id} className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-surface-elevated">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element -- small decorative avatar, not worth the Image optimizer overhead
                <img src={photo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User size={16} className="text-muted" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-sm font-medium text-foreground">{person.name}</p>
                <span className="shrink-0 text-xs font-medium tabular-nums text-muted">{person.count}</span>
              </div>
              {person.subtitle && <p className="truncate text-xs text-muted">{person.subtitle}</p>}
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
