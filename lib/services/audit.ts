import { createSupabaseAdmin } from "@/lib/supabase";
import { getRestaurant } from "@/lib/repositories/restaurants";

export async function writeAuditLog(input: {
  actor: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  const restaurant = await getRestaurant();
  const { error } = await createSupabaseAdmin().from("audit_logs").insert({
    restaurant_id: restaurant.id,
    actor: input.actor,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {}
  });
  if (error) throw error;
}
