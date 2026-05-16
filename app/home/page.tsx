'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { useInvoiceLog } from '@/hooks/useInvoiceLog';
import { useReorderSuggestions } from '@/hooks/useReorderSuggestions';
import { ItemCard } from '@/components/ItemCard';
import { BottomNav } from '@/components/BottomNav';
import { DEFAULT_CATEGORIES, InvoiceLogEntry, ReorderSuggestion } from '@/types';
import { signOutUser } from '@/lib/auth';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { items, loading: itemsLoading } = useItems(business?.id ?? null);
  const { entries: invoiceLog } = useInvoiceLog(business?.id ?? null);
  const { suggestions: reorderSuggestions } = useReorderSuggestions(business?.id ?? null);
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('הכל');

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) router.replace('/login');
    else if (!business) router.replace('/onboarding');
  }, [user, business, authLoading, bizLoading, router]);

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

  async function handleSignOut() {
    await signOutUser();
    router.replace('/login');
  }

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
      </div>
    );
  }
  if (!user || !business) return null;

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-3">
        <div className="flex items-center justify-between mb-2 animate-slide-down">
          {/* RIGHT in RTL: business name */}
          <div>
            <p className="text-base font-bold text-gray-900">{business.name}</p>
            <p className="text-xs text-gray-400">{items.length} פריטים</p>
          </div>
          {/* LEFT in RTL: language + logout */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 glass rounded-lg px-2 py-1 select-none">עב</span>
            <button
              onClick={handleSignOut}
              className="press flex items-center gap-1 text-sm text-gray-500 glass rounded-xl px-3 py-1.5"
            >
              יציאה
            </button>
          </div>
        </div>

        {lowStock.length > 0 && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2.5 text-sm flex items-center gap-2 animate-slide-down delay-50">
            <span className="text-amber-500 text-base">⚠️</span>
            <span className="text-amber-700 font-medium">{lowStock.length} פריטים דורשים תשומת לב</span>
          </div>
        )}
      </div>

      {/* Reorder Suggestions */}
      {reorderSuggestions.length > 0 && (
        <div className="px-4 pt-3 animate-slide-up delay-50">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">{reorderSuggestions.length} הצעות</span>
              <div className="flex items-center gap-1.5">
                <span className="text-base">📋</span>
                <h2 className="text-sm font-semibold text-gray-800">הצעות הזמנה</h2>
              </div>
            </div>
            <div className="space-y-2">
              {reorderSuggestions.map((s) => (
                <ReorderCard key={s.id} suggestion={s} onTap={() => router.push(`/home/item/${s.itemId}`)} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-4 pt-3 pb-1 animate-fade-in">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="חיפוש לפי שם, ספק, מק״ט..."
            className="w-full glass rounded-2xl px-4 py-3 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all pr-10"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-base">🔍</span>
        </div>
      </div>

      {/* Category chips */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar animate-fade-in delay-50">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`press flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
              selectedCategory === cat
                ? 'bg-gray-900 text-white shadow-md shadow-gray-900/15'
                : 'glass text-gray-600'
            }`}
          >
            {cat}{cat === 'הכל' ? ` · ${items.length}` : ''}
          </button>
        ))}
      </div>

      {/* Items */}
      <div className="px-4 space-y-2 mt-1">
        {itemsLoading && (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-400 animate-spin-smooth" />
          </div>
        )}
        {!itemsLoading && filtered.length === 0 && (
          <div className="text-center py-16 animate-scale-in">
            <div className="text-5xl mb-4">{search ? '🔍' : '📦'}</div>
            <p className="text-gray-400 mb-5 text-sm">{search ? 'לא נמצאו תוצאות' : 'עדיין אין פריטים במלאי'}</p>
            {!search && (
              <button
                onClick={() => router.push('/home/add')}
                className="press bg-gray-900 text-white px-6 py-3 rounded-2xl text-sm font-medium shadow-lg shadow-gray-900/15"
              >
                + הוסף פריט ראשון
              </button>
            )}
          </div>
        )}
        {filtered.map((item, i) => (
          <ItemCard key={item.id} item={item} businessId={business.id} index={i} />
        ))}
      </div>

      {/* Invoice Log */}
      {invoiceLog.length > 0 && (
        <div className="px-4 mt-4 mb-2 animate-fade-in">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">אחרונות</span>
              <div className="flex items-center gap-1.5">
                <span className="text-base">📩</span>
                <h2 className="text-sm font-semibold text-gray-800">יבואי חשבוניות</h2>
              </div>
            </div>
            <div className="space-y-2">
              {invoiceLog.map((entry) => (
                <InvoiceLogCard key={entry.id} entry={entry} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => router.push('/home/add')}
        className="press fixed bottom-24 end-4 w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-full flex items-center justify-center text-3xl shadow-xl shadow-indigo-300/50 z-10"
        aria-label="הוסף פריט"
      >
        +
      </button>

      <BottomNav />
    </div>
  );
}

function ReorderCard({
  suggestion,
  onTap,
}: {
  suggestion: ReorderSuggestion;
  onTap: () => void;
}) {
  return (
    <button
      onClick={onTap}
      className="press w-full flex items-center gap-3 bg-indigo-50/60 border border-indigo-100 rounded-xl px-3 py-2.5 text-right"
    >
      <span className="text-lg flex-shrink-0">🛒</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{suggestion.itemName}</p>
        <p className="text-xs text-gray-400">
          מלאי: {suggestion.currentStock} {suggestion.unit} · מינ׳: {suggestion.minStock}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-xs font-semibold text-indigo-600">הזמן {suggestion.suggestedOrderQty}</p>
        {suggestion.supplier && (
          <p className="text-xs text-gray-400 truncate max-w-20">{suggestion.supplier}</p>
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
          ? 'bg-red-50 border border-red-100'
          : 'bg-emerald-50/60 border border-emerald-100'
      }`}
    >
      <span className="text-lg flex-shrink-0">{entry.status === 'error' ? '❌' : '✅'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {entry.supplier || 'ספק לא ידוע'}
        </p>
        <p className="text-xs text-gray-400">
          {entry.status === 'error'
            ? entry.error ?? 'שגיאה בעיבוד'
            : `${entry.itemsUpdated} פריטים עודכנו`}
        </p>
      </div>
      {timeStr && <p className="text-xs text-gray-300 flex-shrink-0">{timeStr}</p>}
    </div>
  );
}
