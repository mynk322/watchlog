import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: { title: { upsert: vi.fn() } },
}));

// tmdb.ts is server-only and hits the network — stub the two enrich calls titles.ts makes.
vi.mock("@/lib/tmdb", () => ({
  getDetails: vi.fn(),
  getCredits: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getDetails, getCredits } from "@/lib/tmdb";
import { upsertTitleForUser } from "./titles";

const titleMock = prisma.title as unknown as Record<string, Mock>;
const detailsMock = getDetails as unknown as Mock;
const creditsMock = getCredits as unknown as Mock;

const DETAILS = {
  title: "Dangal",
  releaseYear: 2016,
  releaseDate: "2016-12-21",
  posterUrl: "/p.jpg",
  backdropUrl: "/b.jpg",
  overview: "wrestling",
  genres: ["Drama"],
  voteAverage: 8.2,
  runtime: 161,
  watchUrl: "http://watch",
  numberOfSeasons: null,
  seasonEpisodeCounts: [],
  creators: [{ id: 1, name: "Creator", role: "Creator", profilePath: null }],
};
const CREDITS = {
  cast: [{ id: 2, name: "Aamir", character: "Mahavir", profilePath: null }],
  directors: [{ id: 3, name: "Nitesh", role: "Director", profilePath: null }],
};

beforeEach(() => {
  vi.clearAllMocks();
  detailsMock.mockResolvedValue(DETAILS);
  creditsMock.mockResolvedValue(CREDITS);
  titleMock.upsert.mockResolvedValue({ id: "t1" });
});

describe("upsertTitleForUser", () => {
  it("enriches from TMDB and upserts on (tmdbId, mediaType, userId)", async () => {
    await upsertTitleForUser("user1", { tmdbId: 10, mediaType: "MOVIE", status: "WATCHLIST" });

    expect(titleMock.upsert).toHaveBeenCalledTimes(1);
    const arg = titleMock.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({
      tmdbId_mediaType_userId: { tmdbId: 10, mediaType: "MOVIE", userId: "user1" },
    });
    expect(arg.create).toMatchObject({
      userId: "user1",
      tmdbId: 10,
      mediaType: "MOVIE",
      title: "Dangal",
      status: "WATCHLIST",
      watchedAt: null,
    });
  });

  it("takes directors from credits for movies and from creators for TV", async () => {
    await upsertTitleForUser("u", { tmdbId: 1, mediaType: "MOVIE", status: "WATCHLIST" });
    expect(titleMock.upsert.mock.calls[0][0].create.directors).toEqual(CREDITS.directors);

    titleMock.upsert.mockClear();
    await upsertTitleForUser("u", { tmdbId: 2, mediaType: "TV", status: "WATCHLIST" });
    expect(titleMock.upsert.mock.calls[0][0].create.directors).toEqual(DETAILS.creators);
  });

  it("stamps watchedAt when creating a WATCHED title", async () => {
    await upsertTitleForUser("u", { tmdbId: 1, mediaType: "MOVIE", status: "WATCHED" });
    expect(titleMock.upsert.mock.calls[0][0].create.watchedAt).toBeInstanceOf(Date);
  });

  it("default conflict resolution overwrites status + watchedAt on update", async () => {
    await upsertTitleForUser("u", { tmdbId: 1, mediaType: "MOVIE", status: "WATCHED" });
    const arg = titleMock.upsert.mock.calls[0][0];
    expect(arg.update).toMatchObject({ status: "WATCHED" });
    expect(arg.update.watchedAt).toBeInstanceOf(Date);
  });

  it("keepExistingStatusOnConflict leaves status/watchedAt untouched (only refreshes static metadata)", async () => {
    await upsertTitleForUser(
      "u",
      { tmdbId: 1, mediaType: "MOVIE", status: "WATCHLIST" },
      { keepExistingStatusOnConflict: true }
    );
    const arg = titleMock.upsert.mock.calls[0][0];
    expect(arg.update).not.toHaveProperty("status");
    expect(arg.update).not.toHaveProperty("watchedAt");
    // Static fields are still refreshed so a merged title isn't left with stale cast/season data.
    expect(arg.update).toHaveProperty("seasonEpisodeCounts");
    expect(arg.update).toHaveProperty("topCast");
    expect(arg.update).toHaveProperty("directors");
  });

  it("propagates a TMDB failure to the caller", async () => {
    detailsMock.mockRejectedValue(new Error("tmdb down"));
    await expect(upsertTitleForUser("u", { tmdbId: 1, mediaType: "MOVIE", status: "WATCHLIST" })).rejects.toThrow(
      "tmdb down"
    );
    expect(titleMock.upsert).not.toHaveBeenCalled();
  });
});
