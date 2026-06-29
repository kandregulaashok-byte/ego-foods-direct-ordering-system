import { getEnv } from "@/lib/env";

type WhatsappMessagePayload =
  | { messaging_product: "whatsapp"; to: string; type: "text"; text: { body: string } }
  | {
      messaging_product: "whatsapp";
      to: string;
      type: "interactive";
      interactive: {
        type: "button";
        body: { text: string };
        action: { buttons: { type: "reply"; reply: { id: string; title: string } }[] };
      };
    };

function phoneNumberId() {
  const configured = getEnv().WHATSAPP_PHONE_NUMBER_ID;
  return configured === "dummy-for-now" ? "1163500686855255" : configured;
}

export async function sendWhatsappMessage(to: string, body: string) {
  const env = getEnv();
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId()}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body }
      } satisfies WhatsappMessagePayload)
    }
  );
  if (!response.ok) {
    throw new Error(`WhatsApp send failed: ${response.status} ${await response.text()}`);
  }
}

export async function sendWhatsappButtons(
  to: string,
  body: string,
  buttons: { id: string; title: string }[]
) {
  const env = getEnv();
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId()}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "interactive",
        interactive: {
          type: "button",
          body: { text: body },
          action: {
            buttons: buttons.slice(0, 3).map((button) => ({
              type: "reply",
              reply: button
            }))
          }
        }
      } satisfies WhatsappMessagePayload)
    }
  );
  if (!response.ok) {
    throw new Error(`WhatsApp button send failed: ${response.status} ${await response.text()}`);
  }
}

export async function getWhatsappMedia(mediaId: string) {
  const env = getEnv();
  const metadata = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` }
  });
  if (!metadata.ok) throw new Error("Unable to fetch media metadata.");
  const json = (await metadata.json()) as { url: string; mime_type: string; file_size: number };
  const file = await fetch(json.url, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}` }
  });
  if (!file.ok) throw new Error("Unable to download media.");
  return {
    bytes: await file.arrayBuffer(),
    contentType: json.mime_type,
    size: json.file_size
  };
}
