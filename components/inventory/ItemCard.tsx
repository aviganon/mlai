'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { updateItemStock } from '@/lib/firestore';
import { InventoryItem } from '@/types';

interface Props {
  item: InventoryItem;
  businessId: string;
  index?: number;
}

function getStockStatus(item: InventoryItem, currentStock: number): {
  color: string;
  badge?: string;
  badgeColor?: string;
} {
  if (currentStock === 0) {
    return { color: 'bg-destructive', badge: 'אזל', badgeColor: 'bg-destructive/10 text-destructive border-destructive/20' };
  }
  if (item.minStock > 0 && currentStock < item.minStock) {
    return { color: 'bg-warning', badge: 'נמוך', badgeColor: 'bg-warning/10 text-warning border-warning/20' };
  }
  return { color: 'bg-success' };
}

export function ItemCard({ item, businessId, index = 0 }: Props) {
  const [stock, setStock] = useState(item.stock);
  const [isPending, setIsPending] = useState(false);
  const { color, badge, badgeColor } = getStockStatus(item, stock);

  const handleDelta = async (delta: number) => {
    if (isPending) return;
    if (delta < 0 && stock <= 0) return;

    // Optimistic update
    setIsPending(true);
    setStock((prev) => Math.max(0, prev + delta));

    try {
      await updateItemStock(businessId, item.id, delta);
    } catch {
      // Revert optimistic update on failure
      setStock((prev) => Math.max(0, prev - delta));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      layout
    >
      <Link href={`/home/item/${item.id}`}>
        <div className="bg-card border border-border rounded-2xl p-4 press group hover:shadow-md hover:border-muted transition-all duration-300">
          <div className="flex items-center gap-4">
            {/* Item Info - Right Side */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
                <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
                {badge && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground pr-4">
                {item.category && <span className="ml-2">{item.category}</span>}
                {item.supplier && <span className="opacity-75">• {item.supplier}</span>}
              </div>
              <div className="text-xs text-muted-foreground pr-4 mt-1">
                <span>{(item.price || 0).toFixed(1)} ₪ / {item.unit}</span>
              </div>
            </div>

            {/* Stock Controls - Left Side */}
            <div
              className="flex items-center gap-2 flex-shrink-0"
              onClick={(e) => e.preventDefault()}
            >
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.preventDefault(); handleDelta(-1); }}
                disabled={isPending || stock <= 0}
                className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted transition-colors"
                aria-label="הפחת כמות"
              >
                <Minus className="w-4 h-4" />
              </motion.button>

              <div className="text-center min-w-12">
                <motion.div
                  key={stock}
                  initial={{ scale: 1.2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-bold text-lg text-foreground leading-none"
                >
                  {stock}
                </motion.div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.unit}</div>
              </div>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.preventDefault(); handleDelta(1); }}
                disabled={isPending}
                className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-muted transition-colors"
                aria-label="הוסף כמות"
              >
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>

            {/* Arrow indicator */}
            <ChevronLeft className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
