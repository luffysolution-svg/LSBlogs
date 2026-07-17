import {
  createHash,
  createHmac,
  randomUUID,
} from "node:crypto";
import type { CmsState, PicBedConfig, ProviderName } from "./types";
import { DEFAULT_PICBED_CONFIG } from "./types";
import { uploadGithubImage } from "./github";

const SECRET_FIELDS: Record<Exclude<ProviderName, "vercel">, string[]> = {
  lsky: ["token"],
  tencent: ["secretId", "secretKey"],
  aliyun: ["accessKeyId", "accessKeySecret"],
  github: ["token"],
};

function cloneDefault(): PicBedConfig {
  return structuredClone(DEFAULT_PICBED_CONFIG);
}

export function mergePicbedConfig(
  base: PicBedConfig | undefined,
  incoming: unknown,
  preserveSecrets = true,
): PicBedConfig {
  const merged = { ...cloneDefault(), ...(base || {}) } as PicBedConfig;
  if (!incoming || typeof incoming !== "object") return merged;
  const value = incoming as Record<string, unknown>;
  const providers: ProviderName[] = ["vercel", "lsky", "tencent", "aliyun", "github"];
  if (providers.includes(value.provider as ProviderName)) merged.provider = value.provider as ProviderName;
  if ("pathPrefix" in value) merged.pathPrefix = String(value.pathPrefix || "").replace(/^\/+|\/+$/g, "");

  for (const provider of providers.filter((item) => item !== "vercel") as Array<Exclude<ProviderName, "vercel">>) {
    const values = value[provider];
    if (!values || typeof values !== "object") continue;
    const next = { ...merged[provider] } as Record<string, string>;
    for (const key of Object.keys(next)) {
      if (!(key in values)) continue;
      const candidate = String((values as Record<string, unknown>)[key] || "").trim();
      if (preserveSecrets && SECRET_FIELDS[provider].includes(key) && !candidate) continue;
      next[key] = candidate;
    }
    Object.assign(merged[provider], next);
  }
  return merged;
}

export function publicPicbedConfig(config: PicBedConfig) {
  const visible = structuredClone(config) as PicBedConfig & {
    hasSecrets?: Record<string, Record<string, boolean>>;
  };
  const hasSecrets: Record<string, Record<string, boolean>> = {};
  for (const [provider, fields] of Object.entries(SECRET_FIELDS)) {
    hasSecrets[provider] = {};
    const values = visible[provider as keyof PicBedConfig] as Record<string, string>;
    for (const field of fields) {
      hasSecrets[provider][field] = Boolean(values[field]);
      values[field] = "";
    }
  }
  visible.hasSecrets = hasSecrets;
  return visible;
}

function requireFields(values: Record<string, string>, ...fields: string[]) {
  const missing = fields.filter((field) => !values[field]?.trim());
  if (missing.length) throw new Error(`请填写完整配置：${missing.join(", ")}`);
}

function encode(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function objectKey(config: PicBedConfig, filename: string, contentType: string): string {
  const matched = filename.match(/\.[A-Za-z0-9]{1,9}$/);
  const extension = matched?.[0].toLowerCase() || (contentType === "image/png" ? ".png" : ".webp");
  const date = new Date();
  const folder = `${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return [config.pathPrefix, folder, `${randomUUID().replace(/-/g, "")}${extension}`]
    .filter(Boolean)
    .join("/");
}

function publicUrl(domain: string, fallback: string, key: string): string {
  return `${(domain || fallback).replace(/\/$/, "")}/${key.split("/").map(encode).join("/")}`;
}

async function testLsky(values: PicBedConfig["lsky"]) {
  requireFields(values, "url", "token");
  const token = values.token.startsWith("Bearer ") ? values.token : `Bearer ${values.token}`;
  const response = await fetch(`${values.url.replace(/\/$/, "")}/api/v1/profile`, {
    headers: { Authorization: token, Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status !== true) throw new Error(data.message || `Lsky Pro HTTP ${response.status}`);
  return `Lsky Pro 连接成功：${data.data?.email || "已认证"}`;
}

async function uploadLsky(
  values: PicBedConfig["lsky"],
  content: Buffer,
  filename: string,
  contentType: string,
) {
  requireFields(values, "url", "token");
  const form = new FormData();
  form.set("file", new Blob([Uint8Array.from(content)], { type: contentType }), filename);
  const token = values.token.startsWith("Bearer ") ? values.token : `Bearer ${values.token}`;
  const response = await fetch(`${values.url.replace(/\/$/, "")}/api/v1/upload`, {
    method: "POST",
    headers: { Authorization: token, Accept: "application/json" },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const data = await response.json().catch(() => ({}));
  const url = data.data?.links?.url;
  if (!response.ok || data.status !== true || !url) throw new Error(data.message || `Lsky Pro HTTP ${response.status}`);
  return String(url);
}

function cosRequest(
  method: "GET" | "PUT",
  values: PicBedConfig["tencent"],
  key = "",
  query: Record<string, string> = {},
) {
  requireFields(values, "secretId", "secretKey", "region", "bucket");
  const host = `${values.bucket}.cos.${values.region}.myqcloud.com`;
  const requestPath = key ? `/${key.split("/").map(encode).join("/")}` : "/";
  const pairs = Object.entries(query).sort(([a], [b]) => a.localeCompare(b));
  const canonicalQuery = pairs.map(([name, value]) => `${encode(name.toLowerCase())}=${encode(value)}`).join("&");
  const parameterNames = pairs.map(([name]) => name.toLowerCase()).join(";");
  const start = Math.floor(Date.now() / 1000);
  const keyTime = `${start};${start + 900}`;
  const httpString = `${method.toLowerCase()}\n${requestPath}\n${canonicalQuery}\nhost=${host}\n`;
  const stringToSign = `sha1\n${keyTime}\n${createHash("sha1").update(httpString).digest("hex")}\n`;
  const signKey = createHmac("sha1", values.secretKey).update(keyTime).digest("hex");
  const signature = createHmac("sha1", signKey).update(stringToSign).digest("hex");
  const authorization = [
    "q-sign-algorithm=sha1",
    `q-ak=${values.secretId}`,
    `q-sign-time=${keyTime}`,
    `q-key-time=${keyTime}`,
    "q-header-list=host",
    `q-url-param-list=${parameterNames}`,
    `q-signature=${signature}`,
  ].join("&");
  const search = new URLSearchParams(query).toString();
  return {
    url: `https://${host}${requestPath}${search ? `?${search}` : ""}`,
    headers: { Authorization: authorization, Host: host },
    host,
  };
}

async function testTencent(values: PicBedConfig["tencent"]) {
  const request = cosRequest("GET", values, "", { "max-keys": "0" });
  const response = await fetch(request.url, { headers: request.headers, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`腾讯云 COS HTTP ${response.status}：${(await response.text()).slice(0, 160)}`);
  return "腾讯云 COS 连接成功";
}

async function uploadTencent(
  values: PicBedConfig["tencent"],
  key: string,
  content: Buffer,
  contentType: string,
) {
  const request = cosRequest("PUT", values, key);
  const response = await fetch(request.url, {
    method: "PUT",
    headers: { ...request.headers, "Content-Type": contentType },
    body: Uint8Array.from(content),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`腾讯云 COS 上传失败：HTTP ${response.status}`);
  return publicUrl(values.domain, `https://${request.host}`, key);
}

function ossHost(values: PicBedConfig["aliyun"]): string {
  const endpoint = values.endpoint.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return endpoint.startsWith(`${values.bucket}.`) ? endpoint : `${values.bucket}.${endpoint}`;
}

function ossHeaders(
  method: "GET" | "PUT",
  values: PicBedConfig["aliyun"],
  key = "",
  content: Uint8Array = new Uint8Array(),
  contentType = "",
) {
  requireFields(values, "accessKeyId", "accessKeySecret", "endpoint", "bucket");
  const contentMd5 = content.length ? createHash("md5").update(content).digest("base64") : "";
  const date = new Date().toUTCString();
  const resource = `/${values.bucket}/${key}`;
  const signature = createHmac("sha1", values.accessKeySecret)
    .update(`${method}\n${contentMd5}\n${contentType}\n${date}\n${resource}`)
    .digest("base64");
  return {
    Authorization: `OSS ${values.accessKeyId}:${signature}`,
    Date: date,
    ...(contentMd5 ? { "Content-MD5": contentMd5 } : {}),
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function testAliyun(values: PicBedConfig["aliyun"]) {
  const host = ossHost(values);
  const response = await fetch(`https://${host}/?max-keys=0`, {
    headers: ossHeaders("GET", values),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`阿里云 OSS HTTP ${response.status}：${(await response.text()).slice(0, 160)}`);
  return "阿里云 OSS 连接成功";
}

async function uploadAliyun(
  values: PicBedConfig["aliyun"],
  key: string,
  content: Buffer,
  contentType: string,
) {
  const host = ossHost(values);
  const url = `https://${host}/${key.split("/").map(encode).join("/")}`;
  const response = await fetch(url, {
    method: "PUT",
    headers: ossHeaders("PUT", values, key, content, contentType),
    body: Uint8Array.from(content),
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`阿里云 OSS 上传失败：HTTP ${response.status}`);
  return publicUrl(values.domain, `https://${host}`, key);
}

async function testGithub(values: PicBedConfig["github"]) {
  requireFields(values, "token", "owner", "repo", "branch");
  const response = await fetch(`https://api.github.com/repos/${encode(values.owner)}/${encode(values.repo)}`, {
    headers: {
      Authorization: `Bearer ${values.token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "LSBlogs-Online-CMS",
      "X-GitHub-Api-Version": "2026-03-10",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  return `GitHub 仓库连接成功：${values.owner}/${values.repo}`;
}

async function testVercel() {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  if (!token) throw new Error("缺少 BLOB_READ_WRITE_TOKEN");
  const { list } = await import("@vercel/blob");
  await list({ limit: 1, token });
  return "Vercel Blob 连接成功";
}

export async function testPicbed(config: PicBedConfig): Promise<string> {
  if (config.provider === "vercel") return testVercel();
  if (config.provider === "lsky") return testLsky(config.lsky);
  if (config.provider === "tencent") return testTencent(config.tencent);
  if (config.provider === "aliyun") return testAliyun(config.aliyun);
  return testGithub(config.github);
}

export async function uploadImage(
  state: CmsState,
  file: File,
): Promise<{ provider: ProviderName; url: string }> {
  if (!file.size) throw new Error("图片文件为空");
  if (file.size > 25 * 1024 * 1024) throw new Error("单张图片不能超过 25 MB");
  if (!file.type.startsWith("image/")) throw new Error("只允许上传图片文件");
  const config = mergePicbedConfig(state.picbed, undefined);
  const content = Buffer.from(await file.arrayBuffer());
  const key = objectKey(config, file.name || "image", file.type);
  let url: string;
  if (config.provider === "vercel") {
    const token = process.env.BLOB_READ_WRITE_TOKEN?.trim();
    if (!token) throw new Error("缺少 BLOB_READ_WRITE_TOKEN");
    const { put } = await import("@vercel/blob");
    const blob = await put(key, content, {
      access: "public",
      addRandomSuffix: true,
      contentType: file.type,
      token,
    });
    url = blob.url;
  } else if (config.provider === "lsky") {
    url = await uploadLsky(config.lsky, content, file.name, file.type);
  } else if (config.provider === "tencent") {
    url = await uploadTencent(config.tencent, key, content, file.type);
  } else if (config.provider === "aliyun") {
    url = await uploadAliyun(config.aliyun, key, content, file.type);
  } else {
    requireFields(config.github, "token", "owner", "repo", "branch");
    url = await uploadGithubImage(config.github, key, content);
  }
  return { provider: config.provider, url };
}
