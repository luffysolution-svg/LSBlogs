import matter from "gray-matter";
import JSON5 from "json5";
import { marked } from "marked";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { stringify as stringifyYaml } from "yaml";
import type { CmsDraft, CmsOperation, ContentType, PendingChange } from "./types";

const INVALID_FILE_CHARS = /[<>:"/\\|?*\u0000-\u001f]/;
let turndown: TurndownService | undefined;

function getTurndown(): TurndownService {
  if (!turndown) {
    turndown = new TurndownService({
      codeBlockStyle: "fenced",
      headingStyle: "atx",
      bulletListMarker: "-",
    });
    turndown.use(gfm);
    turndown.addRule("emptyParagraph", {
      filter: (node) => node.nodeName === "P" && !(node.textContent || "").trim(),
      replacement: () => "\n\n",
    });
  }
  return turndown;
}

export function normalizeDocumentId(raw: unknown, prefix = "post"): string {
  let value = String(raw || "").trim().replace(/\.md$/i, "");
  if (!value || value === "new") value = `${prefix}_${Date.now()}`;
  if (value === "." || value === ".." || INVALID_FILE_CHARS.test(value)) {
    throw new Error("内容 ID 包含非法字符");
  }
  return value;
}

export function documentPath(type: ContentType, id: unknown): string {
  if (type === "about") return "app/about/about.md";
  const folders: Record<Exclude<ContentType, "about">, string> = {
    post: "posts",
    chatter: "chatters",
    moment: "moments",
  };
  return `${folders[type]}/${normalizeDocumentId(id, type)}.md`;
}

function frontmatter(data: Record<string, unknown>, body: string): string {
  return `---\n${stringifyYaml(data, {
    defaultKeyType: "PLAIN",
    defaultStringType: "QUOTE_DOUBLE",
  }).trimEnd()}\n---\n\n${body.trim()}\n`;
}

export function draftToMarkdown(draft: CmsDraft): { id: string; path: string; content: string } {
  const type = draft.type || "post";
  const id = type === "about" ? "about" : normalizeDocumentId(draft.id, type);
  const raw = String(draft.content || "")
    .replace(/<p>&#12288;<\/p>/gi, "<br><br>")
    .replace(/<p>\s*<\/p>/gi, "<br><br>");
  const body = getTurndown().turndown(raw).replace(/\n{3,}/g, "\n\n");
  const date = String(draft.date || "").trim();
  const finalDate = date
    ? date.length <= 10
      ? `${date} ${new Date().toTimeString().slice(0, 8)}`
      : date
    : new Date().toISOString().replace("T", " ").slice(0, 19);
  const data = {
    title: String(draft.title || ""),
    date: finalDate,
    tags: Array.isArray(draft.tags) ? draft.tags.map(String) : [],
    mood: String(draft.mood || ""),
    cover: String(draft.cover || ""),
    description: String(draft.description || ""),
  };
  return { id, path: documentPath(type, id), content: frontmatter(data, body) };
}

export function momentToMarkdown(payload: Record<string, unknown>) {
  const id = normalizeDocumentId(payload.id, "moment");
  const data: Record<string, unknown> = {
    id,
    date: String(payload.date || new Date().toISOString()),
  };
  if (payload.location) data.location = String(payload.location);
  if (Array.isArray(payload.images) && payload.images.length) {
    data.images = payload.images.map(String);
  }
  return {
    id,
    path: documentPath("moment", id),
    content: frontmatter(data, String(payload.content || "")),
  };
}

function extractAssignedLiteral(source: string, exportName: string, open: string, close: string): string {
  const assignment = new RegExp(`\\b${exportName}\\b[^=]*=`).exec(source);
  if (!assignment) throw new Error(`没有找到 ${exportName} 数据导出`);
  const start = source.indexOf(open, assignment.index + assignment[0].length);
  if (start < 0) throw new Error(`${exportName} 数据格式无效`);
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${exportName} 数据没有正确结束`);
}

export function parseTypescriptArray<T>(source: string, exportName: string): T[] {
  return JSON5.parse(extractAssignedLiteral(source, exportName, "[", "]")) as T[];
}

export function parseSiteConfig(source: string): Record<string, unknown> {
  const literal = extractAssignedLiteral(source, "siteConfig", "{", "}")
    .replace(/\s+as\s+\{[^{}]*\}\[\]/g, "")
    .replace(/\s+as\s+const\b/g, "");
  return JSON5.parse(literal) as Record<string, unknown>;
}

export function serializeAlbums(value: unknown): string {
  const albums = Array.isArray(value) ? value : [];
  return `// 本文件由 LSBlogs 在线管理端自动生成，请勿手动修改
export interface Photo { url: string; caption?: string; }
export interface Album { id: string; title: string; description: string; cover: string; date: string; photos: Photo[]; }

export const albums: Album[] = ${JSON.stringify(albums, null, 2)};
`;
}

export function serializeFriends(value: unknown): string {
  const friends = Array.isArray(value) ? value : [];
  return `// 本文件由 LSBlogs 在线管理端自动生成
export interface Friend { id: string; name: string; url: string; description: string; avatar: string; themeColor: string; }

export const friendsData: Friend[] = ${JSON.stringify(friends, null, 2)};
`;
}

export function serializeProjects(value: unknown): string {
  const projects = Array.isArray(value) ? value : [];
  return `// 本文件由 LSBlogs 在线管理端自动生成
export type Project = {
  id: string;
  name: string;
  description: string;
  icon: string;
  githubUrl: string;
  tags: string[];
};

export const projectsData: Project[] = ${JSON.stringify(projects, null, 2)};
`;
}

export function serializeSiteConfig(config: Record<string, unknown>): string {
  return `// siteConfig.ts - 由 LSBlogs 在线管理端维护

export type SiteConfig = {
  title: string;
  faviconUrl: string;
  authorName: string;
  bio: string;
  navTitle: string;
  navSuffix: string;
  navAfter: string;
  avatarUrl: string;
  useGradient: boolean;
  themeColors: string[];
  bgImages: string[];
  defaultPostCover: string;
  photoWallImage: string;
  cloudMusicIds: string[];
  social: Record<string, string>;
  counts: { photos: number };
  chatterTitle: string;
  chatterDescription: string;
  danmakuList: string[];
  githubComments: { repo: string; label: string };
  buildDate: string;
  footerBadges: Array<{ name: string; color: string; svg: string }>;
  icpConfig: { name: string; link: string };
  geminiConfig: { modelId: string; systemPrompt: string; maxOutputTokens: number; temperature: number };
  friendLinkApplyFormat: string;
  enableLevelSystem: boolean;
  [key: string]: unknown;
};

export const siteConfig: SiteConfig = ${JSON.stringify(config, null, 2)};
`;
}

export async function markdownToDraft(
  type: ContentType,
  id: string,
  raw: string,
): Promise<CmsDraft> {
  const parsed = matter(raw);
  return {
    id,
    type,
    title: type === "about" ? "关于我" : String(parsed.data.title || ""),
    date: String(parsed.data.date || ""),
    tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [],
    cover: String(parsed.data.cover || ""),
    mood: String(parsed.data.mood || ""),
    description: String(parsed.data.description || ""),
    content: await marked.parse(parsed.content),
  };
}

export function markdownItem(path: string, type: Exclude<ContentType, "about">, raw: string) {
  const parsed = matter(raw);
  const body = parsed.content.trim();
  const excerpt = body.replace(/[#*_`>\[\]()!-]/g, " ").replace(/\s+/g, " ").slice(0, 140);
  const item: Record<string, unknown> = {
    id: path.split("/").pop()?.replace(/\.md$/i, "") || "",
    type,
    title: String(parsed.data.title || (type === "moment" ? excerpt.slice(0, 36) : "")),
    date: String(parsed.data.date || ""),
    description: String(parsed.data.description || excerpt),
    tags: Array.isArray(parsed.data.tags) ? parsed.data.tags.map(String) : [],
    mood: String(parsed.data.mood || ""),
  };
  if (type === "moment") {
    item.content = body;
    item.location = String(parsed.data.location || "");
    item.images = Array.isArray(parsed.data.images) ? parsed.data.images.map(String) : [];
  }
  return item;
}

export function operationsToChanges(operations: CmsOperation[]): PendingChange[] {
  const changes = new Map<string, PendingChange>();
  for (const operation of operations) {
    const payload = (operation.payload || {}) as Record<string, unknown>;
    let change: PendingChange | undefined;
    if (operation.type === "publish_article") {
      const document = draftToMarkdown(payload as CmsDraft);
      change = { path: document.path, content: document.content };
    } else if (operation.type === "create_moment") {
      const moment = momentToMarkdown(payload);
      change = { path: moment.path, content: moment.content };
    } else if (operation.type === "sync_photowall") {
      change = { path: "data/albums.ts", content: serializeAlbums(operation.payload) };
    } else if (operation.type === "sync_friends") {
      change = { path: "data/friends.ts", content: serializeFriends(operation.payload) };
    } else if (operation.type === "sync_projects") {
      change = { path: "data/projects.ts", content: serializeProjects(operation.payload) };
    } else if (operation.type === "CONFIG") {
      change = { path: "siteConfig.ts", content: serializeSiteConfig(payload) };
    }
    if (change) changes.set(change.path, change);
  }
  return [...changes.values()];
}
