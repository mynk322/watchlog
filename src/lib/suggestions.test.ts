import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profile: { findUnique: vi.fn() },
    suggestion: { upsert: vi.fn(), findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    title: { findMany: vi.fn() },
  },
}));
vi.mock("@/lib/title-meta", () => ({ resolveTitleMeta: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/profile", () => ({ resolveReviewAuthors: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { resolveTitleMeta } from "@/lib/title-meta";
import { createNotification } from "@/lib/notifications";
import { resolveReviewAuthors } from "@/lib/profile";
import { sendSuggestion, dismissSuggestion, getReceivedSuggestions } from "./suggestions";

const profileMock = prisma.profile as unknown as Record<string, Mock>;
const suggestionMock = prisma.suggestion as unknown as Record<string, Mock>;
const titleMock = prisma.title as unknown as Record<string, Mock>;
const metaMock = resolveTitleMeta as unknown as Mock;
const notifyMock = createNotification as unknown as Mock;
const authorsMock = resolveReviewAuthors as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendSuggestion", () => {
  it("refuses to recommend to yourself", async () => {
    expect(await sendSuggestion("u", "u", 1, "MOVIE", null)).toBe("self");
    expect(suggestionMock.upsert).not.toHaveBeenCalled();
  });

  it("rejects an over-long message", async () => {
    expect(await sendSuggestion("a", "b", 1, "MOVIE", "x".repeat(501))).toBe("invalid");
  });

  it("returns no-recipient when the target has no profile", async () => {
    profileMock.findUnique.mockResolvedValue(null);
    expect(await sendSuggestion("a", "b", 1, "MOVIE", null)).toBe("no-recipient");
    expect(suggestionMock.upsert).not.toHaveBeenCalled();
  });

  it("snapshots metadata, upserts, and notifies the recipient", async () => {
    profileMock.findUnique.mockResolvedValue({ userId: "b" });
    metaMock.mockResolvedValue({ title: "Heat", posterUrl: "/h.jpg", releaseYear: 1995 });
    suggestionMock.upsert.mockResolvedValue({});

    expect(await sendSuggestion("a", "b", 949, "MOVIE", "  watch this  ")).toBe("sent");
    expect(suggestionMock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ title: "Heat", message: "watch this" }),
        update: expect.objectContaining({ message: "watch this", dismissedAt: null }),
      })
    );
    expect(notifyMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "b", actorId: "a", type: "SUGGESTION", tmdbId: 949, mediaType: "MOVIE" })
    );
  });
});

describe("dismissSuggestion", () => {
  it("returns false for a suggestion that isn't the user's", async () => {
    suggestionMock.findUnique.mockResolvedValue({ toUserId: "someone-else" });
    expect(await dismissSuggestion("u", "s1")).toBe(false);
    expect(suggestionMock.update).not.toHaveBeenCalled();
  });

  it("marks the suggestion dismissed for its recipient", async () => {
    suggestionMock.findUnique.mockResolvedValue({ toUserId: "u" });
    suggestionMock.update.mockResolvedValue({});
    expect(await dismissSuggestion("u", "s1")).toBe(true);
    expect(suggestionMock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "s1" }, data: expect.objectContaining({ dismissedAt: expect.any(Date) }) })
    );
  });
});

describe("getReceivedSuggestions", () => {
  it("enriches with sender, inLibrary, and a linkable titleId", async () => {
    suggestionMock.findMany.mockResolvedValue([
      {
        id: "s1",
        fromUserId: "a",
        tmdbId: 5,
        mediaType: "MOVIE",
        title: "Se7en",
        posterUrl: "/s.jpg",
        releaseYear: 1995,
        message: "so good",
        createdAt: new Date("2026-07-16T00:00:00Z"),
      },
    ]);
    authorsMock.mockResolvedValue(
      new Map([["a", { userId: "a", displayName: "Alice", handle: "alice", avatarUrl: null }]])
    );
    // First title.findMany = viewer's own rows (empty → not in library); second = any row for linking.
    titleMock.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "title-xyz", tmdbId: 5, mediaType: "MOVIE" }]);

    const [dto] = await getReceivedSuggestions("viewer");
    expect(dto.from.displayName).toBe("Alice");
    expect(dto.inLibrary).toBe(false);
    expect(dto.titleId).toBe("title-xyz");
    expect(dto.message).toBe("so good");
  });
});
