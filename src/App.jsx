import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Boxes,
  ChartColumn,
  CircleHelp,
  ClipboardList,
  Clock3,
  IndianRupee,
  Menu as MenuIcon,
  ReceiptText,
  ShoppingBag,
  Settings,
  Store,
  UtensilsCrossed,
  Wifi
} from 'lucide-react';
import { startAlarm } from './lib/audio';
import { applyExternalMappingsToOrders, orderPortionKg } from './lib/business';
import { fetchKitchenOrders, fetchKitchenSettings, hasKitchenApi, updateKitchenSettings } from './lib/kitchenApi';
import { importSwiggyNow, onSwiggyProgress } from './lib/swiggyBridge';
import { subscribeToOrders, supabase } from './lib/supabase';
import { useAppStore } from './store/appStore';
import { useCashStore } from './store/cashStore';
import { useExpenseStore } from './store/expenseStore';
import { sampleBatchLogs, sampleIngredients, sampleMenuItems, sampleRecipes } from './lib/sampleData';
import { useInventoryStore } from './store/inventoryStore';
import { useOrderStore } from './store/orderStore';
import CashLedger from './screens/CashLedger';
import CompletedSales from './screens/CompletedSales';
import DailySummary from './screens/DailySummary';
import ExpenseLog from './screens/ExpenseLog';
import Inventory from './screens/Inventory';
import MenuSetup from './screens/MenuSetup';
import OrderQueue from './screens/OrderQueue';
import SwiggyImportPanel from './components/SwiggyImportPanel';
import CounterSales from './screens/CounterSales';
import SettingsScreen from './screens/SettingsScreen';

const screens = {
  orders: OrderQueue,
  counter: CounterSales,
  sales: CompletedSales,
  inventory: Inventory,
  swiggy: SwiggyImportPanel,
  expenses: ExpenseLog,
  cash: CashLedger,
  summary: DailySummary,
  menu: MenuSetup,
  settings: SettingsScreen
};

const navItems = [
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'menu', label: 'Menu & Recipes', icon: UtensilsCrossed },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'swiggy', label: 'Swiggy Import', icon: Wifi },
  { id: 'sales', label: 'Sales', icon: ShoppingBag },
  { id: 'cash', label: 'Cash', icon: IndianRupee },
  { id: 'summary', label: 'Summary', icon: ChartColumn },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'settings', label: 'Settings', icon: Settings }
];

const titleByTab = {
  orders: 'MANAGE ORDERS',
  counter: 'COUNTER SALES',
  sales: 'COMPLETED SALES',
  inventory: 'INVENTORY',
  swiggy: 'SWIGGY IMPORT',
  expenses: 'EXPENSES',
  cash: 'CASH LEDGER',
  summary: 'SUMMARY',
  menu: 'MENU & RECIPES',
  settings: 'SETTINGS'
};

const closedMessage = 'Orders are currently not being taken. If we resume in some time, we will update you.';

export default function App() {
  const tab = useAppStore((state) => state.tab);
  const setTab = useAppStore((state) => state.setTab);
  const whatsappOpen = useAppStore((state) => state.whatsappOpen);
  const setWhatsappOpen = useAppStore((state) => state.setWhatsappOpen);
  const printerOnline = useAppStore((state) => state.printerOnline);
  const setPrinterOnline = useAppStore((state) => state.setPrinterOnline);
  const activeCount = useOrderStore((state) => state.activeCount());
  const addOrder = useOrderStore((state) => state.addOrder);
  const upsertOrder = useOrderStore((state) => state.upsertOrder);
  const setOrders = useOrderStore((state) => state.setOrders);
  const mergeImportedOrders = useOrderStore((state) => state.mergeImportedOrders);
  const setInventory = useInventoryStore((state) => state.setAll);
  const addSoldKg = useInventoryStore((state) => state.addSoldKg);
  const [swiggyImporting, setSwiggyImporting] = useState(false);
  const [swiggyProgress, setSwiggyProgress] = useState(null);
  const [notice, setNotice] = useState('');
  const kitchenSynced = useRef(false);
  const Screen = screens[tab] || MenuSetup;

  async function importFromSwiggy() {
    if (swiggyImporting) return;
    setSwiggyImporting(true);
    setSwiggyProgress({ percent: 3, message: 'Starting Swiggy import...' });
    try {
      const result = await importSwiggyNow({ visible: true });
      if (result.importedOrders) mergeImportedOrders(applySwiggyMappings(result.importedOrders));
      setNotice(result.ok ? 'Swiggy import complete.' : result.status || 'Swiggy import needs attention.');
    } catch {
      setTab('swiggy');
      setNotice('Open Swiggy Import to configure credentials and restaurant ID.');
    } finally {
      setSwiggyImporting(false);
      setTimeout(() => setSwiggyProgress(null), 5000);
    }
  }

  async function toggleWhatsappOpen() {
    const next = !whatsappOpen;
    setWhatsappOpen(next);
    if (!hasKitchenApi) return;
    try {
      const settings = await updateKitchenSettings({ is_open: next, closed_message: closedMessage });
      setWhatsappOpen(Boolean(settings.is_open));
      setNotice(settings.is_open ? 'WhatsApp orders are open.' : 'WhatsApp orders are paused.');
    } catch {
      setWhatsappOpen(!next);
      setNotice('Could not update WhatsApp open status.');
    }
  }

  useEffect(() => {
    const unsubscribe = onSwiggyProgress((progress) => {
      setSwiggyProgress(progress);
      if (progress.done) setNotice(progress.message);
    });

    async function loadKitchenOrders() {
      if (!hasKitchenApi) return;
      const orders = await fetchKitchenOrders();
      if (kitchenSynced.current) {
        const known = new Set(useOrderStore.getState().orders.map((order) => order.id));
        const newPaid = orders.filter((order) => order.status === 'new' && order.payment_confirmed && !known.has(order.id));
        for (const order of newPaid) addOrder(order);
        if (newPaid.length) {
          startAlarm();
          requestAnimationFrame(() => document.querySelector('[data-app-scroll]')?.scrollTo({ top: 0, behavior: 'smooth' }));
        }
      }
      kitchenSynced.current = true;
      setOrders(orders);
    }

    async function loadSupabaseData() {
      if (window.kitchenOS?.swiggy) {
        const payload = await window.kitchenOS.swiggy.getSettings();
        mergeImportedOrders(applySwiggyMappings(payload.importedOrders || []));
      }
      if (hasKitchenApi) {
        await fetchKitchenSettings()
          .then((settings) => setWhatsappOpen(Boolean(settings.is_open)))
          .catch(() => {});
      }
      await loadKitchenOrders().catch(() => setNotice('WhatsApp order sync is not reachable.'));
      if (!supabase) return;
      const [orders, menuItems, ingredients, recipes, batchLogs, expenses, dineInSales] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('menu_items').select('*').order('created_at', { ascending: true }),
        supabase.from('ingredients').select('*').order('created_at', { ascending: true }),
        supabase.from('recipes').select('*'),
        supabase.from('batch_logs').select('*').order('logged_at', { ascending: false }),
        supabase.from('expenses').select('*').order('logged_at', { ascending: false }),
        supabase.from('dinein_sales').select('*').order('logged_at', { ascending: false })
      ]);
      if (!orders.error && orders.data?.length) setOrders(orders.data);
      if (!menuItems.error && !ingredients.error && !recipes.error && !batchLogs.error) {
        setInventory({
          menuItems: menuItems.data?.length ? menuItems.data : sampleMenuItems,
          ingredients: ingredients.data?.length ? ingredients.data : sampleIngredients,
          recipes: recipes.data?.length ? recipes.data : sampleRecipes,
          batchLogs: batchLogs.data?.length ? batchLogs.data : sampleBatchLogs
        });
      }
      if (!expenses.error && expenses.data) useExpenseStore.setState({ expenses: expenses.data });
      if (!dineInSales.error && dineInSales.data) useCashStore.setState({ dineInSales: dineInSales.data });
    }

    loadSupabaseData();
    const kitchenPoll = hasKitchenApi
      ? setInterval(() => {
          loadKitchenOrders().catch(() => {});
        }, 10000)
      : null;
    const unsubscribeOrders = subscribeToOrders({
      onInsert: (order) => {
        addOrder(order);
        startAlarm();
        requestAnimationFrame(() => document.querySelector('[data-app-scroll]')?.scrollTo({ top: 0, behavior: 'smooth' }));
      },
      onUpdate: (order, oldOrder) => {
        upsertOrder(order);
        if (order.status === 'completed' && oldOrder?.status !== 'completed') {
          const { menuItems } = useInventoryStore.getState();
          const kg = orderPortionKg(order, menuItems);
          const firstItem = order.items?.[0];
          if (firstItem) addSoldKg(firstItem.menu_item_id, kg);
        }
      }
    });
    return () => {
      if (kitchenPoll) clearInterval(kitchenPoll);
      unsubscribeOrders();
      unsubscribe();
    };
  }, [addOrder, addSoldKg, mergeImportedOrders, setInventory, setOrders, upsertOrder]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timeout);
  }, [notice]);

  return (
    <div className="flex h-screen min-h-[680px] w-screen overflow-hidden bg-bg-secondary text-text-dark" data-app-scroll>
      <aside className="flex w-[164px] shrink-0 flex-col border-r border-[#eadfd7] bg-[#fffaf6] text-[#4b2b19] scrollbar-none max-[860px]:w-[82px]">
        <button
          type="button"
          onClick={() => setTab('orders')}
          className="flex h-[74px] shrink-0 items-center gap-3 border-b border-[#eadfd7] px-4 text-left max-[860px]:justify-center max-[860px]:px-2"
          aria-label="Kitchen OS home"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#eadfd7] bg-white shadow-card">
            <img src="/ego-foods-logo.jpg" alt="Ego Foods logo" className="h-full w-full object-cover" />
          </span>
          <span className="text-[14px] font-black leading-4 max-[860px]:hidden">EGO FOODS</span>
        </button>
        <nav className="flex w-full flex-1 flex-col gap-1 px-2 py-4">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-label={label}
                className={`relative flex w-full items-center gap-3 rounded-sm border-r-2 px-3 py-2 text-left text-[13px] font-bold ${
                  active ? 'border-primary bg-[#fff0e5] text-[#9a3f00]' : 'border-transparent text-[#5a4b42] hover:bg-[#fff4eb]'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <Icon size={17} />
                </span>
                <span className="max-[860px]:hidden">{label}</span>
                {id === 'orders' && activeCount > 0 ? (
                  <span className="absolute right-2 top-1 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[11px] font-black text-white">
                    {activeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setTab('counter')}
          aria-label="New Counter Sale"
          className="m-3 min-h-11 rounded-sm bg-primary px-3 text-[12px] font-black text-white max-[860px]:px-2"
        >
          <span className="max-[860px]:hidden">NEW COUNTER SALE</span>
          <span className="hidden max-[860px]:inline">SALE</span>
        </button>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-[#eadfd7] bg-[#fffaf6] text-text-dark">
          <div className="grid min-h-[74px] gap-3 px-5 py-3 xl:grid-cols-[minmax(240px,1fr)_auto] xl:items-center">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <p className="mr-2 text-[13px] font-black uppercase text-text-dark">Main Kitchen</p>
              <StatusPill color="bg-success" label="Open Status" active />
              <StatusPill color={whatsappOpen ? 'bg-success' : 'bg-danger'} label={whatsappOpen ? 'WhatsApp Ready' : 'WhatsApp Off'} />
              <StatusPill color={printerOnline ? 'bg-success' : 'bg-danger'} label={printerOnline ? 'Printer Active' : 'Printer Issue'} />
            </div>
            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
            <div className="hidden h-10 min-w-[210px] items-center gap-2 rounded-full border border-[#eadfd7] bg-white px-3 text-[13px] font-semibold text-text-muted lg:flex">
              <MenuIcon size={15} />
              Search menu, items...
            </div>
            <button
              type="button"
              onClick={importFromSwiggy}
              disabled={swiggyImporting}
              className="h-10 whitespace-nowrap rounded-sm border border-[#eadfd7] bg-white px-3 text-[13px] font-black text-[#6f3513] disabled:text-text-muted"
            >
              {swiggyImporting ? 'IMPORTING...' : 'IMPORT SWIGGY'}
            </button>
            <button type="button" onClick={toggleWhatsappOpen} className={`h-10 whitespace-nowrap rounded-sm px-3 text-[13px] font-black text-white ${whatsappOpen ? 'bg-success' : 'bg-danger'}`}>
              WhatsApp {whatsappOpen ? 'ON' : 'OFF'}
            </button>
            <button type="button" onClick={() => setPrinterOnline(!printerOnline)} className="h-10 whitespace-nowrap rounded-sm border border-[#eadfd7] bg-white px-3 text-[13px] font-black text-text-dark">
              Printer {printerOnline ? 'OK' : 'Warn'}
            </button>
            <button type="button" onClick={() => setNotice('FAQ: Swiggy import, inventory, expenses, and reports are available from the sidebar.')} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfd7] bg-white text-text-dark" aria-label="FAQ">
              <Clock3 size={18} />
            </button>
            <button type="button" onClick={() => setNotice(`${activeCount} active orders need attention.`)} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfd7] bg-white text-text-dark" aria-label="Notifications">
              <Bell size={18} />
              {activeCount > 0 ? <span className="absolute right-1 top-1 h-3 w-3 rounded-full bg-danger" /> : null}
            </button>
            <button type="button" onClick={() => setNotice('Help: use Swiggy Import for credentials and Menu & Recipes for mappings.')} className="flex h-10 w-10 items-center justify-center rounded-full border border-[#eadfd7] bg-white text-text-dark" aria-label="Help">
              <CircleHelp size={18} />
            </button>
            </div>
          </div>
          {!whatsappOpen ? (
            <div className="border-t border-[#eadfd7] bg-[#fff0e5] px-5 py-2 text-[13px] font-bold text-[#7a3508]">
              WhatsApp orders are paused. Bot reply: {closedMessage}
            </div>
          ) : null}
        </header>
        {swiggyProgress ? (
          <div className="z-20 border-b border-border bg-bg px-8 py-3 shadow-card">
            <div className="flex items-center justify-between gap-4 text-[15px] font-black text-text-dark">
              <span>{swiggyProgress.message || 'Importing from Swiggy...'}</span>
              <span>{Math.round(swiggyProgress.percent || 0)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-primary transition-all duration-200" style={{ width: `${Math.min(100, Math.max(0, swiggyProgress.percent || 0))}%` }} />
            </div>
          </div>
        ) : null}
        {notice ? (
          <div className="absolute right-6 top-[110px] z-30 rounded-lg border border-border bg-bg px-4 py-3 text-[15px] font-black text-text-dark shadow-lg">
            {notice}
          </div>
        ) : null}
        <main className="min-h-0 flex-1 overflow-hidden bg-[#f7f1ec]">
          <Screen />
        </main>
      </div>
    </div>
  );
}

function applySwiggyMappings(orders) {
  const { externalMappings, portions, menuItems } = useInventoryStore.getState();
  return applyExternalMappingsToOrders(orders, { externalMappings, portions, menuItems });
}

function StatusPill({ color, label }) {
  return (
    <span className="inline-flex h-8 items-center gap-2 rounded-full border border-[#eadfd7] bg-white px-3 text-[12px] font-bold text-text-dark">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
