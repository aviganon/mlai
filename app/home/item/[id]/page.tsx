'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { updateItem, updateItemStock, deleteItem } from '@/lib/firestore';
import { DEFAULT_CATEGORIES, UNITS, ItemUnit } from '@/types';

const inputCls = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-right bg-white focus:outline-none focus:ring-2 focus:ring-gray-200 text-sm';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 text-right mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { business } = useBusiness();
  const { items } = useItems(business?.id ?? null);
  const item = items.find((i) => i.id === id);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [unit, setUnit] = useState<ItemUnit>('יחידה');
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [price, setPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sku, setSku] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!item) return;
    setName(item.name);
    setCategory(item.category || DEFAULT_CATEGORIES[0]);
    setUnit(item.unit);
    setStock(item.stock);
    setMinStock(item.minStock);
    setPrice(item.price ? String(item.price) : '');
    setSupplier(item.supplier || '');
    setSku(item.sku || '');
  }, [item]);

  async function handleDelta(delta: number) {
    if (!business || !item) return;
    if (delta < 0 && stock <= 0) return;
    setStock((s) => s + delta);
    await updateItemStock(business.id, item.id, delta);
  }

  async function handleSave() {
    if (!business || !item || !name.trim()) return;
    setSaving(true);
    await updateItem(business.id, item.id, {
      name: name.trim(), category, unit,
      stock, minStock,
      price: parseFloat(price) || 0,
      supplier: supplier.trim(),
      sku: sku.trim(),
    });
    setSaving(false);
    router.back();
  }

  async function handleDelete() {
    if (!business || !item) return;
    setDeleting(true);
    await deleteItem(business.id, item.id);
    router.replace('/home');
  }

  if (!item) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-400">טוען...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 text-lg">←</button>
        <h1 className="text-lg font-semibold flex-1 text-right truncate">{item.name}</h1>
      </div>

      <div className="px-4 py-4 space-y-4 pb-36">
        {/* Stock control - big and central */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          <p className="text-sm text-gray-500 mb-2">כמות נוכחית</p>
          <div className="flex items-center justify-center gap-6">
            <button onClick={() => handleDelta(-1)} disabled={stock <= 0}
              className="w-12 h-12 rounded-xl border border-gray-200 text-2xl font-medium disabled:opacity-30 active:scale-95">
              −
            </button>
            <span className="text-5xl font-semibold text-gray-900 min-w-16 text-center">{stock}</span>
            <button onClick={() => handleDelta(1)}
              className="w-12 h-12 rounded-xl border border-gray-200 text-2xl font-medium active:scale-95">
              +
            </button>
          </div>
          <p className="text-sm text-gray-400 mt-2">{unit}</p>
        </div>

        <Field label="שם פריט">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </Field>

        <Field label="קטגוריה">
          <div className="flex flex-wrap gap-2 justify-end">
            {DEFAULT_CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)}
                className={`px-3 py-1.5 rounded-full text-sm border ${category === c ? 'bg-gray-900 text-white border-gray-900' : 'bg-white border-gray-200'}`}>
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
          <Field label="מינימום">
            <input type="number" inputMode="decimal" value={minStock} onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)} className={inputCls} />
          </Field>
          <Field label='מחיר (₪)'>
            <input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="ספק">
            <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="שם הספק" className={inputCls} />
          </Field>
          <Field label='מק"ט'>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="אופציונלי" className={inputCls} />
          </Field>
        </div>

        {/* Delete */}
        {!confirmDelete ? (
          <button onClick={() => setConfirmDelete(true)} className="w-full text-red-400 text-sm py-2 border border-red-100 rounded-xl bg-red-50">
            מחק פריט
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center space-y-3">
            <p className="text-sm font-medium text-red-700">למחוק את &quot;{item.name}&quot;? לא ניתן לבטל.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm">ביטול</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm disabled:opacity-50">
                {deleting ? 'מוחק...' : 'כן, מחק'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-100 p-4">
        <button onClick={handleSave} disabled={saving}
          className="w-full bg-gray-900 text-white py-4 rounded-xl font-medium text-base disabled:opacity-50">
          {saving ? 'שומר...' : 'שמור שינויים'}
        </button>
      </div>
    </div>
  );
}
