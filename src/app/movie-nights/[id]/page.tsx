import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { MovieNightView } from "@/components/movie-night-view";
import { getMovieNight } from "@/lib/movie-nights";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const night = await getMovieNight(id, null);
  if (!night) return {};
  return { title: `${night.name} — Watchlog` };
}

export default async function MovieNightPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth.protect();
  const { id } = await params;
  const night = await getMovieNight(id, userId);
  if (!night) notFound();

  return <MovieNightView night={night} />;
}
