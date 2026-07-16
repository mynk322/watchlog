import { test, expect, type Page } from "@playwright/test";
import { signIn, signOut } from "./helpers";
import { USERS } from "./users";

// Real TMDB ids so the merge/add paths can enrich them server-side.
const SHARE_TMDB_ID = 155; // The Dark Knight
const GHOST_TMDB_ID = 157336; // Interstellar
const GHOST_KEY = "watchlog:ghost-watchlist";

/** Ensures the signed-in user has the given title, returning its per-user Title id + display name. */
async function ensureTitle(page: Page, tmdbId: number): Promise<{ id: string; title: string }> {
  await page.request.post("/api/titles", {
    data: { tmdbId, mediaType: "MOVIE", status: "WATCHLIST" },
  });
  const res = await page.request.get("/api/titles?status=WATCHLIST");
  const { titles } = await res.json();
  const row = titles.find((t: { tmdbId: number }) => t.tmdbId === tmdbId);
  expect(row, `title ${tmdbId} should exist after add`).toBeTruthy();
  return { id: row.id, title: row.title };
}

async function deleteTitleById(page: Page, id: string): Promise<void> {
  await page.request.delete(`/api/titles/${id}`);
}

async function setGhostItem(page: Page, tmdbId: number): Promise<void> {
  await page.evaluate(
    ([key, id]) => {
      const item = {
        tmdbId: id,
        mediaType: "MOVIE",
        status: "WATCHLIST",
        title: "Ghost Saved Title",
        posterUrl: null,
        addedAt: "2026-07-16T00:00:00.000Z",
      };
      window.localStorage.setItem(key as string, JSON.stringify([item]));
    },
    [GHOST_KEY, tmdbId] as const
  );
}

test("a logged-out visitor can open a shared title page with a sign-up CTA (not bounced to sign-in)", async ({
  page,
}) => {
  // Seed a title as Alice, then view it signed out — the shared-link scenario.
  await signIn(page, USERS.alice);
  const { id, title } = await ensureTitle(page, SHARE_TMDB_ID);
  await signOut(page);

  await page.goto(`/t/${id}`);

  await expect(page).not.toHaveURL(/sign-in/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up free" })).toBeVisible();
  await expect(page.getByText("Track everything you watch")).toBeVisible();
  // No authoring UI or personal rating leaks to an anonymous viewer.
  await expect(page.getByText("Your rating")).toHaveCount(0);

  await signIn(page, USERS.alice);
  await deleteTitleById(page, id);
});

test("the /list page is public and renders a browser-saved ghost item", async ({ page }) => {
  await page.goto("/list"); // public route establishes the origin for localStorage
  await expect(page).not.toHaveURL(/sign-in/);

  await setGhostItem(page, GHOST_TMDB_ID);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Your list" })).toBeVisible();
  await expect(page.getByText("Ghost Saved Title")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up free" })).toBeVisible();
});

test("a ghost watchlist merges into the account on login, then clears", async ({ page }) => {
  // Start clean for this user so the assertion is unambiguous.
  await signIn(page, USERS.bob);
  const before = await ensureTitle(page, GHOST_TMDB_ID).catch(() => null);
  if (before) await deleteTitleById(page, before.id);
  await signOut(page);

  // Save a title as a logged-out ghost, then sign in — GhostMerge should replay it.
  await page.goto("/list");
  await setGhostItem(page, GHOST_TMDB_ID);
  await signIn(page, USERS.bob);
  // networkidle so the client <GhostMerge/> effect fires and its /api/titles/merge POST completes.
  await page.goto("/", { waitUntil: "networkidle" });

  await expect
    .poll(
      async () => {
        const res = await page.request.get("/api/titles?status=WATCHLIST");
        const { titles } = await res.json();
        return titles.some((t: { tmdbId: number }) => t.tmdbId === GHOST_TMDB_ID);
      },
      { timeout: 25_000, message: "ghost title should be merged into the watchlist" }
    )
    .toBe(true);

  // The ghost store is emptied once the merge succeeds.
  await expect
    .poll(async () => page.evaluate((k) => window.localStorage.getItem(k), GHOST_KEY), { timeout: 10_000 })
    .toBeNull();

  // Cleanup so re-runs start clean.
  const { id } = await ensureTitle(page, GHOST_TMDB_ID);
  await deleteTitleById(page, id);
});
