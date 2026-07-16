import { ImageResponse } from "next/og";

// Browser-tab favicon. Kept in sync with the brand mark used in opengraph-image.tsx
// and manifest.ts: a rounded accent-red square with a white "W" for Watchlog.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "#ff3b5c",
          color: "#ffffff",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: "sans-serif",
          lineHeight: 1,
        }}
      >
        W
      </div>
    ),
    { ...size }
  );
}
