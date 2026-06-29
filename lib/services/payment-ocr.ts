export type PaymentOcrResult = {
  amount_paise: number | null;
  paid_to_upi: string | null;
  paid_at: string | null;
  transaction_id: string | null;
  raw_text: string;
  confidence: "high" | "medium" | "low";
  matches_expected_upi: boolean | null;
  matches_expected_amount: boolean | null;
};

export function parsePaymentOcrJson(text: string): PaymentOcrResult {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("OCR response did not include JSON.");
  const value = JSON.parse(match[0]) as Partial<PaymentOcrResult>;
  return {
    amount_paise: typeof value.amount_paise === "number" ? value.amount_paise : null,
    paid_to_upi: typeof value.paid_to_upi === "string" ? value.paid_to_upi : null,
    paid_at: typeof value.paid_at === "string" ? value.paid_at : null,
    transaction_id: typeof value.transaction_id === "string" ? value.transaction_id : null,
    raw_text: typeof value.raw_text === "string" ? value.raw_text : "",
    confidence: value.confidence === "high" || value.confidence === "medium" ? value.confidence : "low",
    matches_expected_upi: typeof value.matches_expected_upi === "boolean" ? value.matches_expected_upi : null,
    matches_expected_amount:
      typeof value.matches_expected_amount === "boolean" ? value.matches_expected_amount : null
  };
}

export async function analyzePaymentScreenshot(input: {
  bytes: ArrayBuffer;
  contentType: string;
  expectedAmountPaise: number;
  expectedUpi: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const image = Buffer.from(input.bytes).toString("base64");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_OCR_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Read this UPI payment screenshot. Return only JSON with keys: amount_paise, paid_to_upi, paid_at, transaction_id, raw_text, confidence, matches_expected_upi, matches_expected_amount. Expected UPI: ${input.expectedUpi}. Expected amount paise: ${input.expectedAmountPaise}. Use null when unreadable.`
            },
            {
              type: "input_image",
              image_url: `data:${input.contentType};base64,${image}`
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) throw new Error(`OpenAI OCR failed: ${response.status} ${await response.text()}`);
  const json = (await response.json()) as { output_text?: string; output?: { content?: { text?: string }[] }[] };
  const text = json.output_text ?? json.output?.flatMap((item) => item.content ?? []).map((item) => item.text).join("\n") ?? "";
  return parsePaymentOcrJson(text);
}
