export type ParsedIntent =
  | { type: "welcome" }
  | { type: "menu" }
  | { type: "track"; orderCode?: string }
  | { type: "order_again" }
  | { type: "checkout" }
  | { type: "clear_cart" }
  | { type: "remove"; value?: string }
  | { type: "quantity"; value: number }
  | { type: "add"; value: string }
  | { type: "instructions"; value: string }
  | { type: "unknown" };

export function parseIntent(text: string): ParsedIntent {
  const normalized = text.trim().toLowerCase();
  if (/^(hi|hello|hey|start)$/i.test(normalized)) return { type: "welcome" };
  if (normalized === "menu") return { type: "menu" };
  if (normalized.startsWith("track")) {
    const [, orderCode] = text.trim().split(/\s+/, 2);
    return { type: "track", orderCode };
  }
  if (normalized.includes("order again") || normalized === "repeat") return { type: "order_again" };
  if (normalized === "checkout" || normalized === "pay") return { type: "checkout" };
  if (normalized === "clear" || normalized === "clear cart") return { type: "clear_cart" };
  if (normalized.startsWith("remove")) return { type: "remove", value: text.replace(/^remove/i, "").trim() };
  if (/^\d+$/.test(normalized)) return { type: "quantity", value: Number(normalized) };
  if (normalized.startsWith("note ")) return { type: "instructions", value: text.slice(5).trim() };
  if (text.startsWith("add:")) return { type: "add", value: `id:${text.slice(4)}` };
  if (normalized.startsWith("add ")) return { type: "add", value: text.slice(4).trim() };
  return { type: "unknown" };
}
