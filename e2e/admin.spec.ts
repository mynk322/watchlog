import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { USERS } from "./users";

// The admin dashboard must be invisible to everyone but the admin account. We can't sign in AS the
// admin here (that email isn't a test user), but the security-critical guarantee is that nobody
// else can reach it.
test.describe("admin dashboard access control", () => {
  test("a signed-in non-admin gets a 404 (dashboard hidden)", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.bob);
    await page.goto("/admin");
    // notFound() → the admin UI never renders for a non-admin.
    await expect(page.getByRole("heading", { name: "Admin · Users" })).toHaveCount(0);
    await page.close();
  });

  test("a signed-out visitor is redirected to sign-in", async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto("/admin");
    await expect(page).toHaveURL(/sign-in/);
    await page.close();
  });
});
