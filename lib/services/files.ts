import { createSupabaseAdmin } from "@/lib/supabase";
import { getRestaurant } from "@/lib/repositories/restaurants";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const maxBytes = 5 * 1024 * 1024;

export function validatePaymentFile(file: { contentType: string; size: number }) {
  if (!allowedTypes.has(file.contentType)) {
    throw new Error("Only JPG, PNG, WEBP, or PDF payment files are accepted.");
  }
  if (!file.size || file.size > maxBytes) {
    throw new Error("Payment screenshot must be between 1 byte and 5 MB.");
  }
}

export async function savePaymentFile(input: {
  customerId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer;
  whatsappMediaId?: string;
}) {
  validatePaymentFile({ contentType: input.contentType, size: input.bytes.byteLength });
  const restaurant = await getRestaurant();
  const supabase = createSupabaseAdmin();
  const path = `${restaurant.id}/${input.customerId}/${Date.now()}-${input.fileName}`;
  const { error: uploadError } = await supabase.storage
    .from("payment-screenshots")
    .upload(path, input.bytes, { contentType: input.contentType, upsert: false });
  if (uploadError) throw uploadError;
  const { data: publicData } = supabase.storage.from("payment-screenshots").getPublicUrl(path);
  const { data, error } = await supabase
    .from("payment_files")
    .insert({
      restaurant_id: restaurant.id,
      customer_id: input.customerId,
      storage_path: path,
      public_url: publicData.publicUrl,
      content_type: input.contentType,
      size_bytes: input.bytes.byteLength,
      whatsapp_media_id: input.whatsappMediaId ?? null
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as { id: string; public_url: string };
}
