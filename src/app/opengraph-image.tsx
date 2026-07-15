import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "Watchlog — everything I've watched";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const recent = await prisma.title.findMany({
    where: { status: "WATCHED", posterUrl: { not: null } },
    orderBy: [{ watchedAt: "desc" }, { addedAt: "desc" }],
    take: 5,
    select: { posterUrl: true },
  });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          background: "#0a0a0c",
          backgroundImage:
            "radial-gradient(circle at 15% 20%, rgba(255,59,92,0.25), transparent 55%), radial-gradient(circle at 85% 0%, rgba(245,196,81,0.18), transparent 50%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                display: "flex",
                width: 20,
                height: 20,
                borderRadius: 6,
                background: "#ff3b5c",
              }}
            />
            <span style={{ fontSize: 40, fontWeight: 700, color: "#f5f5f7" }}>Watchlog</span>
          </div>
          <span style={{ fontSize: 30, color: "#9a9aa3", maxWidth: 620 }}>
            Every movie and series I&rsquo;ve watched, in one place.
          </span>
        </div>

        {recent.length > 0 && (
          <div style={{ display: "flex", gap: 16, marginTop: 56 }}>
            {recent.map((r, i) => (
               
              <img
                key={i}
                src={r.posterUrl!}
                width={150}
                height={225}
                style={{ borderRadius: 12, objectFit: "cover" }}
                alt=""
              />
            ))}
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
