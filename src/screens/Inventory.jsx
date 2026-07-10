import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import InventoryBar from '../components/InventoryBar';
import Modal from '../components/Modal';
import { formatKg, todayISO } from '../lib/format';
import { recipeDeductionAmount, useInventoryStore } from '../store/inventoryStore';
import { useAppStore } from '../store/appStore';

function ingredientColor(ingredient) {
  const stock = Number(ingredient.current_stock || 0);
  const threshold = Number(ingredient.low_stock_threshold || 0);
  if (stock <= threshold) return '#E02020';
  if (stock <= threshold * 1.3) return '#FC8019';
  return '#60B246';
}

export default function Inventory() {
  const menuItems = useInventoryStore((state) => state.menuItems);
  const ingredients = useInventoryStore((state) => state.ingredients);
  const recipes = useInventoryStore((state) => state.recipes);
  const batchLogs = useInventoryStore((state) => state.batchLogs);
  const logBatch = useInventoryStore((state) => state.logBatch);
  const openExpenseMode = useAppStore((state) => state.openExpenseMode);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState(menuItems[0]?.id || '');
  const [batchOpen, setBatchOpen] = useState(false);
  const [kgCooked, setKgCooked] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const menuItem = menuItems.find((item) => item.id === selectedMenuItemId) || menuItems[0];
  const todayBatches = batchLogs.filter((batch) => batch.date === todayISO() && batch.menu_item_id === menuItem?.id);
  const cooked = todayBatches.reduce((sum, batch) => sum + Number(batch.kg_cooked || 0), 0);
  const sold = todayBatches.reduce((sum, batch) => sum + Number(batch.kg_sold || 0), 0);
  const left = Math.max(0, cooked - sold);
  const percentSold = cooked ? Math.round((sold / cooked) * 100) : 0;
  const deductions = useMemo(() => recipes.filter((recipe) => recipe.menu_item_id === menuItem?.id).map((recipe) => {
    const ingredient = ingredients.find((item) => item.id === recipe.ingredient_id);
    return { ingredient, amount: recipeDeductionAmount(recipe, Number(kgCooked || 0), ingredient?.unit || recipe.unit), unit: ingredient?.unit || recipe.unit };
  }), [recipes, ingredients, menuItem, kgCooked]);

  async function saveBatch() {
    if (loading) return;
    setLoading(true);
    setMessage('');
    try {
      const result = await logBatch(menuItem.id, Number(kgCooked));
      if (result.ok) {
        setBatchOpen(false);
        setKgCooked('');
      } else {
        setMessage(result.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="h-full overflow-y-auto bg-[#f7f1ec] p-5 pb-6 scrollbar-none">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-text-dark">Inventory & Batch Management</h1>
          <p className="mt-1 text-[13px] font-semibold text-text-muted">Real-time tracking of raw stock and cooked production batches.</p>
        </div>
        <span className="rounded-full border border-[#eadfd7] bg-white px-3 py-1 text-[13px] font-bold text-text-muted">Today</span>
      </header>

      <h2 className="mb-2 text-[14px] font-black text-text-muted">BIRYANI BATCH</h2>
      <label className="mb-3 block text-[13px] font-black uppercase text-text-muted">
        Cooked item
        <select value={menuItem?.id || ''} onChange={(event) => setSelectedMenuItemId(event.target.value)} className="mt-2 h-12 w-full rounded-sm border border-[#eadfd7] bg-white px-3 text-base font-bold text-text-dark">
          {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {cooked === 0 ? (
        <EmptyState>No batch logged yet today. Tap "Log Today's Batch" when you start cooking.</EmptyState>
      ) : (
        <div className="rounded-sm border border-[#eadfd7] bg-white p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-text-dark">{menuItem?.name}</h3>
              <p className="mt-1 text-base font-semibold text-text-dark">Today's Batch: {formatKg(cooked)}</p>
              <p className="text-base font-semibold text-text-muted">Sold: {formatKg(sold)} · Left: {formatKg(left)}</p>
            </div>
            <span className="rounded-sm bg-[#fff6ef] px-2 py-1 text-base font-black text-primary">{percentSold}%</span>
          </div>
          <div className="mt-3">
            <InventoryBar value={sold} max={cooked} color={left <= 2 ? '#FC8019' : '#60B246'} />
          </div>
          <p className={`mt-3 text-[15px] font-bold ${left <= 1.6 ? 'text-primary' : 'text-success'}`}>
            {left <= 1.6 ? `Low Stock - about ${Math.floor(left / 0.4)} full plates left` : 'Batch level is healthy'}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setBatchOpen(true)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 text-base font-bold text-white"
      >
        <Plus size={20} /> Log Today's Batch
      </button>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-[14px] font-black text-text-muted">RAW INGREDIENTS</h2>
        <button type="button" onClick={() => openExpenseMode('market')} className="h-11 rounded-sm border border-[#eadfd7] bg-white px-3 text-[15px] font-bold text-text-dark">
          Add Stock
        </button>
      </div>
      <div className="mt-2 space-y-3">
        {ingredients.length === 0 ? (
          <EmptyState>No ingredients added yet. Go to Menu Setup to configure your recipe.</EmptyState>
        ) : (
          ingredients.map((ingredient) => {
            const color = ingredientColor(ingredient);
            const max = Math.max(Number(ingredient.current_stock || 0), Number(ingredient.low_stock_threshold || 0) * 2);
            return (
              <div key={ingredient.id} className="rounded-sm border border-[#eadfd7] bg-white p-4 shadow-card">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-base font-black text-text-dark">{ingredient.name}</h3>
                  <span className="shrink-0 text-base font-bold text-text-dark">{ingredient.current_stock} {ingredient.unit}</span>
                </div>
                <InventoryBar value={ingredient.current_stock} max={max} color={color} />
                <p className="mt-2 text-[15px] font-bold" style={{ color }}>
                  {Number(ingredient.current_stock) <= Number(ingredient.low_stock_threshold) ? 'Low Stock!' : 'Above threshold'}
                </p>
              </div>
            );
          })
        )}
      </div>

      {batchOpen ? (
        <Modal
          title="Log Today's Batch"
          onClose={() => setBatchOpen(false)}
          footer={
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setBatchOpen(false)} className="rounded-sm border border-border font-bold text-text-dark">Cancel</button>
              <button type="button" disabled={loading || !Number(kgCooked)} onClick={saveBatch} className="rounded-sm bg-primary px-3 font-bold text-white disabled:bg-text-muted">
                {loading ? 'Saving...' : 'Confirm & Log'}
              </button>
            </div>
          }
        >
          <label className="block text-base font-bold text-text-dark">
            How many kg did you cook today?
            <input
              type="number"
              min="0"
              step="0.1"
              value={kgCooked}
              onChange={(event) => setKgCooked(event.target.value)}
              className="mt-2 h-12 w-full rounded-sm border border-border px-3 text-base font-bold outline-primary"
              placeholder={`${menuItem?.name || 'Item'} kg`}
            />
          </label>
          <div className="mt-4 rounded-sm bg-[#fff6ef] p-3">
            <p className="mb-2 text-[15px] font-black text-text-dark">This will deduct from raw ingredients:</p>
            {deductions.map(({ ingredient, amount, unit }) => (
              <div key={ingredient?.id} className="flex justify-between gap-3 py-1 text-[15px] font-semibold text-text-dark">
                <span>{ingredient?.name}</span>
                <span>{amount.toFixed(unit === 'ml' ? 0 : 2)} {unit}</span>
              </div>
            ))}
          </div>
          {message ? <p className="mt-3 text-[15px] font-bold text-danger">{message}</p> : null}
        </Modal>
      ) : null}
    </section>
  );
}
