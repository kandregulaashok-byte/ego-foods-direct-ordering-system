import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
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
