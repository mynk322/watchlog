import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { ListDetailView } from "@/components/list-detail-view";
import { getList } from "@/lib/lists";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const list = await getList(id, null);
  if (!list) return {};
  return {
    title: `${list.name} — Watchlog`,
    description: list.description ?? `A list by ${list.owner.displayName} on Watchlog.`,
  };
}

export default async function ListPage({ params }: { params: Promise<{ id: string }> }) {
  // Public, shareable page — a logged-out visitor can view a list read-only.
  const { userId } = await auth();
  const { id } = await params;
  const list = await getList(id, userId);
  if (!list) notFound();

  return <ListDetailView list={list} />;
}
