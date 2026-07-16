import { SectionHeading } from "./section-heading";
import { ListCard } from "./list-card";
import { NewListButton } from "./new-list-button";
import type { ListSummaryDTO } from "@/lib/types";

/** The "Lists" section on a profile. Shows a grid of the owner's lists; owners get a create button. */
export function ListsSection({ lists, isOwner }: { lists: ListSummaryDTO[]; isOwner: boolean }) {
  // Nothing to show for a visitor when the owner has no lists.
  if (lists.length === 0 && !isOwner) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <SectionHeading title="Lists" meta={lists.length > 0 ? lists.length : undefined} />
        {isOwner && <NewListButton />}
      </div>
      {lists.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No lists yet. Create one to group titles however you like.</p>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list.id} list={list} />
          ))}
        </div>
      )}
    </section>
  );
}
