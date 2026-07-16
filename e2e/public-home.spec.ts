import { test, expect } from "@playwright/test";

test("the logged-out home is a browsable landing, not a bounce to sign-in", async ({ page }) => {
  await page.goto("/");

  // Not redirected to sign-in, and the landing renders real content.
  await expect(page).not.toHaveURL(/sign-in/);
  await expect(page.getByRole("heading", { name: /Track what you watch/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign up free" }).first()).toBeVisible();

  // "People on Watchlog" is populated (seeded profiles), so the page is never empty.
  await expect(page.getByRole("heading", { name: "People on Watchlog" })).toBeVisible();
});
