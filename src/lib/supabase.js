import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabase = Boolean(url && anonKey && !url.includes('your_supabase'));
export const supabase = hasSupabase ? createClient(url, anonKey) : null;

export function subscribeToOrders({ onInsert, onUpdate }) {
  if (!supabase) return () => {};

  const insertChannel = supabase
    .channel('orders')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => onInsert?.(payload.new))
    .subscribe();

  const updateChannel = supabase
    .channel('order_updates')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => onUpdate?.(payload.new, payload.old))
    .subscribe();

  return () => {
    supabase.removeChannel(insertChannel);
    supabase.removeChannel(updateChannel);
  };
}
