'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { updateItem } from '@/lib/firestore';
import { InventoryItem } from '@/types';

function diffColor(diff: number, ref: number): string {
  if (diff === 0) return 'text-emerald-600';
  const pct = ref > 0 ? Math.abs(diff) / ref : 1;
  if (pct <= 0.02) return 'text-amber-500';
  return 'text-red-500';
}

export default function StockCountPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { items, loading: itemsLoading } = useItems(business?.id ?? null);
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!business) { router.replace('/onboarding'); return; }
  }, [user, business, authLoading, bizLoading, router]);

  useEffect(() => {
    const init: Record<string, string> = {};
    items.forEach((i) => { init[i.id] = String(i.stock); });
    setCounts(init);
  }, [items]);

  const totalValue = useMemo(() =>
    items.reduce((sum, i) => sum + i.stock * i.price, 0), [items]);

  const newTotalValue = useMemo(() =>
    items.reduce((sum, i) => {
      const count = parseFloat(counts[i.id] ?? String(i.stock));
      return sum + (isNaN(count) ? i.stock : count) * i.price;
    }, 0), [items, counts]);

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    await Promise.all(
      items.map((item) => {
        const count = parseFloat(counts[item.id] ?? String(item.stock));
        const newStock = isNaN(count) ? item.stock : count;
        if (newStock === item.stock) return Promise.resolve();
        return updateItem(business.id, item.id, { stock: newStock });
      })
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 1500);
  }

  if (authLoading || bizLoading || itemsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 animate-slide-down">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="press w-9 h-9 rounded-xl bg-white/70 border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1 text-right">ספירת מלאי</h1>
        </div>
        {/* Value summary */}
        <div className="glass rounded-2xl p-3 flex justify-between items-center text-sm">
          <span className="font-semibold text-indigo-600">₪{newTotalValue.toFixed(0)}</span>
          <span className="text-gray-500">שווי מלאי</span>
          {Math.abs(newTotalValue - totalValue) > 1 && (
            <span className={newTotalValue > totalValue ? 'text-emerald-500 text-xs' : 'text-red-500 text-xs'}>
              {newTotalValue > totalValue ? '+' : ''}₪{(newTotalValue - totalValue).toFixed(0)}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-3 space-y-2 animate-slide-up">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-1">
          <span className="w-16 text-center text-xs text-gray-400">הפרש</span>
          <span className="w-20 text-center text-xs text-gray-400">ספירה</span>
          <span className="flex-1 text-right text-xs text-gray-400">פריט</span>
        </div>

        {items.map((item) => {
          const countStr = counts[item.id] ?? String(item.stock);
          const count = parseFloat(countStr);
          const diff = isNaN(count) ? 0 : count - item.stock;
          const ref = item.targetStock ?? item.minStock ?? item.stock;
          const colorCls = diffColor(diff, ref);

          return (
            <div key={item.id} className="glass rounded-2xl p-3 flex items-center gap-3">
              <span className={`w-16 text-center text-sm font-semibold ${colorCls}`}>
                {diff === 0 ? '—' : (diff > 0 ? '+' : '') + diff}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={countStr}
                onChange={(e) => setCounts((c) => ({ ...c, [item.id]: e.target.value }))}
                className="w-20 text-center bg-white/80 border border-gray-200 rounded-xl px-2 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
              <div className="flex-1 text-right min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-400">נוכחי: {item.stock} {item.unit}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-nav fixed bottom-0 right-0 left-0 p-4">
        <button
          onClick={handleSave}
          disabled={saving || saved}
          className="press w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-medium text-base shadow-lg shadow-gray-900/20 disabled:opacity-50"
        >
          {saved ? '✅ נשמר!' : saving ? 'שומר...' : 'שמור ספירה'}
        </button>
      </div>
    </div>
  );
}
