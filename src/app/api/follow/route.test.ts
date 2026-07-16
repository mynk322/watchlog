import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/follows", () => ({ follow: vi.fn(), unfollow: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/profile", () => ({ ensureProfile: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { follow, unfollow } from "@/lib/follows";
import { POST, DELETE } from "./route";

const authMock = auth as unknown as Mock;

function req(body: unknown) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "viewer" });
});

describe("POST /api/follow", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    const res = await POST(req({ userId: "u2" }));
    expect(res.status).toBe(401);
    expect(follow).not.toHaveBeenCalled();
  });

  it("400s without a target userId", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("400s and refuses to follow yourself", async () => {
    const res = await POST(req({ userId: "viewer" }));
    expect(res.status).toBe(400);
    expect(follow).not.toHaveBeenCalled();
  });

  it("follows a valid target", async () => {
    const res = await POST(req({ userId: "u2" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ isFollowing: true });
    expect(follow).toHaveBeenCalledWith("viewer", "u2");
  });
});

describe("DELETE /api/follow", () => {
  it("unfollows a valid target", async () => {
    const res = await DELETE(req({ userId: "u2" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ isFollowing: false });
    expect(unfollow).toHaveBeenCalledWith("viewer", "u2");
  });
});
