import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { upsertTitleForUser } from "@/lib/titles";
import type { MediaType, TitleStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_MEDIA_TYPES: MediaType[] = ["MOVIE", "TV"];
const VALID_STATUSES: TitleStatus[] = ["WATCHED", "WATCHLIST"];
// A logged-out watchlist that grew this large is almost certainly abuse — cap the replay.
const MAX_ITEMS = 100;

/**
 * Merges a logged-out visitor's browser-stored ghost watchlist into their account on login.
 * Idempotent: each item upserts on (tmdbId, mediaType, userId) and never downgrades a title the
 * user already has (keepExistingStatusOnConflict), so re-running or partial retries are safe.
 */
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const rawItems = Array.isArray(body?.items) ? body.items : null;
  if (!rawItems) return Response.json({ error: "items must be an array" }, { status: 400 });

  const items = rawItems.slice(0, MAX_ITEMS).filter((item: unknown) => {
    const it = item as { tmdbId?: unknown; mediaType?: unknown; status?: unknown };
    return (
      Number.isInteger(Number(it?.tmdbId)) &&
      VALID_MEDIA_TYPES.includes(it?.mediaType as MediaType) &&
      VALID_STATUSES.includes(it?.status as TitleStatus)
    );
  });

  let merged = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await upsertTitleForUser(
        userId,
        { tmdbId: Number(item.tmdbId), mediaType: item.mediaType, status: item.status },
        { keepExistingStatusOnConflict: true }
      );
      merged += 1;
    } catch {
      // One bad TMDB lookup shouldn't fail the whole merge — skip and keep going.
      failed += 1;
    }
  }

  return Response.json({ merged, failed, skipped: rawItems.length - items.length });
}
