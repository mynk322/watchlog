import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { USERS } from "./users";
import { ALICE_TITLE_ID, ALICE_TITLE_NAME } from "./global.setup";

test.describe.serial("profile favorites", () => {
  test("Alice favorites a title and it appears on her profile", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);

    await page.goto(`/t/${ALICE_TITLE_ID}`);
    await expect(page.getByRole("heading", { name: ALICE_TITLE_NAME })).toBeVisible();

    await page.getByRole("button", { name: "Add to favorites" }).click();
    await expect(page.getByRole("button", { name: "Remove from favorites" })).toBeVisible();

    await page.goto("/u/alice");
    await expect(page.getByRole("heading", { name: "Favorites" })).toBeVisible();
    await expect(page.getByText(ALICE_TITLE_NAME).first()).toBeVisible();
    await page.close();
  });

  test("Alice can unfavorite it from the title page", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);
    await page.goto(`/t/${ALICE_TITLE_ID}`);
    await page.getByRole("button", { name: "Remove from favorites" }).click();
    await expect(page.getByRole("button", { name: "Add to favorites" })).toBeVisible();
    await page.close();
  });
});
