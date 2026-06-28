import Link from "next/link";
import { updateStatusAction } from "@/app/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { listOrders } from "@/lib/repositories/orders";
import { formatDateTime, formatMoney } from "@/lib/utils";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";

const statuses: OrderStatus[] = ["awaiting_screenshot", "preparing", "ready", "completed", "cancelled"];
type OrderRow = Order & {
  payment_files?: { public_url?: string } | null;
  order_items?: OrderItem[];
};

export default async function OrdersPage({
  searchParams
}: {
  searchParams: Promise<{ status?: OrderStatus; search?: string; from?: string; to?: string }>;
}) {
  const filters = await searchParams;
  const orders = await listOrders(filters);
  const query = new URLSearchParams(filters as Record<string, string>).toString();
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-muted-foreground">Search, filter, export, and update order progress.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/api/orders/export?${query}`}>Export CSV</Link>
        </Button>
      </div>
      <form className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-5">
        <Input name="search" placeholder="Search orders" defaultValue={filters.search} />
        <Input type="date" name="from" defaultValue={filters.from?.slice(0, 10)} />
        <Input type="date" name="to" defaultValue={filters.to?.slice(0, 10)} />
        <select name="status" defaultValue={filters.status ?? ""} className="h-10 rounded-md border bg-background px-3 text-sm">
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <Button>Apply</Button>
      </form>
      <Card>
        <CardHeader>
          <CardTitle>{orders.length} orders</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Order ID</Th>
                <Th>Customer</Th>
                <Th>WhatsApp</Th>
                <Th>Items</Th>
                <Th>Amount</Th>
                <Th>Screenshot</Th>
                <Th>Status</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(orders as OrderRow[]).map((order) => (
                <tr key={order.id}>
                  <Td className="font-medium">{order.order_code}</Td>
                  <Td>{order.customers?.name ?? "Guest"}</Td>
                  <Td>{order.customers?.whatsapp_number}</Td>
                  <Td className="min-w-56">
                    {order.order_items?.map((item) => `${item.quantity} x ${item.name_snapshot}`).join(", ")}
                  </Td>
                  <Td>{formatMoney(order.total_paise)}</Td>
                  <Td>
                    {order.payment_files?.public_url ? (
                      <Link className="text-primary underline" href={order.payment_files.public_url} target="_blank">
                        View
                      </Link>
                    ) : (
                      "None"
                    )}
                  </Td>
                  <Td>
                    <Badge status={order.status}>{order.status.replace(/_/g, " ")}</Badge>
                  </Td>
                  <Td>{formatDateTime(order.created_at)}</Td>
                  <Td>
                    <form action={updateStatusAction} className="flex gap-2">
                      <input type="hidden" name="orderId" value={order.id} />
                      <select name="status" defaultValue={order.status} className="h-8 rounded-md border bg-background px-2 text-xs">
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline">
                        Save
                      </Button>
                    </form>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
