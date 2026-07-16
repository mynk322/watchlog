import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/titles", () => ({ upsertTitleForUser: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { upsertTitleForUser } from "@/lib/titles";
import { POST } from "./route";

const authMock = auth as unknown as Mock;
const upsertMock = upsertTitleForUser as unknown as Mock;

function req(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

const item = (over = {}) => ({ tmdbId: 1, mediaType: "MOVIE", status: "WATCHLIST", ...over });

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "u1" });
  upsertMock.mockResolvedValue({});
});

describe("POST /api/titles/merge", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(req({ items: [item()] }));
    expect(res.status).toBe(401);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("400s when items is not an array", async () => {
    const res = await POST(req({ items: "nope" }));
    expect(res.status).toBe(400);
  });

  it("merges valid items with keepExistingStatusOnConflict and never downgrades", async () => {
    const res = await POST(req({ items: [item({ tmdbId: 1 }), item({ tmdbId: 2, mediaType: "TV" })] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ merged: 2, failed: 0, skipped: 0 });
    expect(upsertMock).toHaveBeenCalledTimes(2);
    expect(upsertMock).toHaveBeenCalledWith(
      "u1",
      { tmdbId: 1, mediaType: "MOVIE", status: "WATCHLIST" },
      { keepExistingStatusOnConflict: true }
    );
  });

  it("skips malformed items (bad mediaType/status/tmdbId), counting them as skipped", async () => {
    const res = await POST(
      req({
        items: [
          item({ tmdbId: 1 }),
          item({ mediaType: "BOOK" }),
          item({ status: "PLANNING" }),
          item({ tmdbId: "x" }),
        ],
      })
    );
    // Only the first item is valid; the other three are filtered out and reported as skipped.
    await expect(res.json()).resolves.toEqual({ merged: 1, failed: 0, skipped: 3 });
    expect(upsertMock).toHaveBeenCalledTimes(1);
  });

  it("caps the replay at 100 items and reports the rest as skipped", async () => {
    const items = Array.from({ length: 105 }, (_, i) => item({ tmdbId: i + 1 }));
    const res = await POST(req({ items }));
    const body = await res.json();
    expect(body.merged).toBe(100);
    expect(body.skipped).toBe(5);
    expect(upsertMock).toHaveBeenCalledTimes(100);
  });

  it("keeps going when one upsert throws, counting it as failed", async () => {
    upsertMock.mockRejectedValueOnce(new Error("tmdb")).mockResolvedValue({});
    const res = await POST(req({ items: [item({ tmdbId: 1 }), item({ tmdbId: 2 })] }));
    await expect(res.json()).resolves.toEqual({ merged: 1, failed: 1, skipped: 0 });
  });
});
