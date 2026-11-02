import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "FrameVerse — Every frame has a story",
    short_name: "FrameVerse",
    description: "A global home for photography and the people behind every frame.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#090a0d",
    theme_color: "#090a0d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
