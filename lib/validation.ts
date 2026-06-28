import { z } from "zod";

export const orderStatusSchema = z.enum([
  "awaiting_screenshot",
  "preparing",
  "ready",
  "completed",
  "cancelled"
]);

export const menuItemSchema = z.object({
  name: z.string().min(2).max(120),
  category: z.string().min(2).max(80),
  description: z.string().max(500).optional().nullable(),
  price_paise: z.coerce.number().int().min(100).max(1000000),
  image_url: z.string().url().optional().nullable(),
  available: z.coerce.boolean().default(true),
  sort_order: z.coerce.number().int().min(0).default(0)
});

export const settingsSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(20),
  address: z.string().min(3).max(300),
  google_maps_url: z.string().url(),
  upi_id: z.string().min(3).max(120),
  upi_qr_url: z.string().url().optional().nullable(),
  preparation_time_minutes: z.coerce.number().int().min(5).max(180),
  is_open: z.coerce.boolean(),
  closed_message: z.string().min(3).max(300)
});

export const statusUpdateSchema = z.object({
  orderId: z.string().uuid(),
  status: orderStatusSchema
});

export const loginSchema = z.object({
  password: z.string().min(1)
});

export const webhookTextSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string().optional(),
  text: z.object({ body: z.string().default("") }).optional(),
  type: z.string()
});
