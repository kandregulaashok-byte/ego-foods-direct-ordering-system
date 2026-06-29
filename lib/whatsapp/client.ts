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
    }
  | {
      messaging_product: "whatsapp";
      to: string;
      type: "interactive";
      interactive: {
        type: "list";
        header?: { type: "text"; text: string };
        body: { text: string };
        action: {
          button: string;
          sections: {
            title: string;
            rows: { id: string; title: string; description?: string }[];
          }[];
        };
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

export async function sendWhatsappList(input: {
  to: string;
  body: string;
  button: string;
  header?: string;
  sectionTitle: string;
  rows: { id: string; title: string; description?: string }[];
}) {
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
        to: input.to,
        type: "interactive",
        interactive: {
          type: "list",
          header: input.header ? { type: "text", text: input.header } : undefined,
          body: { text: input.body },
          action: {
            button: input.button.slice(0, 20),
            sections: [
              {
                title: input.sectionTitle.slice(0, 24),
                rows: input.rows.slice(0, 10).map((row) => ({
                  id: row.id,
                  title: row.title.slice(0, 24),
                  description: row.description?.slice(0, 72)
                }))
              }
            ]
          }
        }
      } satisfies WhatsappMessagePayload)
    }
  );
  if (!response.ok) {
    throw new Error(`WhatsApp list send failed: ${response.status} ${await response.text()}`);
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
