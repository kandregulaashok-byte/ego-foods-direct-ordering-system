import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { dateTitle, formatINR, timeLabel, todayISO } from '../lib/format';
import { useExpenseStore } from '../store/expenseStore';
import { useInventoryStore } from '../store/inventoryStore';
import { useAppStore } from '../store/appStore';

export default function ExpenseLog() {
  const expenses = useExpenseStore((state) => state.expenses);
  const addExpense = useExpenseStore((state) => state.addExpense);
  const ingredients = useInventoryStore((state) => state.ingredients);
  const addStock = useInventoryStore((state) => state.addStock);
  const expenseMode = useAppStore((state) => state.expenseMode);
  const clearExpenseMode = useAppStore((state) => state.clearExpenseMode);
  const todayExpenses = expenses.filter((expense) => expense.date === todayISO());
  const total = todayExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ ingredient_id: ingredients[0]?.id || '', quantity: '', amount: '', description: '', type: 'other' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (expenseMode) {
      setModal(expenseMode);
      clearExpenseMode();
    }
  }, [clearExpenseMode, expenseMode]);

  function open(type) {
    setForm({ ingredient_id: ingredients[0]?.id || '', quantity: '', amount: '', description: '', type: 'other' });
    setMessage('');
    setModal(type);
  }

  async function saveMarketPurchase() {
    if (loading) return;
    const ingredient = ingredients.find((item) => item.id === form.ingredient_id);
    if (!ingredient || !Number(form.quantity) || !Number(form.amount)) {
      setMessage('Ingredient, quantity, and amount are required.');
      return;
    }
    setLoading(true);
    try {
      const stock = await addStock({ ingredientId: ingredient.id, quantity: Number(form.quantity), amount: Number(form.amount) });
      if (!stock.ok) {
        setMessage(stock.message);
        return;
      }
      const result = await addExpense({
        type: 'market_purchase',
        description: ingredient.name,
        ingredient_id: ingredient.id,
        quantity: Number(form.quantity),
        unit: ingredient.unit,
        amount: Number(form.amount)
      });
      if (result.ok) setModal(null);
      else setMessage(result.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveOtherExpense() {
    if (loading) return;
    if (!form.description.trim() || !Number(form.amount)) {
      setMessage('Description and amount are required.');
      return;
    }
    setLoading(true);
    try {
      const result = await addExpense({
        type: form.type,
        description: form.description.trim(),
        amount: Number(form.amount)
      });
      if (result.ok) setModal(null);
      else setMessage(result.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="h-full overflow-y-auto bg-bg-secondary p-4 scrollbar-none">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-black text-text-dark">Expenses</h1>
        <span className="text-base font-bold text-text-muted">Today</span>
      </header>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => open('market')} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 text-base font-bold text-white">
          <Plus size={20} /> Market
        </button>
        <button type="button" onClick={() => open('other')} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-bg px-3 text-base font-bold text-text-dark">
          <Plus size={20} /> Other
        </button>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-bg p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-[15px] font-black text-text-muted">TODAY - {dateTitle()}</h2>
        </div>
        {todayExpenses.length === 0 ? (
          <EmptyState>No expenses logged today. Tap "Market Purchase" to log what you bought.</EmptyState>
        ) : (
          <div className="space-y-4">
            {todayExpenses.map((expense) => (
              <div key={expense.id}>
                <p className="text-base font-black text-text-dark">
                  {expense.type === 'market_purchase' ? 'Market Purchase' : 'Expense'} - {expense.description}
                </p>
                <p className="mt-1 text-[15px] font-semibold text-text-muted">
                  {formatINR(expense.amount)} · {expense.quantity ? `${expense.quantity} ${expense.unit} · ` : ''}{timeLabel(expense.logged_at)}
                </p>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-3 text-lg font-black text-text-dark">
              <span>Total Spent Today</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
        )}
      </div>

      {modal === 'market' ? (
        <Modal title="Market Purchase" onClose={() => setModal(null)} footer={<ExpenseFooter loading={loading} onCancel={() => setModal(null)} onSave={saveMarketPurchase} label="Save Purchase" />}>
          <FormLabel label="Item">
            <select value={form.ingredient_id} onChange={(event) => setForm({ ...form, ingredient_id: event.target.value })} className="h-12 w-full rounded-lg border border-border px-3 text-base font-bold">
              {ingredients.map((ingredient) => <option key={ingredient.id} value={ingredient.id}>{ingredient.name}</option>)}
            </select>
          </FormLabel>
          <FormLabel label="Quantity">
            <input type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className="h-12 w-full rounded-lg border border-border px-3 text-base font-bold" />
          </FormLabel>
          <FormLabel label="Amount Paid">
            <input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="h-12 w-full rounded-lg border border-border px-3 text-base font-bold" />
          </FormLabel>
          <p className="rounded-lg bg-bg-secondary p-3 text-[15px] font-semibold text-text-dark">This will add to the selected ingredient stock.</p>
          {message ? <p className="mt-3 text-[15px] font-bold text-danger">{message}</p> : null}
        </Modal>
      ) : null}

      {modal === 'other' ? (
        <Modal title="Other Expense" onClose={() => setModal(null)} footer={<ExpenseFooter loading={loading} onCancel={() => setModal(null)} onSave={saveOtherExpense} label="Save Expense" />}>
          <FormLabel label="Description">
            <input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="h-12 w-full rounded-lg border border-border px-3 text-base font-bold" />
          </FormLabel>
          <FormLabel label="Amount">
            <input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} className="h-12 w-full rounded-lg border border-border px-3 text-base font-bold" />
          </FormLabel>
          <FormLabel label="Type">
            <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="h-12 w-full rounded-lg border border-border px-3 text-base font-bold">
              <option value="recurring">Staff Advance</option>
              <option value="rent">Rent</option>
              <option value="utilities">Utilities</option>
              <option value="other">Other</option>
            </select>
          </FormLabel>
          {message ? <p className="mt-3 text-[15px] font-bold text-danger">{message}</p> : null}
        </Modal>
      ) : null}
    </section>
  );
}

function FormLabel({ label, children }) {
  return <label className="mb-3 block text-base font-bold text-text-dark">{label}<div className="mt-2">{children}</div></label>;
}

function ExpenseFooter({ loading, onCancel, onSave, label }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" onClick={onCancel} className="rounded-lg border border-border font-bold text-text-dark">Cancel</button>
      <button type="button" disabled={loading} onClick={onSave} className="rounded-lg bg-primary px-3 font-bold text-white disabled:bg-text-muted">{loading ? 'Saving...' : label}</button>
    </div>
  );
}
