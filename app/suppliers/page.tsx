'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { getAllSupplierDetails, getSupplierDetails, saveSupplierDetails, updateItem } from '@/lib/firestore';
import { BottomNav } from '@/components/BottomNav';
import { InventoryItem, SupplierDetails } from '@/types';

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

const inputCls = 'w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all';

export default function SuppliersPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { items, loading: itemsLoading } = useItems(business?.id ?? null);
  const router = useRouter();

  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [supplierDetails, setSupplierDetails] = useState<SupplierDetails | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editDeliveryDays, setEditDeliveryDays] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingDetails, setSavingDetails] = useState(false);

  // All supplier details docs (for suppliers with no items yet)
  const [allSupplierDetails, setAllSupplierDetails] = useState<SupplierDetails[]>([]);

  // New supplier modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newContact, setNewContact] = useState('');
  const [creating, setCreating] = useState(false);
  const [newNameError, setNewNameError] = useState(false);

  // Add existing items modal state
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [itemPickerSearch, setItemPickerSearch] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [assigningItems, setAssigningItems] = useState(false);

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) router.replace('/login');
    else if (!business) router.replace('/onboarding');
  }, [user, business, authLoading, bizLoading, router]);

  useEffect(() => {
    if (!business) return;
    getAllSupplierDetails(business.id).then(setAllSupplierDetails);
  }, [business]);

  useEffect(() => {
    if (!selectedSupplier || !business) return;
    getSupplierDetails(business.id, selectedSupplier).then((d) => {
      setSupplierDetails(d);
      setEditPhone(d?.phone ?? '');
      setEditEmail(d?.email ?? '');
      setEditDeliveryDays(d?.deliveryDays ? String(d.deliveryDays) : '');
      setEditNotes(d?.notes ?? '');
    });
  }, [selectedSupplier, business]);

  const suppliers = useMemo<SupplierGroup[]>(() => {
    const map = new Map<string, InventoryItem[]>();
    items.forEach((item) => {
      const name = item.supplier?.trim() || 'ללא ספק';
      const list = map.get(name) ?? [];
      list.push(item);
      map.set(name, list);
    });
    // Include suppliers from supplierDetails that have no items yet
    allSupplierDetails.forEach((sd) => {
      if (sd.name && !map.has(sd.name)) {
        map.set(sd.name, []);
      }
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
  }, [items, allSupplierDetails]);

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

  const availableItems = useMemo(() => {
    if (!selectedSupplier) return [];
    return items.filter(
      (item) => !item.supplier || item.supplier.trim() !== selectedSupplier.trim()
    );
  }, [items, selectedSupplier]);

  const filteredAvailableItems = useMemo(() => {
    if (!itemPickerSearch.trim()) return availableItems;
    const q = itemPickerSearch.trim().toLowerCase();
    return availableItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [availableItems, itemPickerSearch]);

  const sortedActiveItems = useMemo(() => {
    if (!activeGroup) return [];
    const priority = (item: InventoryItem) => {
      if (item.stock === 0) return 0;
      if (item.minStock > 0 && item.stock < item.minStock) return 1;
      return 2;
    };
    return [...activeGroup.items].sort((a, b) => priority(a) - priority(b));
  }, [activeGroup]);

  async function handleSaveDetails() {
    if (!business || !selectedSupplier) return;
    setSavingDetails(true);
    await saveSupplierDetails(business.id, selectedSupplier, {
      phone: editPhone.trim() || undefined,
      email: editEmail.trim() || undefined,
      deliveryDays: editDeliveryDays ? parseInt(editDeliveryDays) : undefined,
      notes: editNotes.trim() || undefined,
    });
    setSavingDetails(false);
    setShowDetails(false);
  }

  async function handleCreateSupplier() {
    if (!business) return;
    if (!newName.trim()) { setNewNameError(true); return; }
    const createdName = newName.trim();
    setCreating(true);
    await saveSupplierDetails(business.id, createdName, {
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      contactPerson: newContact.trim() || undefined,
    });
    const details = await getAllSupplierDetails(business.id);
    setAllSupplierDetails(details);
    setCreating(false);
    setShowNewModal(false);
    setNewName(''); setNewPhone(''); setNewEmail(''); setNewContact('');
    setNewNameError(false);
    setSelectedSupplier(createdName);
  }

  async function handleAssignItems() {
    if (!business || !selectedSupplier || selectedItemIds.size === 0) return;
    setAssigningItems(true);
    await Promise.all(
      Array.from(selectedItemIds).map((id) =>
        updateItem(business.id, id, { supplier: selectedSupplier })
      )
    );
    setAssigningItems(false);
    setShowAddItemsModal(false);
    setSelectedItemIds(new Set());
    setItemPickerSearch('');
  }

  function openAddItemsModal() {
    setItemPickerSearch('');
    setSelectedItemIds(new Set());
    setShowAddItemsModal(true);
  }

  function openNewModal() {
    setNewName(''); setNewPhone(''); setNewEmail(''); setNewContact('');
    setNewNameError(false);
    setShowNewModal(true);
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
        <div className="flex items-center justify-between mb-3 animate-slide-down">
          <div className="flex items-center gap-2">
            {selectedSupplier ? (
              <button
                onClick={() => { setSelectedSupplier(null); setShowDetails(false); }}
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
          <div className="flex items-center gap-2">
            {!selectedSupplier && (
              <button
                onClick={openNewModal}
                className="press flex items-center gap-1.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-sm"
              >
                <span className="text-sm leading-none">+</span>
                <span>ספק חדש</span>
              </button>
            )}
            <p className="text-xs text-gray-400">
              {selectedSupplier
                ? `${activeGroup?.items.length ?? 0} פריטים`
                : `${suppliers.length} ספקים`}
            </p>
          </div>
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
                  ? String(Math.round(activeGroup.items.reduce((s, i) => s + i.stock, 0) / activeGroup.items.length))
                  : '—'
              }
            />
          </div>

          {/* Add item actions */}
          {selectedSupplier !== 'ללא ספק' && (
            <div className="flex gap-2 animate-fade-in">
              <button
                onClick={openAddItemsModal}
                className="press flex-1 glass rounded-2xl p-3 text-sm font-medium text-gray-700 flex items-center justify-center gap-1.5"
              >
                <span className="text-base leading-none">📦</span>
                <span>הוסף פריט קיים</span>
              </button>
              <button
                onClick={() => router.push('/home/add?supplier=' + encodeURIComponent(selectedSupplier))}
                className="press flex-1 glass rounded-2xl p-3 text-sm font-medium text-gray-700 flex items-center justify-center gap-1.5"
              >
                <span className="text-base leading-none">✨</span>
                <span>צור פריט חדש</span>
              </button>
            </div>
          )}

          {/* Supplier details collapsible */}
          {selectedSupplier !== 'ללא ספק' && (
            <div className="glass rounded-2xl overflow-hidden animate-fade-in">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="press w-full flex items-center justify-between p-4 text-right"
              >
                <span className="text-indigo-500 text-xs">{showDetails ? '▲ סגור' : '▼ ערוך'}</span>
                <span className="text-sm font-medium text-gray-700">פרטי ספק</span>
              </button>
              {showDetails && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs text-gray-500 text-right mb-1">טלפון</label>
                      <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="050-..." className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 text-right mb-1">אימייל</label>
                      <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="mail@..." className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 text-right mb-1">ימי אספקה</label>
                    <input type="number" value={editDeliveryDays} onChange={(e) => setEditDeliveryDays(e.target.value)} placeholder="מספר ימים" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 text-right mb-1">הערות</label>
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="פרטים נוספים..." rows={2} className={inputCls + ' resize-none'} />
                  </div>
                  <button
                    onClick={handleSaveDetails}
                    disabled={savingDetails}
                    className="press w-full bg-gray-900 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {savingDetails ? 'שומר...' : 'שמור פרטים'}
                  </button>
                </div>
              )}
              {!showDetails && (supplierDetails?.phone || supplierDetails?.deliveryDays) && (
                <div className="px-4 pb-3 flex gap-4 justify-end text-xs text-gray-500">
                  {supplierDetails.phone && <span>📞 {supplierDetails.phone}</span>}
                  {supplierDetails.deliveryDays && <span>🚚 {supplierDetails.deliveryDays} ימים</span>}
                </div>
              )}
            </div>
          )}

          {/* Items list — sorted: low stock first */}
          {sortedActiveItems.length === 0 && (
            <div className="text-center py-10 text-gray-400 text-sm animate-fade-in">
              אין פריטים משויכים לספק זה
            </div>
          )}
          {sortedActiveItems.map((item, i) => {
            const dot = stockDot(item);
            const isLow = item.stock === 0 || (item.minStock > 0 && item.stock < item.minStock);
            return (
              <button
                key={item.id}
                onClick={() => router.push(`/home/item/${item.id}`)}
                className="press w-full glass rounded-2xl p-4 flex items-center gap-3 text-right animate-slide-up"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <span className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.category}
                    {item.sku ? ` · מק"ט ${item.sku}` : ''}
                  </p>
                  {isLow && (
                    <p className={`text-xs font-medium mt-0.5 ${item.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
                      {item.stock === 0 ? 'אזל מהמלאי' : `מתחת למינימום (${item.minStock} ${item.unit})`}
                    </p>
                  )}
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
            );
          })}
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-2">
          {filteredSuppliers.length === 0 && (
            <div className="text-center py-16 animate-scale-in">
              <div className="text-5xl mb-4">🚚</div>
              <p className="text-gray-400 text-sm">
                {search ? 'לא נמצאו ספקים' : 'עדיין אין ספקים במלאי'}
              </p>
              {!search && (
                <p className="text-xs text-gray-300 mt-2">
                  לחץ על &ldquo;+ ספק חדש&rdquo; להוספה ידנית, או הוסף פריטים עם שם ספק
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
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center flex-shrink-0 border border-indigo-100">
                <span className="text-xl">{supplier.name === 'ללא ספק' ? '📦' : '🚚'}</span>
              </div>
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
              <div className="flex gap-1 flex-shrink-0">
                {supplier.items.slice(0, 5).map((item) => (
                  <span key={item.id} className={`w-2 h-2 rounded-full ${stockDot(item)}`} />
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

      {/* New Supplier Modal */}
      {showNewModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowNewModal(false); }}
        >
          <div className="glass-strong rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setShowNewModal(false)}
                className="press w-8 h-8 rounded-xl glass flex items-center justify-center text-gray-400 text-sm"
              >
                ✕
              </button>
              <h2 className="text-lg font-bold text-gray-900">ספק חדש</h2>
              <div className="w-8" />
            </div>

            <div className="space-y-3" dir="rtl">
              {/* Supplier name */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">שם ספק *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); setNewNameError(false); }}
                  placeholder="לדוגמה: תוצרת הגליל"
                  className={`${inputCls} ${newNameError ? 'ring-2 ring-red-300 border-red-300' : ''}`}
                  autoFocus
                />
                {newNameError && (
                  <p className="text-xs text-red-400 mt-1 text-right">שם ספק הוא שדה חובה</p>
                )}
              </div>

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">טלפון</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="050-..."
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">אימייל</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="mail@..."
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Contact person */}
              <div>
                <label className="block text-xs text-gray-500 mb-1">איש קשר</label>
                <input
                  type="text"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  placeholder="שם איש הקשר"
                  className={inputCls}
                />
              </div>
            </div>

            <button
              onClick={handleCreateSupplier}
              disabled={creating}
              className="press mt-5 w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3 rounded-2xl text-sm font-semibold shadow-md disabled:opacity-50"
            >
              {creating ? 'יוצר ספק...' : '+ הוסף ספק'}
            </button>
          </div>
        </div>
      )}

      {/* Add Existing Items Modal */}
      {showAddItemsModal && selectedSupplier && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddItemsModal(false); }}
        >
          <div className="glass-strong rounded-3xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowAddItemsModal(false)}
                className="press w-8 h-8 rounded-xl glass flex items-center justify-center text-gray-400 text-sm"
              >
                ✕
              </button>
              <h2 className="text-base font-bold text-gray-900">הוסף פריט קיים</h2>
              <div className="w-8" />
            </div>

            <div className="relative mb-3">
              <input
                type="text"
                value={itemPickerSearch}
                onChange={(e) => setItemPickerSearch(e.target.value)}
                placeholder="חיפוש פריט..."
                className="w-full glass rounded-2xl px-4 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-10"
                dir="rtl"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 text-sm">🔍</span>
            </div>

            {filteredAvailableItems.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {availableItems.length === 0
                  ? 'כל הפריטים כבר משויכים לספק זה'
                  : 'לא נמצאו פריטים'}
              </div>
            ) : (
              <div className="space-y-1.5 mb-4" dir="rtl">
                {filteredAvailableItems.map((item) => {
                  const checked = selectedItemIds.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        const next = new Set(selectedItemIds);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        setSelectedItemIds(next);
                      }}
                      className={`press w-full flex items-center gap-3 p-3 rounded-2xl text-right transition-all ${
                        checked ? 'bg-indigo-50 border border-indigo-200' : 'glass border border-transparent'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        checked ? 'bg-indigo-500 border-indigo-500' : 'border-gray-300 bg-white/60'
                      }`}>
                        {checked && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate text-sm">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.category}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleAssignItems}
              disabled={selectedItemIds.size === 0 || assigningItems}
              className="press w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-3 rounded-2xl text-sm font-semibold shadow-md disabled:opacity-40"
            >
              {assigningItems
                ? 'מוסיף פריטים...'
                : `הוסף פריטים נבחרים (${selectedItemIds.size})`}
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function StatCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="glass rounded-2xl p-3 text-center">
      <p className={`text-xl font-bold ${alert ? 'text-amber-500' : 'text-gray-900'}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
