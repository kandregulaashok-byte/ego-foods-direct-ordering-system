import { NextResponse } from "next/server";
import { listOrders } from "@/lib/repositories/orders";
import { csvEscape } from "@/lib/utils";
import type { OrderStatus } from "@/lib/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as OrderStatus | null;
  const orders = await listOrders({
    status: status || undefined,
    from: url.searchParams.get("from") || undefined,
    to: url.searchParams.get("to") || undefined,
    search: url.searchParams.get("search") || undefined
  });
  const rows = [
    ["Order ID", "Customer", "WhatsApp", "Items", "Amount", "Status", "Created Time"],
    ...orders.map((order) => [
      order.order_code,
      order.customers?.name ?? "",
      order.customers?.whatsapp_number ?? "",
      order.order_items?.map((item) => `${item.quantity} x ${item.name_snapshot}`).join("; ") ?? "",
      order.total_paise / 100,
      order.status,
      order.created_at
    ])
  ];
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=ego-foods-orders.csv"
    }
  });
}
