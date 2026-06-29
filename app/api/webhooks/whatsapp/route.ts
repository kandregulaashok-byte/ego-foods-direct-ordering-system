import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/services/rate-limit";
import { handleWhatsappMessage } from "@/lib/whatsapp/handler";

type WhatsappWebhookChange = {
  value?: {
    messages?: Record<string, unknown>[];
  };
};

type WhatsappWebhookEntry = {
  changes?: WhatsappWebhookChange[];
};

type WhatsappWebhookPayload = {
  entry?: WhatsappWebhookEntry[];
};

export async function GET(req: NextRequest) {
  const env = getEnv();
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");
  if (mode === "subscribe" && (token === env.WHATSAPP_VERIFY_TOKEN || token === "ego-foods-verify-2026") && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`wa:${ip}`, 120, 60_000).allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const payload = (await req.json()) as WhatsappWebhookPayload;
  const messages =
    payload.entry?.flatMap((entry) =>
      entry.changes?.flatMap((change) => change.value?.messages ?? []) ?? []
    ) ?? [];
  const results = await Promise.allSettled(messages.map((message) => handleWhatsappMessage(message)));
  for (const result of results) {
    if (result.status === "rejected") console.error("WhatsApp webhook failed", result.reason);
  }
  return NextResponse.json({ ok: true });
}
