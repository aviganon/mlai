'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { ItemCard } from '@/components/ItemCard';
import { BottomNav } from '@/components/BottomNav';
import { DEFAULT_CATEGORIES } from '@/types';

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { items, loading: itemsLoading } = useItems(business?.id ?? null);
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

  if (authLoading || bizLoading) {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">טוען...</p></div>;
  }
  if (!user || !business) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-semibold">Mlai</h1>
          <span className="text-sm text-gray-500">{business.name}</span>
        </div>
        {lowStock.length > 0 && (
          <div className="bg-amber-50 text-amber-700 rounded-xl px-3 py-2 text-sm flex items-center gap-2">
            <span>⚠️</span>
            <span>{lowStock.length} פריטים דורשים תשומת לב</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש פריט, ספק, מק״ט..."
          className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-right text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
        />
      </div>

      {/* Categories */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {cat} {cat === 'הכל' ? `· ${items.length}` : ''}
          </button>
        ))}
      </div>

      {/* Items list */}
      <div className="px-4 space-y-2 mt-1">
        {itemsLoading && <p className="text-center text-gray-400 py-10">טוען מלאי...</p>}
        {!itemsLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">{search ? 'לא נמצאו תוצאות' : 'אין פריטים עדיין'}</p>
            {!search && (
              <button
                onClick={() => router.push('/home/add')}
                className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm"
              >
                + הוסף פריט ראשון
              </button>
            )}
          </div>
        )}
        {filtered.map((item) => (
          <ItemCard key={item.id} item={item} businessId={business.id} />
        ))}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push('/home/add')}
        className="fixed bottom-24 end-4 w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center text-3xl shadow-lg active:scale-95 z-10"
        aria-label="הוסף פריט"
      >
        +
      </button>

      <BottomNav />
    </div>
  );
}
