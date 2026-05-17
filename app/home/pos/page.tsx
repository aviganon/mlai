'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { getAllSupplierDetails, updateItem } from '@/lib/firestore';
import { BottomNav } from '@/components/BottomNav';
import { InvoiceNotificationBadge } from '@/components/InvoiceNotificationBadge';
import { generateOrderPdf } from '@/lib/generateOrderPdf';
import { InventoryItem, SupplierDetails } from '@/types';

// ─── Types ────────────────────────────────────────────────────

type Confidence = 'high' | 'medium' | 'low';

interface MatchedRow {
  parsedItem: string;
  parsedQty: number;
  match: InventoryItem | null;
  confidence: Confidence;
  newStock: number | null;
}

interface ReorderGroup {
  supplier: string;
  phone?: string;
  items: { itemId: string; name: string; qty: number; unit: string }[];
}

// ─── Matching logic ───────────────────────────────────────────

function matchItem(
  parsedName: string,
  items: InventoryItem[]
): { match: InventoryItem | null; confidence: Confidence } {
  const lower = parsedName.toLowerCase().trim();

  // Exact name match
  const exact = items.find((i) => i.name.toLowerCase() === lower);
  if (exact) return { match: exact, confidence: 'high' };

  // SKU match (when parsedName looks like a product code)
  const skuMatch = items.find((i) => i.sku && i.sku.toLowerCase() === lower);
  if (skuMatch) return { match: skuMatch, confidence: 'high' };

  // Partial — item name is substring of parsed OR parsed is substring of item name
  const partial = items.find((i) => {
    const n = i.name.toLowerCase();
    return n.includes(lower) || lower.includes(n);
  });
  if (partial) return { match: partial, confidence: 'medium' };

  return { match: null, confidence: 'low' };
}

// ─── Page ─────────────────────────────────────────────────────

export default function PosPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { items, loading: itemsLoading } = useItems(business?.id ?? null);
  const router = useRouter();

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Parsed / matched state
  const [matchedRows, setMatchedRows] = useState<MatchedRow[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Post-confirm state
  const [reorderGroups, setReorderGroups] = useState<ReorderGroup[]>([]);
  const [supplierDetailsMap, setSupplierDetailsMap] = useState<Map<string, SupplierDetails>>(
    new Map()
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) router.replace('/login');
    else if (!business) router.replace('/onboarding');
  }, [user, business, authLoading, bizLoading, router]);

  useEffect(() => {
    if (!business) return;
    getAllSupplierDetails(business.id).then((details) => {
      const map = new Map<string, SupplierDetails>();
      details.forEach((d) => { if (d.name) map.set(d.name, d); });
      setSupplierDetailsMap(map);
    });
  }, [business]);

  // Clean up preview URL when file changes
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFile(f: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setMatchedRows(null);
    setConfirmed(false);
    setReorderGroups([]);
    setParseError(null);
    if (f.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(f));
    } else {
      setPreviewUrl(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  async function handleParse() {
    if (!file || itemsLoading) return;
    setParsing(true);
    setParseError(null);

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/parse-sales-report', { method: 'POST', body: fd });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? 'שגיאה בניתוח הדוח');
      }

      const parsed: { item: string; quantity: number }[] = Array.isArray(json) ? json : [];

      const rows: MatchedRow[] = parsed.map((p) => {
        const { match, confidence } = matchItem(p.item, items);
        return {
          parsedItem: p.item,
          parsedQty: p.quantity,
          match,
          confidence,
          newStock: match !== null ? Math.max(0, match.stock - p.quantity) : null,
        };
      });

      setMatchedRows(rows);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'שגיאה לא ידועה');
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!business || !matchedRows) return;
    setConfirming(true);

    const toUpdate = matchedRows.filter((r) => r.match !== null && r.newStock !== null);

    await Promise.all(
      toUpdate.map((r) =>
        updateItem(business.id, r.match!.id, {
          stock: r.newStock!,
          lastUpdatedBy: 'sale',
        })
      )
    );

    // Items that dropped below minStock
    const belowMin = toUpdate.filter(
      (r) => r.match!.minStock > 0 && r.newStock! < r.match!.minStock
    );

    // Group by supplier
    const groupsMap = new Map<string, typeof belowMin>();
    for (const row of belowMin) {
      const supplierName = row.match!.supplier?.trim() || 'ללא ספק';
      const list = groupsMap.get(supplierName) ?? [];
      list.push(row);
      groupsMap.set(supplierName, list);
    }

    const groups: ReorderGroup[] = [];
    for (const [supplierName, rows] of groupsMap) {
      const details = supplierDetailsMap.get(supplierName);
      groups.push({
        supplier: supplierName,
        phone: details?.phone,
        items: rows.map((r) => {
          const target = r.match!.targetStock;
          const minOrder = r.match!.minOrder ?? 1;
          const qty = target
            ? Math.max(0, target - r.newStock!)
            : Math.max(minOrder, r.match!.minStock - r.newStock!);
          return { itemId: r.match!.id, name: r.match!.name, qty, unit: r.match!.unit };
        }),
      });
    }

    setReorderGroups(groups);
    setConfirmed(true);
    setConfirming(false);
  }

  function shareViaWhatsApp(group: ReorderGroup) {
    if (!business) return;

    const blob = generateOrderPdf(group.supplier, group.items, business.name);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `הזמנה-${group.supplier}-${new Date().toLocaleDateString('he-IL')}.pdf`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    const phone = group.phone?.replace(/\D/g, '') ?? '';
    const text = encodeURIComponent(
      `שלום, מצורפת הזמנה חדשה מ${business.name}:\n` +
        group.items.map((i) => `• ${i.name}: ${i.qty} ${i.unit}`).join('\n')
    );
    const waUrl = phone
      ? `https://wa.me/972${phone.replace(/^0/, '')}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  }

  function resetAll() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setMatchedRows(null);
    setConfirmed(false);
    setReorderGroups([]);
    setParseError(null);
  }

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
      </div>
    );
  }
  if (!user || !business) return null;

  const matchedCount = matchedRows?.filter((r) => r.match !== null).length ?? 0;
  const unmatchedCount = matchedRows?.filter((r) => r.match === null).length ?? 0;

  return (
    <div className="min-h-screen pb-28" dir="rtl">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-3 animate-slide-down">
        <div className="flex items-center justify-between">
          <div />
          <div className="flex items-center gap-2">
            <InvoiceNotificationBadge businessId={business.id} />
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900">קופה</h1>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">

        {/* ── Section 1: Upload ── */}
        {!confirmed && (
          <div className="animate-slide-up">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              העלאת דוח מכירות
            </h2>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 select-none ${
                isDragging
                  ? 'border-indigo-400 bg-indigo-50/70 scale-[1.01]'
                  : 'border-indigo-200 bg-white/40 hover:bg-indigo-50/30 hover:border-indigo-300'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />

              {file ? (
                <div className="space-y-3">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="max-h-44 mx-auto rounded-2xl object-contain shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center">
                      <span className="text-3xl">
                        {file.name.endsWith('.pdf')
                          ? '📄'
                          : file.name.match(/\.xlsx?$/i)
                          ? '📊'
                          : '📋'}
                      </span>
                    </div>
                  )}
                  <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  <p className="text-xs text-indigo-400">לחץ להחלפת קובץ</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-indigo-400"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">גרור קובץ לכאן</p>
                    <p className="text-xs text-gray-400 mt-1">או לחץ לבחירת קובץ</p>
                  </div>
                  <p className="text-xs text-gray-300">תמונה · PDF · CSV</p>
                </div>
              )}
            </div>

            {/* Parse button */}
            {file && !matchedRows && (
              <button
                onClick={handleParse}
                disabled={parsing || itemsLoading}
                className="press mt-3 w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-indigo-300/40 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {parsing ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
                    <span>מנתח דוח...</span>
                  </>
                ) : (
                  <>
                    <span>🤖</span>
                    <span>נתח דוח</span>
                  </>
                )}
              </button>
            )}

            {parseError && (
              <div className="mt-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-red-500 flex-shrink-0">⚠️</span>
                <p className="text-sm text-red-600">{parseError}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Section 2: Parsing Results ── */}
        {matchedRows && !confirmed && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400">
                {matchedCount} הותאמו · {unmatchedCount} לא נמצאו
              </span>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                תוצאות ניתוח
              </h2>
            </div>

            <div className="glass rounded-2xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-3 bg-gray-50/60 px-4 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-100">
                <span>התאמה למלאי</span>
                <span className="text-center">כמות</span>
                <span className="text-right">שם פריט</span>
              </div>

              {matchedRows.map((row, i) => (
                <div
                  key={i}
                  className={`grid grid-cols-3 px-4 py-3 items-center border-b border-gray-100/80 last:border-0 ${
                    row.match === null ? 'bg-amber-50/50' : 'bg-white/30'
                  }`}
                >
                  {/* Match */}
                  <div>
                    {row.match ? (
                      <div>
                        <p className="text-xs font-medium text-emerald-700 truncate">
                          {row.match.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {row.match.stock} → {row.newStock} {row.match.unit}
                        </p>
                        {row.confidence === 'medium' && (
                          <span className="text-[10px] text-amber-500">התאמה חלקית</span>
                        )}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <span>⚠</span>
                        <span>לא נמצא</span>
                      </span>
                    )}
                  </div>

                  {/* Quantity */}
                  <div className="text-center">
                    <span className="text-sm font-bold text-gray-800">{row.parsedQty}</span>
                  </div>

                  {/* Item name */}
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 truncate">{row.parsedItem}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Warning for unmatched items */}
            {unmatchedCount > 0 && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-amber-500 flex-shrink-0">⚠️</span>
                <p className="text-xs text-amber-700">
                  {unmatchedCount} פריטים לא נמצאו במלאי ולא יעודכנו
                </p>
              </div>
            )}

            {/* Confirm button */}
            <button
              onClick={handleConfirm}
              disabled={confirming || matchedCount === 0}
              className="press mt-3 w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3.5 rounded-2xl font-semibold shadow-lg shadow-emerald-300/40 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {confirming ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
                  <span>מעדכן מלאי...</span>
                </>
              ) : (
                <>
                  <span>✅</span>
                  <span>אשר ועדכן מלאי ({matchedCount} פריטים)</span>
                </>
              )}
            </button>

            <button
              onClick={resetAll}
              className="press mt-2 w-full glass py-3 rounded-2xl text-sm font-medium text-gray-500"
            >
              בטל וחזור
            </button>
          </div>
        )}

        {/* ── Section 3: Reorder Suggestions ── */}
        {confirmed && (
          <div className="animate-slide-up space-y-4">
            {/* Success banner */}
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3">
              <span className="text-emerald-500 text-lg">✅</span>
              <p className="text-sm font-medium text-emerald-700">
                המלאי עודכן בהצלחה — {matchedCount} פריטים
              </p>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{reorderGroups.length} ספקים</span>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                הצעות הזמנה
              </h2>
            </div>

            {reorderGroups.length === 0 ? (
              <div className="glass rounded-3xl p-10 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <p className="text-base font-semibold text-gray-800 mb-1">
                  אין פריטים שדורשים הזמנה
                </p>
                <p className="text-sm text-gray-400">כל הפריטים מעל רמת המינימום</p>
              </div>
            ) : (
              reorderGroups.map((group) => (
                <div key={group.supplier} className="glass rounded-2xl overflow-hidden">
                  {/* Supplier header */}
                  <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/20 bg-indigo-50/30">
                    <button
                      onClick={() => shareViaWhatsApp(group)}
                      className="press flex items-center gap-1.5 bg-green-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>שלח בוואטסאפ</span>
                    </button>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{group.supplier}</p>
                      {group.phone && (
                        <p className="text-xs text-gray-400 mt-0.5">📞 {group.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-2.5 space-y-1.5">
                    {group.items.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0"
                      >
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                          הזמן {item.qty} {item.unit}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            <button
              onClick={resetAll}
              className="press w-full glass py-3.5 rounded-2xl text-sm font-medium text-gray-600 flex items-center justify-center gap-2"
            >
              <span>📂</span>
              <span>העלה דוח חדש</span>
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
