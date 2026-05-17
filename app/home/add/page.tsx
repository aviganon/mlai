'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Package,
  Scale,
  DollarSign,
  Truck,
  Hash,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { addItem } from '@/lib/firestore';
import { DEFAULT_CATEGORIES, UNITS, ItemUnit } from '@/types';
import { SupplierPicker } from '@/components/SupplierPicker';

const inputClass = 'w-full bg-input border border-border rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all placeholder:text-muted-foreground';

function stripUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== '')
  ) as Partial<T>;
}

interface FormFieldProps {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  required?: boolean;
}

function FormField({ label, icon, children, required }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        <span>{label}</span>
        {required && <span className="text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

export default function AddItemPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
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
  const [saved, setSaved] = useState(false);

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
    setSaved(true);
    setTimeout(() => {
      router.back();
    }, 500);
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-card/95 backdrop-blur-lg border-b border-border px-4 pt-12 pb-4"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="press w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-muted transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-foreground flex-1 text-right">פריט חדש</h1>
        </div>
      </motion.header>

      <div className="p-4 space-y-4">
        {/* Name Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <FormField label="שם פריט" icon={<Package className="w-4 h-4 text-muted-foreground" />} required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="לחם, עגבניות..."
              className={inputClass}
              autoFocus
            />
          </FormField>
        </motion.section>

        {/* Category Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <FormField label="קטגוריה">
            <div className="flex flex-wrap gap-2 mt-2">
              {DEFAULT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`press px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                    category === cat
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </FormField>
        </motion.section>

        {/* Main Fields Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-4 space-y-4"
        >
          <FormField label="יחידת מידה" icon={<Scale className="w-4 h-4 text-muted-foreground" />}>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as ItemUnit)}
              className={inputClass}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="כמות נוכחית">
              <input
                type="number"
                inputMode="decimal"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </FormField>
            <FormField label="מינ׳ התראה">
              <input
                type="number"
                inputMode="decimal"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label='מחיר (₪)' icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}>
              <div className="relative">
                <input
                  type="number"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-12`}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₪</span>
              </div>
            </FormField>
            <FormField label="ספק" icon={<Truck className="w-4 h-4 text-muted-foreground" />}>
              {business ? (
                <SupplierPicker
                  businessId={business.id}
                  items={items}
                  value={supplier}
                  onChange={setSupplier}
                />
              ) : (
                <input
                  type="text"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="שם הספק"
                  className={inputClass}
                />
              )}
            </FormField>
          </div>

          <FormField label='מק"ט / ברקוד' icon={<Hash className="w-4 h-4 text-muted-foreground" />}>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="אופציונלי"
              className={inputClass}
            />
          </FormField>
        </motion.section>

        {/* Advanced Settings */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-2xl overflow-hidden"
        >
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="press w-full flex items-center justify-between p-4"
          >
            <motion.div
              animate={{ rotate: showAdvanced ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {showAdvanced
                ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
                : <ChevronDown className="w-5 h-5 text-muted-foreground" />
              }
            </motion.div>
            <span className="text-sm font-medium text-foreground">הגדרות מתקדמות</span>
          </button>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="p-4 pt-0 space-y-4 border-t border-border">
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <FormField label="מלאי תקן">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={targetStock}
                        onChange={(e) => setTargetStock(e.target.value)}
                        placeholder="יעד מלאי"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="כמות במארז">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={packSize}
                        onChange={(e) => setPackSize(e.target.value)}
                        placeholder="יח׳ במארז"
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="מינ׳ הזמנה">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={minOrder}
                        onChange={(e) => setMinOrder(e.target.value)}
                        placeholder="כמות מינ׳"
                        className={inputClass}
                      />
                    </FormField>
                    <FormField label="ימי אספקה">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={deliveryDays}
                        onChange={(e) => setDeliveryDays(e.target.value)}
                        placeholder="ימים"
                        className={inputClass}
                      />
                    </FormField>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      {/* Save Button - Fixed Bottom */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 right-0 left-0 p-4 bg-card/95 backdrop-blur-lg border-t border-border"
      >
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || saved}
          className="press w-full bg-primary text-primary-foreground py-4 rounded-2xl font-medium shadow-lg shadow-primary/20 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>שומר...</span>
            </>
          ) : saved ? (
            <>
              <Check className="w-5 h-5" />
              <span>נשמר!</span>
            </>
          ) : (
            <span>+ הוסף פריט</span>
          )}
        </button>
      </motion.div>
    </div>
  );
}
