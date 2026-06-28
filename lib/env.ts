import { z } from "zod";

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  WHATSAPP_ACCESS_TOKEN: z.string().min(1),
  WHATSAPP_PHONE_NUMBER_ID: z.string().min(1),
  WHATSAPP_VERIFY_TOKEN: z.string().min(8),
  DASHBOARD_PASSWORD: z.string().min(8),
  RESTAURANT_NAME: z.string().min(1).default("Ego Foods"),
  RESTAURANT_PHONE: z.string().min(8),
  RESTAURANT_UPI: z.string().min(3),
  RESTAURANT_MAPS: z.string().url(),
  COOKIE_SECRET: z.string().min(16).default("replace-this-cookie-secret")
});

export function getEnv() {
  return envSchema.parse(process.env);
}
