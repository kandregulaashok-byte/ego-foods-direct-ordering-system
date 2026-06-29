import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { LiveRefresh } from "@/components/dashboard/live-refresh";
import { getDashboardMetrics, listOrders } from "@/lib/repositories/orders";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const [metrics, recentOrders] = await Promise.all([
    getDashboardMetrics().catch((error) => {
      console.error("Dashboard metrics failed", error);
      return null;
    }),
    listOrders().catch((error) => {
      console.error("Recent orders failed", error);
      return [];
    })
  ]);
  if (!metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Could not load dashboard metrics. Check Vercel logs and Supabase env values.</p>
        </div>
      </div>
    );
  }
  const cards = [
    ["Today's Orders", metrics.todaysOrders, "accent-emerald"],
    ["Today's Revenue", formatMoney(metrics.todaysRevenuePaise), "accent-gold"],
    ["Preparing", metrics.preparing, "accent-cyan"],
    ["Ready", metrics.ready, "accent-lime"],
    ["Completed", metrics.completed, "accent-ink"],
    ["Pending", metrics.pending, "accent-amber"],
    ["Average Order", formatMoney(metrics.averageOrderPaise), "accent-cyan"],
    ["Repeat Customer %", `${metrics.returningPercent}%`, "accent-emerald"],
    ["Top Item", metrics.topItem, "accent-gold"],
    ["Top Customer", metrics.topCustomer, "accent-ink"]
  ];
  return (
    <div className="space-y-6">
      <div className="hero-panel flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">EGO FOODS CONTROL ROOM</p>
          <h1 className="text-4xl font-semibold tracking-tight">Today&apos;s service</h1>
          <p className="mt-2 text-sm text-muted-foreground">Orders, revenue, kitchen status, and repeat customers in one live view.</p>
        </div>
        <Link className="rounded-md border border-white/65 bg-zinc-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800" href="/dashboard/orders">
          Open orders
        </Link>
      </div>
      <LiveRefresh orderIds={recentOrders.map((order) => order.id)} />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value, accent]) => (
          <Card key={label} className={`metric-card ${accent} overflow-hidden`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card className="order-board">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.slice(0, 10).map((order) => (
                <tr key={order.id}>
                  <Td>
                    <Link className="font-medium text-primary" href="/dashboard/orders">
                      {order.order_code}
                    </Link>
                  </Td>
                  <Td>{order.customers?.name ?? order.customers?.whatsapp_number}</Td>
                  <Td>{formatMoney(order.total_paise)}</Td>
                  <Td>
                    <Badge status={order.status}>{order.status.replace(/_/g, " ")}</Badge>
                  </Td>
                  <Td>{formatDateTime(order.created_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
