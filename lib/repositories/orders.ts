import { startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { createSupabaseAdmin } from "@/lib/supabase";
import type { CartItem, DashboardMetrics, Order, OrderStatus } from "@/lib/types";
import { makeOrderCode } from "@/lib/utils";
import { getRestaurant } from "@/lib/repositories/restaurants";
import { findOrCreateCustomer } from "@/lib/repositories/customers";

export async function listOrders(filters?: {
  status?: OrderStatus;
  from?: string;
  to?: string;
  search?: string;
}) {
  const restaurant = await getRestaurant();
  let query = createSupabaseAdmin()
    .from("orders")
    .select("*, customers(*), order_items(*), payment_files(*)")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.from) query = query.gte("created_at", filters.from);
  if (filters?.to) query = query.lte("created_at", filters.to);

  const { data, error } = await query;
  if (error) throw error;
  const orders = (data ?? []) as Order[];
  const needle = filters?.search?.trim().toLowerCase();
  if (!needle) return orders;
  return orders.filter((order) => {
    const haystack = [
      order.order_code,
      order.customers?.name,
      order.customers?.whatsapp_number,
      ...(order.order_items ?? []).map((item) => item.name_snapshot)
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  });
}

export async function getOrderByCode(orderCode: string, whatsappNumber?: string) {
  const query = createSupabaseAdmin()
    .from("orders")
    .select("*, customers(*), order_items(*), payment_files(*)")
    .eq("order_code", orderCode)
    .maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  const order = data as Order | null;
  if (!order || !whatsappNumber) return order;
  return order.customers?.whatsapp_number === whatsappNumber ? order : null;
}

export async function getLatestCustomerOrder(whatsappNumber: string) {
  const customer = await findOrCreateCustomer(whatsappNumber);
  const { data, error } = await createSupabaseAdmin()
    .from("orders")
    .select("*, customers(*), order_items(*)")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Order | null;
}

export async function createOrderFromCart(input: {
  whatsappNumber: string;
  cart: CartItem[];
  paymentFileId?: string;
  whatsappMessageId?: string;
  specialInstructions?: string;
}) {
  const restaurant = await getRestaurant();
  const customer = await findOrCreateCustomer(input.whatsappNumber);
  const totalPaise = input.cart.reduce((sum, item) => sum + item.pricePaise * item.quantity, 0);
  const supabase = createSupabaseAdmin();

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      restaurant_id: restaurant.id,
      customer_id: customer.id,
      order_code: makeOrderCode(),
      status: input.paymentFileId ? "preparing" : "awaiting_screenshot",
      total_paise: totalPaise,
      payment_file_id: input.paymentFileId ?? null,
      whatsapp_message_id: input.whatsappMessageId ?? null,
      special_instructions: input.specialInstructions ?? null
    })
    .select("*")
    .single();
  if (error) throw error;

  const orderItems = input.cart.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menuItemId,
    name_snapshot: item.name,
    price_paise_snapshot: item.pricePaise,
    quantity: item.quantity,
    line_total_paise: item.pricePaise * item.quantity
  }));
  const { error: itemError } = await supabase.from("order_items").insert(orderItems);
  if (itemError) throw itemError;

  await supabase.rpc("refresh_customer_stats", { target_customer_id: customer.id });
  return { ...(order as Order), order_items: orderItems };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { data, error } = await createSupabaseAdmin()
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .select("*, customers(*), order_items(*)")
    .single();
  if (error) throw error;
  return data as Order;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const restaurant = await getRestaurant();
  const today = startOfDay(new Date()).toISOString();
  const { data, error } = await createSupabaseAdmin()
    .from("orders")
    .select("*, customers(*), order_items(*)")
    .eq("restaurant_id", restaurant.id)
    .gte("created_at", today);
  if (error) throw error;
  const orders = (data ?? []) as Order[];
  const revenue = orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + order.total_paise, 0);
  const completed = orders.filter((order) => order.status === "completed").length;
  const counts = orders.reduce<Record<OrderStatus, number>>(
    (acc, order) => {
      acc[order.status] += 1;
      return acc;
    },
    { awaiting_screenshot: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0 }
  );
  const itemCounts = new Map<string, number>();
  const customerTotals = new Map<string, number>();
  for (const order of orders) {
    customerTotals.set(order.customers?.name ?? order.customers?.whatsapp_number ?? "Customer", order.total_paise);
    for (const item of order.order_items ?? []) {
      itemCounts.set(item.name_snapshot, (itemCounts.get(item.name_snapshot) ?? 0) + item.quantity);
    }
  }
  const topItem = [...itemCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No orders yet";
  const topCustomer =
    [...customerTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No orders yet";
  const returning = new Set(orders.filter((order) => (order.customers?.orders_count ?? 0) > 1).map((o) => o.customer_id));
  const customers = new Set(orders.map((order) => order.customer_id));

  return {
    todaysOrders: orders.length,
    todaysRevenuePaise: revenue,
    preparing: counts.preparing,
    ready: counts.ready,
    completed,
    pending: counts.awaiting_screenshot,
    averageOrderPaise: orders.length ? Math.round(revenue / orders.length) : 0,
    returningPercent: customers.size ? Math.round((returning.size / customers.size) * 100) : 0,
    topItem,
    topCustomer
  };
}

export async function getReportRange(period: "today" | "week" | "month") {
  const start =
    period === "today"
      ? startOfDay(new Date())
      : period === "week"
        ? startOfWeek(new Date(), { weekStartsOn: 1 })
        : startOfMonth(new Date());
  return listOrders({ from: start.toISOString() });
}
