'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  AlertTriangle,
  Package,
  ClipboardList,
  TrendingUp,
  Filter,
  ShoppingCart,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useIsOwner } from '@/hooks/useIsOwner';
import { useItems } from '@/hooks/useItems';
import { useInvoiceLog } from '@/hooks/useInvoiceLog';
import { useReorderSuggestions } from '@/hooks/useReorderSuggestions';
import { ItemCard } from '@/components/inventory/ItemCard';
import { BottomNav } from '@/components/inventory/BottomNav';
import { DEFAULT_CATEGORIES, InvoiceLogEntry, ReorderSuggestion } from '@/types';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { isOwner, loading: ownerLoading } = useIsOwner();
  const { items, loading: itemsLoading } = useItems(business?.id ?? null);
  const { entries: invoiceLog } = useInvoiceLog(business?.id ?? null);
  const { suggestions: reorderSuggestions } = useReorderSuggestions(business?.id ?? null);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('הכל');

  useEffect(() => {
    if (authLoading || bizLoading || ownerLoading) return;
    if (!user) router.replace('/login');
    else if (!business && !isOwner) router.replace('/onboarding');
  }, [user, business, isOwner, authLoading, bizLoading, ownerLoading, router]);

  const categories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category).filter(Boolean));
    return ['הכל', ...DEFAULT_CATEGORIES.filter((c) => cats.has(c)), ...Array.from(cats).filter((c) => !DEFAULT_CATEGORIES.includes(c))];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchCat = selectedCategory === 'הכל' || item.category === selectedCategory;
      const matchSearch = item.name.includes(search) || item.supplier?.includes(search) || item.sku?.includes(search);
      return matchCat && matchSearch;
    });
  }, [items, selectedCategory, search]);

  const lowStock = items.filter((i) => i.stock === 0 || (i.minStock > 0 && i.stock < i.minStock));
  const totalValue = items.reduce((sum, i) => sum + (i.stock * (i.price || 0)), 0);

  if (authLoading || bizLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 border-t-foreground animate-spin-smooth" />
      </div>
    );
  }
  if (!user) return null;

  // Owner with no business selected
  if (isOwner && !business) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pb-28 px-6 gap-5 text-center">
        <div className="w-20 h-20 bg-secondary rounded-2xl flex items-center justify-center">
          <Package className="w-10 h-10 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-bold text-foreground mb-1">אין עסק פעיל</p>
          <p className="text-sm text-muted-foreground">בחר עסק לניהול מהגדרות</p>
        </div>
        <button
          onClick={() => router.push('/settings')}
          className="press bg-primary text-primary-foreground px-6 py-3 rounded-2xl text-sm font-medium shadow-lg shadow-primary/20"
        >
          עבור להגדרות
        </button>
        <BottomNav />
      </div>
    );
  }

  if (!business) return null;

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-20 bg-card/95 backdrop-blur-lg border-b border-border px-4 pt-12 pb-4"
      >
        {/* Top Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link
              href="/home/stockcount"
              className="press px-3 py-2 bg-secondary rounded-xl text-sm font-medium text-secondary-foreground flex items-center gap-1.5"
            >
              <ClipboardList className="w-4 h-4" />
              <span>ספירה</span>
            </Link>
            <Link
              href="/home/reports"
              className="press px-3 py-2 bg-secondary rounded-xl text-sm font-medium text-secondary-foreground flex items-center gap-1.5"
            >
              <TrendingUp className="w-4 h-4" />
              <span>דוח</span>
            </Link>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-bold text-foreground">{business.name}</h1>
            <p className="text-sm text-muted-foreground">{items.length} פריטים</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-secondary rounded-2xl p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">שווי מלאי</span>
            </div>
            <p className="text-lg font-bold text-foreground">{totalValue.toLocaleString()} ₪</p>
          </motion.div>

          {lowStock.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              className="bg-warning/10 border border-warning/20 rounded-2xl p-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <span className="text-xs text-warning">דורש תשומת לב</span>
              </div>
              <p className="text-lg font-bold text-warning-foreground">{lowStock.length} פריטים</p>
            </motion.div>
          )}
        </div>

        {/* Low Stock Alert - Scrollable */}
        {lowStock.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-4"
          >
            {lowStock.slice(0, 5).map((item) => (
              <Link
                key={item.id}
                href={`/home/item/${item.id}`}
                className="press flex-shrink-0 flex items-center gap-2 bg-warning/10 border border-warning/20 rounded-xl px-3 py-2"
              >
                <div className={`w-2 h-2 rounded-full ${item.stock === 0 ? 'bg-destructive' : 'bg-warning'}`} />
                <span className="text-sm font-medium text-foreground whitespace-nowrap">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.stock} {item.unit}</span>
              </Link>
            ))}
          </motion.div>
        )}
      </motion.header>

      {/* Reorder Suggestions */}
      {reorderSuggestions.length > 0 && (
        <div className="px-4 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">{reorderSuggestions.length} הצעות</span>
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">הצעות הזמנה</h2>
              </div>
            </div>
            <div className="space-y-2">
              {reorderSuggestions.map((s) => (
                <ReorderCard key={s.id} suggestion={s} onTap={() => router.push(`/home/item/${s.itemId}`)} />
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-4 pb-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="relative"
        >
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, ספק, מק״ט..."
            className="w-full bg-secondary border border-border rounded-2xl px-4 py-3.5 pr-12 text-right text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all placeholder:text-muted-foreground"
          />
          <button className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 hover:bg-muted rounded-lg transition-colors">
            <Filter className="w-4 h-4 text-muted-foreground" />
          </button>
        </motion.div>
      </div>

      {/* Category Chips */}
      <div className="px-4 py-2">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex gap-2 overflow-x-auto no-scrollbar"
        >
          {categories.map((cat, i) => (
            <motion.button
              key={cat}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              onClick={() => setSelectedCategory(cat)}
              className={`press flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-muted'
              }`}
            >
              {cat}
              {cat === 'הכל' && <span className="mr-1 text-xs opacity-70">({items.length})</span>}
            </motion.button>
          ))}
        </motion.div>
      </div>

      {/* Items List */}
      <div className="px-4 py-2 space-y-3">
        {itemsLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 rounded-full border-2 border-muted-foreground/20 border-t-foreground animate-spin-smooth" />
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-16"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-secondary rounded-2xl flex items-center justify-center">
                  {search ? <Search className="w-8 h-8 text-muted-foreground" /> : <Package className="w-8 h-8 text-muted-foreground" />}
                </div>
                <p className="text-muted-foreground mb-5">
                  {search ? 'לא נמצאו תוצאות' : 'עדיין אין פריטים במלאי'}
                </p>
                {!search && (
                  <Link
                    href="/home/add"
                    className="press inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-medium shadow-lg shadow-primary/20"
                  >
                    <Plus className="w-5 h-5" />
                    <span>הוסף פריט ראשון</span>
                  </Link>
                )}
              </motion.div>
            ) : (
              filtered.map((item, i) => (
                <ItemCard key={item.id} item={item} businessId={business.id} index={i} />
              ))
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Invoice Log */}
      {invoiceLog.length > 0 && (
        <div className="px-4 mt-4 mb-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground">אחרונות</span>
              <h2 className="text-sm font-semibold text-foreground">יבואי חשבוניות</h2>
            </div>
            <div className="space-y-2">
              {invoiceLog.map((entry) => (
                <InvoiceLogCard key={entry.id} entry={entry} />
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Floating Add Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        className="fixed bottom-24 left-4 z-30"
      >
        <Link
          href="/home/add"
          className="press flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-2xl shadow-xl shadow-primary/30"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </motion.div>

      <BottomNav />
    </div>
  );
}

function ReorderCard({ suggestion, onTap }: { suggestion: ReorderSuggestion; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="press w-full flex items-center gap-3 bg-secondary/60 border border-border rounded-xl px-3 py-2.5 text-right"
    >
      <ShoppingCart className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{suggestion.itemName}</p>
        <p className="text-xs text-muted-foreground">
          מלאי: {suggestion.currentStock} {suggestion.unit} · מינ׳: {suggestion.minStock}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xs font-semibold text-foreground">הזמן {suggestion.suggestedOrderQty}</p>
        {suggestion.supplier && (
          <p className="text-xs text-muted-foreground truncate max-w-20">{suggestion.supplier}</p>
        )}
      </div>
    </button>
  );
}

function InvoiceLogCard({ entry }: { entry: InvoiceLogEntry }) {
  const date = entry.parsedAt
    ? new Date((entry.parsedAt as unknown as { seconds: number }).seconds * 1000)
    : null;
  const timeStr = date
    ? date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-right ${
        entry.status === 'error'
          ? 'bg-destructive/10 border border-destructive/20'
          : 'bg-success/10 border border-success/20'
      }`}
    >
      <span className="text-lg flex-shrink-0">{entry.status === 'error' ? '❌' : '✅'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {entry.supplier || 'ספק לא ידוע'}
        </p>
        <p className="text-xs text-muted-foreground">
          {entry.status === 'error'
            ? entry.error ?? 'שגיאה בעיבוד'
            : `${entry.itemsUpdated} פריטים עודכנו`}
        </p>
      </div>
      {timeStr && <p className="text-xs text-muted-foreground flex-shrink-0">{timeStr}</p>}
    </div>
  );
}
