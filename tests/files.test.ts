import { describe, expect, it } from "vitest";
import { validatePaymentFile } from "@/lib/services/files";

describe("validatePaymentFile", () => {
  it("accepts valid images", () => {
    expect(() => validatePaymentFile({ contentType: "image/png", size: 1024 })).not.toThrow();
  });

  it("rejects unsupported types", () => {
    expect(() => validatePaymentFile({ contentType: "text/plain", size: 1024 })).toThrow();
  });

  it("rejects large files", () => {
    expect(() => validatePaymentFile({ contentType: "image/jpeg", size: 6 * 1024 * 1024 })).toThrow();
  });
});
