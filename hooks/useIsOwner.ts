'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { getUser } from '@/lib/users';

export function useIsOwner() {
  const { user, loading: authLoading } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    getUser(user.uid).then((profile) => {
      setIsOwner(profile?.isOwner === true);
      setLoading(false);
    });
  }, [user, authLoading]);

  return { isOwner, loading };
}
