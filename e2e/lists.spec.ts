import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { USERS } from "./users";
import { ALICE_TITLE_ID, ALICE_TITLE_NAME } from "./global.setup";

test.describe.serial("custom lists", () => {
  const LIST_NAME = "Movie night";

  test("Alice creates a list from a title page and it holds the title", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);

    await page.goto(`/t/${ALICE_TITLE_ID}`);
    await expect(page.getByRole("heading", { name: ALICE_TITLE_NAME })).toBeVisible();

    // Open the "Add to list" menu and create a new list (which adds this title to it).
    await page.getByRole("button", { name: "Add to list" }).click();
    await page.getByPlaceholder("New list…").fill(LIST_NAME);
    await page.getByRole("button", { name: "Create list and add" }).click();

    // The new list now shows as containing the title (checkbox checked).
    await expect(page.getByRole("menuitemcheckbox", { name: LIST_NAME })).toHaveAttribute("aria-checked", "true");
    await page.close();
  });

  test("the list appears on Alice's profile and opens to show the title", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);

    await page.goto("/u/alice");
    await expect(page.getByRole("heading", { name: "Lists" })).toBeVisible();
    await page.getByRole("link", { name: new RegExp(LIST_NAME) }).click();

    await expect(page.getByRole("heading", { name: LIST_NAME })).toBeVisible();
    await expect(page.getByText(ALICE_TITLE_NAME).first()).toBeVisible();
    await page.close();
  });

  test("Alice removes the title, leaving the list empty", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);

    await page.goto("/u/alice");
    await page.getByRole("link", { name: new RegExp(LIST_NAME) }).click();
    await expect(page.getByRole("heading", { name: LIST_NAME })).toBeVisible();

    await page.getByRole("button", { name: `Remove ${ALICE_TITLE_NAME}` }).click();
    await expect(page.getByText("This list is empty", { exact: false })).toBeVisible();
    await page.close();
  });
});
