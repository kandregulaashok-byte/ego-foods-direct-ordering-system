import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { sampleDineInSales } from '../lib/sampleData';
import { todayISO, uid } from '../lib/format';
import { readLocal, writeLocal } from '../lib/localPersist';

const cashKey = 'kitchen-os.cash';

export const useCashStore = create((set, get) => ({
  dineInSales: readLocal(cashKey, sampleDineInSales),
  addDineInSale: async ({ amount, note }) => {
    const row = {
      id: uid('dinein'),
      amount: Number(amount),
      note,
      date: todayISO(),
      logged_at: new Date().toISOString()
    };
    if (supabase) {
      const { error } = await supabase.from('dinein_sales').insert(row);
      if (error) return { ok: false, message: error.message };
    }
    set((state) => {
      const dineInSales = [row, ...state.dineInSales];
      writeLocal(cashKey, dineInSales);
      return { dineInSales };
    });
    return { ok: true };
  },
  totalToday: () =>
    get().dineInSales
      .filter((sale) => sale.date === todayISO())
      .reduce((sum, sale) => sum + Number(sale.amount || 0), 0)
}));
