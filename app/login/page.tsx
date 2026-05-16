'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signInWithGoogle } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/home');
  }, [user, loading, router]);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'אירעה שגיאה. נסה שוב.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>טוען...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '2rem' }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 500, marginBottom: '0.5rem' }}>Mlai</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>ניהול מלאי פשוט</p>
      <button
        onClick={handleSignIn}
        disabled={submitting}
        style={{
          padding: '0.75rem 2rem',
          fontSize: '1rem',
          fontWeight: 500,
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: submitting ? 'wait' : 'pointer',
        }}
      >
        {submitting ? 'מתחבר...' : 'התחבר עם Google'}
      </button>
      {error && <p style={{ color: '#c00', marginTop: '1rem' }}>{error}</p>}
    </div>
  );
}
