import { deleteMenuItemAction, saveMenuItemAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, Td, Th } from "@/components/ui/table";
import { listMenuItems } from "@/lib/repositories/menu";
import { formatMoney } from "@/lib/utils";

export default async function MenuPage() {
  const items = await listMenuItems();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Menu</h1>
        <p className="text-sm text-muted-foreground">Items marked unavailable are hidden from WhatsApp customers.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Add or update item</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveMenuItemAction} className="grid gap-3 md:grid-cols-2">
            <Input name="name" placeholder="Name" required />
            <Input name="category" placeholder="Category" required />
            <Input name="price_rupees" type="number" min="1" step="1" placeholder="Price in rupees" required />
            <Input name="sort_order" type="number" min="0" defaultValue="0" placeholder="Sort order" />
            <Input name="image_url" type="url" placeholder="Image URL" />
            <label className="flex items-center gap-2 text-sm">
              <input name="available" type="checkbox" defaultChecked />
              Available
            </label>
            <Textarea name="description" placeholder="Description" className="md:col-span-2" />
            <Button className="md:w-fit">Save item</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Current menu</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Category</Th>
                <Th>Price</Th>
                <Th>Available</Th>
                <Th>Sort</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <Td className="font-medium">{item.name}</Td>
                  <Td>{item.category}</Td>
                  <Td>{formatMoney(item.price_paise)}</Td>
                  <Td>{item.available ? "Yes" : "No"}</Td>
                  <Td>{item.sort_order}</Td>
                  <Td>
                    <div className="flex gap-2">
                    <form action={saveMenuItemAction} className="contents">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="name" value={item.name} />
                      <input type="hidden" name="category" value={item.category} />
                      <input type="hidden" name="description" value={item.description ?? ""} />
                      <input type="hidden" name="price_rupees" value={item.price_paise / 100} />
                      <input type="hidden" name="image_url" value={item.image_url ?? ""} />
                      <input type="hidden" name="sort_order" value={item.sort_order} />
                      {item.available ? null : <input type="hidden" name="available" value="on" />}
                      <Button size="sm" variant="outline">
                        {item.available ? "Mark sold out" : "Mark available"}
                      </Button>
                    </form>
                    <form action={deleteMenuItemAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <Button size="sm" variant="destructive">
                        Delete
                      </Button>
                    </form>
                    </div>
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
