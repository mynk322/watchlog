import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/likes", () => ({ likeReview: vi.fn(), unlikeReview: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { likeReview, unlikeReview } from "@/lib/likes";
import { POST, DELETE } from "./route";

const authMock = auth as unknown as Mock;

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}
const request = {} as Parameters<typeof POST>[0];

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "viewer" });
});

describe("POST /api/reviews/[id]/like", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(request, ctx("r1"));
    expect(res.status).toBe(401);
    expect(likeReview).not.toHaveBeenCalled();
  });

  it("likes the review for the current user", async () => {
    const res = await POST(request, ctx("r1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ liked: true });
    expect(likeReview).toHaveBeenCalledWith("viewer", "r1");
  });
});

describe("DELETE /api/reviews/[id]/like", () => {
  it("unlikes the review", async () => {
    const res = await DELETE(request, ctx("r1"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ liked: false });
    expect(unlikeReview).toHaveBeenCalledWith("viewer", "r1");
  });
});
