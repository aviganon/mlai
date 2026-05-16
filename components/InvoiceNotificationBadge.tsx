'use client';
import { useEffect, useRef, useState } from 'react';
import { getInvoiceLogRange } from '@/lib/firestore';
import { InvoiceLogEntry } from '@/types';

const LS_KEY = 'mlai_dismissed_invoices';

function getDismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveDismissed(ids: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'object' && val !== null && 'seconds' in val) {
    return new Date((val as { seconds: number }).seconds * 1000);
  }
  return null;
}

export function InvoiceNotificationBadge({ businessId }: { businessId: string }) {
  const [entries, setEntries] = useState<InvoiceLogEntry[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDismissed(getDismissed());
    const to = new Date();
    const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    getInvoiceLogRange(businessId, from, to).then(setEntries);
  }, [businessId]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const undismissedCount = entries.filter((e) => !dismissed.includes(e.id)).length;

  function dismiss(id: string) {
    const next = [...getDismissed(), id].filter((v, i, a) => a.indexOf(v) === i);
    saveDismissed(next);
    setDismissed(next);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="press relative w-9 h-9 rounded-xl glass flex items-center justify-center text-gray-500"
        aria-label="עדכוני חשבוניות"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {undismissedCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {undismissedCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-11 left-0 w-72 glass-strong rounded-2xl shadow-2xl shadow-gray-900/15 z-50 overflow-hidden animate-scale-in">
          <div className="px-4 py-3 border-b border-white/20">
            <p className="text-sm font-semibold text-gray-900 text-right">עדכוני חשבוניות (7 ימים)</p>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">אין עדכונים</p>
            ) : (
              entries.map((entry) => {
                const date = toDate(entry.parsedAt);
                const dateStr = date
                  ? date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : '';
                const isDismissed = dismissed.includes(entry.id);

                return (
                  <div
                    key={entry.id}
                    dir="rtl"
                    className={`px-4 py-3 border-b border-white/10 last:border-0 transition-opacity ${isDismissed ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{entry.status === 'error' ? '❌' : '✅'}</span>
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {entry.supplier || 'ספק לא ידוע'}
                          </p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {entry.status === 'error'
                            ? (entry.error ?? 'שגיאה בעיבוד')
                            : `${entry.itemsUpdated} פריטים עודכנו`}
                          {dateStr ? ` · ${dateStr}` : ''}
                        </p>
                      </div>
                      {!isDismissed && (
                        <button
                          onClick={() => dismiss(entry.id)}
                          className="press text-xs text-indigo-500 font-medium flex-shrink-0 mt-0.5"
                        >
                          סמן כנקרא
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
