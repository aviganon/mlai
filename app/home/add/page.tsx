'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { addItem } from '@/lib/firestore';
import { DEFAULT_CATEGORIES, UNITS, ItemUnit } from '@/types';

const inputCls = 'w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 text-right mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export default function AddItemPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const router = useRouter();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [unit, setUnit] = useState<ItemUnit>('יחידה');
  const [stock, setStock] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [price, setPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sku, setSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('נא להזין שם פריט'); return; }
    if (!user || !business) return;
    setLoading(true);
    setError('');
    try {
      await addItem(business.id, {
        name: name.trim(), category, unit,
        stock: parseFloat(stock) || 0,
        minStock: parseFloat(minStock) || 0,
        price: parseFloat(price) || 0,
        supplier: supplier.trim(),
        sku: sku.trim(),
      });
      router.back();
    } catch {
      setError('שגיאה בשמירה, נסה שוב');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 flex items-center gap-3 animate-slide-down">
        <button
          onClick={() => router.back()}
          className="press w-9 h-9 rounded-xl bg-white/70 border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm"
        >
          ←
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-right">פריט חדש</h1>
      </div>

      <div className="px-4 py-4 space-y-4 animate-slide-up">
        {/* Name */}
        <div className="glass rounded-3xl p-4">
          <Field label="שם פריט *">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder='למשל: "אבוקדו"' className={inputCls} autoFocus />
          </Field>
        </div>

        {/* Category */}
        <div className="glass rounded-3xl p-4">
          <Field label="קטגוריה">
            <div className="flex flex-wrap gap-2 justify-end mt-1">
              {DEFAULT_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)}
                  className={`press px-3 py-1.5 rounded-xl text-sm border transition-all duration-200 ${
                    category === c
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/15'
                      : 'bg-white/70 border-gray-200 text-gray-600'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Unit + Stock */}
        <div className="glass rounded-3xl p-4 space-y-4">
          <Field label="יחידת מידה">
            <select value={unit} onChange={(e) => setUnit(e.target.value as ItemUnit)} className={inputCls}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="כמות נוכחית">
              <input type="number" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} />
            </Field>
            <Field label="מינימום">
              <input type="number" inputMode="decimal" value={minStock} onChange={(e) => setMinStock(e.target.value)} className={inputCls} />
            </Field>
          </div>
        </div>

        {/* Price + SKU + Supplier */}
        <div className="glass rounded-3xl p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label='מחיר (₪)'>
              <input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <Field label='מק"ט'>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="אופציונלי" className={inputCls} />
            </Field>
          </div>
          <Field label="ספק">
            <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="שם הספק" className={inputCls} />
          </Field>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 text-right animate-fade-in">
            {error}
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="glass-nav fixed bottom-0 right-0 left-0 p-4">
        <button onClick={handleSave} disabled={loading}
          className="press w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-medium text-base shadow-lg shadow-gray-900/20 disabled:opacity-50">
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
              שומר...
            </span>
          ) : 'שמור פריט'}
        </button>
      </div>
    </div>
  );
}
