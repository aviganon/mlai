'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { signOutUser } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';

export default function SettingsPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const router = useRouter();

  async function handleSignOut() {
    await signOutUser();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <h1 className="text-xl font-semibold text-right">הגדרות</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <p className="text-sm text-gray-500 text-right">עסק</p>
          <p className="font-medium text-right">{business?.name ?? '—'}</p>
          {business?.branch && <p className="text-sm text-gray-400 text-right">{business.branch}</p>}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-2">
          <p className="text-sm text-gray-500 text-right">חשבון</p>
          <p className="text-sm text-right">{user?.email}</p>
        </div>

        <button
          onClick={handleSignOut}
          className="w-full bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl text-sm"
        >
          התנתקות
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
