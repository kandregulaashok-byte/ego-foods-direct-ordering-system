import { Minus, Plus, Printer, Save } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatINR } from '../lib/format';
import { useCashStore } from '../store/cashStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useOrderStore } from '../store/orderStore';

export default function CounterSales() {
  const menuItems = useInventoryStore((state) => state.menuItems);
  const portions = useInventoryStore((state) => state.portions);
  const addDineInSale = useCashStore((state) => state.addDineInSale);
  const addCounterOrder = useOrderStore((state) => state.addCounterOrder);
  const [cart, setCart] = useState({});
  const [mode, setMode] = useState('Takeaway');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const saleItems = portions
    .filter((portion) => portion.source !== 'swiggy' && Number(portion.price))
    .map((portion) => ({
      ...portion,
      menuName: menuItems.find((item) => item.id === portion.menu_item_id)?.name || 'Menu item'
    }));
  const total = useMemo(() => saleItems.reduce((sum, item) => sum + Number(cart[item.id] || 0) * Number(item.price || 0), 0), [cart, saleItems]);

  function setQty(id, delta) {
    setCart((current) => ({ ...current, [id]: Math.max(0, Number(current[id] || 0) + delta) }));
  }

  async function saveAndPrint() {
    if (loading || !total) return;
    setLoading(true);
    const selectedItems = saleItems
      .filter((item) => Number(cart[item.id] || 0) > 0)
      .map((item) => ({
        menu_item_id: item.menu_item_id,
        portion_id: item.id,
        name: `${item.menuName} - ${item.name}`,
        variant: item.name,
        qty: Number(cart[item.id] || 0),
        quantity: Number(cart[item.id] || 0),
        price: Number(item.price || 0),
        portion_grams: Number(item.grams || 0)
      }));
    const note = selectedItems
      .map((item) => `${item.name} x${item.qty}`)
      .join(', ');
    const result = await addDineInSale({ amount: total, note: `${mode}: ${note}` });
    setLoading(false);
    if (result.ok) {
      addCounterOrder({ items: selectedItems, total, mode });
      setCart({});
      setMessage('Counter sale saved and added to sales.');
    } else {
      setMessage(result.message || 'Could not save counter sale.');
    }
  }

  return (
    <section className="grid h-full bg-[#f7f1ec] lg:grid-cols-[1fr_340px]">
      <div className="min-h-0 overflow-y-auto p-5 scrollbar-none">
        <header className="mb-4">
          <h1 className="text-xl font-black text-text-dark">Counter Sales</h1>
          <p className="mt-1 text-[13px] font-semibold text-text-muted">Select item and quantity. Amount is calculated from menu price.</p>
        </header>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {saleItems.map((item) => (
            <div key={item.id} className="rounded-sm border border-[#eadfd7] bg-white p-4 shadow-card">
              <p className="text-[15px] font-black text-text-dark">{item.menuName}</p>
              <p className="mt-1 text-[13px] font-bold text-text-muted">{item.name} - {item.grams}g</p>
              <p className="mt-3 text-lg font-black text-[#8a3a08]">{formatINR(item.price)}</p>
              <div className="mt-3 flex items-center justify-between">
                <button type="button" onClick={() => setQty(item.id, -1)} className="flex h-10 w-10 items-center justify-center rounded-sm border border-[#eadfd7] text-text-dark">
                  <Minus size={17} />
                </button>
                <span className="text-xl font-black">{cart[item.id] || 0}</span>
                <button type="button" onClick={() => setQty(item.id, 1)} className="flex h-10 w-10 items-center justify-center rounded-sm bg-primary text-white">
                  <Plus size={17} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <aside className="border-l border-[#eadfd7] bg-white p-5">
        <h2 className="text-lg font-black text-text-dark">Order Summary</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {['Dine In', 'Takeaway'].map((item) => (
            <button key={item} type="button" onClick={() => setMode(item)} className={`min-h-10 rounded-sm border text-[13px] font-black ${mode === item ? 'border-primary bg-[#fff0e5] text-[#8a3a08]' : 'border-[#eadfd7] text-text-muted'}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {saleItems.filter((item) => Number(cart[item.id] || 0) > 0).map((item) => (
            <div key={item.id} className="flex justify-between text-[14px] font-bold text-text-dark">
              <span>{item.name} x{cart[item.id]}</span>
              <span>{formatINR(Number(item.price) * Number(cart[item.id]))}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 border-t border-[#eadfd7] pt-4">
          <div className="flex justify-between text-lg font-black text-text-dark">
            <span>Total Amount</span>
            <span>{formatINR(total)}</span>
          </div>
          <button type="button" disabled={!total || loading} onClick={saveAndPrint} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 text-[13px] font-black text-white disabled:bg-text-muted">
            <Save size={17} /> <Printer size={17} /> {loading ? 'Saving...' : 'Save & Print'}
          </button>
          <button type="button" onClick={() => setCart({})} className="mt-2 w-full rounded-sm border border-[#eadfd7] px-4 text-[13px] font-black text-text-dark">
            Clear
          </button>
          {message ? <p className="mt-3 text-[13px] font-bold text-success">{message}</p> : null}
        </div>
      </aside>
    </section>
  );
}
