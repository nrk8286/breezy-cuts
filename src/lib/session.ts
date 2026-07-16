import "server-only";
import { cookies } from "next/headers";
import type { Role } from "@/lib/types";
const COOKIE_NAME = "breezy_session"; const WEEK = 60 * 60 * 24 * 7;
type SessionPayload = { userId: string; role: Role; exp: number };
function secret() { const value = process.env.SESSION_SECRET; if (value) return value; if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required in production"); return "breezy-cuts-local-development-secret-change-me"; }
function base64Url(bytes: Uint8Array) { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function decodeBase64Url(value: string) { const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="); return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0)); }
async function signature(encoded: string) { const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]); return base64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded)))); }
async function encodeSession(payload: SessionPayload) { const encoded = base64Url(new TextEncoder().encode(JSON.stringify(payload))); return `${encoded}.${await signature(encoded)}`; }
async function decodeSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null; const [encoded, supplied] = token.split("."); if (!encoded || !supplied) return null;
  const expected = await signature(encoded); if (supplied.length !== expected.length) return null;
  let difference = 0; for (let i = 0; i < supplied.length; i += 1) difference |= supplied.charCodeAt(i) ^ expected.charCodeAt(i); if (difference !== 0) return null;
  try { const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encoded))) as SessionPayload; return payload.userId && payload.role && payload.exp >= Date.now() ? payload : null; } catch { return null; }
}
export async function getSession() { return decodeSession((await cookies()).get(COOKIE_NAME)?.value); }
export async function createSession(userId: string, role: Role) { const maxAge = WEEK; (await cookies()).set(COOKIE_NAME, await encodeSession({ userId, role, exp: Date.now() + maxAge * 1000 }), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge, priority: "high" }); }
export async function deleteSession() { (await cookies()).delete(COOKIE_NAME); }
