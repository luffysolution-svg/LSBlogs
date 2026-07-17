import type { MetadataRoute } from "next";
import { siteConfig } from "../siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.title} 管理台`,
    short_name: "LSBlogs CMS",
    description: "跨设备管理和发布 LSBlogs 内容",
    start_url: "/admin",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#6366f1",
    icons: [{ src: siteConfig.faviconUrl, sizes: "any", type: "image/png" }],
  };
}
