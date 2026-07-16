import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteList, updateList } from "@/lib/lists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const patch: { name?: string; description?: string | null } = {};
  if (typeof body?.name === "string") patch.name = body.name;
  if (body?.description === null || typeof body?.description === "string") patch.description = body.description;

  const ok = await updateList(userId, id, patch);
  if (!ok) return Response.json({ error: "List not found or invalid input" }, { status: 400 });
  return Response.json({ updated: true });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const ok = await deleteList(userId, id);
  if (!ok) return Response.json({ error: "List not found" }, { status: 404 });
  return Response.json({ deleted: true });
}
