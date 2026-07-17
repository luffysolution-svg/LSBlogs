import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export function isBlockedRemoteAddress(address: string): boolean {
  const normalized = address.toLowerCase().split("%")[0];
  if (isIP(normalized) === 4) {
    const [a, b] = normalized.split(".").map(Number);
    return a === 0
      || a === 10
      || a === 127
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || (a === 198 && (b === 18 || b === 19))
      || a >= 224;
  }
  if (isIP(normalized) === 6) {
    const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    if (mappedIpv4) return isBlockedRemoteAddress(mappedIpv4);
    return normalized === "::"
      || normalized === "::1"
      || normalized.startsWith("fc")
      || normalized.startsWith("fd")
      || /^fe[89ab]/.test(normalized)
      || normalized.startsWith("ff")
      || normalized.startsWith("2001:db8");
  }
  return true;
}

async function publicImageUrl(value: string, base?: URL): Promise<URL> {
  const url = base ? new URL(value, base) : new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error("只允许使用公开的 HTTP(S) 图片地址");
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".local")) {
    throw new Error("不允许读取本机或局域网地址");
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isBlockedRemoteAddress(address))) {
    throw new Error("不允许读取本机、局域网或保留地址");
  }
  return url;
}

async function limitedBody(response: Response): Promise<Buffer> {
  const announcedSize = Number(response.headers.get("content-length") || 0);
  if (announcedSize > MAX_IMAGE_BYTES) throw new Error("远程图片不能超过 25 MB");
  if (!response.body) throw new Error("远程图片内容为空");

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("远程图片不能超过 25 MB");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}

export async function loadRemoteImage(value: string) {
  let url = await publicImageUrl(value.trim());
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetch(url, {
      headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/*" },
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === 3) throw new Error("远程图片重定向次数过多");
      url = await publicImageUrl(location, url);
      continue;
    }
    if (!response.ok) throw new Error(`读取远程图片失败：HTTP ${response.status}`);
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) throw new Error("该地址返回的不是图片");
    return { content: await limitedBody(response), contentType };
  }
  throw new Error("读取远程图片失败");
}
