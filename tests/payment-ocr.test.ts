import { describe, expect, it } from "vitest";
import { parsePaymentOcrJson } from "@/lib/services/payment-ocr";

describe("payment OCR", () => {
  it("parses JSON from a model response", () => {
    expect(
      parsePaymentOcrJson('{"amount_paise":26000,"paid_to_upi":"7702449983@ybl","paid_at":null,"transaction_id":"ABC","raw_text":"Paid Rs 260","confidence":"high","matches_expected_upi":true,"matches_expected_amount":true}')
    ).toMatchObject({
      amount_paise: 26000,
      paid_to_upi: "7702449983@ybl",
      confidence: "high",
      matches_expected_upi: true,
      matches_expected_amount: true
    });
  });
});
