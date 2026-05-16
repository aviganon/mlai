import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, getDocs,
  increment, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Business, InventoryItem, BusinessType } from '@/types';

// ─── Business ────────────────────────────────────────────────

export async function getUserBusiness(userId: string): Promise<Business | null> {
  const q = query(collection(db, 'businesses'), where('ownerId', '==', userId));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Business;
}

export async function createBusiness(
  userId: string,
  data: { name: string; type: BusinessType; branch: string }
): Promise<string> {
  const ref = await addDoc(collection(db, 'businesses'), {
    ...data,
    ownerId: userId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Inventory Items ──────────────────────────────────────────

export function subscribeToItems(
  businessId: string,
  callback: (items: InventoryItem[]) => void
): () => void {
  const q = query(
    collection(db, 'businesses', businessId, 'items'),
    orderBy('name')
  );
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InventoryItem[];
    callback(items);
  });
}

export async function addItem(
  businessId: string,
  data: Omit<InventoryItem, 'id' | 'lastUpdated' | 'lastUpdatedBy'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'businesses', businessId, 'items'), {
    ...data,
    lastUpdated: serverTimestamp(),
    lastUpdatedBy: 'manual',
  });
  return ref.id;
}

export async function updateItem(
  businessId: string,
  itemId: string,
  data: Partial<Omit<InventoryItem, 'id'>>
): Promise<void> {
  await updateDoc(doc(db, 'businesses', businessId, 'items', itemId), {
    ...data,
    lastUpdated: serverTimestamp(),
  });
}

export async function updateItemStock(
  businessId: string,
  itemId: string,
  delta: number
): Promise<void> {
  await updateDoc(doc(db, 'businesses', businessId, 'items', itemId), {
    stock: increment(delta),
    lastUpdated: serverTimestamp(),
    lastUpdatedBy: 'manual',
  });
}

export async function deleteItem(businessId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'businesses', businessId, 'items', itemId));
}
