import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "Watchlog title";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Satori's font has no star glyph, so the rating is drawn as pips rather than Unicode text. */
function RatingPips({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        const background =
          fill >= 1
            ? "#f5c451"
            : fill > 0
              ? `linear-gradient(90deg, #f5c451 ${fill * 100}%, rgba(245,196,81,0.25) ${fill * 100}%)`
              : "rgba(245,196,81,0.25)";
        return <div key={i} style={{ display: "flex", width: 24, height: 24, borderRadius: 6, background }} />;
      })}
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const title = await prisma.title.findUnique({ where: { id } });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "64px",
          background: "#0a0a0c",
          backgroundImage: "radial-gradient(circle at 85% 10%, rgba(255,59,92,0.22), transparent 55%)",
        }}
      >
        {title?.posterUrl && (
           
          <img
            src={title.posterUrl}
            width={340}
            height={510}
            style={{ borderRadius: 20, objectFit: "cover", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
            alt=""
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 620 }}>
          <span style={{ fontSize: 22, color: "#9a9aa3", letterSpacing: 2, textTransform: "uppercase" }}>
            Watchlog
          </span>
          <span style={{ fontSize: 56, fontWeight: 700, color: "#f5f5f7", lineHeight: 1.1 }}>
            {title?.title ?? "Untitled"}
          </span>
          {title?.releaseYear && <span style={{ fontSize: 28, color: "#9a9aa3" }}>{title.releaseYear}</span>}
          {title?.rating && <RatingPips rating={title.rating} />}
        </div>
      </div>
    ),
    { ...size }
  );
}
