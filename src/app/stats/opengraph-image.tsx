import { ImageResponse } from "next/og";
import { auth } from "@clerk/nextjs/server";
import { getWatchStats } from "@/lib/stats";

export const alt = "My taste in numbers — Watchlog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const { userId } = await auth.protect();
  const stats = await getWatchStats(userId);
  const topGenre = stats.genreBreakdown[0]?.label;

  const tiles = [
    { label: "Movies watched", value: String(stats.moviesWatched) },
    { label: "Series watched", value: String(stats.seriesWatched) },
    { label: "Hours watched", value: stats.estimatedHours.toLocaleString() },
    { label: "Avg. rating", value: stats.averageRating ? `${stats.averageRating.toFixed(1)} / 5` : "—" },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 40,
          padding: "64px",
          background: "#0a0a0c",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(255,59,92,0.22), transparent 55%), radial-gradient(circle at 85% 0%, rgba(91,141,239,0.18), transparent 50%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 22, color: "#9a9aa3", letterSpacing: 2, textTransform: "uppercase" }}>
            Watchlog
          </span>
          <span style={{ fontSize: 48, fontWeight: 700, color: "#f5f5f7" }}>My taste in numbers</span>
          {topGenre && <span style={{ fontSize: 26, color: "#9a9aa3" }}>Mostly {topGenre.toLowerCase()}</span>}
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          {tiles.map((t) => (
            <div
              key={t.label}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                padding: "28px 32px",
                borderRadius: 20,
                background: "#141417",
                minWidth: 200,
              }}
            >
              <span style={{ fontSize: 20, color: "#9a9aa3" }}>{t.label}</span>
              <span style={{ fontSize: 44, fontWeight: 700, color: "#f5f5f7" }}>{t.value}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
