'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getUserBusiness } from '@/lib/firestore';
import { createOrUpdateUser, updateLastSeen } from '@/lib/users';
import { Business } from '@/types';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useBusiness() {
  const { user, loading: authLoading } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    async function load() {
      if (!user) return;
      // Track user profile + lastSeen
      createOrUpdateUser(user).catch(() => {});

      // First: business where user is owner
      let biz = await getUserBusiness(user.uid);

      // Fallback: business where user is a member (employee)
      if (!biz) {
        const snap = await getDocs(
          query(collection(db, 'businesses'), where(`members.${user.uid}.role`, 'in', ['owner', 'employee']))
        );
        if (!snap.empty) {
          const d = snap.docs[0];
          biz = { id: d.id, ...d.data() } as Business;
        }
      }

      setBusiness(biz);
      setLoading(false);
    }

    load();
  }, [user, authLoading]);

  // Update lastSeen every 2 minutes while app is open
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      updateLastSeen(user.uid).catch(() => {});
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user]);

  return { business, loading, setBusiness };
}
