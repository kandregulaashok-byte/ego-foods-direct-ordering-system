import { createClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/env";

export function normalizeSupabaseUrl(url: string) {
  const match = url.match(/supabase\.com\/dashboard\/project\/([^/?#]+)/);
  return match ? `https://${match[1]}.supabase.co` : url;
}

export function createSupabaseAdmin() {
  const env = getEnv();
  return createClient(normalizeSupabaseUrl(env.SUPABASE_URL), env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
