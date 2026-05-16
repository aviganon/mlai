'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllSupplierDetails, saveSupplierDetails } from '@/lib/firestore';
import { InventoryItem, SupplierDetails } from '@/types';

interface Props {
  businessId: string;
  items: InventoryItem[];
  value: string;
  onChange: (val: string) => void;
}

const fieldCls =
  'w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all';

export function SupplierPicker({ businessId, items, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [allDetails, setAllDetails] = useState<SupplierDetails[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newContact, setNewContact] = useState('');
  const [creating, setCreating] = useState(false);
  const [nameError, setNameError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getAllSupplierDetails(businessId).then(setAllDetails);
  }, [businessId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  const supplierNames = useMemo(() => {
    const set = new Set<string>();
    allDetails.forEach((d) => { if (d.name) set.add(d.name); });
    items.forEach((i) => { if (i.supplier?.trim()) set.add(i.supplier.trim()); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'he'));
  }, [allDetails, items]);

  function resetCreate() {
    setShowCreate(false);
    setNewName(''); setNewPhone(''); setNewEmail(''); setNewContact('');
    setNameError(false);
  }

  async function handleCreate() {
    if (!newName.trim()) { setNameError(true); return; }
    setCreating(true);
    await saveSupplierDetails(businessId, newName.trim(), {
      phone: newPhone.trim() || undefined,
      email: newEmail.trim() || undefined,
      contactPerson: newContact.trim() || undefined,
    });
    const updated = await getAllSupplierDetails(businessId);
    setAllDetails(updated);
    onChange(newName.trim());
    setCreating(false);
    setOpen(false);
    resetCreate();
  }

  return (
    <div ref={containerRef} className="relative" dir="rtl">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setShowCreate(false); }}
        className="w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-3 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all flex items-center justify-between gap-2"
      >
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
        <span className={value ? 'text-gray-900 flex-1 text-right' : 'text-gray-400 flex-1 text-right'}>
          {value || 'בחר ספק...'}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full right-0 left-0 mt-1 z-50 glass-strong rounded-2xl shadow-xl overflow-hidden border border-gray-100 animate-scale-in">
          {/* Existing suppliers */}
          <div className="max-h-52 overflow-y-auto">
            {value && (
              <button
                type="button"
                onClick={() => { onChange(''); setOpen(false); }}
                className="press w-full text-right px-4 py-2.5 text-xs text-gray-400 hover:bg-white/60 border-b border-gray-100 flex items-center justify-end gap-2"
              >
                <span>הסר ספק</span>
                <span>✕</span>
              </button>
            )}
            {supplierNames.length === 0 && (
              <p className="text-center py-4 text-xs text-gray-400">אין ספקים עדיין</p>
            )}
            {supplierNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => { onChange(name); setOpen(false); setShowCreate(false); }}
                className={`press w-full text-right px-4 py-3 text-sm transition-all border-b border-gray-50 last:border-0 ${
                  value === name
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-800 hover:bg-white/60'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          {/* Create new option */}
          {!showCreate ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="press w-full text-right px-4 py-3 text-sm font-semibold text-indigo-600 border-t border-indigo-100 bg-indigo-50/60 hover:bg-indigo-50 flex items-center justify-end gap-1.5"
            >
              <span>+ צור ספק חדש</span>
            </button>
          ) : (
            <div className="border-t border-indigo-100 px-4 py-3 space-y-2 bg-white/90" dir="rtl">
              <p className="text-xs font-bold text-gray-700">ספק חדש</p>
              <input
                type="text"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNameError(false); }}
                placeholder="שם ספק *"
                className={`${fieldCls} ${nameError ? 'ring-2 ring-red-300 border-red-300' : ''}`}
                autoFocus
              />
              {nameError && (
                <p className="text-xs text-red-400 text-right">שם ספק הוא שדה חובה</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="טלפון"
                  className={fieldCls}
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="אימייל"
                  className={fieldCls}
                />
              </div>
              <input
                type="text"
                value={newContact}
                onChange={(e) => setNewContact(e.target.value)}
                placeholder="איש קשר"
                className={fieldCls}
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={resetCreate}
                  className="press flex-1 py-2 rounded-xl glass text-xs text-gray-600"
                >
                  ביטול
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating}
                  className="press flex-1 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {creating ? 'יוצר...' : '+ הוסף'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
