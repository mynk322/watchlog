import { User } from "lucide-react";
import { profileUrl } from "@/lib/tmdb-shared";
import type { CastMemberDTO, DirectorCreditDTO } from "@/lib/types";

interface CastListProps {
  cast: CastMemberDTO[] | null;
  directors: DirectorCreditDTO[] | null;
}

/** "Directed by …" / "Created by …" credit line, plus a scrollable strip of top-billed cast. */
export function CastList({ cast, directors }: CastListProps) {
  const hasCast = cast && cast.length > 0;
  const hasDirectors = directors && directors.length > 0;
  if (!hasCast && !hasDirectors) return null;

  const directorLabel = directors && directors[0]?.role === "Creator" ? "Created by" : "Directed by";

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-bold text-foreground">Cast &amp; crew</h2>

      {hasDirectors && (
        <p className="text-sm text-muted">
          {directorLabel}{" "}
          <span className="text-foreground">{directors!.map((d) => d.name).join(", ")}</span>
        </p>
      )}

      {hasCast && (
        <ul className="flex gap-4 overflow-x-auto pb-2">
          {cast!.map((person) => {
            const photo = profileUrl(person.profilePath);
            return (
              <li key={person.id} className="flex w-24 shrink-0 flex-col items-center gap-2 text-center">
                <div className="relative h-24 w-24 overflow-hidden rounded-full bg-surface-elevated">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- TMDB headshot, not worth the Image optimizer overhead
                    <img src={photo} alt={person.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User size={28} className="text-muted" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{person.name}</p>
                  {person.character && <p className="truncate text-[11px] text-muted">{person.character}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
