'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  Minus,
  Plus,
  Pencil,
  Trash2,
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { updateItem, updateItemStock, deleteItem } from '@/lib/firestore';
import { DEFAULT_CATEGORIES, UNITS, ItemUnit } from '@/types';
import { SupplierPicker } from '@/components/SupplierPicker';

const inputClass = 'w-full bg-input border border-border rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all placeholder:text-muted-foreground';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-muted-foreground text-right uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { business } = useBusiness();
  const { items } = useItems(business?.id ?? null);
  const item = items.find((i) => i.id === id);

  const [stock, setStock] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddValue, setQuickAddValue] = useState('');

  // Edit mode state
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [editUnit, setEditUnit] = useState<ItemUnit>('יחידה');
  const [editMinStock, setEditMinStock] = useState(0);
  const [editPrice, setEditPrice] = useState('');
  const [editSupplier, setEditSupplier] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editPackSize, setEditPackSize] = useState('');
  const [editMinOrder, setEditMinOrder] = useState('');
  const [editDeliveryDays, setEditDeliveryDays] = useState('');
  const [editTargetStock, setEditTargetStock] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!item) return;
    setStock(item.stock);
    setEditName(item.name);
    setEditCategory(item.category || DEFAULT_CATEGORIES[0]);
    setEditUnit(item.unit);
    setEditMinStock(item.minStock);
    setEditPrice(item.price ? String(item.price) : '');
    setEditSupplier(item.supplier || '');
    setEditSku(item.sku || '');
    setEditPackSize(item.packSize ? String(item.packSize) : '');
    setEditMinOrder(item.minOrder ? String(item.minOrder) : '');
    setEditDeliveryDays(item.deliveryDays ? String(item.deliveryDays) : '');
    setEditTargetStock(item.targetStock ? String(item.targetStock) : '');
    if (item.packSize || item.minOrder || item.deliveryDays || item.targetStock) {
      setShowAdvanced(true);
    }
  }, [item]);

  if (!item) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-secondary rounded-2xl flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="w-7 h-7 mx-auto rounded-full border-2 border-muted-foreground/20 border-t-foreground animate-spin-smooth" />
        </div>
      </div>
    );
  }

  const isLowStock = stock === 0 || (item.minStock > 0 && stock < item.minStock);
  const stockValue = stock * (item.price || 0);

  async function handleDelta(delta: number) {
    if (isPending || !business || !item) return;
    if (delta < 0 && stock <= 0) return;
    setIsPending(true);
    setStock((prev) => Math.max(0, prev + delta));
    await updateItemStock(business.id, item.id, delta);
    setIsPending(false);
  }

  async function handleQuickAdd() {
    const value = parseFloat(quickAddValue);
    if (isNaN(value) || !business || !item) return;
    setIsPending(true);
    setStock((prev) => Math.max(0, prev + value));
    await updateItemStock(business.id, item.id, value);
    setQuickAddValue('');
    setShowQuickAdd(false);
    setIsPending(false);
  }

  async function handleSave() {
    if (!business || !item || !editName.trim()) return;
    setSaving(true);
    await updateItem(business.id, item.id, {
      name: editName.trim(),
      category: editCategory,
      unit: editUnit,
      stock,
      minStock: editMinStock,
      price: parseFloat(editPrice) || 0,
      supplier: editSupplier.trim(),
      sku: editSku.trim(),
      ...(editPackSize ? { packSize: parseFloat(editPackSize) } : {}),
      ...(editMinOrder ? { minOrder: parseFloat(editMinOrder) } : {}),
      ...(editDeliveryDays ? { deliveryDays: parseInt(editDeliveryDays) } : {}),
      ...(editTargetStock ? { targetStock: parseFloat(editTargetStock) } : {}),
    });
    setSaving(false);
    setShowEdit(false);
  }

  async function handleDelete() {
    if (!business || !item) return;
    setDeleting(true);
    await deleteItem(business.id, item.id);
    router.replace('/home');
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
          <div className="flex-1 text-right">
            <h1 className="text-xl font-bold text-foreground">{item.name}</h1>
            <p className="text-sm text-muted-foreground">{item.category}</p>
          </div>
          <button
            onClick={() => setShowEdit(!showEdit)}
            className={`press w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
              showEdit
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary border-border text-foreground hover:bg-muted'
            }`}
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </motion.header>

      <div className="p-4 space-y-4">
        {/* Stock Card */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl p-6 ${
            isLowStock
              ? 'bg-warning/10 border border-warning/20'
              : 'bg-card border border-border'
          }`}
        >
          {isLowStock && (
            <div className="flex items-center gap-2 mb-4 text-warning">
              <AlertTriangle className="w-5 h-5" />
              <span className="text-sm font-medium">
                {stock === 0 ? 'המלאי אזל!' : 'המלאי נמוך!'}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="text-right">
              <p className="text-sm text-muted-foreground mb-1">כמות במלאי</p>
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={stock}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl font-bold text-foreground"
                >
                  {stock}
                </motion.span>
                <span className="text-lg text-muted-foreground">{item.unit}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDelta(-1)}
                disabled={isPending || stock <= 0}
                className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted transition-colors"
              >
                <Minus className="w-6 h-6" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDelta(1)}
                disabled={isPending}
                className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 shadow-lg shadow-primary/20 transition-colors"
              >
                <Plus className="w-6 h-6" />
              </motion.button>
            </div>
          </div>

          {/* Quick Add */}
          <AnimatePresence>
            {showQuickAdd ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 mb-4"
              >
                <input
                  type="number"
                  value={quickAddValue}
                  onChange={(e) => setQuickAddValue(e.target.value)}
                  placeholder="הכנס כמות..."
                  className="flex-1 bg-input border border-border rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                  autoFocus
                />
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickAddValue}
                  className="press w-12 h-12 rounded-xl bg-success text-success-foreground flex items-center justify-center disabled:opacity-30"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setShowQuickAdd(false); setQuickAddValue(''); }}
                  className="press w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowQuickAdd(true)}
                className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                + עדכון כמות מהיר
              </motion.button>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Item Details View (shown when not editing) */}
        <AnimatePresence>
          {!showEdit && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.15 }}
              className="bg-card border border-border rounded-2xl p-4 space-y-3"
            >
              <h3 className="font-semibold text-foreground text-right mb-4">פרטי פריט</h3>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="font-medium text-foreground">{(item.price || 0).toFixed(2)} ₪</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm">מחיר ליחידה</span>
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="font-medium text-foreground">{stockValue.toFixed(2)} ₪</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm">שווי מלאי</span>
                  <Package className="w-4 h-4" />
                </div>
              </div>

              {item.supplier && (
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="font-medium text-foreground">{item.supplier}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">ספק</span>
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className="font-medium text-foreground">{item.minStock} {item.unit}</span>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-sm">מינימום להתראה</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>

              {item.sku && (
                <div className="flex items-center justify-between py-2">
                  <span className="font-medium text-foreground font-mono">{item.sku}</span>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">מק&quot;ט</span>
                  </div>
                </div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Edit Form (shown when editing) */}
        <AnimatePresence>
          {showEdit && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Name */}
              <section className="bg-card border border-border rounded-2xl p-4">
                <Field label="שם פריט *">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className={inputClass}
                  />
                </Field>
              </section>

              {/* Category */}
              <section className="bg-card border border-border rounded-2xl p-4">
                <Field label="קטגוריה">
                  <div className="flex flex-wrap gap-2 justify-end mt-1">
                    {DEFAULT_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditCategory(c)}
                        className={`press px-3 py-1.5 rounded-xl text-sm border transition-all duration-200 ${
                          editCategory === c
                            ? 'bg-primary text-primary-foreground border-primary shadow-md'
                            : 'bg-secondary border-border text-secondary-foreground'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </Field>
              </section>

              {/* Main Fields */}
              <section className="bg-card border border-border rounded-2xl p-4 space-y-4">
                <Field label="יחידת מידה">
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value as ItemUnit)}
                    className={inputClass}
                  >
                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="מינימום התראה">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editMinStock}
                      onChange={(e) => setEditMinStock(parseFloat(e.target.value) || 0)}
                      className={inputClass}
                    />
                  </Field>
                  <Field label='מחיר (₪)'>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="0"
                      className={inputClass}
                    />
                  </Field>
                </div>
                <Field label="ספק">
                  {business ? (
                    <SupplierPicker
                      businessId={business.id}
                      items={items}
                      value={editSupplier}
                      onChange={setEditSupplier}
                    />
                  ) : (
                    <input
                      type="text"
                      value={editSupplier}
                      onChange={(e) => setEditSupplier(e.target.value)}
                      placeholder="שם הספק"
                      className={inputClass}
                    />
                  )}
                </Field>
                <Field label='מק"ט'>
                  <input
                    type="text"
                    value={editSku}
                    onChange={(e) => setEditSku(e.target.value)}
                    placeholder="אופציונלי"
                    className={inputClass}
                  />
                </Field>
              </section>

              {/* Advanced settings */}
              <section className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="press w-full flex items-center justify-between p-4"
                >
                  <motion.div animate={{ rotate: showAdvanced ? 180 : 0 }} transition={{ duration: 0.2 }}>
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
                          <Field label="מלאי תקן">
                            <input type="number" inputMode="decimal" value={editTargetStock} onChange={(e) => setEditTargetStock(e.target.value)} placeholder="יעד מלאי" className={inputClass} />
                          </Field>
                          <Field label="כמות במארז">
                            <input type="number" inputMode="decimal" value={editPackSize} onChange={(e) => setEditPackSize(e.target.value)} placeholder="יח׳ במארז" className={inputClass} />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="מינ׳ הזמנה">
                            <input type="number" inputMode="decimal" value={editMinOrder} onChange={(e) => setEditMinOrder(e.target.value)} placeholder="כמות מינ׳" className={inputClass} />
                          </Field>
                          <Field label="ימי אספקה">
                            <input type="number" inputMode="numeric" value={editDeliveryDays} onChange={(e) => setEditDeliveryDays(e.target.value)} placeholder="ימים" className={inputClass} />
                          </Field>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Button */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <AnimatePresence>
            {showDeleteConfirm ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4"
              >
                <p className="text-sm text-destructive text-center mb-4">
                  האם למחוק את &quot;{item.name}&quot; לצמיתות?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="press flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="press flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-medium flex items-center justify-center gap-2"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    <span>מחק</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="press w-full py-3 rounded-xl border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>מחק פריט</span>
              </button>
            )}
          </AnimatePresence>
        </motion.section>
      </div>

      {/* Save Edit Button - Fixed Bottom (only in edit mode) */}
      <AnimatePresence>
        {showEdit && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 right-0 left-0 p-4 bg-card/95 backdrop-blur-lg border-t border-border"
          >
            <button
              onClick={handleSave}
              disabled={saving || !editName.trim()}
              className="press w-full bg-primary text-primary-foreground py-4 rounded-2xl font-medium shadow-lg shadow-primary/20 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>שומר...</span>
                </>
              ) : (
                <span>שמור שינויים</span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
