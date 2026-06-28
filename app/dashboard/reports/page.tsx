import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getReportRange } from "@/lib/repositories/orders";
import { formatMoney } from "@/lib/utils";
import type { Order } from "@/lib/types";

function summarize(orders: Order[]) {
  const revenue = orders.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total_paise, 0);
  const topItems = new Map<string, number>();
  const hours = new Map<number, number>();
  const customers = new Map<string, number>();
  for (const order of orders) {
    hours.set(new Date(order.created_at).getHours(), (hours.get(new Date(order.created_at).getHours()) ?? 0) + 1);
    customers.set(order.customers?.whatsapp_number ?? order.customer_id, (customers.get(order.customers?.whatsapp_number ?? order.customer_id) ?? 0) + 1);
    for (const item of order.order_items ?? []) {
      topItems.set(item.name_snapshot, (topItems.get(item.name_snapshot) ?? 0) + item.quantity);
    }
  }
  return {
    revenue,
    orders: orders.length,
    average: orders.length ? Math.round(revenue / orders.length) : 0,
    topItem: [...topItems.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No data",
    peakHour: [...hours.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
    returningCustomers: [...customers.values()].filter((count) => count > 1).length,
    topCustomer: [...customers.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No data"
  };
}

export default async function ReportsPage() {
  const [today, week, month] = await Promise.all([getReportRange("today"), getReportRange("week"), getReportRange("month")]);
  const sections = [
    ["Today", summarize(today)],
    ["This Week", summarize(week)],
    ["This Month", summarize(month)]
  ] as const;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">Revenue, order volume, top items, peak hours, and customer retention.</p>
      </div>
      <section className="grid gap-4 lg:grid-cols-3">
        {sections.map(([label, stats]) => (
          <Card key={label}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 size={18} />
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <p>Revenue: <strong>{formatMoney(stats.revenue)}</strong></p>
              <p>Orders: <strong>{stats.orders}</strong></p>
              <p>Average Order: <strong>{formatMoney(stats.average)}</strong></p>
              <p>Top Item: <strong>{stats.topItem}</strong></p>
              <p>Peak Hour: <strong>{stats.peakHour === undefined ? "No data" : `${stats.peakHour}:00`}</strong></p>
              <p>Returning Customers: <strong>{stats.returningCustomers}</strong></p>
              <p>Top Customer: <strong>{stats.topCustomer}</strong></p>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
