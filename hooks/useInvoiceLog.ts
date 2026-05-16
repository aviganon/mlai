'use client';
import { useEffect, useState } from 'react';
import { subscribeToInvoiceLog } from '@/lib/firestore';
import { InvoiceLogEntry } from '@/types';

export function useInvoiceLog(businessId: string | null) {
  const [entries, setEntries] = useState<InvoiceLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToInvoiceLog(businessId, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [businessId]);

  return { entries, loading };
}
