'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getUser } from '@/lib/users';
import { getUserBusiness } from '@/lib/firestore';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }

    async function redirect() {
      if (!user) return;
      try {
        const profile = await getUser(user.uid);
        if (profile?.isOwner) {
          router.replace('/admin');
          return;
        }
        const business = await getUserBusiness(user.uid);
        if (!business) {
          router.replace('/onboarding');
        } else {
          router.replace('/home');
        }
      } catch {
        router.replace('/home');
      }
    }

    redirect();
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
    </div>
  );
}
