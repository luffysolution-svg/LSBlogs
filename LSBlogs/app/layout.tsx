import "katex/dist/katex.min.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { MusicProvider } from "../components/MusicProvider";
import BackgroundSlider from "../components/BackgroundSlider";
import { siteConfig } from "../siteConfig";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.bio,
  keywords: ["个人博客", "技术博客", "二次元", "Next.js"],
  icons: {
    icon: siteConfig.faviconUrl,
    apple: siteConfig.faviconUrl,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full overflow-x-hidden">
        <ThemeProvider>
          <MusicProvider>
            <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
              {!siteConfig.useGradient && <BackgroundSlider />}
              <div
                className="absolute inset-0"
                style={{ background: "var(--backdrop-overlay)" }}
              />
              <div
                className="absolute inset-0"
                style={{ background: "var(--backdrop-effects)" }}
              />
            </div>

            <div className="relative z-10 min-h-screen">{children}</div>
          </MusicProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
