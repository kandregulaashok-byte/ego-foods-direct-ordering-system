import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const COOKIE_NAME = "ego_dashboard_session";

async function signEdge(value: string) {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) return null;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function isAuthenticatedEdge(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;
  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || age > 1000 * 60 * 60 * 12) return false;
  return (await signEdge(issuedAt)) === signature;
}

export function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
