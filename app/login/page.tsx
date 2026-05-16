'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signInWithGoogle } from '@/lib/auth';
import { signInWithEmail, sendPasswordReset } from '@/lib/emailAuth';

const inputCls =
  'w-full bg-white/70 border border-gray-200 rounded-2xl px-4 py-4 text-right focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all text-sm';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // tab: 'google' | 'email'
  const [tab, setTab] = useState<'google' | 'email'>('google');

  // email form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/home');
  }, [user, loading, router]);

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'אירעה שגיאה. נסה שוב.');
      setSubmitting(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResetSent(false);
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'אירעה שגיאה. נסה שוב.');
      setSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (!email) {
      setError('הכנס אימייל לאיפוס סיסמה');
      return;
    }
    setError(null);
    try {
      await sendPasswordReset(email);
      setResetSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'אירעה שגיאה');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-80 h-80 bg-indigo-200 rounded-full blur-3xl opacity-30" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 w-96 h-96 bg-violet-200 rounded-full blur-3xl opacity-25" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10 animate-slide-up">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-200 mb-5">
            <span className="text-white text-3xl font-bold tracking-tight">M</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Mlai</h1>
          <p className="text-gray-400 mt-2 text-sm">ניהול מלאי פשוט וחכם</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-3xl p-6 animate-slide-up delay-100">
          <p className="text-sm text-gray-500 text-right mb-4">כניסה לחשבון</p>

          {/* Tab switcher */}
          <div className="flex gap-2 mb-5 bg-gray-100/80 rounded-2xl p-1">
            <button
              onClick={() => { setTab('google'); setError(null); setResetSent(false); }}
              className={`flex-1 text-xs font-medium py-2 rounded-xl transition-all ${
                tab === 'google'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              כניסה עם Google
            </button>
            <button
              onClick={() => { setTab('email'); setError(null); setResetSent(false); }}
              className={`flex-1 text-xs font-medium py-2 rounded-xl transition-all ${
                tab === 'email'
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              אימייל וסיסמה
            </button>
          </div>

          {tab === 'google' ? (
            <button
              onClick={handleGoogleSignIn}
              disabled={submitting}
              className="press w-full flex items-center justify-center gap-3 bg-gray-900 text-white py-4 rounded-2xl font-medium text-base shadow-lg shadow-gray-900/20 disabled:opacity-60"
            >
              {submitting ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
              ) : (
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span>{submitting ? 'מתחבר...' : 'המשך עם Google'}</span>
            </button>
          ) : (
            <form onSubmit={handleEmailSignIn} className="space-y-3" dir="rtl">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="אימייל"
                required
                className={inputCls}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמה"
                required
                className={inputCls}
              />
              <button
                type="submit"
                disabled={submitting}
                className="press w-full bg-gray-900 text-white py-4 rounded-2xl font-medium text-base shadow-lg shadow-gray-900/20 disabled:opacity-60"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin-smooth" />
                    מתחבר...
                  </span>
                ) : 'כניסה'}
              </button>
              <div className="text-center pt-1">
                {resetSent ? (
                  <p className="text-xs text-green-600 animate-fade-in">נשלח מייל לאיפוס ✓</p>
                ) : (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    className="text-xs text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    שכחת סיסמה?
                  </button>
                )}
              </div>
            </form>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm text-red-600 text-right animate-fade-in">
              {error}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6 animate-fade-in delay-200">
          הכניסה מאובטחת ·{' '}
          <a href="/register" className="text-indigo-500 hover:underline">
            משתמש חדש? צור חשבון
          </a>
        </p>
      </div>
    </div>
  );
}
