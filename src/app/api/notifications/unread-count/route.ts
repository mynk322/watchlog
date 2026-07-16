import { auth } from "@clerk/nextjs/server";
import { getUnreadCount } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const count = await getUnreadCount(userId);
  return Response.json({ count });
}
