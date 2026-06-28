import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const COOKIE_NAME = "ego_dashboard_session";

function sign(value: string) {
  return createHmac("sha256", getEnv().COOKIE_SECRET).update(value).digest("hex");
}

export function verifyPassword(password: string) {
  const expected = Buffer.from(getEnv().DASHBOARD_PASSWORD);
  const received = Buffer.from(password);
  if (expected.length !== received.length) return false;
  return timingSafeEqual(expected, received);
}

export async function setDashboardCookie() {
  const issuedAt = Date.now().toString();
  const token = `${issuedAt}.${sign(issuedAt)}`;
  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12
  });
}

export async function clearDashboardCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export function isAuthenticated(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;
  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || age > 1000 * 60 * 60 * 12) return false;
  return sign(issuedAt) === signature;
}

export function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/";
  url.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
