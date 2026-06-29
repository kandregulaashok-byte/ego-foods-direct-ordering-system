import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

const items = [
  ["Fry Piece Biryani (Palav) - Regular", "Non-Veg Palavs", "Regular portion", 18000],
  ["Fry Piece Biryani (Palav) - Large", "Non-Veg Palavs", "Large portion", 26000],
  ["Chicken Joint Palav - Large", "Non-Veg Palavs", "Large portion", 30000],
  ["Chicken Sambar Rice - Regular", "Non-Veg Palavs", "Regular portion", 25000],
  ["Chicken Sambar Rice - Large", "Non-Veg Palavs", "Large portion", 35000],
  ["Special Chicken Palav - Regular", "Non-Veg Palavs", "Regular portion", 25000],
  ["Special Chicken Palav - Large", "Non-Veg Palavs", "Large portion", 35000],
  ["Chicken Mughlai Palav - Regular", "Non-Veg Palavs", "Regular portion", 25000],
  ["Chicken Mughlai Palav - Large", "Non-Veg Palavs", "Large portion", 35000],
  ["Chicken Biryani Fried Rice - Regular", "Non-Veg Palavs", "Regular portion", 25000],
  ["Chicken Biryani Fried Rice - Large", "Non-Veg Palavs", "Large portion", 35000],
  ["Ulavacharu Chicken Palav - Regular", "Non-Veg Palavs", "Regular portion", 25000],
  ["Ulavacharu Chicken Palav - Large", "Non-Veg Palavs", "Large portion", 35000],
  ["Veg Palav - Regular", "Veg Palavs", "Regular portion", 14000],
  ["Veg Palav - Large", "Veg Palavs", "Large portion", 20000],
  ["Special Veg Palav with Paneer Curry - Regular", "Veg Palavs", "Regular portion", 18000],
  ["Special Veg Palav with Paneer Curry - Large", "Veg Palavs", "Large portion", 26000],
  ["Veg Palav with Mushroom Curry - Regular", "Veg Palavs", "Regular portion", 18000],
  ["Veg Palav with Mushroom Curry - Large", "Veg Palavs", "Large portion", 26000],
  ["Hot Gulab Jamun (3 Pieces)", "Desserts", null, 8000],
  ["Hot Gulab Jamun with Vanilla Ice Cream", "Desserts", null, 12000]
] as const;

export async function POST() {
  const supabase = createSupabaseAdmin();
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id")
    .limit(1)
    .single();
  if (restaurantError) throw restaurantError;

  const { error: updateError } = await supabase
    .from("restaurants")
    .update({
      name: "EGO Foods (East Godavari Foods)",
      phone: "9866630936, 9703930936",
      address: "Road No. 17, Alkapoor Township, Puppalaguda, Hyderabad - 500089",
      google_maps_url: "https://maps.app.goo.gl/yCfYzkgsTX4eLFLr6",
      upi_id: "7702449983@ybl"
    })
    .eq("id", restaurant.id);
  if (updateError) throw updateError;

  const { error: deleteError } = await supabase.from("menu_items").delete().eq("restaurant_id", restaurant.id);
  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("menu_items").insert(
    items.map(([name, category, description, price_paise], index) => ({
      restaurant_id: restaurant.id,
      name,
      category,
      description,
      price_paise,
      available: true,
      sort_order: (index + 1) * 10
    }))
  );
  if (insertError) throw insertError;

  return NextResponse.json({ ok: true, items: items.length });
}
