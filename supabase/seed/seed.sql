insert into restaurants (name, phone, address, google_maps_url, upi_id, preparation_time_minutes, is_open)
values (
  'Ego Foods',
  '919999999999',
  'Ego Foods Kitchen, Bengaluru',
  'https://maps.google.com/?q=Ego+Foods+Bengaluru',
  'egofoods@upi',
  30,
  true
)
on conflict do nothing;

with restaurant as (select id from restaurants limit 1)
insert into menu_items (restaurant_id, name, category, description, price_paise, available, sort_order)
select id, 'Paneer Roll', 'Rolls', 'Soft roll packed with paneer, onions, and house chutney.', 14900, true, 10 from restaurant
union all select id, 'Chicken Roll', 'Rolls', 'Classic chicken roll with mint mayo.', 16900, true, 20 from restaurant
union all select id, 'Veg Fried Rice', 'Rice Bowls', 'Wok-tossed rice with seasonal vegetables.', 13900, true, 30 from restaurant
union all select id, 'Chicken Biryani', 'Rice Bowls', 'Aromatic rice with chicken and raita.', 22900, true, 40 from restaurant
union all select id, 'Masala Fries', 'Sides', 'Crisp fries with house spice mix.', 9900, true, 50 from restaurant
union all select id, 'Cold Coffee', 'Drinks', 'Chilled coffee with light sweetness.', 8900, true, 60 from restaurant;
