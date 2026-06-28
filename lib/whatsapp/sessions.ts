import { createSupabaseAdmin } from "@/lib/supabase";
import type { WhatsappSessionState } from "@/lib/types";
import { getRestaurant } from "@/lib/repositories/restaurants";
import { findOrCreateCustomer } from "@/lib/repositories/customers";

const defaultState: WhatsappSessionState = { step: "idle", cart: [] };

export async function getSession(whatsappNumber: string) {
  const restaurant = await getRestaurant();
  const customer = await findOrCreateCustomer(whatsappNumber);
  const { data, error } = await createSupabaseAdmin()
    .from("whatsapp_sessions")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .eq("customer_id", customer.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { customer, state: defaultState };
  return { customer, state: (data.state ?? defaultState) as WhatsappSessionState };
}

export async function saveSession(whatsappNumber: string, state: WhatsappSessionState) {
  const restaurant = await getRestaurant();
  const customer = await findOrCreateCustomer(whatsappNumber);
  const { error } = await createSupabaseAdmin()
    .from("whatsapp_sessions")
    .upsert(
      {
        restaurant_id: restaurant.id,
        customer_id: customer.id,
        state,
        expires_at: new Date(Date.now() + 1000 * 60 * 60 * 6).toISOString()
      },
      { onConflict: "restaurant_id,customer_id" }
    );
  if (error) throw error;
}

export async function clearSession(whatsappNumber: string) {
  await saveSession(whatsappNumber, defaultState);
}
