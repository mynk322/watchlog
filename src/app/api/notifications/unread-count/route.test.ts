import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ getUnreadCount: vi.fn() }));

import { auth } from "@clerk/nextjs/server";
import { getUnreadCount } from "@/lib/notifications";
import { GET } from "./route";

const authMock = auth as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ userId: "me" });
});

describe("GET /api/notifications/unread-count", () => {
  it("401s when signed out", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect((await GET()).status).toBe(401);
  });

  it("returns the unread count for the current user", async () => {
    (getUnreadCount as Mock).mockResolvedValue(4);
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ count: 4 });
    expect(getUnreadCount).toHaveBeenCalledWith("me");
  });
});
