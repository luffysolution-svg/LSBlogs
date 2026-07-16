import fs from "fs";
import path from "path";
import matter from "gray-matter";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Camera, MessageCircle } from "lucide-react";

import Navbar from "../components/Navbar";
import CloudPlayer from "../components/CloudPlayer";
import { siteConfig } from "../siteConfig";
import { albums } from "../data/albums";

interface PostPreview {
  slug: string;
  title: string;
  description: string;
  cover: string;
  date: string;
  formattedDate: string;
  tags: string[];
}

const photoPreview = [
  "/images/backgrounds/bg-01-columbina.webp",
  "/images/backgrounds/bg-02-reze.webp",
  "/images/backgrounds/bg-07-naruto.webp",
  "/images/backgrounds/bg-08-tanjiro.webp",
];

function formatUpdateTime(dateString: string) {
  if (!dateString || dateString === "1970-01-01") return "最近更新";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getPosts(): PostPreview[] {
  const postsDirectory = path.join(process.cwd(), "posts");
  if (!fs.existsSync(postsDirectory)) return [];

  return fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => {
      const fullPath = path.join(postsDirectory, fileName);
      const { data, content } = matter(fs.readFileSync(fullPath, "utf8"));
      const date = typeof data.date === "string" ? data.date : "1970-01-01";

      return {
        slug: fileName.replace(/\.md$/, ""),
        title: typeof data.title === "string" ? data.title : "未命名文章",
        description:
          typeof data.description === "string"
            ? data.description
            : content.replace(/[#>*`]/g, "").trim().slice(0, 96),
        cover: typeof data.cover === "string" ? data.cover : siteConfig.defaultPostCover,
        date,
        formattedDate: formatUpdateTime(date),
        tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function countChatters() {
  const directory = path.join(process.cwd(), "chatters");
  if (!fs.existsSync(directory)) return 0;
  return fs.readdirSync(directory).filter((fileName) => fileName.endsWith(".md")).length;
}

export default function Home() {
  const allPosts = getPosts();
  const latestPosts = allPosts.slice(0, 3);
  const featuredPost = allPosts[0];
  const chatterCount = countChatters();
  const photoCount = albums.reduce((total, album) => total + album.photos.length, 0);

  return (
    <div className="min-h-[100dvh] pb-8">
      <Navbar />

      <main className="mx-auto w-full max-w-7xl px-4 pt-24 sm:px-6 lg:px-8">
        <section className="grid gap-5 lg:grid-cols-[0.88fr_1.32fr]">
          <div className="glass-panel flex min-h-[330px] flex-col justify-between p-6 sm:p-8">
            <div>
              <div className="mb-6 flex items-center gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-[12px] border border-white/30 shadow-lg">
                  <Image
                    src={siteConfig.avatarUrl}
                    alt={`${siteConfig.authorName} 的头像`}
                    fill
                    priority
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    Personal log
                  </p>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
                    {siteConfig.authorName}
                  </h1>
                </div>
              </div>

              <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-[-0.03em] text-[var(--foreground)] sm:text-4xl">
                次元之外，代码之中。
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
                {siteConfig.bio}
              </p>
            </div>

            <div className="mt-8">
              <Link
                href="/timeline"
                className="inline-flex h-11 items-center gap-2 rounded-[12px] bg-[var(--accent)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(201,68,64,0.24)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                浏览文章
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </Link>

              <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-[var(--border)] pt-5">
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <BookOpen className="size-3.5" aria-hidden="true" />文章
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">{allPosts.length}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <MessageCircle className="size-3.5" aria-hidden="true" />碎片
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">{chatterCount}</dd>
                </div>
                <div>
                  <dt className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <Camera className="size-3.5" aria-hidden="true" />照片
                  </dt>
                  <dd className="mt-1 text-lg font-semibold text-[var(--foreground)]">{photoCount}</dd>
                </div>
              </dl>
            </div>
          </div>

          <Link
            href={featuredPost ? `/posts/${featuredPost.slug}` : "/timeline"}
            className="group relative min-h-[330px] overflow-hidden rounded-[16px] border border-white/20 bg-slate-950 shadow-[0_24px_70px_rgba(3,8,18,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <Image
              src={featuredPost?.cover || siteConfig.defaultPostCover}
              alt=""
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.035]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,15,0.04)_12%,rgba(4,8,15,0.88)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8">
              <div className="mb-4 flex items-center gap-3 text-xs font-medium text-white/72">
                <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1 backdrop-blur-md">
                  {featuredPost?.tags[0] || "精选文章"}
                </span>
                <time>{featuredPost?.formattedDate || "等待第一篇文章"}</time>
              </div>
              <h2 className="max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">
                {featuredPost?.title || "从这里开始记录你的次元旅程"}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/76 sm:text-base">
                {featuredPost?.description || "写下第一篇文章，让灵感、技术与热爱在这里相遇。"}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                阅读全文 <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </section>

        <section className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[1.45fr_0.82fr_0.98fr]">
          <div className="glass-panel p-5 sm:p-6">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Latest</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">最近文章</h2>
              </div>
              <Link href="/timeline" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--accent)]">
                查看全部
              </Link>
            </div>

            {latestPosts.length > 0 ? (
              <div>
                {latestPosts.map((post, index) => (
                  <Link
                    key={post.slug}
                    href={`/posts/${post.slug}`}
                    className={`group flex items-center gap-4 py-3 ${index > 0 ? "border-t border-[var(--border)]" : ""}`}
                  >
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-[12px] bg-[var(--panel)]">
                      <Image
                        src={post.cover}
                        alt=""
                        fill
                        sizes="80px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)]">
                        {post.title}
                      </p>
                      <p className="mt-1 truncate text-xs text-[var(--muted-foreground)]">{post.description}</p>
                    </div>
                    <time className="hidden shrink-0 text-xs text-[var(--muted-foreground)] sm:block">{post.formattedDate}</time>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-10 text-sm text-[var(--muted-foreground)]">还没有文章，去管理端写下第一篇吧。</p>
            )}
          </div>

          <CloudPlayer />

          <Link
            href="/photowall"
            className="glass-panel group flex min-h-[290px] flex-col p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Gallery</p>
                <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">次元相册</h2>
              </div>
              <ArrowUpRight className="size-5 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
            </div>
            <div className="grid flex-1 grid-cols-2 grid-rows-2 gap-2 overflow-hidden rounded-[12px]">
              {photoPreview.map((src, index) => (
                <div key={src} className="relative min-h-20 overflow-hidden">
                  <Image
                    src={src}
                    alt={`动漫相册预览 ${index + 1}`}
                    fill
                    sizes="(max-width: 1024px) 50vw, 12vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          </Link>
        </section>
      </main>
    </div>
  );
}
