export type OrderStatus =
  | "awaiting_screenshot"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type SessionStep =
  | "idle"
  | "browsing_menu"
  | "awaiting_quantity"
  | "cart"
  | "checkout"
  | "awaiting_screenshot";

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  category: string;
  description: string | null;
  price_paise: number;
  image_url: string | null;
  available: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Customer = {
  id: string;
  restaurant_id: string;
  name: string | null;
  whatsapp_number: string;
  orders_count: number;
  lifetime_spend_paise: number;
  last_visit_at: string | null;
  average_spend_paise: number;
  favourite_item_id: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name_snapshot: string;
  price_paise_snapshot: number;
  quantity: number;
  line_total_paise: number;
};

export type Order = {
  id: string;
  order_code: string;
  restaurant_id: string;
  customer_id: string;
  status: OrderStatus;
  total_paise: number;
  special_instructions: string | null;
  payment_file_id: string | null;
  whatsapp_message_id: string | null;
  payment_ocr?: {
    amount_paise?: number | null;
    paid_to_upi?: string | null;
    paid_at?: string | null;
    transaction_id?: string | null;
    confidence?: "high" | "medium" | "low";
    matches_expected_upi?: boolean | null;
    matches_expected_amount?: boolean | null;
  } | null;
  created_at: string;
  updated_at: string;
  customers?: Customer;
  order_items?: OrderItem[];
};

export type RestaurantSettings = {
  id: string;
  name: string;
  phone: string;
  address: string;
  google_maps_url: string;
  upi_id: string;
  upi_qr_url: string | null;
  preparation_time_minutes: number;
  is_open: boolean;
  closed_message: string;
};

export type CartItem = {
  menuItemId: string;
  name: string;
  pricePaise: number;
  quantity: number;
};

export type WhatsappSessionState = {
  step: SessionStep;
  cart: CartItem[];
  lastMenuItemId?: string;
  pendingOrderId?: string;
  specialInstructions?: string;
};

export type DashboardMetrics = {
  todaysOrders: number;
  todaysRevenuePaise: number;
  preparing: number;
  ready: number;
  completed: number;
  pending: number;
  averageOrderPaise: number;
  returningPercent: number;
  topItem: string;
  topCustomer: string;
};
