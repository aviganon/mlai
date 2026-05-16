'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryItem } from '@/types';
import { updateItemStock } from '@/lib/firestore';

function stockColor(item: InventoryItem): string {
  if (item.stock === 0) return 'bg-red-500';
  if (item.minStock > 0 && item.stock < item.minStock) return 'bg-amber-400';
  return 'bg-emerald-500';
}

function stockLabel(item: InventoryItem): string {
  if (item.stock === 0) return 'אזל';
  if (item.minStock > 0 && item.stock < item.minStock) return 'מלאי נמוך';
  return '';
}

interface Props {
  item: InventoryItem;
  businessId: string;
}

export function ItemCard({ item, businessId }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelta(delta: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (pending) return;
    if (delta < 0 && item.stock <= 0) return;
    setPending(true);
    try {
      await updateItemStock(businessId, item.id, delta);
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      onClick={() => router.push(`/home/item/${item.id}`)}
      className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 active:scale-98 cursor-pointer"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stockColor(item)}`} />
          <span className="font-medium text-gray-900 truncate">{item.name}</span>
        </div>
        <div className="text-sm text-gray-500 pr-4">
          {item.stock} {item.unit}
          {item.minStock > 0 && (
            <span className="mr-2 text-xs">· מינ׳ {item.minStock}</span>
          )}
          {stockLabel(item) && (
            <span className={`mr-2 text-xs font-medium ${item.stock === 0 ? 'text-red-500' : 'text-amber-500'}`}>
              · {stockLabel(item)}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => handleDelta(-1, e)}
          disabled={pending || item.stock <= 0}
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-medium disabled:opacity-30 active:scale-95"
        >
          −
        </button>
        <span className="w-8 text-center font-semibold text-gray-900">{item.stock}</span>
        <button
          onClick={(e) => handleDelta(1, e)}
          disabled={pending}
          className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-lg font-medium disabled:opacity-30 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
