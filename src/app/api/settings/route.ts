import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  return Response.json({ settings: settings ?? null });
}

export async function PUT(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { theme, watchedSortKey, watchlistSortKey, region } = body ?? {};

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: { userId, theme, watchedSortKey, watchlistSortKey, region },
    update: { theme, watchedSortKey, watchlistSortKey, region },
  });

  return Response.json({ settings });
}
