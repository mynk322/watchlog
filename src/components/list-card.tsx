import Link from "next/link";
import Image from "next/image";
import { ListMusic } from "lucide-react";
import type { ListSummaryDTO } from "@/lib/types";

/** A compact card for a list: a poster preview stack, the name, and the item count. */
export function ListCard({ list }: { list: ListSummaryDTO }) {
  return (
    <Link
      href={`/lists/${list.id}`}
      className="group flex flex-col gap-2 rounded-xl border border-border bg-surface p-3 transition-colors hover:bg-surface-elevated"
    >
      <div className="flex gap-1 overflow-hidden rounded-lg">
        {list.previewPosters.length > 0 ? (
          list.previewPosters.map((poster, i) => (
            <div key={i} className="relative aspect-2/3 flex-1 overflow-hidden rounded-md bg-surface-elevated">
              <Image src={poster} alt="" fill sizes="80px" className="object-cover" />
            </div>
          ))
        ) : (
          <div className="flex aspect-[8/3] w-full items-center justify-center rounded-md bg-surface-elevated">
            <ListMusic size={22} className="text-muted" />
          </div>
        )}
      </div>
      <div>
        <p className="truncate font-semibold text-foreground group-hover:text-accent" title={list.name}>
          {list.name}
        </p>
        <p className="text-xs text-muted">
          {list.itemCount} {list.itemCount === 1 ? "title" : "titles"}
        </p>
      </div>
    </Link>
  );
}
