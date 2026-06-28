import { NextResponse } from "next/server";

function keyShape(value: string | undefined) {
  if (!value) return "missing";
  if (value.startsWith('"') || value.endsWith('"')) return "has_quotes";
  if (value.startsWith("sb_secret_")) return "secret_key";
  if (value.startsWith("sb_publishable_")) return "publishable_key";
  if (value.startsWith("eyJ")) return "legacy_jwt";
  return "unknown";
}

export async function GET() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const result = {
    supabaseUrl: url ?? "missing",
    serviceKey: keyShape(serviceKey),
    anonKey: keyShape(anonKey),
    dashboardPassword: process.env.DASHBOARD_PASSWORD ? "present" : "missing",
    cookieSecret: process.env.COOKIE_SECRET ? "present" : "missing",
    supabaseStatus: "not_checked" as string,
    supabaseError: null as string | null
  };

  if (!url || !serviceKey) {
    return NextResponse.json(result);
  }

  try {
    const res = await fetch(`${url}/rest/v1/restaurants?select=id,name&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`
      },
      cache: "no-store"
    });
    result.supabaseStatus = String(res.status);
    if (!res.ok) result.supabaseError = (await res.text()).slice(0, 500);
  } catch (error) {
    result.supabaseStatus = "fetch_failed";
    result.supabaseError = error instanceof Error ? error.message : String(error);
  }

  return NextResponse.json(result);
}
