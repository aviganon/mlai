'use client';
import { useEffect, useState } from 'react';
import { subscribeToReorderSuggestions } from '@/lib/firestore';
import { ReorderSuggestion } from '@/types';

export function useReorderSuggestions(businessId: string | null) {
  const [suggestions, setSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToReorderSuggestions(businessId, (data) => {
      setSuggestions(data);
      setLoading(false);
    });
    return unsub;
  }, [businessId]);

  return { suggestions, loading };
}
