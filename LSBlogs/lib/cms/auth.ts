import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminPassword, getSessionSecret } from "./env";

export const CMS_SESSION_COOKIE = "lsblogs_cms_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function sign(value: string): string {
  const passwordDigest = createHash("sha256").update(getAdminPassword()).digest("hex");
  return createHmac("sha256", getSessionSecret())
    .update(`${passwordDigest}.${value}`)
    .digest("base64url");
}

export function createSessionToken(now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const [payload, signature, ...extra] = token.split(".");
  if (!payload || !signature || extra.length) return false;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(data.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(candidate: string): boolean {
  const expected = createHash("sha256").update(getAdminPassword()).digest();
  const actual = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(expected, actual);
}

export function getRequestSession(request: Request): string | undefined {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([name]) => name === CMS_SESSION_COOKIE)?.[1];
}

export function isRequestAuthenticated(request: Request): boolean {
  return verifySessionToken(getRequestSession(request));
}

export async function isCmsAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(CMS_SESSION_COOKIE)?.value);
}

export function sessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CMS_SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${CMS_SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
