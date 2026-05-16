'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createBusiness } from '@/lib/firestore';
import { BusinessType, BUSINESS_TYPE_LABELS } from '@/types';

const TYPES: BusinessType[] = ['restaurant', 'cafe', 'supermarket', 'store', 'other'];

const TYPE_ICONS: Record<BusinessType, string> = {
  restaurant: '🍽️',
  cafe: '☕',
  supermarket: '🛒',
  store: '🏪',
  other: '📦',
};

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState<BusinessType>('restaurant');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!name.trim()) { setError('נא להזין שם עסק'); return; }
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      await createBusiness(user.uid, { name: name.trim(), type, branch: branch.trim() });
      router.replace('/home');
    } catch {
      setError('אירעה שגיאה, נסה שוב');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 bg-violet-100 rounded-full blur-3xl opacity-30" />

      <div className="relative w-full max-w-sm">
        <div className="text-right mb-6 animate-slide-up">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-200 mb-3">
            <span className="text-white text-xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ברוכים הבאים ל-Mlai</h1>
          <p className="text-gray-400 text-sm mt-1">בוא נגדיר את העסק שלך — לוקח שניות</p>
        </div>

        <div className="glass-strong rounded-3xl p-5 space-y-5 animate-slide-up delay-100">
          {/* Business name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">שם העסק *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='למשל: "מני ובניו"'
              className="w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-3.5 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all text-sm"
            />
          </div>

          {/* Business type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">סוג עסק</label>
            <div className="flex flex-wrap gap-2 justify-end">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`press flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm border transition-all duration-200 ${
                    type === t
                      ? 'bg-gray-900 text-white border-gray-900 shadow-md shadow-gray-900/15'
                      : 'bg-white/70 text-gray-600 border-gray-200'
                  }`}
                >
                  <span>{TYPE_ICONS[t]}</span>
                  <span>{BUSINESS_TYPE_LABELS[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-2">
              סניף / עיר <span className="text-gray-400 font-normal">(אופציונלי)</span>
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder='למשל: "תל אביב"'
              className="w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-3.5 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600 text-right animate-fade-in">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="press w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-medium shadow-lg shadow-gray-900/20 disabled:opacity-50 transition-opacity"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
                יוצר...
              </span>
            ) : 'יצירת עסק →'}
          </button>
        </div>
      </div>
    </div>
  );
}
