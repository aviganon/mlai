'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { updateItem, updateItemStock, deleteItem } from '@/lib/firestore';
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
      name: name.trim(), category, unit, stock, minStock,
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
      <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
    </div>
  );

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
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-right truncate">{item.name}</h1>
      </div>

      <div className="px-4 py-4 space-y-4 animate-slide-up">
        {/* Big stock control */}
        <div className="glass rounded-3xl p-5 text-center">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">כמות נוכחית</p>
          <div className="flex items-center justify-center gap-6 mb-2">
            <button
              onClick={() => handleDelta(-1)}
              disabled={stock <= 0}
              className="press w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-2xl font-medium text-gray-700 disabled:opacity-25 shadow-sm"
            >
              −
            </button>
            <div className="text-center">
              <span className="text-6xl font-bold text-gray-900 tabular-nums">{stock}</span>
            </div>
            <button
              onClick={() => handleDelta(1)}
              className="press w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-2xl font-medium text-gray-700 shadow-sm"
            >
              +
            </button>
          </div>
          <p className="text-sm text-gray-400">{unit}</p>
        </div>

        {/* Name */}
        <div className="glass rounded-3xl p-4">
          <Field label="שם פריט">
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
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

        {/* Unit + Min */}
        <div className="glass rounded-3xl p-4 space-y-4">
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
        </div>

        {/* Delete */}
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="press w-full text-red-400 text-sm py-3 border border-red-100 rounded-2xl bg-red-50/60"
          >
            🗑 מחק פריט
          </button>
        ) : (
          <div className="glass rounded-3xl p-5 border border-red-200 bg-red-50/40 text-center space-y-4 animate-scale-in">
            <p className="text-sm font-semibold text-red-700">למחוק את &quot;{item.name}&quot;?<br /><span className="font-normal text-red-500">פעולה זו לא ניתנת לביטול</span></p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="press flex-1 py-3 rounded-2xl border border-gray-200 bg-white/70 text-sm font-medium text-gray-700">ביטול</button>
              <button onClick={handleDelete} disabled={deleting} className="press flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-medium shadow-md shadow-red-200 disabled:opacity-50">
                {deleting ? 'מוחק...' : 'כן, מחק'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save */}
      <div className="glass-nav fixed bottom-0 right-0 left-0 p-4">
        <button onClick={handleSave} disabled={saving}
          className="press w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-medium text-base shadow-lg shadow-gray-900/20 disabled:opacity-50">
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
              שומר...
            </span>
          ) : 'שמור שינויים'}
        </button>
      </div>
    </div>
  );
}
