import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/favorites", () => ({ addFavorite: vi.fn(), removeFavorite: vi.fn(), MAX_FAVORITES: 12 }));

import { auth } from "@clerk/nextjs/server";
import { addFavorite, removeFavorite } from "@/lib/favorites";
import { POST, DELETE } from "./route";

const authMock = auth as unknown as Mock;
const req = (body: unknown) => ({ json: async () => body }) as unknown as Parameters<typeof POST>[0];

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "me" });
});

describe("POST /api/favorites", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await POST(req({ tmdbId: 550, mediaType: "MOVIE" }))).status).toBe(401);
  });

  it("400s on invalid input", async () => {
    expect((await POST(req({ tmdbId: "nope" }))).status).toBe(400);
    expect(addFavorite).not.toHaveBeenCalled();
  });

  it("404s when the title isn't in the user's library", async () => {
    (addFavorite as Mock).mockResolvedValue("no-title");
    expect((await POST(req({ tmdbId: 550, mediaType: "MOVIE" }))).status).toBe(404);
  });

  it("409s at the favorites cap", async () => {
    (addFavorite as Mock).mockResolvedValue("at-limit");
    expect((await POST(req({ tmdbId: 550, mediaType: "MOVIE" }))).status).toBe(409);
  });

  it("favorites a valid title", async () => {
    (addFavorite as Mock).mockResolvedValue("added");
    const res = await POST(req({ tmdbId: 550, mediaType: "MOVIE" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ favorited: true });
    expect(addFavorite).toHaveBeenCalledWith("me", 550, "MOVIE");
  });
});

describe("DELETE /api/favorites", () => {
  it("unfavorites a title", async () => {
    const res = await DELETE(req({ tmdbId: 550, mediaType: "MOVIE" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ favorited: false });
    expect(removeFavorite).toHaveBeenCalledWith("me", 550, "MOVIE");
  });
});
