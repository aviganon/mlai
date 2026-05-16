'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { getInvoiceLogRange } from '@/lib/firestore';
import { InvoiceLogEntry } from '@/types';

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { items } = useItems(business?.id ?? null);
  const router = useRouter();

  const now = new Date();
  const [fromDate, setFromDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  );
  const [toDate, setToDate] = useState(now.toISOString().split('T')[0]);
  const [invoiceLogs, setInvoiceLogs] = useState<InvoiceLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!business) { router.replace('/onboarding'); return; }
  }, [user, business, authLoading, bizLoading, router]);

  useEffect(() => {
    if (!business || !fromDate || !toDate) return;
    setLoadingLogs(true);
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');
    getInvoiceLogRange(business.id, from, to).then((logs) => {
      setInvoiceLogs(logs);
      setLoadingLogs(false);
    });
  }, [business, fromDate, toDate]);

  const totalValue = useMemo(() =>
    items.reduce((sum, i) => sum + i.stock * i.price, 0), [items]);

  const bySupplier = useMemo(() => {
    const map = new Map<string, { value: number; count: number }>();
    items.forEach((item) => {
      const sup = item.supplier?.trim() || 'ללא ספק';
      const cur = map.get(sup) ?? { value: 0, count: 0 };
      map.set(sup, { value: cur.value + item.stock * item.price, count: cur.count + 1 });
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.value - a.value);
  }, [items]);

  function handleExport() {
    const lines = [
      `דוח מלאי - ${business?.name ?? ''}`,
      `תקופה: ${fromDate} עד ${toDate}`,
      `תאריך הפקה: ${new Date().toLocaleDateString('he-IL')}`,
      '',
      `שווי מלאי כולל: ₪${totalValue.toFixed(2)}`,
      '',
      '--- לפי ספק ---',
      ...bySupplier.map((s) => `${s.name}: ₪${s.value.toFixed(2)} (${s.count} פריטים)`),
      '',
      '--- פריטים ---',
      ...items.map((i) => `${i.name} | ${i.stock} ${i.unit} | ₪${(i.stock * i.price).toFixed(2)} | ${i.supplier || '—'}`),
      '',
      `--- חשבוניות (${invoiceLogs.length}) ---`,
      ...invoiceLogs.map((e) => {
        const date = e.parsedAt
          ? new Date((e.parsedAt as unknown as { seconds: number }).seconds * 1000).toLocaleDateString('he-IL')
          : '';
        return `${date} | ${e.supplier} | ${e.itemsUpdated} פריטים`;
      }),
    ];
    const text = lines.join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-28">
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 animate-slide-down">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.back()}
            className="press w-9 h-9 rounded-xl bg-white/70 border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex-1 text-right">דוח חודשי</h1>
          <button
            onClick={handleExport}
            className="press px-3 py-1.5 bg-indigo-500 text-white rounded-xl text-sm font-medium"
          >
            {copied ? '✅' : '📋 ייצוא'}
          </button>
        </div>
        {/* Date range */}
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="flex-1 glass rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-gray-400 text-xs">עד</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="flex-1 glass rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-gray-400 text-xs">מ</span>
        </div>
      </div>

      <div className="px-4 pt-3 space-y-4 animate-slide-up">
        {/* Total value */}
        <div className="glass rounded-2xl p-5 text-center">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">שווי מלאי נוכחי</p>
          <p className="text-4xl font-bold text-gray-900">₪{totalValue.toLocaleString('he-IL', { maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-gray-400 mt-1">{items.length} פריטים</p>
        </div>

        {/* By supplier */}
        <div className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-800 text-right mb-3">לפי ספק</h2>
          <div className="space-y-2">
            {bySupplier.map((s) => (
              <div key={s.name} className="flex items-center justify-between">
                <span className="text-sm text-indigo-600 font-medium">₪{s.value.toFixed(0)}</span>
                <div className="text-right">
                  <span className="text-sm text-gray-800">{s.name}</span>
                  <span className="text-xs text-gray-400 mr-1">({s.count} פריטים)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Invoice log */}
        <div className="glass rounded-2xl p-4">
          <h2 className="text-sm font-semibold text-gray-800 text-right mb-3">
            יבואי חשבוניות {loadingLogs ? '...' : `(${invoiceLogs.length})`}
          </h2>
          {invoiceLogs.length === 0 && !loadingLogs && (
            <p className="text-xs text-gray-400 text-center py-2">אין חשבוניות בתקופה זו</p>
          )}
          <div className="space-y-2">
            {invoiceLogs.map((entry) => {
              const date = entry.parsedAt
                ? new Date((entry.parsedAt as unknown as { seconds: number }).seconds * 1000)
                : null;
              const dateStr = date?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) ?? '';
              return (
                <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-gray-100">
                  <span className={`text-xs ${entry.status === 'error' ? 'text-red-400' : 'text-emerald-500'}`}>
                    {entry.status === 'error' ? '❌' : '✅'} {entry.itemsUpdated} פריטים
                  </span>
                  <div className="text-right">
                    <span className="text-sm text-gray-800">{entry.supplier}</span>
                    <span className="text-xs text-gray-400 mr-1">{dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
