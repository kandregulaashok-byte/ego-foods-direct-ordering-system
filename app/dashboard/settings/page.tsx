import { saveSettingsAction } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getRestaurant } from "@/lib/repositories/restaurants";

export default async function SettingsPage() {
  const restaurant = await getRestaurant();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">These values are used in checkout messages and restaurant operations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Restaurant settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={saveSettingsAction} className="grid gap-3 md:grid-cols-2">
            <Input name="name" defaultValue={restaurant.name} placeholder="Restaurant name" required />
            <Input name="phone" defaultValue={restaurant.phone} placeholder="Phone" required />
            <Input name="upi_id" defaultValue={restaurant.upi_id} placeholder="UPI ID" required />
            <Input name="upi_qr_url" defaultValue={restaurant.upi_qr_url ?? ""} placeholder="UPI QR URL" />
            <Input name="google_maps_url" defaultValue={restaurant.google_maps_url} placeholder="Google Maps URL" required />
            <Input
              name="preparation_time_minutes"
              type="number"
              min="5"
              max="180"
              defaultValue={restaurant.preparation_time_minutes}
              required
            />
            <Textarea name="address" defaultValue={restaurant.address} placeholder="Address" className="md:col-span-2" />
            <Textarea
              name="closed_message"
              defaultValue={restaurant.closed_message}
              placeholder="Closed message"
              className="md:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input name="is_open" type="checkbox" defaultChecked={restaurant.is_open} />
              Restaurant open
            </label>
            <Button className="md:w-fit">Save settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
