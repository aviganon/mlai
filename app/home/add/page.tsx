'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { addItem } from '@/lib/firestore';
import { DEFAULT_CATEGORIES, UNITS, ItemUnit } from '@/types';
import { SupplierPicker } from '@/components/SupplierPicker';

const inputCls = 'w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all text-sm';

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')
  ) as Partial<T>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 text-right mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export default function AddItemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
      </div>
    }>
      <AddItemForm />
    </Suspense>
  );
}

function AddItemForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { business } = useBusiness();
  const { items } = useItems(business?.id ?? null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [unit, setUnit] = useState<ItemUnit>('יחידה');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [price, setPrice] = useState('');
  const [supplier, setSupplier] = useState('');
  const [sku, setSku] = useState('');
  const [packSize, setPackSize] = useState('');
  const [minOrder, setMinOrder] = useState('');
  const [deliveryDays, setDeliveryDays] = useState('');
  const [targetStock, setTargetStock] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supplierParam = searchParams.get('supplier');
    if (supplierParam) setSupplier(supplierParam);
  }, [searchParams]);

  async function handleSave() {
    if (!business || !user || !name.trim()) return;
    setSaving(true);
    const itemData = {
      name: name.trim(),
      category,
      unit,
      stock: parseFloat(stock) || 0,
      minStock: parseFloat(minStock) || 0,
      price: parseFloat(price) || 0,
      supplier: supplier.trim(),
      sku: sku.trim(),
      ...(packSize ? { packSize: parseFloat(packSize) } : {}),
      ...(minOrder ? { minOrder: parseFloat(minOrder) } : {}),
      ...(deliveryDays ? { deliveryDays: parseInt(deliveryDays) } : {}),
      ...(targetStock ? { targetStock: parseFloat(targetStock) } : {}),
    };
    await addItem(business.id, itemData);
    setSaving(false);
    router.back();
  }

  return (
    <div className="min-h-screen pb-28">
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
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לחם, עגבניות..."
              className={inputCls}
              autoFocus
            />
          </Field>
        </div>

        {/* Category */}
        <div className="glass rounded-3xl p-4">
          <Field label="קטגוריה">
            <div className="flex flex-wrap gap-2 justify-end mt-1">
              {DEFAULT_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`press px-3 py-1.5 rounded-xl text-sm border transition-all duration-200 ${
                    category === c
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/15'
                      : 'bg-white/70 border-gray-200 text-gray-600'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Main fields */}
        <div className="glass rounded-3xl p-4 space-y-4">
          <Field label="יחידת מידה">
            <select value={unit} onChange={(e) => setUnit(e.target.value as ItemUnit)} className={inputCls}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="כמות נוכחית">
              <input type="number" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <Field label="מינ׳ התראה">
              <input type="number" inputMode="decimal" value={minStock} onChange={(e) => setMinStock(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label='מחיר (₪)'>
              <input type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={inputCls} />
            </Field>
            <Field label="ספק">
              {business ? (
                <SupplierPicker
                  businessId={business.id}
                  items={items}
                  value={supplier}
                  onChange={setSupplier}
                />
              ) : (
                <input type="text" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="שם הספק" className={inputCls} />
              )}
            </Field>
          </div>
          <Field label='מק"ט'>
            <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} placeholder="אופציונלי" className={inputCls} />
          </Field>
        </div>

        {/* Advanced settings collapsible */}
        <div className="glass rounded-3xl overflow-hidden">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="press w-full flex items-center justify-between p-4 text-right"
          >
            <span className="text-indigo-500 text-sm">{showAdvanced ? '▲' : '▼'}</span>
            <span className="text-sm font-medium text-gray-700">הגדרות מתקדמות</span>
          </button>
          {showAdvanced && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3 mt-4">
                <Field label="מלאי תקן">
                  <input type="number" inputMode="decimal" value={targetStock} onChange={(e) => setTargetStock(e.target.value)} placeholder="יעד מלאי" className={inputCls} />
                </Field>
                <Field label="כמות במארז">
                  <input type="number" inputMode="decimal" value={packSize} onChange={(e) => setPackSize(e.target.value)} placeholder="יח׳ במארז" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="מינ׳ הזמנה">
                  <input type="number" inputMode="decimal" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="כמות מינ׳" className={inputCls} />
                </Field>
                <Field label="ימי אספקה">
                  <input type="number" inputMode="numeric" value={deliveryDays} onChange={(e) => setDeliveryDays(e.target.value)} placeholder="ימים" className={inputCls} />
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save */}
      <div className="glass-nav fixed bottom-0 right-0 left-0 p-4">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="press w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-medium text-base shadow-lg shadow-gray-900/20 disabled:opacity-50"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
              שומר...
            </span>
          ) : '+ הוסף פריט'}
        </button>
      </div>
    </div>
  );
}