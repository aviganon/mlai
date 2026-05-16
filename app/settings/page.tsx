'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useIsOwner } from '@/hooks/useIsOwner';
import { signOutUser } from '@/lib/auth';
import { getAllBusinesses, adminDeleteBusiness, adminUpdateBusiness } from '@/lib/firestore';
import { createBusiness, createPendingUser } from '@/lib/adminFirestore';
import { getAllUsers } from '@/lib/users';
import { setUserOwner } from '@/lib/userOwner';
import { BottomNav } from '@/components/BottomNav';
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

const BUSINESS_TYPES = ['מסעדה', 'קפה', 'סופרמרקט', 'חנות', 'אחר'];

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { business } = useBusiness();
  const { isOwner, loading: ownerLoading } = useIsOwner();
  const router = useRouter();
  const isBusinessOwner = business?.ownerId === user?.uid;

  // Admin state
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<MlaiUser[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'businesses' | 'users'>('businesses');

  // Add Business form
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [newBizName, setNewBizName] = useState('');
  const [newBizType, setNewBizType] = useState('מסעדה');
  const [newBizManager, setNewBizManager] = useState('');
  const [newBizBranch, setNewBizBranch] = useState('');
  const [addBizLoading, setAddBizLoading] = useState(false);

  // Add User form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserSuccess, setAddUserSuccess] = useState(false);

  useEffect(() => {
    if (authLoading || ownerLoading) return;
    if (!user || !isOwner) return;
    setAdminLoading(true);
    Promise.all([getAllBusinesses(), getAllUsers()]).then(([b, u]) => {
      setBusinesses(b);
      setUsers(u);
      setAdminLoading(false);
    });
  }, [user, isOwner, authLoading, ownerLoading]);

  async function handleSignOut() {
    await signOutUser();
    router.replace('/login');
  }

  async function handleDelete(id: string) {
    await adminDeleteBusiness(id);
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
    setConfirmDelete(null);
    setUsers((prev) => prev.map((u) => u.businessId === id ? { ...u, businessId: null } : u));
  }

  async function handleSetOwner(uid: string, val: boolean) {
    await setUserOwner(uid, val);
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, isOwner: val } : u));
  }

  async function handleSaveName(id: string) {
    if (!editName.trim()) return;
    await adminUpdateBusiness(id, { name: editName.trim() });
    setBusinesses((prev) => prev.map((b) => b.id === id ? { ...b, name: editName.trim() } : b));
    setEditId(null);
  }

  async function handleAddBusiness(e: React.FormEvent) {
    e.preventDefault();
    if (!newBizName.trim()) return;
    setAddBizLoading(true);
    try {
      const id = await createBusiness({
        name: newBizName.trim(),
        type: newBizType,
        ownerId: user?.uid ?? 'admin-created',
        branch: newBizBranch.trim() || undefined,
        managerInfo: newBizManager.trim() || undefined,
      });
      const newBiz: Business = {
        id,
        name: newBizName.trim(),
        type: newBizType,
        ownerId: user?.uid ?? 'admin-created',
        branch: newBizBranch.trim() || undefined,
      } as Business;
      setBusinesses((prev) => [newBiz, ...prev]);
      setShowAddBusiness(false);
      setNewBizName('');
      setNewBizType('מסעדה');
      setNewBizManager('');
      setNewBizBranch('');
    } finally {
      setAddBizLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!newUserEmail.trim()) return;
    setAddUserLoading(true);
    try {
      const uid = await createPendingUser(newUserEmail.trim());
      const newUser: MlaiUser = {
        uid,
        email: newUserEmail.trim(),
        displayName: newUserEmail.trim().split('@')[0],
        isOwner: false,
        businessId: null,
        role: 'owner',
      } as MlaiUser;
      setUsers((prev) => [newUser, ...prev]);
      setAddUserSuccess(true);
      setNewUserEmail('');
      setTimeout(() => {
        setAddUserSuccess(false);
        setShowAddUser(false);
      }, 2500);
    } finally {
      setAddUserLoading(false);
    }
  }

  function handleImpersonate(biz: Business) {
    localStorage.setItem('mlaiImpersonating', JSON.stringify({
      businessId: biz.id,
      businessName: biz.name,
    }));
    router.push('/home');
  }

  // While auth/owner status resolves, show nothing special
  if (authLoading || ownerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
      </div>
    );
  }

  /* ──────────────── OWNER VIEW ──────────────── */
  if (isOwner) {
    const onlineCount = users.filter((u) => isOnline(u.lastSeen)).length;

    return (
      <div className="min-h-screen pb-28">
        {/* Header */}
        <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 animate-slide-down">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold text-gray-900 truncate max-w-[55%]">{business?.name ?? '—'}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 glass rounded-lg px-2 py-1 select-none">עב</span>
              <button
                onClick={handleSignOut}
                className="press flex items-center gap-1 text-sm text-gray-500 glass rounded-xl px-3 py-1.5"
              >
                יציאה
              </button>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-xl font-bold text-gray-900">פאנל ניהול</h1>
            {!adminLoading && (
              <p className="text-xs text-gray-400">
                {businesses.length} עסקים · {users.length} משתמשים ·{' '}
                <span className="text-emerald-500 font-medium">{onlineCount} מחוברים</span>
              </p>
            )}
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
          {adminLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
            </div>
          ) : (
            <>
              {/* Domains link */}
              <button onClick={() => router.push('/admin/domains')}
                className="press w-full glass rounded-2xl p-4 flex items-center justify-between">
                <span className="text-indigo-500 font-medium text-sm">ניהול תחומים →</span>
                <span className="text-2xl">🗂️</span>
              </button>

              {/* Businesses tab */}
              {activeTab === 'businesses' && (
                <>
                  {/* Add Business button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setShowAddBusiness((v) => !v); setShowAddUser(false); }}
                      className="press flex items-center gap-1.5 text-xs font-semibold text-indigo-600 glass border border-indigo-200 rounded-xl px-3 py-2"
                    >
                      <span className="text-base leading-none">+</span>
                      <span>הוסף עסק</span>
                    </button>
                  </div>

                  {/* Inline Add Business Form */}
                  {showAddBusiness && (
                    <form
                      onSubmit={handleAddBusiness}
                      className="glass rounded-2xl p-4 space-y-3 animate-scale-in border border-indigo-100"
                    >
                      <p className="text-sm font-semibold text-gray-900 text-right">עסק חדש</p>

                      <div className="space-y-2">
                        <input
                          required
                          type="text"
                          value={newBizName}
                          onChange={(e) => setNewBizName(e.target.value)}
                          placeholder="שם עסק *"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
                        />
                        <select
                          value={newBizType}
                          onChange={(e) => setNewBizType(e.target.value)}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70 appearance-none"
                          dir="rtl"
                        >
                          {BUSINESS_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={newBizManager}
                          onChange={(e) => setNewBizManager(e.target.value)}
                          placeholder="שם מנהל / אימייל (לתצוגה בלבד)"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
                        />
                        <input
                          type="text"
                          value={newBizBranch}
                          onChange={(e) => setNewBizBranch(e.target.value)}
                          placeholder="כתובת / סניף"
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddBusiness(false)}
                          className="press flex-1 py-2.5 rounded-xl glass text-xs text-gray-600"
                        >
                          ביטול
                        </button>
                        <button
                          type="submit"
                          disabled={addBizLoading || !newBizName.trim()}
                          className="press flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
                        >
                          {addBizLoading ? '...' : 'צור עסק'}
                        </button>
                      </div>
                    </form>
                  )}

                  {businesses.map((biz) => {
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
                              <button
                                onClick={() => handleImpersonate(biz)}
                                className="press flex-1 py-2 rounded-xl glass text-xs font-medium text-amber-600 border border-amber-100"
                              >
                                👁 הצג כמנהל
                              </button>
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

                  {businesses.length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm">אין עסקים רשומים עדיין</div>
                  )}
                </>
              )}

              {/* Users tab */}
              {activeTab === 'users' && (
                <>
                  {/* Add User button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => { setShowAddUser((v) => !v); setShowAddBusiness(false); }}
                      className="press flex items-center gap-1.5 text-xs font-semibold text-indigo-600 glass border border-indigo-200 rounded-xl px-3 py-2"
                    >
                      <span className="text-base leading-none">+</span>
                      <span>הוסף משתמש</span>
                    </button>
                  </div>

                  {/* Inline Add User Form */}
                  {showAddUser && (
                    <form
                      onSubmit={handleAddUser}
                      className="glass rounded-2xl p-4 space-y-3 animate-scale-in border border-indigo-100"
                    >
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">הוסף משתמש חדש</p>
                        <p className="text-xs text-gray-400 mt-0.5">שלוח קישור כניסה למשתמש חדש</p>
                      </div>

                      {addUserSuccess ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center animate-scale-in">
                          <p className="text-sm text-emerald-700 font-medium">✅ המשתמש נוצר בהצלחה</p>
                        </div>
                      ) : (
                        <>
                          <input
                            required
                            type="email"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="כתובת אימייל"
                            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setShowAddUser(false); setNewUserEmail(''); }}
                              className="press flex-1 py-2.5 rounded-xl glass text-xs text-gray-600"
                            >
                              ביטול
                            </button>
                            <button
                              type="submit"
                              disabled={addUserLoading || !newUserEmail.trim()}
                              className="press flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
                            >
                              {addUserLoading ? '...' : 'צור פרופיל'}
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  )}

                  {users.map((u) => (
                    <div key={u.uid} className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isOnline(u.lastSeen) ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-sm font-medium text-gray-900 truncate">{u.displayName ?? u.email}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatLastSeen(u.lastSeen)}</p>
                          {u.isOwner && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">בעלים</span>
                          )}
                        </div>
                        {u.isOwner && u.uid === user?.uid ? (
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-medium">אתה</span>
                        ) : u.isOwner ? (
                          <button
                            onClick={() => handleSetOwner(u.uid, false)}
                            className="press px-2 py-1 text-xs rounded-lg bg-red-50 text-red-500 border border-red-100"
                          >
                            הסר בעלות
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSetOwner(u.uid, true)}
                            className="press px-2 py-1 text-xs rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200"
                          >
                            הפוך לבעלים
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {users.length === 0 && (
                    <div className="text-center py-12 text-gray-400 text-sm">אין משתמשים רשומים עדיין</div>
                  )}
                </>
              )}

              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="press w-full bg-white/70 border border-red-100 text-red-500 py-4 rounded-2xl text-sm font-medium transition-all"
              >
                התנתקות
              </button>
            </>
          )}
        </div>

        <BottomNav />
      </div>
    );
  }

  /* ──────────────── REGULAR USER VIEW ──────────────── */
  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 animate-slide-down">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-900 truncate max-w-[55%]">{business?.name ?? '—'}</p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 glass rounded-lg px-2 py-1 select-none">עב</span>
            <button
              onClick={handleSignOut}
              className="press flex items-center gap-1 text-sm text-gray-500 glass rounded-xl px-3 py-1.5"
            >
              יציאה
            </button>
          </div>
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-right">הגדרות</h1>
      </div>

      <div className="px-4 py-4 space-y-3 animate-slide-up">
        {/* Business card */}
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base">🏪</span>
            </div>
            <div className="text-right flex-1">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">העסק שלך</p>
              <p className="font-semibold text-gray-900 mt-0.5">{business?.name ?? '—'}</p>
              {business?.branch && <p className="text-sm text-gray-400">{business.branch}</p>}
            </div>
          </div>
        </div>

        {/* Account card */}
        <div className="glass rounded-3xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-500 text-base">👤</span>
            </div>
            <div className="text-right flex-1 min-w-0">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">חשבון Google</p>
              <p className="text-sm text-gray-700 mt-0.5 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Version */}
        <div className="glass rounded-3xl p-4 text-center">
          <p className="text-xs text-gray-400">Mlai · גרסה 2.0</p>
        </div>

        {/* Team - business owner only */}
        {isBusinessOwner && (
          <button onClick={() => router.push('/home/team')}
            className="press w-full glass rounded-2xl p-4 flex items-center justify-between">
            <span className="text-indigo-500 text-sm font-medium">ניהול צוות →</span>
            <span className="text-xl">👥</span>
          </button>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="press w-full bg-white/70 border border-red-100 text-red-500 py-4 rounded-2xl text-sm font-medium transition-all"
        >
          התנתקות
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
