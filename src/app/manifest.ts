import type { MetadataRoute } from "next";

// Web app manifest — controls the icon and name shown when Watchlog is installed
// as a PWA (the "app icon" in Chrome's install / home-screen prompt). Icons reuse
// the generated brand marks from icon.tsx / apple-icon.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Watchlog",
    short_name: "Watchlog",
    description:
      "A personal, ever-growing log of everything watched — movies and series, sorted by year.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0c",
    theme_color: "#0a0a0c",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
