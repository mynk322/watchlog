import { clerkSetup } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import { Pool } from "pg";
import dotenv from "dotenv";
import { USERS, type TestUser } from "./users";
import { withClerkRetry } from "./clerk-retry";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

type Clerk = ReturnType<typeof createClerkClient>;

// A title seeded for Alice so the favorites flow has a real /t/[id] page to pin from.
export const ALICE_TITLE_ID = "e2e-alice-fightclub";
export const ALICE_TITLE_TMDB = 550;
export const ALICE_TITLE_NAME = "Fight Club";

async function ensureUser(clerk: Clerk, u: TestUser): Promise<string> {
  const existing = await withClerkRetry(() => clerk.users.getUserList({ emailAddress: [u.email] }));
  if (existing.data[0]) return existing.data[0].id; // idempotent — reuse across runs
  const created = await withClerkRetry(() =>
    clerk.users.createUser({ emailAddress: [u.email], password: u.password, firstName: u.firstName })
  );
  return created.id;
}

/** Wipes the test users' data and re-seeds Alice's profile + one title, for a deterministic start. */
async function resetAndSeed(aliceId: string, bobId: string, allIds: string[]): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await pool.query(`DELETE FROM "Review" WHERE "userId" = ANY($1)`, [allIds]);
    await pool.query(`DELETE FROM "ReviewLike" WHERE "userId" = ANY($1)`, [allIds]);
    await pool.query(`DELETE FROM "Comment" WHERE "userId" = ANY($1)`, [allIds]);
    await pool.query(`DELETE FROM "Follow" WHERE "followerId" = ANY($1) OR "followingId" = ANY($1)`, [allIds]);
    await pool.query(`DELETE FROM "Notification" WHERE "userId" = ANY($1) OR "actorId" = ANY($1)`, [allIds]);
    await pool.query(`DELETE FROM "ProfileFavorite" WHERE "userId" = ANY($1)`, [allIds]);
    await pool.query(`DELETE FROM "Title" WHERE "userId" = ANY($1)`, [allIds]);
    await pool.query(`DELETE FROM "Profile" WHERE "userId" = ANY($1)`, [allIds]);

    // Seed stable profiles so neither test user triggers a lazy ensureProfile → Clerk getUser
    // (Clerk's dev instance rate-limits). Alice also gets a title to favorite.
    await pool.query(
      `INSERT INTO "Profile" ("userId", "displayName", handle, "updatedAt") VALUES ($1, 'Alice', 'alice', now()), ($2, 'Bob', 'bob', now())`,
      [aliceId, bobId]
    );
    await pool.query(
      `INSERT INTO "Title" (id, "userId", "tmdbId", "mediaType", title, "releaseYear", status, rating, genres, "addedAt", "updatedAt")
       VALUES ($1, $2, $3, 'MOVIE'::"MediaType", $4, 1999, 'WATCHED'::"TitleStatus", 5, ARRAY['Drama'], now(), now())`,
      [ALICE_TITLE_ID, aliceId, ALICE_TITLE_TMDB, ALICE_TITLE_NAME]
    );
  } finally {
    await pool.end();
  }
}

export default async function globalSetup(): Promise<void> {
  // Makes a Clerk testing token available so setupClerkTestingToken() can bypass bot protection.
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY not set — cannot seed E2E users");
  const clerk = createClerkClient({ secretKey });

  const aliceId = await ensureUser(clerk, USERS.alice);
  const bobId = await ensureUser(clerk, USERS.bob);
  await resetAndSeed(aliceId, bobId, [aliceId, bobId]);
}
