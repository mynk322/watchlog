"use client";

import { useState } from "react";

// Roughly the character length of ~3 lines; below this, clamping/toggle would add noise for nothing.
const CLAMP_THRESHOLD = 220;

/** A review body that clamps to ~3 lines with a read-more/less toggle when it's long. */
export function ReviewBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = body.length > CLAMP_THRESHOLD;

  return (
    <div className="text-sm leading-relaxed text-foreground">
      <p className={!expanded && isLong ? "line-clamp-3 whitespace-pre-wrap break-words" : "whitespace-pre-wrap break-words"}>
        {body}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-muted transition-colors hover:text-foreground cursor-pointer"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
