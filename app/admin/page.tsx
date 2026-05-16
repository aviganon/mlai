'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useIsOwner } from '@/hooks/useIsOwner';
import { getAllBusinesses, adminDeleteBusiness, adminUpdateBusiness } from '@/lib/firestore';
import { getAllUsers } from '@/lib/users';
import { Business, MlaiUser } from '@/types';

function isOnline(lastSeen: unknown): boolean {
  if (!lastSeen) return false;
  const d = (lastSeen as { toDate?: () => Date })?.toDate?.() ?? new Date(lastSeen as string);
  return Date.now() - d.getTime() < 5 * 60 * 1000;
}

function formatLastSeen(lastSeen: unknown): string {
  if (!lastSeen) return 'אף פעם';
  const d = (lastSeen as { toDate?: () => Date })?.toDate?.() ?? new Date(lastSeen as string);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'עכשיו';
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  if (diff < 86400) return `לפני ${Math.floor(diff / 3600)} שעות`;
  return `לפני ${Math.floor(diff / 86400)} ימים`;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: ownerLoading } = useIsOwner();
  const router = useRouter();

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<MlaiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'businesses' | 'users'>('businesses');

  useEffect(() => {
    if (authLoading || ownerLoading) return;
    if (!user || !isOwner) { router.replace('/home'); return; }
    Promise.all([getAllBusinesses(), getAllUsers()]).then(([b, u]) => {
      setBusinesses(b);
      setUsers(u);
      setLoading(false);
    });
  }, [user, isOwner, authLoading, ownerLoading, router]);

  async function handleDelete(id: string) {
    await adminDeleteBusiness(id);
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    setConfirmDelete(null);
    const updatedUsers = users.map((u) => u.businessId === id ? { ...u, businessId: null } : u);
    setUsers(updatedUsers);
  }

  async function handleSaveName(id: string) {
    if (!editName.trim()) return;
    await adminUpdateBusiness(id, { name: editName.trim() });
    setBusinesses((prev) => prev.map((b) => b.id === id ? { ...b, name: editName.trim() } : b));
    setEditId(null);
  }

  const onlineCount = users.filter((u) => isOnline(u.lastSeen)).length;

  if (authLoading || ownerLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" /></div>;
  }

  return (
    <div className="min-h-screen pb-10">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 animate-slide-down">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push('/home')} className="press w-9 h-9 rounded-xl bg-white/70 border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm">←</button>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">פאנל ניהול</h1>
            <p className="text-xs text-gray-400">{businesses.length} עסקים · {users.length} משתמשים · <span className="text-emerald-500 font-medium">{onlineCount} מחוברים</span></p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          {(['businesses', 'users'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`press flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-gray-900 text-white shadow-md shadow-gray-900/15' : 'glass text-gray-600'}`}>
              {tab === 'businesses' ? `עסקים (${businesses.length})` : `משתמשים (${users.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 animate-slide-up">
        {/* Domains link */}
        <button onClick={() => router.push('/admin/domains')}
          className="press w-full glass rounded-2xl p-4 flex items-center justify-between">
          <span className="text-indigo-500 font-medium text-sm">ניהול תחומים →</span>
          <span className="text-2xl">🗂️</span>
        </button>

        {/* Businesses tab */}
        {activeTab === 'businesses' && businesses.map((biz) => {
          const owner = users.find((u) => u.uid === biz.ownerId);
          return (
            <div key={biz.id} className="glass rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {owner && (
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline(owner.lastSeen) ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  )}
                  <div>
                    {editId === biz.id ? (
                      <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                        className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 w-40" />
                    ) : (
                      <p className="font-semibold text-gray-900 text-sm">{biz.name}</p>
                    )}
                    <p className="text-xs text-gray-400">{owner?.email ?? biz.ownerId}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-gray-400">{(biz as unknown as Record<string, unknown>).domain as string ?? biz.type}</p>
                  {owner && <p className="text-xs text-gray-400 mt-0.5">{formatLastSeen(owner.lastSeen)}</p>}
                </div>
              </div>

              <div className="flex gap-2">
                {editId === biz.id ? (
                  <>
                    <button onClick={() => handleSaveName(biz.id)} className="press flex-1 py-2 rounded-xl bg-gray-900 text-white text-xs font-medium">שמור</button>
                    <button onClick={() => setEditId(null)} className="press flex-1 py-2 rounded-xl glass text-xs">ביטול</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => { setEditId(biz.id); setEditName(biz.name); }}
                      className="press flex-1 py-2 rounded-xl glass text-xs font-medium text-gray-600">✏️ ערוך שם</button>
                    <button onClick={() => setConfirmDelete(biz.id)}
                      className="press flex-1 py-2 rounded-xl bg-red-50 border border-red-100 text-red-500 text-xs font-medium">🗑 מחק</button>
                  </>
                )}
              </div>

              {confirmDelete === biz.id && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-2 animate-scale-in">
                  <p className="text-xs text-red-700 font-medium text-right">למחוק את &quot;{biz.name}&quot; וכל הפריטים שלו?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDelete(null)} className="press flex-1 py-1.5 rounded-xl border border-gray-200 text-xs bg-white">ביטול</button>
                    <button onClick={() => handleDelete(biz.id)} className="press flex-1 py-1.5 rounded-xl bg-red-500 text-white text-xs">מחק</button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Users tab */}
        {activeTab === 'users' && users.map((u) => (
          <div key={u.uid} className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline(u.lastSeen) ? 'bg-emerald-400' : 'bg-gray-300'}`} />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-sm font-medium text-gray-900 truncate">{u.displayName ?? u.email}</p>
              <p className="text-xs text-gray-400 truncate">{u.email}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-500">{formatLastSeen(u.lastSeen)}</p>
              {u.isOwner && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">בעלים</span>}
            </div>
          </div>
        ))}

        {activeTab === 'businesses' && businesses.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">אין עסקים רשומים עדיין</div>
        )}
        {activeTab === 'users' && users.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">אין משתמשים רשומים עדיין</div>
        )}
      </div>
    </div>
  );
}
