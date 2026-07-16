import { test, expect } from "@playwright/test";

// These flows are all logged-out — no sign-in or seeded data required.

test("the people directory is public (not bounced to sign-in)", async ({ page }) => {
  await page.goto("/people");
  await expect(page).not.toHaveURL(/sign-in/);
  await expect(page.getByRole("heading", { name: "People" })).toBeVisible();
});

test("a logged-out visitor can search TMDB from the header", async ({ page }) => {
  await page.goto("/people");

  const search = page.getByPlaceholder(/Search your collection/i);
  await expect(search).toBeVisible(); // search is offered to guests, not just signed-in users
  await search.fill("the dark knight");

  // Results come from TMDB via the now-public /api/search endpoint.
  await expect(page.getByText("The Dark Knight", { exact: false }).first()).toBeVisible({ timeout: 15_000 });
});
