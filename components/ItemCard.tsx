'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryItem } from '@/types';
import { updateItemStock } from '@/lib/firestore';

function stockConfig(item: InventoryItem): { dot: string; badge?: string; badgeColor?: string } {
  if (item.stock === 0) return { dot: 'bg-red-400', badge: 'אזל', badgeColor: 'text-red-500 bg-red-50' };
  if (item.minStock > 0 && item.stock < item.minStock) return { dot: 'bg-amber-400', badge: 'נמוך', badgeColor: 'text-amber-600 bg-amber-50' };
  return { dot: 'bg-emerald-400' };
}

interface Props {
  item: InventoryItem;
  businessId: string;
  index?: number;
}

export function ItemCard({ item, businessId, index = 0 }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const { dot, badge, badgeColor } = stockConfig(item);

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
      className="glass rounded-2xl p-4 flex items-center gap-3 press cursor-pointer animate-slide-up"
      style={{ animationDelay: `${index * 0.04}s` }}
    >
      {/* Left: info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
          <span className="font-semibold text-gray-900 truncate text-sm">{item.name}</span>
          {badge && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${badgeColor}`}>
              {badge}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 pr-4">
          {item.category && <span className="ml-2">{item.category}</span>}
          {item.supplier && <span>· {item.supplier}</span>}
        </div>
      </div>

      {/* Right: stock controls */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => handleDelta(-1, e)}
          disabled={pending || item.stock <= 0}
          className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg font-medium text-gray-700 disabled:opacity-25 press-sm shadow-sm"
        >
          −
        </button>
        <div className="text-center min-w-10">
          <div className="font-bold text-gray-900 text-base leading-none">{item.stock}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{item.unit}</div>
        </div>
        <button
          onClick={(e) => handleDelta(1, e)}
          disabled={pending}
          className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-lg font-medium text-gray-700 disabled:opacity-25 press-sm shadow-sm"
        >
          +
        </button>
      </div>
    </div>
  );
}
