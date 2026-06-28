import { NextResponse } from "next/server";
import { setDashboardCookie, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";
import { writeAuditLog } from "@/lib/services/audit";

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json());
  if (!parsed.success || !verifyPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  await setDashboardCookie();
  await writeAuditLog({ actor: "dashboard", action: "login", entityType: "session" });
  return NextResponse.json({ ok: true });
}
