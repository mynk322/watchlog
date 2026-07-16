import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { toTitleDTO } from "@/lib/dto";
import { isValidRating } from "@/lib/validation";
import type { TitleStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: TitleStatus[] = ["WATCHED", "WATCHLIST"];

function isValidEpisodeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const data: Prisma.TitleUpdateInput = {};

  if (body?.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return Response.json({ error: "status must be WATCHED or WATCHLIST" }, { status: 400 });
    }
    data.status = body.status;
    data.watchedAt = body.status === "WATCHED" ? new Date() : null;
  }

  if (body?.rating !== undefined) {
    if (body.rating !== null && !isValidRating(body.rating)) {
      return Response.json({ error: "rating must be null or a multiple of 0.5 between 0.5 and 5" }, { status: 400 });
    }
    data.rating = body.rating;
  }

  if (body?.currentSeason !== undefined) {
    if (body.currentSeason !== null && !isValidEpisodeNumber(body.currentSeason)) {
      return Response.json({ error: "currentSeason must be null or a positive integer" }, { status: 400 });
    }
    data.currentSeason = body.currentSeason;
  }

  if (body?.currentEpisode !== undefined) {
    if (body.currentEpisode !== null && !isValidEpisodeNumber(body.currentEpisode)) {
      return Response.json({ error: "currentEpisode must be null or a positive integer" }, { status: 400 });
    }

    if (body.currentEpisode !== null) {
      const existing = await prisma.title.findUnique({
        where: { id, userId },
        select: { currentSeason: true, seasonEpisodeCounts: true },
      });
      if (!existing) return Response.json({ error: "Title not found" }, { status: 404 });

      const effectiveSeason = body.currentSeason ?? existing.currentSeason ?? 1;
      const cap = existing.seasonEpisodeCounts[effectiveSeason - 1];
      if (cap !== undefined && body.currentEpisode > cap) {
        return Response.json({ error: `currentEpisode exceeds season ${effectiveSeason}'s episode count (${cap})` }, { status: 400 });
      }
    }

    data.currentEpisode = body.currentEpisode;
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "provide status, rating, currentSeason, and/or currentEpisode to update" }, { status: 400 });
  }

  try {
    const title = await prisma.title.update({ where: { id, userId }, data });
    return Response.json({ title: toTitleDTO(title) });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Title not found" }, { status: 404 });
    }
    console.error("[PATCH /api/titles/[id]] update failed", err);
    return Response.json({ error: "Failed to update title" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    await prisma.title.delete({ where: { id, userId } });
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return Response.json({ error: "Title not found" }, { status: 404 });
    }
    console.error("[DELETE /api/titles/[id]] delete failed", err);
    return Response.json({ error: "Failed to delete title" }, { status: 500 });
  }
}
