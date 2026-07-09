import { Bell, Boxes, ChartColumn, IndianRupee, ReceiptText } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useOrderStore } from '../store/orderStore';

const tabs = [
  { id: 'orders', label: 'Orders', icon: Bell },
  { id: 'inventory', label: 'Inventory', icon: Boxes },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
  { id: 'cash', label: 'Cash', icon: IndianRupee },
  { id: 'summary', label: 'Summary', icon: ChartColumn }
];

export default function BottomNav() {
  const tab = useAppStore((state) => state.tab);
  const setTab = useAppStore((state) => state.setTab);
  const activeCount = useOrderStore((state) => state.activeCount());

  return (
    <nav className="grid h-[76px] grid-cols-5 border-t border-border bg-bg">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`relative flex min-h-[76px] flex-col items-center justify-center gap-1 border-t-2 text-[14px] font-semibold ${
              active ? 'border-primary text-primary' : 'border-transparent text-text-muted'
            }`}
          >
            <span className="relative">
              <Icon size={22} />
              {id === 'orders' && activeCount > 0 ? (
                <span className="absolute -right-3 -top-2 flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[12px] font-bold text-white">
                  {activeCount}
                </span>
              ) : null}
            </span>
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
