'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createBusiness } from '@/lib/firestore';
import { getDomains, DEFAULT_DOMAINS } from '@/lib/domains';
import { Domain } from '@/types';

export default function OnboardingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getDomains().then((d) => {
      if (d.length > 0) {
        setDomains(d);
        setSelectedDomain(d[0]);
      } else {
        const fallback = DEFAULT_DOMAINS.map((d, i) => ({ ...d, id: String(i) }));
        setDomains(fallback);
        setSelectedDomain(fallback[0]);
      }
    });
  }, []);

  async function handleSubmit() {
    if (!name.trim()) { setError('נא להזין שם עסק'); return; }
    if (!user || !selectedDomain) return;
    setLoading(true);
    setError('');
    try {
      await createBusiness(user.uid, {
        name: name.trim(),
        type: 'other',
        branch: branch.trim(),
        domain: selectedDomain.name,
        domainCategories: selectedDomain.categories,
        domainUnits: selectedDomain.units,
      } as Parameters<typeof createBusiness>[1] & Record<string, unknown>);
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
          <h1 className="text-2xl font-bold text-gray-900">הגדרת העסק שלך</h1>
          <p className="text-gray-400 text-sm mt-1">לוקח שניות — רק הפעם הראשונה</p>
        </div>

        <div className="glass-strong rounded-3xl p-5 space-y-5 animate-slide-up delay-100">
          {/* Domain selection */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 text-right mb-2 uppercase tracking-wide">סוג העסק</label>
            <div className="grid grid-cols-3 gap-2">
              {domains.map((d) => (
                <button key={d.id} onClick={() => setSelectedDomain(d)}
                  className={`press flex flex-col items-center py-3 px-2 rounded-2xl border transition-all duration-200 ${
                    selectedDomain?.id === d.id
                      ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-gray-900/20'
                      : 'bg-white/70 border-gray-200 text-gray-600'
                  }`}>
                  <span className="text-2xl mb-1">{d.icon}</span>
                  <span className="text-xs font-medium leading-tight text-center">{d.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Domain categories preview */}
          {selectedDomain && (
            <div className="bg-gray-50/80 rounded-2xl px-4 py-3 animate-fade-in">
              <p className="text-xs text-gray-400 text-right mb-2">קטגוריות לתחום זה:</p>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {selectedDomain.categories.slice(0, 6).map((c) => (
                  <span key={c} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{c}</span>
                ))}
                {selectedDomain.categories.length > 6 && (
                  <span className="text-xs text-gray-400">+{selectedDomain.categories.length - 6}</span>
                )}
              </div>
            </div>
          )}

          {/* Business name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 text-right mb-2 uppercase tracking-wide">שם העסק *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='למשל: "מני ובניו"'
              className="w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-3.5 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all text-sm"
            />
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 text-right mb-2 uppercase tracking-wide">
              סניף / עיר <span className="text-gray-400 font-normal normal-case">(אופציונלי)</span>
            </label>
            <input
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder='למשל: "תל אביב"'
              className="w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-3.5 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all text-sm"
            />
          </div>

          {error && <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 text-right animate-fade-in">{error}</div>}

          <button onClick={handleSubmit} disabled={loading || !selectedDomain}
            className="press w-full bg-gradient-to-br from-gray-900 to-gray-800 text-white py-4 rounded-2xl font-medium shadow-lg shadow-gray-900/20 disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
                יוצר...
              </span>
            ) : 'יצירת עסק →'}
          </button>

          <button onClick={() => router.push('/join')} className="w-full text-center text-sm text-indigo-400 py-1 press">
            יש לך קוד הצטרפות? לחץ כאן
          </button>
        </div>
      </div>
    </div>
  );
}
