import type { MetadataRoute } from "next";
import { APP_NAME } from "@/lib/config";

// Rendered per request so APP_NAME can be changed without rebuilding.
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME.length > 12 ? "Reels" : APP_NAME,
    description: "Save Instagram reels, share ideas and plan what the team makes next.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0a0a0e",
    theme_color: "#0a0a0e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Lets the installed app appear in Android's share sheet (e.g. from Instagram → Share).
    share_target: {
      action: "/share",
      method: "GET",
      params: { title: "title", text: "text", url: "url" },
    },
  };
}
