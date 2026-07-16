import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({ clerkClient: vi.fn() }));
vi.mock("@/lib/migrate-user", () => ({ migrateUserData: vi.fn() }));

import { clerkClient } from "@clerk/nextjs/server";
import { migrateUserData } from "@/lib/migrate-user";
import { POST } from "./route";

const clerkMock = clerkClient as unknown as Mock;
const migrateMock = migrateUserData as unknown as Mock;

function req(body: unknown, authHeader?: string) {
  return {
    headers: { get: (h: string) => (h === "authorization" ? authHeader ?? null : null) },
    json: async () => body,
  } as unknown as Parameters<typeof POST>[0];
}
function withTargetUsers(data: { id: string }[]) {
  clerkMock.mockResolvedValue({ users: { getUserList: vi.fn().mockResolvedValue({ data }) } });
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.CRON_SECRET;
});

describe("POST /api/admin/migrate-user", () => {
  it("401s when a CRON_SECRET is configured and the Bearer token is wrong", async () => {
    process.env.CRON_SECRET = "s3cret";
    const res = await POST(req({ fromUserId: "dev" }, "Bearer nope"));
    expect(res.status).toBe(401);
    expect(migrateMock).not.toHaveBeenCalled();
  });

  it("400s without a fromUserId", async () => {
    withTargetUsers([{ id: "prod" }]);
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    expect(migrateMock).not.toHaveBeenCalled();
  });

  it("404s when the target account doesn't exist yet", async () => {
    withTargetUsers([]);
    expect((await POST(req({ fromUserId: "dev" }))).status).toBe(404);
  });

  it("400s when fromUserId is already the target account", async () => {
    withTargetUsers([{ id: "dev" }]);
    expect((await POST(req({ fromUserId: "dev" }))).status).toBe(400);
    expect(migrateMock).not.toHaveBeenCalled();
  });

  it("migrates from the given userId to the resolved target and returns counts", async () => {
    withTargetUsers([{ id: "prod-uid" }]);
    migrateMock.mockResolvedValue({ titles: 7, reviews: 2, profile: 1 });
    const res = await POST(req({ fromUserId: "user_dev123" }));
    expect(res.status).toBe(200);
    expect(migrateMock).toHaveBeenCalledWith("user_dev123", "prod-uid");
    await expect(res.json()).resolves.toMatchObject({ ok: true, from: "user_dev123", to: "prod-uid" });
  });
});
