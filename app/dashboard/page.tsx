import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, Td, Th } from "@/components/ui/table";
import { getDashboardMetrics, listOrders } from "@/lib/repositories/orders";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const [metrics, recentOrders] = await Promise.all([getDashboardMetrics(), listOrders()]);
  const cards = [
    ["Today's Orders", metrics.todaysOrders],
    ["Today's Revenue", formatMoney(metrics.todaysRevenuePaise)],
    ["Preparing", metrics.preparing],
    ["Ready", metrics.ready],
    ["Completed", metrics.completed],
    ["Pending", metrics.pending],
    ["Average Order", formatMoney(metrics.averageOrderPaise)],
    ["Repeat Customer %", `${metrics.returningPercent}%`],
    ["Top Item", metrics.topItem],
    ["Top Customer", metrics.topCustomer]
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live operating view for today.</p>
      </div>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </section>
      <Card>
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
