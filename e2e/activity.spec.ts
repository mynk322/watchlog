import { test, expect } from "@playwright/test";
import { signIn } from "./helpers";
import { USERS } from "./users";

test.describe.serial("activity feed", () => {
  // Alice follows Bob (so the follow notification lands on Bob, keeping Alice's notifications — which
  // social.spec asserts on — untouched), Bob does a lightweight action, and it shows in Alice's feed.
  test("Alice sees a followed user's activity in her feed", async ({ browser }) => {
    // Bob creates a list — emits a LIST_CREATED activity (no TMDB, no shared-title collisions).
    const bob = await browser.newPage();
    await signIn(bob, USERS.bob);
    const res = await bob.request.post("/api/lists", { data: { name: "Bob's picks" } });
    expect(res.ok()).toBeTruthy();

    // Alice follows Bob, then sees his activity in her feed.
    const alice = await browser.newPage();
    await signIn(alice, USERS.alice);
    await alice.goto("/u/bob");
    const follow = alice.getByRole("button", { name: "Follow", exact: true });
    if (await follow.isVisible().catch(() => false)) {
      await follow.click();
      await expect(alice.getByRole("button", { name: "Following" })).toBeVisible();
    }

    await alice.goto("/feed");
    await expect(alice.getByText("created the list", { exact: false })).toBeVisible();
    await expect(alice.getByText("Bob's picks", { exact: false })).toBeVisible();

    // Clean up so later specs start from a known follow state: Alice unfollows Bob.
    await alice.goto("/u/bob");
    await alice.getByRole("button", { name: "Following" }).click();
    await expect(alice.getByRole("button", { name: "Follow", exact: true })).toBeVisible();

    await bob.close();
    await alice.close();
  });
});
