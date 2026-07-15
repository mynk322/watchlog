"use client";

import { useCallback, useEffect, useState } from "react";
import type { TitleDTO, TitleStatus } from "@/lib/types";

export function useTitles(status: TitleStatus) {
  const [titles, setTitles] = useState<TitleDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/titles?status=${status}`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setTitles(data.titles ?? []);
    }
    setLoading(false);
  }, [status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount / status change
    refresh();
    const handler = () => refresh();
    window.addEventListener("titles:changed", handler);
    return () => window.removeEventListener("titles:changed", handler);
  }, [refresh]);

  const updateStatus = useCallback(async (id: string, newStatus: TitleStatus) => {
    setTitles((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/titles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    window.dispatchEvent(new CustomEvent("titles:changed"));
  }, []);

  const removeTitle = useCallback(async (id: string) => {
    setTitles((prev) => prev.filter((t) => t.id !== id));
    await fetch(`/api/titles/${id}`, { method: "DELETE" });
    window.dispatchEvent(new CustomEvent("titles:changed"));
  }, []);

  const updateRating = useCallback(async (id: string, rating: number | null) => {
    setTitles((prev) => prev.map((t) => (t.id === id ? { ...t, rating } : t)));
    await fetch(`/api/titles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
  }, []);

  const updateProgress = useCallback(
    async (id: string, progress: { currentSeason?: number; currentEpisode?: number }) => {
      setTitles((prev) => prev.map((t) => (t.id === id ? { ...t, ...progress } : t)));
      await fetch(`/api/titles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(progress),
      });
    },
    []
  );

  return { titles, loading, updateStatus, removeTitle, updateRating, updateProgress };
}
