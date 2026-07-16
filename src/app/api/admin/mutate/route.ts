import type { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@/generated/prisma/client";
import { isAdmin } from "@/lib/admin";
import { adminMutate, AdminMutateError, type AdminMutateInput } from "@/lib/admin-mutate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await isAdmin(userId))) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as AdminMutateInput | null;
  if (!body || (body.op !== "update" && body.op !== "delete")) {
    return Response.json({ error: "op must be 'update' or 'delete'" }, { status: 400 });
  }

  try {
    const result = await adminMutate(body);
    return Response.json({ ok: true, count: result.count });
  } catch (err) {
    if (err instanceof AdminMutateError) return Response.json({ error: err.message }, { status: 400 });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return Response.json({ error: "That value conflicts with an existing record (e.g. handle taken)" }, { status: 409 });
    }
    console.error("[POST /api/admin/mutate] failed", err);
    return Response.json({ error: "Mutation failed" }, { status: 500 });
  }
}
