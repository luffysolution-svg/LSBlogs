"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { siteConfig } from "../siteConfig";
import { useTheme } from "./ThemeProvider";

interface GitHubCommentsProps {
  issueTerm?: string;
  compact?: boolean;
}

export default function GitHubComments({ issueTerm, compact = false }: GitHubCommentsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { isDark } = useTheme();
  const resolvedIssueTerm = issueTerm || pathname.replace(/\/$/, "") || "/";
  const commentsRepo = process.env.NEXT_PUBLIC_GITHUB_COMMENTS_REPO || siteConfig.githubComments.repo;
  const commentsLabel = process.env.NEXT_PUBLIC_GITHUB_COMMENTS_LABEL || siteConfig.githubComments.label;
  const isConfigured = /^[^/\s]+\/[^/\s]+$/.test(commentsRepo);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.replaceChildren();
    if (!isConfigured) return;

    const script = document.createElement("script");
    script.src = "https://utteranc.es/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("repo", commentsRepo);
    script.setAttribute("issue-term", resolvedIssueTerm);
    script.setAttribute("label", commentsLabel);
    script.setAttribute("theme", isDark ? "github-dark" : "github-light");
    container.appendChild(script);

    return () => container.replaceChildren();
  }, [commentsLabel, commentsRepo, isConfigured, isDark, resolvedIssueTerm]);

  return (
    <section className={`github-comments relative w-full ${compact ? "mt-5" : "mt-16"}`} aria-label="GitHub 评论区">
      <div className="pointer-events-none absolute -top-8 left-1/2 h-24 w-3/4 -translate-x-1/2 rounded-full bg-[#ff5a52]/10 blur-3xl dark:bg-[#ff5a52]/15" />
      <div className="relative border-t border-slate-200/60 pt-5 dark:border-white/10">
        {!compact && (
          <div className="mb-3 flex items-center justify-between gap-3 px-1 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            <span>GitHub transmission</span>
            <span className="text-[#ff5a52]">Issues linked</span>
          </div>
        )}
        {!isConfigured && (
          <p className="rounded-[12px] border border-dashed border-[var(--border)] px-4 py-5 text-sm text-[var(--muted-foreground)]">
            评论尚未启用。请配置 NEXT_PUBLIC_GITHUB_COMMENTS_REPO。
          </p>
        )}
        <div ref={containerRef} />
      </div>

      <style jsx global>{`
        .github-comments .utterances {
          max-width: 100%;
        }
        .github-comments .utterances-frame {
          color-scheme: light dark;
        }
      `}</style>
    </section>
  );
}
