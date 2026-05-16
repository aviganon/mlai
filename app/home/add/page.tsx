'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { addItem } from '@/lib/firestore';
import { DEFAULT_CATEGORIES, UNITS, ItemUnit } from '@/types';

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
        name: name.trim(),
        category,
        unit,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-lg font-semibold flex-1 text-right">פריט חדש</h1>
      </div>

      <div className="px-4 py-4 space-y-4 pb-32">
        <Field label="שם פריט *">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder='למשל: "אבוקדו"' className={inputCls} />
        </Field>

        <Field label="קטגוריה">
          <div className="flex flex-wrap gap-2 justify-end">
            {DEFAULT_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-sm border ${category === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200 text-gray-600'}`}>
                {c}
              </button>
            ))}
          </div>
        </Field>

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

        {error && <p className="text-red-500 text-sm text-right">{error}</p>}
      </div>

      {/* Save button */}
      <div className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-100 p-4">
        <button onClick={handleSave} disabled={loading}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-medium text-base disabled:opacity-50">
          {loading ? 'שומר...' : 'שמור פריט'}
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-right bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-right mb-1.5">{label}</label>
      {children}
    </div>
  );
}
