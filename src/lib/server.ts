import "server-only";
import crypto from "node:crypto";

export const id = () => crypto.randomUUID();
export const slug = () => crypto.randomBytes(9).toString("base64url");

export function ipHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return crypto.createHash("sha256").update(`${process.env.IP_SALT || "bribe-desk"}:${ip}`).digest("hex").slice(0, 24);
}

export function isKitchen(req: Request) {
  const want = process.env.KITCHEN_KEY;
  const got = req.headers.get("x-kitchen-key") || "";
  if (!want) return process.env.NODE_ENV !== "production" && got === "dev";
  const a = Buffer.from(want), b = Buffer.from(got);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Cloudflare Turnstile. Passes when no secret is configured. */
export async function humanCheck(token: unknown) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== "string" || !token) return false;
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await res.json()) as { success?: boolean };
  return !!data.success;
}

export const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
export const cleanBlock = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const cleanUrl = (v: unknown) => {
  const s = clean(v, 500);
  if (!s) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
};
