import { createSupabaseAdmin } from "@/lib/supabase";
import type { Customer } from "@/lib/types";
import { getRestaurant } from "@/lib/repositories/restaurants";
import { normalizeWhatsappNumber } from "@/lib/utils";

export async function findOrCreateCustomer(whatsappNumber: string, name?: string | null) {
  const restaurant = await getRestaurant();
  const normalized = normalizeWhatsappNumber(whatsappNumber);
  const supabase = createSupabaseAdmin();
  const { data: existing, error } = await supabase
    .from("customers")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("whatsapp_number", normalized)
    .maybeSingle();
  if (error) throw error;
  if (existing) return existing as Customer;

  const { data, error: createError } = await supabase
    .from("customers")
    .insert({ restaurant_id: restaurant.id, whatsapp_number: normalized, name })
    .select("*")
    .single();
  if (createError) throw createError;
  return data as Customer;
}

export async function listCustomers() {
  const restaurant = await getRestaurant();
  const { data, error } = await createSupabaseAdmin()
    .from("customers")
    .select("*, orders(*, order_items(*))")
    .eq("restaurant_id", restaurant.id)
    .order("last_visit_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as Customer[];
}
