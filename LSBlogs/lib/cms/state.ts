import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getSessionSecret } from "./env";
import { createEmptyCmsState, type CmsState } from "./types";

const STATE_PREFIX = "cms-state/";
const LOCAL_STATE_PATH = path.join(process.cwd(), ".cms-data", "state.enc");
let updateQueue: Promise<unknown> = Promise.resolve();

function stateKey(): Buffer {
  return createHash("sha256").update(`lsblogs-state:${getSessionSecret()}`).digest();
}

export function encryptState(state: CmsState): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", stateKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(state), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("LSCMS1"), iv, tag, encrypted]).toString("base64");
}

export function decryptState(encoded: string): CmsState {
  const data = Buffer.from(encoded.trim(), "base64");
  if (data.subarray(0, 6).toString("utf8") !== "LSCMS1") {
    throw new Error("CMS 状态文件格式无效");
  }
  const iv = data.subarray(6, 18);
  const tag = data.subarray(18, 34);
  const encrypted = data.subarray(34);
  const decipher = createDecipheriv("aes-256-gcm", stateKey(), iv);
  decipher.setAuthTag(tag);
  const parsed = JSON.parse(
    Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8"),
  ) as CmsState;
  if (parsed.version !== 1) throw new Error("不支持的 CMS 状态版本");
  return parsed;
}

async function loadFromBlob(token: string): Promise<CmsState> {
  const { list } = await import("@vercel/blob");
  const result = await list({ prefix: STATE_PREFIX, limit: 100, token });
  const latest = [...result.blobs].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  )[0];
  if (!latest) return createEmptyCmsState();
  const response = await fetch(latest.url, { cache: "no-store" });
  if (!response.ok) throw new Error(`无法读取云端 CMS 状态：HTTP ${response.status}`);
  return decryptState(await response.text());
}

async function saveToBlob(token: string, state: CmsState): Promise<void> {
  const { del, list, put } = await import("@vercel/blob");
  const pathname = `${STATE_PREFIX}${Date.now()}.enc`;
  const saved = await put(pathname, encryptState(state), {
    access: "public",
    addRandomSuffix: true,
    contentType: "text/plain; charset=utf-8",
    cacheControlMaxAge: 60,
    token,
  });

  const result = await list({ prefix: STATE_PREFIX, limit: 100, token });
  const oldUrls = [...result.blobs]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(5)
    .map((blob) => blob.url)
    .filter((url) => url !== saved.url);
  if (oldUrls.length) await del(oldUrls, { token });
}

async function loadLocal(): Promise<CmsState> {
  try {
    return decryptState(await fs.readFile(LOCAL_STATE_PATH, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return createEmptyCmsState();
    throw error;
  }
}

async function saveLocal(state: CmsState): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_STATE_PATH), { recursive: true });
  const temporary = `${LOCAL_STATE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temporary, encryptState(state), "utf8");
  await fs.rename(temporary, LOCAL_STATE_PATH);
}

export async function loadCmsState(): Promise<CmsState> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return loadFromBlob(token);
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("在线 CMS 尚未连接 Vercel Blob：缺少 BLOB_READ_WRITE_TOKEN");
  }
  return loadLocal();
}

export async function saveCmsState(state: CmsState): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (token) return saveToBlob(token, state);
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("在线 CMS 尚未连接 Vercel Blob：缺少 BLOB_READ_WRITE_TOKEN");
  }
  return saveLocal(state);
}

export function updateCmsState<T>(
  updater: (state: CmsState) => T | Promise<T>,
): Promise<T> {
  const work = updateQueue.then(async () => {
    const state = await loadCmsState();
    const result = await updater(state);
    await saveCmsState(state);
    return result;
  });
  updateQueue = work.catch(() => undefined);
  return work;
}
