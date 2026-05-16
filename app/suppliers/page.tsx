'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { BottomNav } from '@/components/BottomNav';
import { InventoryItem } from '@/types';

interface SupplierGroup {
  name: string;
  items: InventoryItem[];
  lowStockCount: number;
}

function stockDot(item: InventoryItem) {
  if (item.stock === 0) return 'bg-red-400';
  if (item.minStock > 0 && item.stock < item.minStock) return 'bg-amber-400';
  return 'bg-emerald-400';
}

export default function SuppliersPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { items, loading: itemsLoading } = useItems(business?.id ?? null);
  const router = useRouter();

  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) router.replace('/login');
    else if (!business) router.replace('/onboarding');
  }, [user, business, authLoading, bizLoading, router]);

  const suppliers = useMemo<SupplierGroup[]>(() => {
    const map = new Map<string, InventoryItem[]>();
    items.forEach((item) => {
      const name = item.supplier?.trim() || 'ללא ספק';
      const list = map.get(name) ?? [];
      list.push(item);
      map.set(name, list);
    });
    return Array.from(map.entries())
      .map(([name, its]) => ({
        name,
        items: its,
        lowStockCount: its.filter(
          (i) => i.stock === 0 || (i.minStock > 0 && i.stock < i.minStock)
        ).length,
      }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [items]);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.trim().toLowerCase();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.items.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [suppliers, search]);

  const activeGroup = useMemo(
    () => (selectedSupplier ? suppliers.find((s) => s.name === selectedSupplier) : null),
    [suppliers, selectedSupplier]
  );

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
        <div className="flex items-center justify-between mb-3 animate-slide-down">
          <div className="flex items-center gap-2">
            {selectedSupplier ? (
              <button
                onClick={() => setSelectedSupplier(null)}
                className="press w-8 h-8 rounded-xl glass flex items-center justify-center text-gray-500 text-sm"
              >
                ←
              </button>
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">🚚</span>
              </div>
            )}
            <h1 className="text-xl font-bold text-gray-900">
              {selectedSupplier ?? 'ספקים'}
            </h1>
          </div>
          <p className="text-xs text-gray-400">
            {selectedSupplier
              ? `${activeGroup?.items.length ?? 0} פריטים`
              : `${suppliers.length} ספקים`}
          </p>
        </div>

        {!selectedSupplier && (
          <div className="relative animate-fade-in">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש ספק או פריט..."
              className="w-full glass rounded-2xl px-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-10"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
          </div>
        )}
      </div>

      {/* Content */}
      {itemsLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-indigo-200 border-t-indigo-400 animate-spin-smooth" />
        </div>
      ) : selectedSupplier && activeGroup ? (
        /* Supplier detail view */
        <div className="px-4 pt-3 space-y-2">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mb-3 animate-slide-up">
            <StatCard label="פריטים" value={String(activeGroup.items.length)} />
            <StatCard
              label="מלאי נמוך"
              value={String(activeGroup.lowStockCount)}
              alert={activeGroup.lowStockCount > 0}
            />
            <StatCard
              label="ממוצע מלאי"
              value={
                activeGroup.items.length > 0
                  ? String(
                      Math.round(
                        activeGroup.items.reduce((s, i) => s + i.stock, 0) /
                          activeGroup.items.length
                      )
                    )
                  : '—'
              }
            />
          </div>

          {/* Items list */}
          {activeGroup.items.map((item, i) => (
            <button
              key={item.id}
              onClick={() => router.push(`/home/item/${item.id}`)}
              className={`press w-full glass rounded-2xl p-4 flex items-center gap-3 text-right animate-slide-up delay-${Math.min(i * 50, 300)}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stockDot(item)}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {item.category}
                  {item.sku ? ` · מק"ט ${item.sku}` : ''}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-gray-900">
                  {item.stock} <span className="text-xs font-normal text-gray-400">{item.unit}</span>
                </p>
                {item.price > 0 && (
                  <p className="text-xs text-gray-400">₪{item.price}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Supplier list view */
        <div className="px-4 pt-3 space-y-2">
          {filteredSuppliers.length === 0 && (
            <div className="text-center py-16 animate-scale-in">
              <div className="text-5xl mb-4">🚚</div>
              <p className="text-gray-400 text-sm">
                {search ? 'לא נמצאו ספקים' : 'עדיין אין ספקים במלאי'}
              </p>
              {!search && (
                <p className="text-xs text-gray-300 mt-2">
                  הוסף פריטים עם שם ספק כדי לראות אותם כאן
                </p>
              )}
            </div>
          )}

          {filteredSuppliers.map((supplier, i) => (
            <button
              key={supplier.name}
              onClick={() => setSelectedSupplier(supplier.name)}
              className="press w-full glass rounded-2xl p-4 flex items-center gap-4 text-right animate-slide-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {/* Icon */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                <span className="text-xl">
                  {supplier.name === 'ללא ספק' ? '📦' : '🚚'}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-right">
                <p className="font-semibold text-gray-900 truncate">{supplier.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {supplier.items.length} פריטים
                  {supplier.lowStockCount > 0 && (
                    <span className="mr-1.5 text-amber-500 font-medium">
                      · {supplier.lowStockCount} דורשים תשומת לב
                    </span>
                  )}
                </p>
              </div>

              {/* Item dots preview */}
              <div className="flex gap-1 flex-shrink-0">
                {supplier.items.slice(0, 5).map((item) => (
                  <span
                    key={item.id}
                    className={`w-2 h-2 rounded-full ${stockDot(item)}`}
                  />
                ))}
                {supplier.items.length > 5 && (
                  <span className="text-xs text-gray-300">+{supplier.items.length - 5}</span>
                )}
              </div>

              <span className="text-gray-300 text-sm flex-shrink-0">‹</span>
            </button>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function StatCard({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <p className={`text-xl font-bold ${alert ? 'text-amber-500' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
