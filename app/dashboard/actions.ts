"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteMenuItem, upsertMenuItem } from "@/lib/repositories/menu";
import { updateOrderStatus } from "@/lib/repositories/orders";
import { updateRestaurantSettings } from "@/lib/repositories/restaurants";
import { writeAuditLog } from "@/lib/services/audit";
import { menuItemSchema, settingsSchema, statusUpdateSchema } from "@/lib/validation";
import { clearDashboardCookie } from "@/lib/auth";

export async function updateStatusAction(formData: FormData) {
  const parsed = statusUpdateSchema.parse({
    orderId: formData.get("orderId"),
    status: formData.get("status")
  });
  const order = await updateOrderStatus(parsed.orderId, parsed.status);
  await writeAuditLog({
    actor: "dashboard",
    action: "update_status",
    entityType: "order",
    entityId: order.id,
    metadata: { status: parsed.status }
  });
  revalidatePath("/dashboard/orders");
  revalidatePath("/dashboard");
}

export async function saveMenuItemAction(formData: FormData) {
  const id = formData.get("id")?.toString() || undefined;
  const parsed = menuItemSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    description: formData.get("description"),
    price_paise: Number(formData.get("price_rupees")) * 100,
    image_url: formData.get("image_url") || null,
    available: formData.get("available") === "on",
    sort_order: formData.get("sort_order")
  });
  const item = await upsertMenuItem({ id, ...parsed });
  await writeAuditLog({
    actor: "dashboard",
    action: id ? "update_menu_item" : "create_menu_item",
    entityType: "menu_item",
    entityId: item.id
  });
  revalidatePath("/dashboard/menu");
}

export async function deleteMenuItemAction(formData: FormData) {
  const id = String(formData.get("id"));
  await deleteMenuItem(id);
  await writeAuditLog({ actor: "dashboard", action: "delete_menu_item", entityType: "menu_item", entityId: id });
  revalidatePath("/dashboard/menu");
}

export async function saveSettingsAction(formData: FormData) {
  const parsed = settingsSchema.parse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    google_maps_url: formData.get("google_maps_url"),
    upi_id: formData.get("upi_id"),
    upi_qr_url: formData.get("upi_qr_url") || null,
    preparation_time_minutes: formData.get("preparation_time_minutes"),
    is_open: formData.get("is_open") === "on",
    closed_message: formData.get("closed_message")
  });
  const restaurant = await updateRestaurantSettings(parsed);
  await writeAuditLog({ actor: "dashboard", action: "update_settings", entityType: "restaurant", entityId: restaurant.id });
  revalidatePath("/dashboard/settings");
}

export async function logoutAction() {
  await clearDashboardCookie();
  redirect("/");
}
