'use client';
import { useEffect, useState } from 'react';
import { subscribeToItems } from '@/lib/firestore';
import { InventoryItem } from '@/types';

export function useItems(businessId: string | null) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToItems(businessId, (data) => {
      setItems(data);
      setLoading(false);
    });
    return unsub;
  }, [businessId]);

  return { items, loading };
}
