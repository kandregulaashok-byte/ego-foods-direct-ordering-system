import { createSupabaseAdmin } from "@/lib/supabase";
import type { MenuItem } from "@/lib/types";
import { getRestaurant } from "@/lib/repositories/restaurants";

export async function listMenuItems({ availableOnly = false } = {}) {
  const restaurant = await getRestaurant();
  let query = createSupabaseAdmin()
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (availableOnly) query = query.eq("available", true);
  const { data, error } = await query;
  if (error) throw error;
  return data as MenuItem[];
}

export async function getMenuItem(id: string) {
  const { data, error } = await createSupabaseAdmin()
    .from("menu_items")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as MenuItem;
}

export async function upsertMenuItem(input: Partial<MenuItem>) {
  const restaurant = await getRestaurant();
  const { data, error } = await createSupabaseAdmin()
    .from("menu_items")
    .upsert({ ...input, restaurant_id: restaurant.id })
    .select("*")
    .single();
  if (error) throw error;
  return data as MenuItem;
}

export async function deleteMenuItem(id: string) {
  const { error } = await createSupabaseAdmin().from("menu_items").delete().eq("id", id);
  if (error) throw error;
}
