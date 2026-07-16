import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { USERS } from "./users";
import { ALICE_TITLE_TMDB, ALICE_TITLE_NAME } from "./global.setup";

test.describe.serial("group movie-night picker", () => {
  test("Alice hosts a movie night, adds a title, votes, and closes to reveal the winner", async ({ browser }) => {
    const page = await browser.newPage();
    // Auto-accept the confirm() dialogs used by close/delete.
    page.on("dialog", (d) => d.accept());
    await signIn(page, USERS.alice);

    // Create a movie night from the index.
    await page.goto("/movie-nights");
    await page.getByRole("button", { name: "New movie night" }).click();
    await page.getByPlaceholder("e.g. Friday movie night").fill("Friday movie night");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByRole("heading", { name: "Friday movie night" })).toBeVisible();
    const id = page.url().split("/movie-nights/")[1];
    expect(id).toBeTruthy();

    // Add a candidate via the API (Alice already owns Fight Club, so metadata resolves from the DB —
    // this keeps the test off the TMDB search path). Then reload to see it rendered.
    const res = await page.request.post(`/api/movie-nights/${id}/candidates`, {
      data: { tmdbId: ALICE_TITLE_TMDB, mediaType: "MOVIE" },
    });
    expect(res.ok()).toBeTruthy();
    await page.reload();
    await expect(page.getByText(ALICE_TITLE_NAME).first()).toBeVisible();

    // Vote for it.
    await page.getByRole("button", { name: `Vote for ${ALICE_TITLE_NAME}` }).click();
    await expect(page.getByRole("button", { name: `Remove vote for ${ALICE_TITLE_NAME}` })).toBeVisible();

    // Close voting → winner banner appears.
    await page.getByRole("button", { name: "Close voting" }).click();
    await expect(page.getByText("Winner", { exact: false })).toBeVisible();
    await expect(page.getByText(ALICE_TITLE_NAME).first()).toBeVisible();
    await page.close();
  });
});
