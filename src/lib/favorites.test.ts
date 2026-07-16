import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    title: { findUnique: vi.fn(), findMany: vi.fn() },
    profileFavorite: { findUnique: vi.fn(), count: vi.fn(), upsert: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { addFavorite, removeFavorite, isFavorited, getFavorites, MAX_FAVORITES } from "./favorites";

const titleMock = prisma.title as unknown as Record<string, Mock>;
const favMock = prisma.profileFavorite as unknown as Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("addFavorite", () => {
  it("refuses a title the user hasn't added", async () => {
    titleMock.findUnique.mockResolvedValue(null);
    expect(await addFavorite("u1", 550, "MOVIE")).toBe("no-title");
    expect(favMock.upsert).not.toHaveBeenCalled();
  });

  it("refuses once the favorites cap is reached (for a new favorite)", async () => {
    titleMock.findUnique.mockResolvedValue({ title: "Fight Club", posterUrl: "/p.jpg", releaseYear: 1999 });
    favMock.findUnique.mockResolvedValue(null); // not already favorited
    favMock.count.mockResolvedValue(MAX_FAVORITES);
    expect(await addFavorite("u1", 550, "MOVIE")).toBe("at-limit");
    expect(favMock.upsert).not.toHaveBeenCalled();
  });

  it("pins a title, snapshotting its metadata", async () => {
    titleMock.findUnique.mockResolvedValue({ title: "Fight Club", posterUrl: "/p.jpg", releaseYear: 1999 });
    favMock.findUnique.mockResolvedValue(null);
    favMock.count.mockResolvedValue(3);
    favMock.upsert.mockResolvedValue({});
    expect(await addFavorite("u1", 550, "MOVIE")).toBe("added");
    expect(favMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: { userId: "u1", tmdbId: 550, mediaType: "MOVIE", title: "Fight Club", posterUrl: "/p.jpg", releaseYear: 1999 },
      })
    );
  });

  it("re-favoriting an existing pin skips the cap check", async () => {
    titleMock.findUnique.mockResolvedValue({ title: "Fight Club", posterUrl: null, releaseYear: 1999 });
    favMock.findUnique.mockResolvedValue({ userId: "u1", tmdbId: 550, mediaType: "MOVIE" });
    favMock.upsert.mockResolvedValue({});
    expect(await addFavorite("u1", 550, "MOVIE")).toBe("added");
    expect(favMock.count).not.toHaveBeenCalled();
  });
});

describe("removeFavorite", () => {
  it("swallows a delete of a non-existent pin", async () => {
    favMock.delete.mockRejectedValue(new Error("not found"));
    await expect(removeFavorite("u1", 1, "MOVIE")).resolves.toBeUndefined();
  });
});

describe("isFavorited", () => {
  it("reflects presence", async () => {
    favMock.findUnique.mockResolvedValueOnce({ userId: "u1" }).mockResolvedValueOnce(null);
    expect(await isFavorited("u1", 1, "MOVIE")).toBe(true);
    expect(await isFavorited("u1", 2, "MOVIE")).toBe(false);
  });
});

describe("getFavorites", () => {
  it("links a favorite to the viewer's own title row when they have one", async () => {
    favMock.findMany.mockResolvedValue([
      { tmdbId: 550, mediaType: "MOVIE", title: "Fight Club", posterUrl: "/p.jpg", releaseYear: 1999 },
      { tmdbId: 99, mediaType: "TV", title: "Show", posterUrl: null, releaseYear: 2020 },
    ]);
    titleMock.findMany.mockResolvedValue([{ id: "t-viewer-550", tmdbId: 550, mediaType: "MOVIE" }]);

    const favs = await getFavorites("owner", "viewer");
    expect(favs[0]).toMatchObject({ tmdbId: 550, title: "Fight Club", viewerTitleId: "t-viewer-550" });
    expect(favs[1]).toMatchObject({ tmdbId: 99, viewerTitleId: null });
  });

  it("returns [] and skips the viewer-title lookup when there are no favorites", async () => {
    favMock.findMany.mockResolvedValue([]);
    expect(await getFavorites("owner", "viewer")).toEqual([]);
    expect(titleMock.findMany).not.toHaveBeenCalled();
  });
});
