import { ImageResponse } from "next/og";

// Home-screen icon for iOS. Same brand mark as icon.tsx, sized for Apple touch icons
// with the dark app background so it reads well against light iOS wallpapers.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0c",
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 30,
            background: "#ff3b5c",
            color: "#ffffff",
            fontSize: 96,
            fontWeight: 700,
            fontFamily: "sans-serif",
            lineHeight: 1,
          }}
        >
          W
        </div>
      </div>
    ),
    { ...size }
  );
}
