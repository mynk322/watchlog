import type { NextRequest } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { migrateUserData } from "@/lib/migrate-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Data is only ever migrated TO this account (limits blast radius); the source userId is supplied.
const TARGET_EMAIL = "mayankpadia50@gmail.com";

/**
 * One-time migration: re-keys all data owned by `fromUserId` (an old Clerk userId, e.g. from the
 * dev instance) to the current Clerk account for TARGET_EMAIL. Authorized by CRON_SECRET.
 * Idempotent. Body: { "fromUserId": "user_..." }.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const fromUserId = typeof body?.fromUserId === "string" ? body.fromUserId.trim() : "";
  if (!fromUserId) {
    return Response.json({ error: "fromUserId is required in the request body" }, { status: 400 });
  }

  const client = await clerkClient();
  const { data: users } = await client.users.getUserList({ emailAddress: [TARGET_EMAIL] });
  const target = users[0];
  if (!target) {
    return Response.json({ error: `No Clerk user found for ${TARGET_EMAIL} — sign up first` }, { status: 404 });
  }
  if (target.id === fromUserId) {
    return Response.json({ error: "fromUserId is already the target account — nothing to migrate" }, { status: 400 });
  }

  const counts = await migrateUserData(fromUserId, target.id);
  return Response.json({ ok: true, from: fromUserId, to: target.id, counts });
}
