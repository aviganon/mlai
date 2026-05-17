'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Package, Mail, Lock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { signInWithGoogle } from '@/lib/auth';
import { signInWithEmail, sendPasswordReset } from '@/lib/emailAuth';
import { linkGoogleToCurrentUser, ensureMlaiUserDoc } from '@/lib/authLink';
import { auth } from '@/lib/firebase';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<'google' | 'email'>('google');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [pendingGoogleLink, setPendingGoogleLink] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/home');
  }, [user, loading, router]);

  async function handleGoogleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      if (auth.currentUser) {
        await ensureMlaiUserDoc(auth.currentUser);
      }
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      if (code === 'auth/account-exists-with-different-credential') {
        setError('נמצא חשבון עם אימייל זה. הכנס עם אימייל וסיסמה תחילה כדי לקשר את החשבונות');
        setTab('email');
        setPendingGoogleLink(true);
      } else {
        setError(e instanceof Error ? e.message : 'אירעה שגיאה. נסה שוב.');
      }
      setSubmitting(false);
    }
  }

  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setError('נא למלא את כל השדות');
      return;
    }
    setError(null);
    setResetSent(false);
    setLinkSuccess(false);
    setSubmitting(true);
    try {
      const cred = await signInWithEmail(email, password);
      if (pendingGoogleLink) {
        try {
          await linkGoogleToCurrentUser(cred.user);
          setLinkSuccess(true);
          setPendingGoogleLink(false);
        } catch (linkErr: unknown) {
          setError(linkErr instanceof Error ? linkErr.message : 'קישור חשבון Google נכשל');
          setSubmitting(false);
        }
      }
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
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.4, scale: 1 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="absolute -top-32 -right-32 w-96 h-96 bg-accent/30 rounded-full blur-3xl"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.3, scale: 1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
          className="absolute -bottom-48 -left-32 w-[500px] h-[500px] bg-secondary/50 rounded-full blur-3xl"
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo & Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary shadow-xl shadow-primary/20 mb-6"
          >
            <Package className="w-10 h-10 text-primary-foreground" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-foreground tracking-tight"
          >
            Mlai
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-muted-foreground mt-2"
          >
            ניהול מלאי פשוט וחכם
          </motion.p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-card rounded-3xl p-6 shadow-lg shadow-foreground/5 border border-border"
        >
          <p className="text-sm text-muted-foreground text-right mb-5">כניסה לחשבון</p>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 bg-secondary rounded-2xl p-1.5">
            <button
              onClick={() => { setTab('google'); setError(null); setResetSent(false); }}
              className={`flex-1 text-sm font-medium py-2.5 rounded-xl transition-all duration-300 ${
                tab === 'google'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              כניסה עם Google
            </button>
            <button
              onClick={() => { setTab('email'); setError(null); setResetSent(false); }}
              className={`flex-1 text-sm font-medium py-2.5 rounded-xl transition-all duration-300 ${
                tab === 'email'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              אימייל וסיסמה
            </button>
          </div>

          <AnimatePresence mode="wait">
            {tab === 'google' ? (
              <motion.div
                key="google"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <button
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="press w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground py-4 rounded-2xl font-medium shadow-lg shadow-primary/20 disabled:opacity-60 transition-all"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  <span>{submitting ? 'מתחבר...' : 'המשך עם Google'}</span>
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleEmailSignIn}
                className="space-y-4"
                dir="rtl"
              >
                {/* Email Field */}
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="אימייל"
                    required
                    className="w-full bg-input border border-border rounded-2xl px-4 py-4 pr-12 text-right focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                </div>

                {/* Password Field */}
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="סיסמה"
                    required
                    className="w-full bg-input border border-border rounded-2xl px-12 py-4 text-right focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="press w-full bg-primary text-primary-foreground py-4 rounded-2xl font-medium shadow-lg shadow-primary/20 disabled:opacity-60 transition-all"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      מתחבר...
                    </span>
                  ) : 'כניסה'}
                </button>

                <div className="text-center pt-1">
                  {resetSent ? (
                    <p className="text-sm text-green-600 animate-fade-in">נשלח מייל לאיפוס ✓</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePasswordReset}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      שכחת סיסמה?
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 bg-destructive/10 border border-destructive/20 rounded-2xl px-4 py-3 text-sm text-destructive text-right"
              >
                {error}
              </motion.div>
            )}
            {linkSuccess && !error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 bg-success/10 border border-success/20 rounded-2xl px-4 py-3 text-sm text-success-foreground text-right"
              >
                החשבונות קושרו בהצלחה ✓
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer Link */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          {'הכניסה מאובטחת · '}
          <Link href="/register" className="text-foreground font-medium hover:underline">
            משתמש חדש? צור חשבון
          </Link>
        </motion.p>
      </div>
    </div>
  );
}
