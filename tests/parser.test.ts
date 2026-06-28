import { describe, expect, it } from "vitest";
import { parseIntent } from "@/lib/whatsapp/parser";

describe("parseIntent", () => {
  it("handles welcome messages", () => {
    expect(parseIntent("HI")).toEqual({ type: "welcome" });
    expect(parseIntent("hello")).toEqual({ type: "welcome" });
  });

  it("parses ordering commands", () => {
    expect(parseIntent("add Paneer Roll")).toEqual({ type: "add", value: "Paneer Roll" });
    expect(parseIntent("2")).toEqual({ type: "quantity", value: 2 });
    expect(parseIntent("remove roll")).toEqual({ type: "remove", value: "roll" });
    expect(parseIntent("checkout")).toEqual({ type: "checkout" });
  });

  it("parses tracking and instructions", () => {
    expect(parseIntent("TRACK EGO-20260628-090000-ABCD")).toEqual({
      type: "track",
      orderCode: "EGO-20260628-090000-ABCD"
    });
    expect(parseIntent("note no onions")).toEqual({ type: "instructions", value: "no onions" });
  });
});
