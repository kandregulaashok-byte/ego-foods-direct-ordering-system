import { createSupabaseAdmin } from "@/lib/supabase";
import type { RestaurantSettings } from "@/lib/types";
import { getEnv } from "@/lib/env";

export async function getRestaurant(): Promise<RestaurantSettings> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("restaurants").select("*").limit(1).single();
  if (error && error.code !== "PGRST116") throw error;
  if (data) return data as RestaurantSettings;

  const env = getEnv();
  const { data: created, error: createError } = await supabase
    .from("restaurants")
    .insert({
      name: env.RESTAURANT_NAME,
      phone: env.RESTAURANT_PHONE,
      google_maps_url: env.RESTAURANT_MAPS,
      upi_id: env.RESTAURANT_UPI
    })
    .select("*")
    .single();
  if (createError) throw createError;
  return created as RestaurantSettings;
}

export async function updateRestaurantSettings(input: Partial<RestaurantSettings>) {
  const restaurant = await getRestaurant();
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("restaurants")
    .update(input)
    .eq("id", restaurant.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as RestaurantSettings;
}
