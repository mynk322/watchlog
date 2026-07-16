import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { USERS } from "./users";

test("a signed-in user can reach the authed app", async ({ page }) => {
  await signIn(page, USERS.alice);

  await page.goto("/feed");
  await expect(page.getByRole("heading", { name: "Feed" })).toBeVisible();

  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: "Notifications" })).toBeVisible();
});

test("a signed-out visitor is redirected away from the feed", async ({ page }) => {
  await page.goto("/feed");
  await expect(page).toHaveURL(/sign-in/);
});
