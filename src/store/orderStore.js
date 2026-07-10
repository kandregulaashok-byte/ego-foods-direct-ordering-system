import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { hasKitchenApi, updateKitchenOrderStatus } from '../lib/kitchenApi';
import { sampleOrders } from '../lib/sampleData';
import { activeToday, completedToday, orderPortionKg } from '../lib/business';
import { startAlarm, stopAlarm } from '../lib/audio';

function isPaidNew(order) {
  return order?.payment_confirmed && (order.status === 'new' || order.status === 'payment_pending');
}

function printCustomerReceipt(order) {
  if (order?.source !== 'whatsapp' || !window.kitchenOS?.printer?.printCustomerReceipt) return;
  window.kitchenOS.printer.printCustomerReceipt(order).catch((error) => {
    console.error('Customer receipt print failed:', error);
  });
}

export const useOrderStore = create((set, get) => ({
  orders: sampleOrders,
  viewedScreenshots: {},
  alarmOrderIds: new Set(),
  setOrders: (orders) => {
    const nextOrders = [
      ...(orders || []),
      ...get().orders.filter((order) => ['swiggy', 'counter', 'dinein'].includes(order.source))
    ];
    const byId = new Map(nextOrders.map((order) => [order.swiggy_order_id || order.id, order]));
    const mergedOrders = Array.from(byId.values());
    const alarmOrderIds = new Set(mergedOrders.filter(isPaidNew).map((order) => order.id));
    if (alarmOrderIds.size) startAlarm();
    else stopAlarm();
    set({ orders: mergedOrders, alarmOrderIds });
  },
  mergeImportedOrders: (importedOrders) =>
    set((state) => {
      const byId = new Map(state.orders.map((order) => [order.swiggy_order_id || order.id, order]));
      for (const order of importedOrders || []) byId.set(order.swiggy_order_id || order.id, order);
      return { orders: Array.from(byId.values()) };
    }),
  addOrder: (order) =>
    set((state) => ({
      orders: [order, ...state.orders.filter((item) => item.id !== order.id)],
      alarmOrderIds: new Set([...state.alarmOrderIds, order.id])
    })),
  upsertOrder: (order) =>
    set((state) => ({
      orders: state.orders.some((item) => item.id === order.id)
        ? state.orders.map((item) => (item.id === order.id ? order : item))
        : [order, ...state.orders]
    })),
  markScreenshotViewed: (orderId) =>
    set((state) => ({ viewedScreenshots: { ...state.viewedScreenshots, [orderId]: true } })),
  dismissAlarmForOrder: (orderId) => {
    if (isPaidNew(get().orders.find((order) => order.id === orderId))) return;
    set((state) => {
      const alarmOrderIds = new Set(state.alarmOrderIds);
      alarmOrderIds.delete(orderId);
      if (alarmOrderIds.size === 0) stopAlarm();
      return { alarmOrderIds };
    });
  },
  updateOrderStatus: async (orderId, status, extra = {}) => {
    const previous = get().orders.find((order) => order.id === orderId);
    if (!previous) return { ok: false, message: 'Order not found.' };
    if (status === 'preparing' && !extra.payment_confirmed && !previous.payment_confirmed) {
      return { ok: false, message: 'Confirm the payment before preparing this order.' };
    }
    const next = { ...previous, ...extra, status, updated_at: new Date().toISOString() };
    if (hasKitchenApi && previous.source === 'whatsapp') {
      const saved = await updateKitchenOrderStatus(orderId, status, extra);
      get().upsertOrder(saved);
      if (status === 'preparing') printCustomerReceipt(saved);
      return { ok: true, previous, next: saved };
    }
    if (supabase) {
      const { error } = await supabase.from('orders').update(next).eq('id', orderId);
      if (error) return { ok: false, message: error.message };
    }
    get().upsertOrder(next);
    if (status === 'preparing') printCustomerReceipt(next);
    return { ok: true, previous, next };
  },
  activeCount: () => get().orders.filter(activeToday).length,
  paidTodayTotal: () =>
    get().orders
      .filter((order) => completedToday(order) && order.payment_confirmed)
      .reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
  completedPortionKg: (menuItems) =>
    get().orders
      .filter((order) => completedToday(order))
      .reduce((sum, order) => sum + orderPortionKg(order, menuItems), 0)
}));
