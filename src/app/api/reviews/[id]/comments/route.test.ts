import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/profile", () => ({ ensureProfile: vi.fn() }));
vi.mock("@/lib/comments", () => ({
  getCommentsForReview: vi.fn(),
  createComment: vi.fn(),
  MAX_COMMENT_LENGTH: 2000,
}));
vi.mock("@/lib/prisma", () => ({ prisma: { review: { findUnique: vi.fn() } } }));
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { getCommentsForReview, createComment } from "@/lib/comments";
import { GET, POST } from "./route";

const authMock = auth as unknown as Mock;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const req = (body: unknown) => ({ json: async () => body }) as unknown as Parameters<typeof POST>[0];

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "viewer" });
});

describe("GET comments", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await GET(req(null), ctx("r1"))).status).toBe(401);
  });

  it("returns the review's comments", async () => {
    (getCommentsForReview as Mock).mockResolvedValue([{ id: "c1" }]);
    const res = await GET(req(null), ctx("r1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ comments: [{ id: "c1" }] });
    expect(getCommentsForReview).toHaveBeenCalledWith("r1", "viewer");
  });
});

describe("POST comment", () => {
  it("rejects an empty body", async () => {
    const res = await POST(req({ body: "   " }), ctx("r1"));
    expect(res.status).toBe(400);
    expect(createComment).not.toHaveBeenCalled();
  });

  it("rejects an over-long body", async () => {
    const res = await POST(req({ body: "x".repeat(2001) }), ctx("r1"));
    expect(res.status).toBe(400);
  });

  it("creates a comment (trimmed) and returns 201", async () => {
    (createComment as Mock).mockResolvedValue({ id: "c2", body: "hi" });
    const res = await POST(req({ body: "  hi  " }), ctx("r1"));
    expect(res.status).toBe(201);
    expect(createComment).toHaveBeenCalledWith("r1", "viewer", "hi");
  });
});
