'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { useItems } from '@/hooks/useItems';
import { createPurchaseOrder, updateOrderStatus, receiveOrder, subscribeToOrders } from '@/lib/firestore';
import { BottomNav } from '@/components/BottomNav';
import { InventoryItem, PurchaseOrder, PurchaseOrderItem } from '@/types';

function statusLabel(s: PurchaseOrder['status']) {
  if (s === 'pending') return { label: 'ממתין', cls: 'bg-amber-100 text-amber-700' };
  if (s === 'approved') return { label: 'אושר', cls: 'bg-blue-100 text-blue-700' };
  return { label: 'התקבל', cls: 'bg-emerald-100 text-emerald-700' };
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading: bizLoading } = useBusiness();
  const { items } = useItems(business?.id ?? null);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'new' | 'list'>('new');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (authLoading || bizLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!business) { router.replace('/onboarding'); return; }
  }, [user, business, authLoading, bizLoading, router]);

  useEffect(() => {
    if (!business) return;
    return subscribeToOrders(business.id, setOrders);
  }, [business]);

  const orderItems = useMemo<InventoryItem[]>(() => {
    return items.filter((i) => {
      const threshold = i.targetStock ?? i.minStock;
      return threshold > 0 && i.stock < threshold;
    });
  }, [items]);

  useEffect(() => {
    const initial: Record<string, number> = {};
    orderItems.forEach((item) => {
      const target = item.targetStock ?? item.minStock;
      const needed = Math.max(0, target - item.stock);
      const packSize = item.packSize ?? 1;
      initial[item.id] = packSize > 1 ? Math.ceil(needed / packSize) * packSize : needed;
    });
    setQtys(initial);
  }, [orderItems]);

  async function handleCreate() {
    if (!business || !user) return;
    const orderItemsList: PurchaseOrderItem[] = orderItems
      .filter((i) => (qtys[i.id] ?? 0) > 0)
      .map((i) => ({
        itemId: i.id,
        itemName: i.name,
        supplier: i.supplier || 'ללא ספק',
        qty: qtys[i.id] ?? 0,
        unit: i.unit,
        price: i.price,
      }));
    if (orderItemsList.length === 0) return;
    setCreating(true);
    await createPurchaseOrder(business.id, user.uid, orderItemsList);
    setCreating(false);
    setActiveTab('list');
  }

  if (authLoading || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
      </div>
    );
  }

  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-3 animate-slide-down">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400">
            {pendingCount > 0 && <span className="text-amber-500 font-medium">{pendingCount} ממתינות</span>}
          </p>
          <h1 className="text-xl font-bold text-gray-900">הזמנות</h1>
        </div>
        <div className="flex gap-2">
          {(['new', 'list'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`press flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-gray-900 text-white shadow-md shadow-gray-900/15' : 'glass text-gray-600'
              }`}
            >
              {tab === 'new' ? `הזמנה חדשה (${orderItems.length})` : `רשימת הזמנות (${orders.length})`}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'new' ? (
        <div className="px-4 pt-3 space-y-2 animate-slide-up">
          {orderItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-gray-400 text-sm">אין פריטים שדורשים הזמנה</p>
              <p className="text-xs text-gray-300 mt-2">הגדר מלאי תקן לפריטים כדי לראות הצעות</p>
            </div>
          ) : (
            <>
              {orderItems.map((item) => {
                const target = item.targetStock ?? item.minStock;
                return (
                  <div key={item.id} className="glass rounded-2xl p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0 text-right">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-400">
                        מלאי: {item.stock} {item.unit} · תקן: {target} · ספק: {item.supplier || '—'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setQtys((q) => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - (item.packSize ?? 1)) }))}
                        className="press w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold"
                      >
                        −
                      </button>
                      <span className="w-10 text-center font-semibold text-gray-900">{qtys[item.id] ?? 0}</span>
                      <button
                        onClick={() => setQtys((q) => ({ ...q, [item.id]: (q[item.id] ?? 0) + (item.packSize ?? 1) }))}
                        className="press w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 font-bold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={handleCreate}
                disabled={creating || orderItems.every((i) => (qtys[i.id] ?? 0) === 0)}
                className="press w-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white py-4 rounded-2xl font-medium text-base shadow-lg shadow-indigo-300/40 disabled:opacity-50 mt-4"
              >
                {creating ? 'יוצר...' : '🛒 צור הזמנה'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-3 animate-slide-up">
          {orders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-gray-400 text-sm">אין הזמנות עדיין</p>
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard key={order.id} order={order} businessId={business!.id} />
            ))
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function OrderCard({ order, businessId }: { order: PurchaseOrder; businessId: string }) {
  const [loading, setLoading] = useState(false);
  const { label, cls } = statusLabel(order.status);

  const date = order.createdAt
    ? new Date((order.createdAt as unknown as { seconds: number }).seconds * 1000)
    : null;
  const dateStr = date?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' }) ?? '';

  async function handleApprove() {
    setLoading(true);
    await updateOrderStatus(businessId, order.id, 'approved');
    setLoading(false);
  }

  async function handleReceive() {
    setLoading(true);
    await receiveOrder(businessId, order.id, order.items);
    setLoading(false);
  }

  return (
    <div className="glass rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls}`}>{label}</span>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{order.items.length} פריטים</p>
          <p className="text-xs text-gray-400">{dateStr}</p>
        </div>
      </div>
      <div className="space-y-1">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.itemId} className="flex justify-between text-xs text-gray-600">
            <span className="text-gray-400">{item.supplier}</span>
            <span>{item.itemName} · {item.qty} {item.unit}</span>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-xs text-gray-400 text-right">+{order.items.length - 3} עוד...</p>
        )}
      </div>
      {order.totalEstimate > 0 && (
        <p className="text-xs text-gray-500 text-right">סה״כ משוער: ₪{order.totalEstimate.toFixed(0)}</p>
      )}
      <div className="flex gap-2">
        {order.status === 'pending' && (
          <button
            onClick={handleApprove}
            disabled={loading}
            className="press flex-1 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100 disabled:opacity-50"
          >
            ✓ אשר הזמנה
          </button>
        )}
        {order.status === 'approved' && (
          <button
            onClick={handleReceive}
            disabled={loading}
            className="press flex-1 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium border border-emerald-100 disabled:opacity-50"
          >
            📦 סמן כהתקבל
          </button>
        )}
      </div>
    </div>
  );
}
