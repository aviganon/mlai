'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { getUserBusiness, getBusinessById } from '@/lib/firestore';
import { Business } from '@/types';

export function useBusiness(): { business: Business | null; loading: boolean } {
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setBusiness(null); setLoading(false); return; }
    setLoading(true);

    const impersonateId = typeof window !== 'undefined'
      ? localStorage.getItem('impersonateBusinessId') : null;

    if (impersonateId) {
      getBusinessById(impersonateId)
        .then((biz) => { setBusiness(biz); setLoading(false); })
        .catch(() => { setBusiness(null); setLoading(false); });
      return;
    }

    getDoc(doc(db, 'mlaiUsers', user.uid)).then(async (snap) => {
      const profileBusinessId = snap.exists()
        ? (snap.data()?.businessId as string | null | undefined) : null;
      if (profileBusinessId) {
        setBusiness(await getBusinessById(profileBusinessId));
      } else {
        setBusiness(await getUserBusiness(user.uid));
      }
      setLoading(false);
    }).catch(() => { setBusiness(null); setLoading(false); });
  }, [user, authLoading]);

  return { business, loading };
}