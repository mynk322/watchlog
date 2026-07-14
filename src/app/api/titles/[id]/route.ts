import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { toTitleDTO } from "@/lib/dto";
import type { TitleStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES: TitleStatus[] = ["WATCHED", "WATCHLIST"];

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const status = body?.status as TitleStatus;

  if (!VALID_STATUSES.includes(status)) {
    return Response.json({ error: "status must be WATCHED or WATCHLIST" }, { status: 400 });
  }

  try {
    const title = await prisma.title.update({
      where: { id },
      data: { status, watchedAt: status === "WATCHED" ? new Date() : null },
    });
    return Response.json({ title: toTitleDTO(title) });
  } catch {
    return Response.json({ error: "Title not found" }, { status: 404 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.title.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "Title not found" }, { status: 404 });
  }
}
