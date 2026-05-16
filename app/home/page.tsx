'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { signOutUser } from '@/lib/auth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p>טוען...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 500 }}>ברוך הבא ל-Mlai</h1>
      <p style={{ color: '#666', marginTop: '0.5rem' }}>{user.email}</p>
      <p style={{ marginTop: '2rem', color: '#999' }}>שלב 1 הושלם. שלב 2 ייבנה במקום הזה.</p>
      <button
        onClick={() => signOutUser()}
        style={{
          marginTop: '2rem',
          padding: '0.5rem 1.5rem',
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        התנתק
      </button>
    </div>
  );
}
