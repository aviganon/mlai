'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsOwner } from '@/hooks/useIsOwner';
import { getDomains, addDomain, deleteDomain, DEFAULT_DOMAINS } from '@/lib/domains';
import { Domain, UNITS } from '@/types';

export default function DomainsAdminPage() {
  const { isOwner, loading: ownerLoading } = useIsOwner();
  const router = useRouter();
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📦');
  const [newCategories, setNewCategories] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (ownerLoading) return;
    if (!isOwner) { router.replace('/home'); return; }
    getDomains().then((d) => { setDomains(d); setLoading(false); });
  }, [isOwner, ownerLoading, router]);

  async function handleSeed() {
    setSaving(true);
    for (const d of DEFAULT_DOMAINS) {
      await addDomain(d);
    }
    const updated = await getDomains();
    setDomains(updated);
    setSaving(false);
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    setSaving(true);
    const cats = newCategories.split(',').map((c) => c.trim()).filter(Boolean);
    await addDomain({ name: newName.trim(), icon: newIcon, categories: cats.length ? cats : ['כללי', 'אחר'], units: UNITS, isDefault: false });
    const updated = await getDomains();
    setDomains(updated);
    setNewName(''); setNewIcon('📦'); setNewCategories('');
    setShowAdd(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await deleteDomain(id);
    setDomains((prev) => prev.filter((d) => d.id !== id));
    setConfirmDelete(null);
  }

  if (ownerLoading || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
    </div>
  );

  return (
    <div className="min-h-screen pb-10">
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 animate-slide-down flex items-center gap-3">
        <button onClick={() => router.back()} className="press w-9 h-9 rounded-xl bg-white/70 border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm">←</button>
        <div className="flex-1 text-right">
          <h1 className="text-xl font-bold text-gray-900">ניהול תחומים</h1>
          <p className="text-xs text-gray-400">{domains.length} תחומים מוגדרים</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 animate-slide-up">
        {domains.length === 0 && (
          <div className="glass rounded-2xl p-5 text-center space-y-3">
            <p className="text-gray-400 text-sm">אין תחומים. טען את ברירות המחדל:</p>
            <button onClick={handleSeed} disabled={saving}
              className="press bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium">
              {saving ? 'טוען...' : '⚡ טען תחומי ברירת מחדל'}
            </button>
          </div>
        )}

        {domains.map((d) => (
          <div key={d.id} className="glass rounded-2xl p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{d.icon}</span>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.categories.length} קטגוריות</p>
                </div>
              </div>
              {!d.isDefault && (
                <button onClick={() => setConfirmDelete(d.id)} className="press text-red-400 text-xs border border-red-100 bg-red-50 px-2.5 py-1 rounded-xl">מחק</button>
              )}
            </div>
            <div className="flex flex-wrap gap-1 justify-end">
              {d.categories.map((c) => (
                <span key={c} className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
              ))}
            </div>
            {confirmDelete === d.id && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 animate-scale-in">
                <button onClick={() => setConfirmDelete(null)} className="press flex-1 py-1.5 rounded-xl border border-gray-200 text-xs bg-white">ביטול</button>
                <button onClick={() => handleDelete(d.id)} className="press flex-1 py-1.5 rounded-xl bg-red-500 text-white text-xs">מחק</button>
              </div>
            )}
          </div>
        ))}

        {/* Add domain */}
        {!showAdd ? (
          <button onClick={() => setShowAdd(true)} className="press w-full glass rounded-2xl py-4 text-sm font-medium text-indigo-500">+ הוסף תחום חדש</button>
        ) : (
          <div className="glass rounded-2xl p-4 space-y-3 animate-scale-in">
            <p className="text-sm font-semibold text-gray-900 text-right">תחום חדש</p>
            <div className="flex gap-2">
              <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} className="w-14 border border-gray-200 rounded-xl px-2 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="📦" />
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="שם התחום" />
            </div>
            <textarea value={newCategories} onChange={(e) => setNewCategories(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none h-20"
              placeholder="קטגוריות מופרדות בפסיקים: בגדים, נעליים, אביזרים" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="press flex-1 py-2.5 rounded-xl glass text-sm">ביטול</button>
              <button onClick={handleAdd} disabled={saving || !newName.trim()} className="press flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50">
                {saving ? 'שומר...' : 'הוסף תחום'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
