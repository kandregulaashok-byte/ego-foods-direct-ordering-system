import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/services/rate-limit";

describe("rateLimit", () => {
  it("blocks after limit is exceeded", () => {
    const key = `test-${Date.now()}`;
    expect(rateLimit(key, 2).allowed).toBe(true);
    expect(rateLimit(key, 2).allowed).toBe(true);
    expect(rateLimit(key, 2).allowed).toBe(false);
  });
});
