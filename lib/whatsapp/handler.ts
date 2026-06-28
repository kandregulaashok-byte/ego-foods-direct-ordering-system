import { createSupabaseAdmin } from "@/lib/supabase";
import { listMenuItems } from "@/lib/repositories/menu";
import {
  createOrderFromCart,
  getLatestCustomerOrder,
  getOrderByCode
} from "@/lib/repositories/orders";
import { getRestaurant } from "@/lib/repositories/restaurants";
import { findOrCreateCustomer } from "@/lib/repositories/customers";
import { savePaymentFile } from "@/lib/services/files";
import { formatMoney } from "@/lib/utils";
import type { CartItem, MenuItem, WhatsappSessionState } from "@/lib/types";
import { getWhatsappMedia, sendWhatsappButtons, sendWhatsappMessage } from "@/lib/whatsapp/client";
import { clearSession, getSession, saveSession } from "@/lib/whatsapp/sessions";
import { parseIntent } from "@/lib/whatsapp/parser";

type WhatsappInboundMessage = {
  from?: string;
  id?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string };
  document?: { id?: string };
  interactive?: { button_reply?: { id?: string; title?: string } };
};

function summarizeMenu(items: MenuItem[]) {
  const grouped = items.reduce<Record<string, MenuItem[]>>((acc, item) => {
    acc[item.category] = acc[item.category] ?? [];
    acc[item.category].push(item);
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([category, categoryItems]) => {
      const rows = categoryItems
        .map((item, index) => `${index + 1}. ${item.name} - ${formatMoney(item.price_paise)}`)
        .join("\n");
      return `*${category}*\n${rows}`;
    })
    .join("\n\n");
}

function cartSummary(cart: CartItem[]) {
  if (!cart.length) return "Your cart is empty.";
  const lines = cart.map(
    (item) => `${item.quantity} x ${item.name} - ${formatMoney(item.pricePaise * item.quantity)}`
  );
  const total = cart.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  return `${lines.join("\n")}\n\nTotal: ${formatMoney(total)}`;
}

async function sendMenu(to: string) {
  const items = await listMenuItems({ availableOnly: true });
  if (!items.length) {
    await sendWhatsappMessage(to, "Menu is currently unavailable. Please check again shortly.");
    return;
  }
  await sendWhatsappMessage(
    to,
    `Today's menu:\n\n${summarizeMenu(items)}\n\nReply "add item name" to add an item. Example: add Paneer Roll`
  );
}

function findMenuMatch(items: MenuItem[], value: string) {
  const needle = value.trim().toLowerCase();
  return items.find((item) => item.name.toLowerCase() === needle) ?? items.find((item) => item.name.toLowerCase().includes(needle));
}

async function handleImageMessage(input: { from: string; mediaId: string; messageId: string }) {
  const { customer, state } = await getSession(input.from);
  if (!state.cart.length && !state.pendingOrderId) {
    await sendWhatsappMessage(input.from, "I received a file, but there is no active checkout. Send MENU to start an order.");
    return;
  }
  const media = await getWhatsappMedia(input.mediaId);
  const file = await savePaymentFile({
    customerId: customer.id,
    fileName: `${input.messageId}`,
    contentType: media.contentType,
    bytes: media.bytes,
    whatsappMediaId: input.mediaId
  });
  const order = await createOrderFromCart({
    whatsappNumber: input.from,
    cart: state.cart,
    paymentFileId: file.id,
    whatsappMessageId: input.messageId,
    specialInstructions: state.specialInstructions
  });
  await clearSession(input.from);
  await sendWhatsappMessage(
    input.from,
    `Payment screenshot received.\n\nOrder ${order.order_code} is being processed.\nPlease arrange Rapido/Uber/Porter yourself if delivery is required.`
  );
}

export async function handleWhatsappMessage(message: WhatsappInboundMessage) {
  const from = String(message.from ?? "");
  const messageId = String(message.id ?? "");
  const type = String(message.type ?? "");
  const supabase = createSupabaseAdmin();
  const { data: duplicate } = await supabase
    .from("processed_webhooks")
    .select("message_id")
    .eq("message_id", messageId)
    .maybeSingle();
  if (duplicate) return;
  await supabase.from("processed_webhooks").insert({ message_id: messageId, payload: message });

  if (type === "image" || type === "document") {
    const mediaId = message[type]?.id;
    if (mediaId) {
      await handleImageMessage({ from, mediaId, messageId });
      return;
    }
  }
  if (type !== "text" && type !== "interactive") {
    await sendWhatsappMessage(from, "I can help with menu, cart, checkout, and tracking. Send MENU to continue.");
    return;
  }

  const text =
    type === "interactive"
      ? String(message.interactive?.button_reply?.id ?? message.interactive?.button_reply?.title ?? "")
      : String(message.text?.body ?? "");
  const intent = parseIntent(text);
  const restaurant = await getRestaurant();
  const { state } = await getSession(from);

  if (!restaurant.is_open && intent.type !== "track") {
    await sendWhatsappMessage(from, restaurant.closed_message);
    return;
  }

  if (intent.type === "welcome") {
    await sendWhatsappButtons(
      from,
      `Welcome to ${restaurant.name}. What would you like to do?`,
      [
        { id: "menu", title: "Menu" },
        { id: "track", title: "Track" },
        { id: "order again", title: "Order Again" }
      ]
    );
    return;
  }

  if (intent.type === "menu") {
    await saveSession(from, { ...state, step: "browsing_menu" });
    await sendMenu(from);
    return;
  }

  if (intent.type === "order_again") {
    const lastOrder = await getLatestCustomerOrder(from);
    if (!lastOrder?.order_items?.length) {
      await sendWhatsappMessage(from, "I could not find a previous order. Send MENU to start a fresh cart.");
      return;
    }
    const cart = lastOrder.order_items.map((item) => ({
      menuItemId: item.menu_item_id ?? "",
      name: item.name_snapshot,
      pricePaise: item.price_paise_snapshot,
      quantity: item.quantity
    }));
    await saveSession(from, { step: "cart", cart });
    await sendWhatsappMessage(from, `Repeated your last order:\n\n${cartSummary(cart)}\n\nReply CHECKOUT to pay.`);
    return;
  }

  if (intent.type === "track") {
    const order = intent.orderCode ? await getOrderByCode(intent.orderCode, from) : await getLatestCustomerOrder(from);
    await sendWhatsappMessage(
      from,
      order ? `Order ${order.order_code} status: ${order.status.replace(/_/g, " ")}` : "No matching order found."
    );
    return;
  }

  if (intent.type === "add") {
    const items = await listMenuItems({ availableOnly: true });
    const match = findMenuMatch(items, intent.value);
    if (!match) {
      await sendWhatsappMessage(from, "I could not find that item. Send MENU to see available items.");
      return;
    }
    const cart = [...state.cart];
    const existing = cart.find((item) => item.menuItemId === match.id);
    if (existing) existing.quantity += 1;
    else cart.push({ menuItemId: match.id, name: match.name, pricePaise: match.price_paise, quantity: 1 });
    await saveSession(from, { ...state, step: "cart", cart, lastMenuItemId: match.id });
    await sendWhatsappMessage(from, `${match.name} added.\n\n${cartSummary(cart)}\n\nReply a number to update the last item quantity, add more, REMOVE item, CLEAR, or CHECKOUT.`);
    return;
  }

  if (intent.type === "quantity" && state.lastMenuItemId) {
    const cart = state.cart
      .map((item) => (item.menuItemId === state.lastMenuItemId ? { ...item, quantity: intent.value } : item))
      .filter((item) => item.quantity > 0);
    await saveSession(from, { ...state, step: "cart", cart });
    await sendWhatsappMessage(from, `Updated cart:\n\n${cartSummary(cart)}`);
    return;
  }

  if (intent.type === "remove") {
    const value = (intent.value ?? "").toLowerCase();
    const cart = state.cart.filter((item) => !item.name.toLowerCase().includes(value));
    await saveSession(from, { ...state, cart });
    await sendWhatsappMessage(from, `Updated cart:\n\n${cartSummary(cart)}`);
    return;
  }

  if (intent.type === "clear_cart") {
    await clearSession(from);
    await sendWhatsappMessage(from, "Cart cleared. Send MENU to start again.");
    return;
  }

  if (intent.type === "instructions") {
    await saveSession(from, { ...state, specialInstructions: intent.value });
    await sendWhatsappMessage(from, "Special instructions saved.");
    return;
  }

  if (intent.type === "checkout") {
    if (!state.cart.length) {
      await sendWhatsappMessage(from, "Your cart is empty. Send MENU to add items.");
      return;
    }
    const nextState: WhatsappSessionState = { ...state, step: "awaiting_screenshot" };
    await saveSession(from, nextState);
    await sendWhatsappMessage(
      from,
      `Checkout\n\n${cartSummary(state.cart)}\n\nPay to UPI: ${restaurant.upi_id}\nMaps: ${restaurant.google_maps_url}\nPreparation time: ${restaurant.preparation_time_minutes} minutes\n\nUpload your payment screenshot here after paying.`
    );
    return;
  }

  await sendWhatsappMessage(from, "I did not understand that. Send MENU, CHECKOUT, TRACK, or ORDER AGAIN.");
}

export async function ensureCustomerForWebhook(phone: string) {
  return findOrCreateCustomer(phone);
}
