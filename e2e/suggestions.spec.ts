import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { USERS } from "./users";
import { ALICE_TITLE_ID, ALICE_TITLE_NAME } from "./global.setup";

test.describe.serial("recommend a title to a friend", () => {
  test("Alice recommends a title to Bob with a note", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);

    await page.goto(`/t/${ALICE_TITLE_ID}`);
    await expect(page.getByRole("heading", { name: ALICE_TITLE_NAME })).toBeVisible();

    await page.getByRole("button", { name: "Recommend" }).click();
    await page.getByPlaceholder("Add a note (optional)").fill("You'll love this");
    // Pick Bob from the recipient list and confirm it sent (check icon → button disabled).
    const bobRow = page.getByRole("button", { name: "Bob" });
    await bobRow.click();
    await expect(bobRow).toBeDisabled();
    await page.close();
  });

  test("Bob sees it in his inbox and can dismiss it", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.bob);

    await page.goto("/inbox");
    await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
    await expect(page.getByText("Alice", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(ALICE_TITLE_NAME).first()).toBeVisible();
    await expect(page.getByText("You'll love this", { exact: false })).toBeVisible();

    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText("Nothing yet", { exact: false })).toBeVisible();
    await page.close();
  });
});
