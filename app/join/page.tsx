'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getBusinessByInviteCode, joinBusinessAsEmployee } from '@/lib/firestore';
import { setUserBusiness } from '@/lib/users';

export default function JoinPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    if (!code.trim() || !user) return;
    setLoading(true);
    setError('');
    try {
      const business = await getBusinessByInviteCode(code.trim());
      if (!business) { setError('קוד לא נמצא. בדוק שהקוד נכון.'); setLoading(false); return; }
      await joinBusinessAsEmployee(business.id, {
        uid: user.uid,
        email: user.email ?? '',
        displayName: user.displayName,
      });
      await setUserBusiness(user.uid, business.id, 'employee');
      router.replace('/home');
    } catch {
      setError('שגיאה, נסה שוב');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 bg-violet-100 rounded-full blur-3xl opacity-30" />

      <div className="relative w-full max-w-sm">
        <div className="text-right mb-6 animate-slide-up">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200 mb-3">
            <span className="text-white text-xl">👥</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">הצטרפות לעסק</h1>
          <p className="text-gray-400 text-sm mt-1">הכנס את קוד ההצטרפות שקיבלת מהמנהל שלך</p>
        </div>

        <div className="glass-strong rounded-3xl p-5 space-y-4 animate-slide-up delay-100">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="הכנס קוד (6 תווים)"
            maxLength={6}
            className="w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-4 text-center text-2xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all font-mono"
          />

          {error && <p className="text-red-500 text-sm text-right animate-fade-in">{error}</p>}

          <button onClick={handleJoin} disabled={loading || code.length < 4}
            className="press w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-medium shadow-lg shadow-gray-900/20 disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
                מצטרף...
              </span>
            ) : 'הצטרף לעסק'}
          </button>

          <button onClick={() => router.push('/onboarding')} className="w-full text-center text-sm text-gray-400 py-1">
            פתח עסק חדש במקום
          </button>
        </div>
      </div>
    </div>
  );
}
