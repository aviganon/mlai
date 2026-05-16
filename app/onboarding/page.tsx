'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createBusiness } from '@/lib/firestore';
import { BusinessType, BUSINESS_TYPE_LABELS } from '@/types';

const TYPES: BusinessType[] = ['restaurant', 'cafe', 'supermarket', 'store', 'other'];

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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold text-right mb-1">Mlai</h1>
        <p className="text-gray-500 text-right mb-8">בוא נגדיר את העסק שלך</p>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1.5">שם העסק *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='למשל: "מני ובניו"'
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1.5">סוג עסק</label>
            <div className="flex flex-wrap gap-2 justify-end">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    type === t
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200'
                  }`}
                >
                  {BUSINESS_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 text-right mb-1.5">
              סניף / כתובת <span className="text-gray-400 font-normal">(אופציונלי)</span>
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder='למשל: "תל אביב"'
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {error && <p className="text-red-500 text-sm text-right">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? 'יוצר...' : 'יצירת עסק'}
          </button>
        </div>
      </div>
    </div>
  );
}
