"use client";

import { usePathname } from "next/navigation";
import BackgroundSlider from "./BackgroundSlider";
import { MusicProvider } from "./MusicProvider";
import { ThemeProvider } from "./ThemeProvider";
import { siteConfig } from "../siteConfig";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCms = pathname === "/login" || pathname.startsWith("/admin");

  return (
    <ThemeProvider>
      {isCms ? (
        <div className="relative z-10 min-h-screen bg-slate-50 dark:bg-slate-950">{children}</div>
      ) : (
        <MusicProvider>
          <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
            {!siteConfig.useGradient && <BackgroundSlider />}
            <div className="absolute inset-0" style={{ background: "var(--backdrop-overlay)" }} />
            <div className="absolute inset-0" style={{ background: "var(--backdrop-effects)" }} />
          </div>
          <div className="relative z-10 min-h-screen">{children}</div>
        </MusicProvider>
      )}
    </ThemeProvider>
  );
}
