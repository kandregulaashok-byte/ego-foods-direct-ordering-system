import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { listCustomers } from "@/lib/repositories/customers";
import { formatDateTime, formatMoney } from "@/lib/utils";

export default async function CustomersPage() {
  const customers = await listCustomers();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customers</h1>
        <p className="text-sm text-muted-foreground">CRM metrics generated from direct WhatsApp ordering history.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{customers.length} customers</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>WhatsApp</Th>
                <Th>Orders</Th>
                <Th>Lifetime Spend</Th>
                <Th>Last Order</Th>
                <Th>Favourite Item</Th>
                <Th>Average Spend</Th>
                <Th>Repeat</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <Td>{customer.name ?? "Guest"}</Td>
                  <Td>{customer.whatsapp_number}</Td>
                  <Td>{customer.orders_count}</Td>
                  <Td>{formatMoney(customer.lifetime_spend_paise)}</Td>
                  <Td>{customer.last_visit_at ? formatDateTime(customer.last_visit_at) : "None"}</Td>
                  <Td>{customer.favourite_item_id ?? "Calculated after orders"}</Td>
                  <Td>{formatMoney(customer.average_spend_paise)}</Td>
                  <Td>{customer.orders_count > 1 ? <Badge>Repeat</Badge> : "New"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
