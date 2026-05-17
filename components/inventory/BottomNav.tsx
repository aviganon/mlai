'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, Receipt, Truck, ShoppingCart, Settings } from 'lucide-react';
import Link from 'next/link';
import { useBusiness } from '@/hooks/useBusiness';
import { subscribeToOrders } from '@/lib/firestore';
import { PurchaseOrder } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { label: 'בית', path: '/home', icon: Home },
  { label: 'קופה', path: '/home/pos', icon: Receipt },
  { label: 'ספקים', path: '/suppliers', icon: Truck },
  { label: 'הזמנות', path: '/home/orders', icon: ShoppingCart },
  { label: 'הגדרות', path: '/settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { business } = useBusiness();
  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    if (!business) return;
    return subscribeToOrders(business.id, (orders: PurchaseOrder[]) => {
      setPendingOrders(orders.filter((o) => o.status === 'pending').length);
    });
  }, [business]);

  const isActive = (path: string) => {
    if (path === '/home') {
      return (
        pathname === '/home' ||
        (pathname.startsWith('/home') &&
          !pathname.startsWith('/home/orders') &&
          !pathname.startsWith('/home/pos'))
      );
    }
    return pathname === path || pathname.startsWith(path);
  };

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 right-0 left-0 z-30 bg-card/95 backdrop-blur-lg border-t border-border"
    >
      <div className="flex pb-safe">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const showBadge = item.path === '/home/orders' && pendingOrders > 0;

          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex-1 flex flex-col items-center pt-3 pb-4 gap-1 press-sm relative"
            >
              <motion.div
                className={`flex items-center justify-center w-12 h-9 rounded-xl transition-all duration-300 ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
                animate={{ scale: active ? 1.05 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              >
                <Icon className="w-5 h-5" />
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-0.5 right-[calc(50%-18px)] min-w-[18px] h-[18px] bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-1"
                  >
                    {pendingOrders}
                  </motion.span>
                )}
              </motion.div>
              <span
                className={`text-[11px] font-medium transition-colors duration-300 ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
