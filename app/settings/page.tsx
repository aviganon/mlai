'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useIsOwner } from '@/hooks/useIsOwner';
import { signOutUser } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';

export default function SettingsPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { isOwner } = useIsOwner();
  const router = useRouter();
  const isBusinessOwner = business?.ownerId === user?.uid;

  async function handleSignOut() {
    await signOutUser();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 animate-slide-down">
        {/* Top bar: business name (right) + lang/logout (left) */}
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

        {/* Admin - system owner only */}
        {isOwner && (
          <button onClick={() => router.push('/admin')}
            className="press w-full bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-indigo-600 text-sm font-semibold">פאנל בעלים →</span>
            <span className="text-xl">🛡️</span>
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
