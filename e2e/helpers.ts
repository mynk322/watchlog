import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { createClerkClient } from "@clerk/backend";
import dotenv from "dotenv";
import type { Page } from "@playwright/test";
import type { TestUser } from "./users";
import { withClerkRetry } from "./clerk-retry";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

function backend() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY not set");
  return createClerkClient({ secretKey });
}

// Memoize id lookups: the suite signs in ~15 times and Clerk's dev instance rate-limits, so we
// must not call getUserList on every sign-in.
const userIdCache = new Map<string, string>();

/** Resolves the seeded user's Clerk id (cached per worker). */
export async function userIdFor(user: TestUser): Promise<string> {
  const cached = userIdCache.get(user.email);
  if (cached) return cached;
  const list = await withClerkRetry(() => backend().users.getUserList({ emailAddress: [user.email] }));
  const found = list.data[0];
  if (!found) throw new Error(`Seeded user not found: ${user.email}`);
  userIdCache.set(user.email, found.id);
  return found.id;
}

/**
 * Signs a seeded user in via a backend-generated sign-in ticket. Tickets skip the first-factor /
 * bot-protection flow (which otherwise returns needs_client_trust), so this is reliable in CI.
 */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  const clerkBackend = backend();
  const userId = await userIdFor(user);
  const { token } = await withClerkRetry(() =>
    clerkBackend.signInTokens.createSignInToken({ userId, expiresInSeconds: 60 * 10 })
  );

  await setupClerkTestingToken({ page });
  await page.goto("/sign-in");
  await clerk.signIn({ page, signInParams: { strategy: "ticket", ticket: token } });
}

export async function signOut(page: Page): Promise<void> {
  await clerk.signOut({ page });
}
