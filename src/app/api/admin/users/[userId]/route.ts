import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin, getAdminUserDetail, deleteUserEverything } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<Response | null> {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return Response.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { userId } = await params;
  return Response.json({ detail: await getAdminUserDetail(userId) });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { userId: adminId } = await auth();
  const { userId } = await params;
  if (userId === adminId) {
    return Response.json({ error: "You can't delete your own admin account here" }, { status: 400 });
  }

  const result = await deleteUserEverything(userId);
  return Response.json({ ok: true, ...result });
}
