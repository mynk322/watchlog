import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { USERS } from "./users";

// The full social loop across two users. Serial: later steps depend on earlier ones.
test.describe.serial("follow, like, comment, feed, notifications", () => {
  let aliceHandle: string;
  const reviewBody = "Fight Club is a masterpiece of unreliable narration.";

  test("Alice writes a review", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);
    // Post through the real API using Alice's session — creates the review + her profile lazily.
    const res = await page.request.post("/api/reviews", {
      data: { tmdbId: 550, mediaType: "MOVIE", body: reviewBody, rating: 5 },
    });
    expect(res.ok()).toBeTruthy();
    const { review } = await res.json();
    aliceHandle = review.author.handle;
    expect(aliceHandle).toBeTruthy();
    await page.close();
  });

  test("Bob follows, likes, and comments on Alice's review", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.bob);
    await page.goto(`/u/${aliceHandle}`);

    await expect(page.getByText(reviewBody)).toBeVisible();

    // Follow
    await page.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(page.getByRole("button", { name: "Following" })).toBeVisible();

    // Like
    await page.getByRole("button", { name: "Like review" }).click();
    await expect(page.getByRole("button", { name: "Unlike review" })).toBeVisible();

    // Comment
    await page.getByRole("button", { name: /Comments/ }).click();
    await page.getByPlaceholder("Add a comment…").fill("Couldn't agree more.");
    await page.getByRole("button", { name: "Post" }).click();
    await expect(page.getByText("Couldn't agree more.")).toBeVisible();

    await page.close();
  });

  test("Bob's feed shows the followed user's review", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.bob);
    await page.goto("/feed");
    await expect(page.getByText(reviewBody)).toBeVisible();
    await expect(page.getByText(`@${aliceHandle}`)).toBeVisible();
    await page.close();
  });

  test("Alice sees an unread badge, then her notifications, then the badge clears", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);

    // Unread badge shows on any authed page (3 unread from Bob's follow/like/comment).
    await page.goto("/feed");
    await expect(page.getByTestId("notification-badge")).toBeVisible();

    // The notifications themselves (no Title row exists for the API-created review, so no title text).
    await page.goto("/notifications");
    await expect(page.getByText("started following you")).toBeVisible();
    await expect(page.getByText("liked your review")).toBeVisible();
    await expect(page.getByText(/commented on/)).toBeVisible();

    // Visiting the page marked them read; navigating away refetches and the badge is gone.
    await page.goto("/feed");
    await expect(page.getByTestId("notification-badge")).toHaveCount(0);
    await page.close();
  });

  test("Alice replies; Bob (a thread participant) is notified and the row deep-links to her profile", async ({ browser }) => {
    const alicePage = await browser.newPage();
    await signIn(alicePage, USERS.alice);
    await alicePage.goto(`/u/${aliceHandle}`);
    await alicePage.getByRole("button", { name: /Comments/ }).click();
    await alicePage.getByPlaceholder("Add a comment…").fill("Thanks for reading, everyone!");
    await alicePage.getByRole("button", { name: "Post" }).click();
    await expect(alicePage.getByText("Thanks for reading, everyone!")).toBeVisible();
    await alicePage.close();

    // Bob commented earlier, so Alice's reply notifies him even though it's not his review.
    const bobPage = await browser.newPage();
    await signIn(bobPage, USERS.bob);
    await bobPage.goto("/notifications");
    const row = bobPage.getByText(/commented on/);
    await expect(row).toBeVisible();
    await row.click();
    await expect(bobPage).toHaveURL(new RegExp(`/u/${aliceHandle}$`)); // deep-links to the review author
    await bobPage.close();
  });

  test("Bob edits then deletes his comment", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.bob);
    await page.goto(`/u/${aliceHandle}`);
    await page.getByRole("button", { name: /Comments/ }).click();
    await expect(page.getByText("Couldn't agree more.")).toBeVisible();

    // Edit
    await page.getByRole("button", { name: "Edit comment" }).click();
    await page.getByRole("textbox", { name: "Edit comment text" }).fill("On reflection, the ending is even better.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("On reflection, the ending is even better.")).toBeVisible();

    // Delete (auto-accept the confirm dialog)
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: "Delete comment" }).click();
    await expect(page.getByText("On reflection, the ending is even better.")).toHaveCount(0);
    await page.close();
  });

  test("Alice edits her profile display name and bio", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.alice);
    await page.goto("/me"); // resolves to /u/[handle]
    await page.getByRole("button", { name: "Edit profile" }).click();
    await page.getByLabel("Display name").fill("Alice in Cinemas");
    await page.getByLabel("Bio").fill("Noir and slow-burn enthusiast.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Alice in Cinemas" })).toBeVisible();
    await expect(page.getByText("Noir and slow-burn enthusiast.")).toBeVisible();
    await page.close();
  });

  test("Bob unfollows Alice and his feed empties", async ({ browser }) => {
    const page = await browser.newPage();
    await signIn(page, USERS.bob);
    await page.goto(`/u/${aliceHandle}`);
    await page.getByRole("button", { name: "Following" }).click();
    await expect(page.getByRole("button", { name: "Follow", exact: true })).toBeVisible();

    await page.goto("/feed");
    await expect(page.getByText(reviewBody)).toHaveCount(0);
    await page.close();
  });
});
