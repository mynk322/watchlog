import { clerkSetup } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { Pool } from "pg";
import dotenv from "dotenv";
import { USERS, type TestUser } from "./users";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

type Clerk = ReturnType<typeof createClerkClient>;

async function ensureUser(clerk: Clerk, u: TestUser): Promise<string> {
  const existing = await clerk.users.getUserList({ emailAddress: [u.email] });
  if (existing.data[0]) return existing.data[0].id; // idempotent — reuse across runs
  const created = await clerk.users.createUser({
    emailAddress: [u.email],
    password: u.password,
    firstName: u.firstName,
  });
  return created.id;
}

/** Wipes the test users' social rows so each run starts from a known-empty state. */
async function resetSocialData(userIds: string[]): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const ids = userIds;
    await pool.query(`DELETE FROM "Review" WHERE "userId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "ReviewLike" WHERE "userId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "Comment" WHERE "userId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "Follow" WHERE "followerId" = ANY($1) OR "followingId" = ANY($1)`, [ids]);
    await pool.query(`DELETE FROM "Notification" WHERE "userId" = ANY($1) OR "actorId" = ANY($1)`, [ids]);
    // Also drop profiles so the display-name/handle edit test starts from the lazily-created default.
    await pool.query(`DELETE FROM "Profile" WHERE "userId" = ANY($1)`, [ids]);
  } finally {
    await pool.end();
  }
}

export default async function globalSetup(): Promise<void> {
  // Makes a Clerk testing token available so setupClerkTestingToken() can bypass bot protection.
  // Pass the publishable key explicitly — the app only exposes it as NEXT_PUBLIC_*.
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY not set — cannot seed E2E users");
  const clerk = createClerkClient({ secretKey });

  const userIds: string[] = [];
  for (const u of Object.values(USERS)) userIds.push(await ensureUser(clerk, u));
  await resetSocialData(userIds);
}
