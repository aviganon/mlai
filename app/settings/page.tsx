'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useIsOwner } from '@/hooks/useIsOwner';
import { signOutUser } from '@/lib/auth';
import { getAllBusinesses, adminDeleteBusiness, adminUpdateBusiness, updateBusinessInvoiceEmail } from '@/lib/firestore';
import { createBusiness, createPendingUser, addPendingMember } from '@/lib/adminFirestore';
import { getAllUsers } from '@/lib/users';
import { setUserOwner } from '@/lib/userOwner';
import { getDomains, addDomain, deleteDomain, DEFAULT_DOMAINS } from '@/lib/domains';
import { BottomNav } from '@/components/BottomNav';
import { Business, MlaiUser, Domain, UNITS } from '@/types';

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
  const [activeTab, setActiveTab] = useState<'businesses' | 'users' | 'domains'>('businesses');
  const [activeBizId, setActiveBizId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActiveBizId(localStorage.getItem('impersonateBusinessId'));
    }
  }, []);

  // Business detail panel
  const [selectedBiz, setSelectedBiz] = useState<Business | null>(null);
  const [panelInvoiceEmail, setPanelInvoiceEmail] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [panelEditName, setPanelEditName] = useState('');
  const [panelEditingName, setPanelEditingName] = useState(false);
  const [panelConfirmDelete, setPanelConfirmDelete] = useState(false);

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
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'owner' | 'employee'>('employee');
  const [newUserBusinessId, setNewUserBusinessId] = useState<string>('');
  const [newUserIsOwner, setNewUserIsOwner] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState(false);
  const [addUserSuccess, setAddUserSuccess] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Domains state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [confirmDeleteDomain, setConfirmDeleteDomain] = useState<string | null>(null);
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  const [newDomainIcon, setNewDomainIcon] = useState('📦');
  const [newDomainCategories, setNewDomainCategories] = useState('');
  const [savingDomain, setSavingDomain] = useState(false);
  const [seedingDomains, setSeedingDomains] = useState(false);
  // Category editing
  const [inlineEditKey, setInlineEditKey] = useState<string | null>(null); // "domainId:catIdx"
  const [inlineEditVal, setInlineEditVal] = useState('');
  const [addCatInput, setAddCatInput] = useState<Record<string, string>>({});
  const [savingCatDomain, setSavingCatDomain] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || ownerLoading) return;
    if (!user || !isOwner) return;
    setAdminLoading(true);
    Promise.all([getAllBusinesses(), getAllUsers(), getDomains()]).then(([b, u, d]) => {
      setBusinesses(b);
      setUsers(u);
      setDomains(d);
      setAdminLoading(false);
    });
  }, [user, isOwner, authLoading, ownerLoading]);

  async function handleSignOut() {
    await signOutUser();
    router.replace('/login');
  }

  async function handleSetOwner(uid: string, val: boolean) {
    await setUserOwner(uid, val);
    setUsers((prev) => prev.map((u) => u.uid === uid ? { ...u, isOwner: val } : u));
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
    if (!newUserEmail.trim() || !newUserDisplayName.trim()) return;
    setAddUserLoading(true);
    try {
      const uid = await createPendingUser({
        email: newUserEmail.trim(),
        displayName: newUserDisplayName.trim(),
        role: newUserRole,
        businessId: newUserBusinessId || null,
        isOwner: newUserIsOwner,
      });
      if (newUserBusinessId && newUserRole === 'employee') {
        await addPendingMember(newUserBusinessId, newUserEmail.trim());
      }
      const newUser: MlaiUser = {
        uid,
        email: newUserEmail.trim(),
        displayName: newUserDisplayName.trim(),
        isOwner: newUserIsOwner,
        businessId: newUserBusinessId || null,
        role: newUserRole,
      } as MlaiUser;
      setUsers((prev) => [newUser, ...prev]);
      const link = `https://mlai.galis.app/join?email=${encodeURIComponent(newUserEmail.trim())}`;
      setInviteLink(link);
      setAddUserSuccess(true);
      setTimeout(() => {
        setAddUserSuccess(false);
        setInviteLink('');
        setLinkCopied(false);
        setShowAddUser(false);
        setNewUserEmail('');
        setNewUserDisplayName('');
        setNewUserRole('employee');
        setNewUserBusinessId('');
        setNewUserIsOwner(false);
      }, 5000);
    } finally {
      setAddUserLoading(false);
    }
  }

  function handleImpersonate(biz: Business) {
    localStorage.setItem('impersonateBusinessId', biz.id);
    setActiveBizId(biz.id);
    router.push('/home');
  }

  function openBizPanel(biz: Business) {
    setSelectedBiz(biz);
    setPanelInvoiceEmail(biz.invoiceEmail ?? '');
    setPanelEditName(biz.name);
    setPanelEditingName(false);
    setPanelConfirmDelete(false);
  }

  async function handleSaveInvoiceEmail() {
    if (!selectedBiz) return;
    setSavingEmail(true);
    await updateBusinessInvoiceEmail(selectedBiz.id, panelInvoiceEmail.trim());
    setBusinesses((prev) =>
      prev.map((b) => b.id === selectedBiz.id ? { ...b, invoiceEmail: panelInvoiceEmail.trim() } : b)
    );
    setSelectedBiz((b) => b ? { ...b, invoiceEmail: panelInvoiceEmail.trim() } : b);
    setSavingEmail(false);
  }

  async function handlePanelSaveName() {
    if (!selectedBiz || !panelEditName.trim()) return;
    await adminUpdateBusiness(selectedBiz.id, { name: panelEditName.trim() });
    setBusinesses((prev) =>
      prev.map((b) => b.id === selectedBiz.id ? { ...b, name: panelEditName.trim() } : b)
    );
    setSelectedBiz((b) => b ? { ...b, name: panelEditName.trim() } : b);
    setPanelEditingName(false);
  }

  async function handlePanelDelete() {
    if (!selectedBiz) return;
    await adminDeleteBusiness(selectedBiz.id);
    setBusinesses((prev) => prev.filter((b) => b.id !== selectedBiz.id));
    setUsers((prev) => prev.map((u) => u.businessId === selectedBiz.id ? { ...u, businessId: null } : u));
    setSelectedBiz(null);
    setPanelConfirmDelete(false);
  }

  // Domain handlers
  async function handleSeedDomains() {
    setSeedingDomains(true);
    for (const d of DEFAULT_DOMAINS) {
      await addDomain(d);
    }
    const updated = await getDomains();
    setDomains(updated);
    setSeedingDomains(false);
  }

  async function handleAddDomain() {
    if (!newDomainName.trim()) return;
    setSavingDomain(true);
    const cats = newDomainCategories.split(',').map((c) => c.trim()).filter(Boolean);
    await addDomain({
      name: newDomainName.trim(),
      icon: newDomainIcon,
      categories: cats.length ? cats : ['כללי', 'אחר'],
      units: UNITS,
      isDefault: false,
    });
    const updated = await getDomains();
    setDomains(updated);
    setNewDomainName('');
    setNewDomainIcon('📦');
    setNewDomainCategories('');
    setShowAddDomain(false);
    setSavingDomain(false);
  }

  async function handleDeleteDomain(id: string) {
    await deleteDomain(id);
    setDomains((prev) => prev.filter((d) => d.id !== id));
    setConfirmDeleteDomain(null);
  }

  async function handleDeleteCategory(domainId: string, catIdx: number) {
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) return;
    const updated = domain.categories.filter((_, i) => i !== catIdx);
    setSavingCatDomain(domainId);
    await setDoc(doc(db, 'domains', domainId), { categories: updated }, { merge: true });
    setDomains((prev) => prev.map((d) => d.id === domainId ? { ...d, categories: updated } : d));
    setSavingCatDomain(null);
  }

  async function handleSaveCatEdit(domainId: string, catIdx: number) {
    const newVal = inlineEditVal.trim();
    if (!newVal) { setInlineEditKey(null); return; }
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) return;
    const updated = domain.categories.map((c, i) => (i === catIdx ? newVal : c));
    setSavingCatDomain(domainId);
    await setDoc(doc(db, 'domains', domainId), { categories: updated }, { merge: true });
    setDomains((prev) => prev.map((d) => d.id === domainId ? { ...d, categories: updated } : d));
    setInlineEditKey(null);
    setSavingCatDomain(null);
  }

  async function handleAddCategory(domainId: string) {
    const input = (addCatInput[domainId] ?? '').trim();
    if (!input) return;
    const domain = domains.find((d) => d.id === domainId);
    if (!domain) return;
    const updated = [...domain.categories, input];
    setSavingCatDomain(domainId);
    await setDoc(doc(db, 'domains', domainId), { categories: updated }, { merge: true });
    setDomains((prev) => prev.map((d) => d.id === domainId ? { ...d, categories: updated } : d));
    setAddCatInput((prev) => ({ ...prev, [domainId]: '' }));
    setSavingCatDomain(null);
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
        <div className="glass-strong sticky top-0 z-10 px-4 pt-8 pb-4 animate-slide-down">
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
            {(['businesses', 'users', 'domains'] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`press flex-1 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === tab ? 'bg-gray-900 text-white shadow-md shadow-gray-900/15' : 'glass text-gray-600'}`}>
                {tab === 'businesses'
                  ? `עסקים (${businesses.length})`
                  : tab === 'users'
                  ? `משתמשים (${users.length})`
                  : `תחומים (${domains.length})`}
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
                    const isActive = activeBizId === biz.id;
                    return (
                      <div
                        key={biz.id}
                        className="w-full glass-strong rounded-3xl p-5 text-right animate-fade-in"
                      >
                        {/* Tappable info area opens the detail panel */}
                        <button
                          type="button"
                          onClick={() => openBizPanel(biz)}
                          className="w-full text-right"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {owner && (
                                <div className={`w-2.5 h-2.5 rounded-full ${isOnline(owner.lastSeen) ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                              )}
                              <span className="text-gray-300 text-sm">‹</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 justify-end">
                                <p className="font-bold text-gray-900 truncate">{biz.name}</p>
                                {isActive && (
                                  <span className="flex-shrink-0 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">פעיל ✓</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {(biz as unknown as Record<string, unknown>).domain as string ?? biz.type}
                              </p>
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                {owner?.displayName ?? owner?.email ?? biz.ownerId}
                              </p>
                              {biz.invoiceEmail && (
                                <p className="text-xs text-indigo-400 mt-0.5 truncate">📧 {biz.invoiceEmail}</p>
                              )}
                            </div>
                          </div>
                        </button>

                        {/* Footer row: last-seen + manage button */}
                        <div className="flex items-center justify-between mt-3">
                          {owner
                            ? <p className="text-xs text-gray-400">{formatLastSeen(owner.lastSeen)}</p>
                            : <span />
                          }
                          <button
                            type="button"
                            onClick={() => handleImpersonate(biz)}
                            className={`press px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                : 'bg-indigo-600 text-white'
                            }`}
                          >
                            {isActive ? 'פעיל ✓' : 'נהל עסק זה'}
                          </button>
                        </div>
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
                        <div className="space-y-3 animate-scale-in">
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                            <p className="text-sm text-emerald-700 font-medium">✅ המשתמש נוצר בהצלחה</p>
                          </div>
                          <div className="bg-white/80 border border-gray-200 rounded-xl p-3 space-y-2">
                            <p className="text-xs text-gray-500 font-medium text-right">קישור הזמנה:</p>
                            <p className="text-xs text-indigo-600 break-all text-right font-mono bg-indigo-50 rounded-lg px-2 py-1.5 select-all">{inviteLink}</p>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(inviteLink);
                                setLinkCopied(true);
                              }}
                              className="press w-full py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
                            >
                              {linkCopied ? '✅ הועתק!' : '📋 העתק קישור'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <input
                              required
                              type="text"
                              value={newUserDisplayName}
                              onChange={(e) => setNewUserDisplayName(e.target.value)}
                              placeholder="שם מלא *"
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
                            />
                            <input
                              required
                              type="email"
                              value={newUserEmail}
                              onChange={(e) => setNewUserEmail(e.target.value)}
                              placeholder="כתובת אימייל *"
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
                            />
                            <select
                              value={newUserRole}
                              onChange={(e) => setNewUserRole(e.target.value as 'owner' | 'employee')}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70 appearance-none"
                              dir="rtl"
                            >
                              <option value="owner">בעלים</option>
                              <option value="employee">עובד</option>
                            </select>
                            <select
                              value={newUserBusinessId}
                              onChange={(e) => setNewUserBusinessId(e.target.value)}
                              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70 appearance-none"
                              dir="rtl"
                            >
                              <option value="">ללא שיוך לעסק</option>
                              {businesses.map((biz) => (
                                <option key={biz.id} value={biz.id}>{biz.name}</option>
                              ))}
                            </select>
                            <label className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white/70 border border-gray-200 rounded-xl cursor-pointer">
                              <span className="text-sm text-gray-700">הרשאות בעלים במערכת</span>
                              <input
                                type="checkbox"
                                checked={newUserIsOwner}
                                onChange={(e) => setNewUserIsOwner(e.target.checked)}
                                className="w-4 h-4 accent-indigo-600 rounded"
                              />
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddUser(false);
                                setNewUserEmail('');
                                setNewUserDisplayName('');
                                setNewUserRole('employee');
                                setNewUserBusinessId('');
                                setNewUserIsOwner(false);
                              }}
                              className="press flex-1 py-2.5 rounded-xl glass text-xs text-gray-600"
                            >
                              ביטול
                            </button>
                            <button
                              type="submit"
                              disabled={addUserLoading || !newUserEmail.trim() || !newUserDisplayName.trim()}
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

              {/* Domains tab */}
              {activeTab === 'domains' && (
                <>
                  {domains.length === 0 && (
                    <div className="glass rounded-2xl p-5 text-center space-y-3">
                      <p className="text-gray-400 text-sm">אין תחומים. טען את ברירות המחדל:</p>
                      <button
                        onClick={handleSeedDomains}
                        disabled={seedingDomains}
                        className="press bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-medium"
                      >
                        {seedingDomains ? 'טוען...' : '⚡ טען תחומי ברירת מחדל'}
                      </button>
                    </div>
                  )}

                  {domains.map((d) => (
                    <div key={d.id} className="glass rounded-2xl p-4 animate-fade-in space-y-3">
                      {/* Domain header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {!d.isDefault && (
                            <button
                              onClick={() => setConfirmDeleteDomain(d.id)}
                              className="press text-red-400 text-xs border border-red-100 bg-red-50 px-2.5 py-1 rounded-xl"
                            >
                              מחק
                            </button>
                          )}
                          {savingCatDomain === d.id && (
                            <span className="text-[10px] text-indigo-400 font-medium">שומר...</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900 text-sm">{d.name}</p>
                            <p className="text-xs text-gray-400">{d.categories.length} קטגוריות</p>
                          </div>
                          <span className="text-2xl">{d.icon}</span>
                        </div>
                      </div>

                      {/* Category chips */}
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {d.categories.map((cat, idx) => {
                          const editKey = `${d.id}:${idx}`;
                          const isEditing = inlineEditKey === editKey;
                          return isEditing ? (
                            <div key={editKey} className="flex items-center gap-1">
                              <button
                                onClick={() => setInlineEditKey(null)}
                                className="press text-[10px] text-gray-400 px-1.5 py-0.5 rounded-lg glass"
                              >
                                ✕
                              </button>
                              <button
                                onClick={() => handleSaveCatEdit(d.id, idx)}
                                className="press text-[10px] text-white bg-indigo-600 px-2 py-0.5 rounded-lg"
                              >
                                ✓
                              </button>
                              <input
                                autoFocus
                                value={inlineEditVal}
                                onChange={(e) => setInlineEditVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveCatEdit(d.id, idx);
                                  if (e.key === 'Escape') setInlineEditKey(null);
                                }}
                                className="border border-indigo-300 rounded-lg px-2 py-0.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white w-24"
                                dir="rtl"
                              />
                            </div>
                          ) : (
                            <span
                              key={cat + idx}
                              className="group flex items-center gap-0.5 text-[11px] bg-gray-100 text-gray-700 pl-1 pr-2 py-0.5 rounded-full"
                            >
                              <button
                                onClick={() => handleDeleteCategory(d.id, idx)}
                                className="press opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400 text-[10px] leading-none w-3.5 h-3.5 flex items-center justify-center"
                                aria-label="מחק קטגוריה"
                              >
                                ✕
                              </button>
                              <button
                                onClick={() => {
                                  setInlineEditKey(`${d.id}:${idx}`);
                                  setInlineEditVal(cat);
                                }}
                                className="press"
                              >
                                {cat}
                              </button>
                            </span>
                          );
                        })}
                      </div>

                      {/* Add category input */}
                      <div className="flex gap-2 items-center" dir="rtl">
                        <button
                          onClick={() => handleAddCategory(d.id)}
                          disabled={!(addCatInput[d.id] ?? '').trim() || savingCatDomain === d.id}
                          className="press text-xs font-semibold text-white bg-indigo-600 px-3 py-1.5 rounded-xl disabled:opacity-40 flex-shrink-0"
                        >
                          הוסף
                        </button>
                        <input
                          type="text"
                          value={addCatInput[d.id] ?? ''}
                          onChange={(e) => setAddCatInput((prev) => ({ ...prev, [d.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(d.id); }}
                          placeholder="+ הוסף קטגוריה"
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
                          dir="rtl"
                        />
                      </div>

                      {/* Delete confirm */}
                      {confirmDeleteDomain === d.id && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 animate-scale-in">
                          <button onClick={() => setConfirmDeleteDomain(null)} className="press flex-1 py-1.5 rounded-xl border border-gray-200 text-xs bg-white">ביטול</button>
                          <button onClick={() => handleDeleteDomain(d.id)} className="press flex-1 py-1.5 rounded-xl bg-red-500 text-white text-xs">מחק</button>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add domain */}
                  {!showAddDomain ? (
                    <button
                      onClick={() => setShowAddDomain(true)}
                      className="press w-full glass rounded-2xl py-4 text-sm font-medium text-indigo-500"
                    >
                      + הוסף תחום חדש
                    </button>
                  ) : (
                    <div className="glass rounded-2xl p-4 space-y-3 animate-scale-in">
                      <p className="text-sm font-semibold text-gray-900 text-right">תחום חדש</p>
                      <div className="flex gap-2">
                        <input
                          value={newDomainIcon}
                          onChange={(e) => setNewDomainIcon(e.target.value)}
                          className="w-14 border border-gray-200 rounded-xl px-2 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          placeholder="📦"
                        />
                        <input
                          value={newDomainName}
                          onChange={(e) => setNewDomainName(e.target.value)}
                          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          placeholder="שם התחום"
                        />
                      </div>
                      <textarea
                        value={newDomainCategories}
                        onChange={(e) => setNewDomainCategories(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-right text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none h-20"
                        placeholder="קטגוריות מופרדות בפסיקים: בגדים, נעליים, אביזרים"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddDomain(false)}
                          className="press flex-1 py-2.5 rounded-xl glass text-sm"
                        >
                          ביטול
                        </button>
                        <button
                          onClick={handleAddDomain}
                          disabled={savingDomain || !newDomainName.trim()}
                          className="press flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium disabled:opacity-50"
                        >
                          {savingDomain ? 'שומר...' : 'הוסף תחום'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <BottomNav />

        {/* Business Detail Panel */}
        {selectedBiz && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedBiz(null); }}
          >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedBiz(null)} />
            <div className="relative w-full max-w-lg glass-strong rounded-t-3xl px-5 pt-5 pb-10 animate-slide-up shadow-2xl max-h-[85vh] overflow-y-auto">
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-gray-300 mx-auto mb-5" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5" dir="rtl">
                <button
                  onClick={() => setSelectedBiz(null)}
                  className="press w-8 h-8 rounded-xl glass flex items-center justify-center text-gray-400 text-sm"
                >
                  ✕
                </button>
                <h2 className="text-lg font-bold text-gray-900 truncate flex-1 text-right mr-3">{selectedBiz.name}</h2>
              </div>

              <div className="space-y-4" dir="rtl">
                {/* Business info */}
                <div className="glass rounded-2xl p-4 space-y-1">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">פרטי עסק</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm text-gray-500">סוג</span>
                    <span className="text-sm font-medium text-gray-900">{(selectedBiz as unknown as Record<string, unknown>).domain as string ?? selectedBiz.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">בעלים</span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[60%]">
                      {users.find((u) => u.uid === selectedBiz.ownerId)?.displayName
                        ?? users.find((u) => u.uid === selectedBiz.ownerId)?.email
                        ?? selectedBiz.ownerId}
                    </span>
                  </div>
                  {selectedBiz.branch && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">סניף</span>
                      <span className="text-sm font-medium text-gray-900">{selectedBiz.branch}</span>
                    </div>
                  )}
                </div>

                {/* Edit name */}
                <div className="glass rounded-2xl p-4 space-y-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">שם עסק</p>
                  {panelEditingName ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPanelEditingName(false)}
                        className="press py-2 px-3 rounded-xl glass text-xs text-gray-600"
                      >
                        ביטול
                      </button>
                      <button
                        onClick={handlePanelSaveName}
                        className="press py-2 px-3 rounded-xl bg-gray-900 text-white text-xs font-medium"
                      >
                        שמור
                      </button>
                      <input
                        autoFocus
                        value={panelEditName}
                        onChange={(e) => setPanelEditName(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white/70"
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => setPanelEditingName(true)}
                        className="press text-xs text-indigo-600 font-medium glass rounded-xl px-3 py-1.5"
                      >
                        ✏️ ערוך
                      </button>
                      <p className="text-sm font-semibold text-gray-900">{selectedBiz.name}</p>
                    </div>
                  )}
                </div>

                {/* Invoice email section */}
                <div className="glass rounded-2xl p-4 space-y-3">
                  <div className="text-right">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">חשבוניות במייל</p>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      שלח חשבוניות ספקים לכתובת זו — המערכת תעדכן את המלאי אוטומטית
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">כתובת מייל לחשבוניות</label>
                    <input
                      type="email"
                      value={panelInvoiceEmail}
                      onChange={(e) => setPanelInvoiceEmail(e.target.value)}
                      placeholder="invoices@example.com"
                      className="w-full bg-white/70 border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all"
                      dir="ltr"
                    />
                  </div>
                  <button
                    onClick={handleSaveInvoiceEmail}
                    disabled={savingEmail}
                    className="press w-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white py-2.5 rounded-xl text-sm font-semibold shadow-md disabled:opacity-50"
                  >
                    {savingEmail ? 'שומר...' : 'שמור כתובת מייל'}
                  </button>
                </div>

                {/* Manage / impersonate */}
                <button
                  onClick={() => handleImpersonate(selectedBiz)}
                  className={`press w-full py-3 rounded-2xl text-sm font-semibold transition-all ${
                    activeBizId === selectedBiz.id
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-300/30'
                  }`}
                >
                  {activeBizId === selectedBiz.id ? 'פעיל ✓ — נהל עסק זה' : 'נהל עסק זה'}
                </button>

                {/* Delete */}
                {!panelConfirmDelete ? (
                  <button
                    onClick={() => setPanelConfirmDelete(true)}
                    className="press w-full py-3 rounded-2xl bg-red-50 border border-red-100 text-red-500 text-sm font-medium"
                  >
                    🗑 מחק עסק
                  </button>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3 animate-scale-in">
                    <p className="text-sm text-red-700 font-medium text-right">
                      למחוק את &quot;{selectedBiz.name}&quot; וכל הפריטים שלו?
                      <span className="block text-xs font-normal text-red-400 mt-0.5">פעולה זו לא ניתנת לביטול</span>
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setPanelConfirmDelete(false)} className="press flex-1 py-2.5 rounded-xl border border-gray-200 bg-white text-xs">ביטול</button>
                      <button onClick={handlePanelDelete} className="press flex-1 py-2.5 rounded-xl bg-red-500 text-white text-xs font-semibold">מחק לצמיתות</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ──────────────── REGULAR USER VIEW ──────────────── */
  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-10 px-4 pt-8 pb-4 animate-slide-down">
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
      </div>

      <BottomNav />
    </div>
  );
}
