import { todayISO, uid } from './format';

const now = new Date();
const minutesAgo = (minutes) => new Date(now.getTime() - minutes * 60000).toISOString();

export const sampleMenuItems = [
  {
    id: 'menu-fry-piece-biryani',
    name: 'Fry Piece Biryani',
    category: 'biryani',
    recipe_base_quantity: 1,
    recipe_base_unit: 'kg',
    cooked_low_stock_threshold_kg: 1.5,
    price_full: 180,
    price_half: 110,
    portion_full_grams: 400,
    portion_half_grams: 200,
    is_active: true
  }
];

export const samplePortions = [
  { id: 'portion-fry-half', menu_item_id: 'menu-fry-piece-biryani', name: 'Half', grams: 200, price: 110, source: 'whatsapp' },
  { id: 'portion-fry-full', menu_item_id: 'menu-fry-piece-biryani', name: 'Full', grams: 400, price: 180, source: 'whatsapp' },
  { id: 'portion-fry-swiggy-single', menu_item_id: 'menu-fry-piece-biryani', name: 'Swiggy SINGLE', grams: 400, price: null, source: 'swiggy' },
  { id: 'portion-fry-swiggy-large', menu_item_id: 'menu-fry-piece-biryani', name: 'Swiggy Large', grams: 600, price: null, source: 'swiggy' }
];

export const sampleIngredients = [
  ['Basmati Rice', 'kg', 10, 2],
  ['Chicken Fry Pieces', 'kg', 5, 1],
  ['Oil', 'ml', 2000, 500],
  ['Onions', 'kg', 3, 0.5],
  ['Tomatoes', 'kg', 2, 0.5],
  ['Ginger Garlic Paste', 'kg', 0.5, 0.1],
  ['Biryani Masala', 'kg', 0.3, 0.05],
  ['Curd', 'kg', 1, 0.2],
  ['Salt and Spices', 'kg', 0.5, 0.1]
].map(([name, unit, current_stock, low_stock_threshold]) => ({
  id: `ingredient-${name.toLowerCase().replaceAll(' ', '-')}`,
  name,
  unit,
  current_stock,
  low_stock_threshold
}));

export const sampleRecipes = sampleIngredients.map((ingredient) => ({
  id: uid('recipe'),
  menu_item_id: 'menu-fry-piece-biryani',
  ingredient_id: ingredient.id,
  base_quantity: 1,
  base_unit: 'kg',
  quantity_per_kg: {
    'Basmati Rice': 0.6,
    'Chicken Fry Pieces': 0.4,
    Oil: 80,
    Onions: 0.15,
    Tomatoes: 0.1,
    'Ginger Garlic Paste': 0.03,
    'Biryani Masala': 0.02,
    Curd: 0.05,
    'Salt and Spices': 0.01
  }[ingredient.name],
  unit: ingredient.unit
}));

export const sampleExternalMappings = [
  {
    id: 'mapping-swiggy-single',
    source: 'swiggy',
    external_item_name: 'Chicken Fry Piece Palav SINGLE',
    menu_item_id: 'menu-fry-piece-biryani',
    portion_id: 'portion-fry-swiggy-single',
    inventory_applies: true
  },
  {
    id: 'mapping-swiggy-large',
    source: 'swiggy',
    external_item_name: 'Chicken Fry Piece Palav Large',
    menu_item_id: 'menu-fry-piece-biryani',
    portion_id: 'portion-fry-swiggy-large',
    inventory_applies: true
  }
];

export const sampleBatchLogs = [
  {
    id: 'batch-today',
    menu_item_id: 'menu-fry-piece-biryani',
    date: todayISO(),
    kg_cooked: 5,
    kg_sold: 0.8,
    estimated_waste_cost: 90,
    logged_at: minutesAgo(220)
  }
];

export const sampleOrders = [
  {
    id: 'order-new-1',
    customer_name: 'Arjun M.',
    customer_phone: '9999999999',
    items: [{ menu_item_id: 'menu-fry-piece-biryani', name: 'Fry Piece Biryani', variant: 'full', qty: 1, price: 180 }],
    total_amount: 180,
    status: 'new',
    payment_confirmed: true,
    payment_screenshot_url: '',
    pickup_code: '4291',
    source: 'whatsapp',
    created_at: minutesAgo(8),
    updated_at: minutesAgo(8)
  },
  {
    id: 'order-preparing-1',
    customer_name: 'Meera',
    items: [{ menu_item_id: 'menu-fry-piece-biryani', name: 'Fry Piece Biryani', variant: 'half', qty: 2, price: 110 }],
    total_amount: 220,
    status: 'preparing',
    payment_confirmed: true,
    pickup_code: '8310',
    source: 'whatsapp',
    created_at: minutesAgo(30),
    updated_at: minutesAgo(12)
  },
  {
    id: 'order-done-1',
    customer_name: 'Ravi',
    items: [{ menu_item_id: 'menu-fry-piece-biryani', name: 'Fry Piece Biryani', variant: 'full', qty: 1, price: 180 }],
    total_amount: 180,
    status: 'completed',
    payment_confirmed: true,
    pickup_code: '2764',
    source: 'whatsapp',
    created_at: minutesAgo(95),
    updated_at: minutesAgo(72)
  }
];

export const sampleExpenses = [
  {
    id: 'expense-chicken',
    type: 'market_purchase',
    description: 'Chicken Fry Pieces',
    ingredient_id: 'ingredient-chicken-fry-pieces',
    quantity: 3,
    unit: 'kg',
    amount: 720,
    date: todayISO(),
    logged_at: minutesAgo(260)
  },
  {
    id: 'expense-rice',
    type: 'market_purchase',
    description: 'Basmati Rice',
    ingredient_id: 'ingredient-basmati-rice',
    quantity: 5,
    unit: 'kg',
    amount: 450,
    date: todayISO(),
    logged_at: minutesAgo(250)
  }
];

export const sampleDineInSales = [
  { id: 'dinein-1', amount: 1800, note: 'Lunch counter', date: todayISO(), logged_at: minutesAgo(70) }
];
