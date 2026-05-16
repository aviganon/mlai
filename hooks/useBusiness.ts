'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getUserBusiness } from '@/lib/firestore';
import { Business } from '@/types';

export function useBusiness() {
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    getUserBusiness(user.uid).then((b) => {
      setBusiness(b);
      setLoading(false);
    });
  }, [user, authLoading]);

  return { business, loading, setBusiness };
}
