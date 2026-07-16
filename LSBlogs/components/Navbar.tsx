"use client";

import { Menu, Moon, Sun, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { siteConfig } from "../siteConfig";
import { useTheme } from "./ThemeProvider";

const navigationLinks = [
  { name: "首页", href: "/" },
  { name: "文章", href: "/timeline" },
  { name: "项目", href: "/projects" },
  { name: "说说", href: "/moments" },
  { name: "照片", href: "/photowall" },
  { name: "音乐", href: "/music" },
  { name: "关于", href: "/about" },
  { name: "杂谈", href: "/chatter" },
  { name: "友链", href: "/friends" },
  { name: "灵境", href: "/tree" },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div className="glass-panel nav-panel mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="min-w-0 truncate text-base font-black tracking-[-0.035em] text-[var(--nav-foreground)] sm:text-lg"
        >
          {siteConfig.navTitle || siteConfig.authorName}
          <span className="mx-1.5 text-[var(--accent)]">{siteConfig.navSuffix || "/"}</span>
          <span className="font-semibold text-[var(--nav-muted)]">{siteConfig.navAfter}</span>
        </Link>

        <nav className="hidden items-center gap-4 xl:flex" aria-label="主导航">
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`nav-link ${isActive(link.href) ? "nav-link-active" : ""}`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={toggleTheme}
            className="icon-button hidden sm:inline-flex"
            aria-label={isDark ? "切换到浅色模式" : "切换到深色模式"}
          >
            {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
          </button>
          <button
            type="button"
            onClick={() => setIsOpen((value) => !value)}
            className="icon-button xl:hidden"
            aria-expanded={isOpen}
            aria-controls="mobile-navigation"
            aria-label={isOpen ? "关闭导航" : "打开导航"}
          >
            {isOpen ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <nav
          id="mobile-navigation"
          className="glass-panel nav-panel mx-auto mt-2 grid max-w-7xl grid-cols-2 gap-2 p-3 sm:grid-cols-3 xl:hidden"
          aria-label="移动端导航"
        >
          {navigationLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                isActive(link.href)
                  ? "bg-[var(--accent)] text-white"
                  : "text-[var(--nav-muted)] hover:bg-[var(--control-hover)] hover:text-[var(--nav-foreground)]"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[var(--nav-muted)] transition-colors hover:bg-[var(--control-hover)] hover:text-[var(--nav-foreground)]"
          >
            {isDark ? <Sun size={17} strokeWidth={1.8} /> : <Moon size={17} strokeWidth={1.8} />}
            {isDark ? "浅色模式" : "深色模式"}
          </button>
        </nav>
      )}
    </header>
  );
}
