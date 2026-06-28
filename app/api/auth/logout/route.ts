import { NextResponse } from "next/server";
import { clearDashboardCookie } from "@/lib/auth";

export async function POST() {
  await clearDashboardCookie();
  return NextResponse.json({ ok: true });
}
