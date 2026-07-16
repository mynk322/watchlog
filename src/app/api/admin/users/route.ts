import { auth } from "@clerk/nextjs/server";
import { isAdmin, listAdminUsers } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const users = await listAdminUsers();
  return Response.json({ users });
}
