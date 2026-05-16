import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, orderBy, getDocs, getDoc,
  increment, serverTimestamp, limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { Business, InventoryItem, BusinessType, BusinessMember, InvoiceLogEntry, ReorderSuggestion } from '@/types';

// ─── Team / Invite ────────────────────────────────────────────

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function getOrCreateInviteCode(businessId: string): Promise<string> {
  const snap = await getDoc(doc(db, 'businesses', businessId));
  if (!snap.exists()) throw new Error('Business not found');
  const data = snap.data();
  if (data.inviteCode) return data.inviteCode;
  const code = randomCode();
  await updateDoc(doc(db, 'businesses', businessId), { inviteCode: code });
  return code;
}

export async function getBusinessByInviteCode(code: string): Promise<Business | null> {
  const q = query(collection(db, 'businesses'), where('inviteCode', '==', code.toUpperCase()));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Business;
}

export async function joinBusinessAsEmployee(
  businessId: string,
  member: { uid: string; email: string; displayName: string | null }
): Promise<void> {
  await updateDoc(doc(db, 'businesses', businessId), {
    [`members.${member.uid}`]: {
      email: member.email,
      displayName: member.displayName,
      role: 'employee',
      addedAt: serverTimestamp(),
    },
  });
}

export async function removeTeamMember(businessId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, 'businesses', businessId), {
    [`members.${uid}`]: null,
  });
}

export function getTeamMembers(business: Business): BusinessMember[] {
  const members = (business as unknown as Record<string, unknown>)?.members as Record<string, BusinessMember> | undefined;
  if (!members) return [];
  return Object.values(members).filter(Boolean);
}

// ─── Admin ────────────────────────────────────────────────────

export async function getAllBusinesses(): Promise<Business[]> {
  const snap = await getDocs(query(collection(db, 'businesses'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Business[];
}

export async function adminDeleteBusiness(businessId: string): Promise<void> {
  const itemsSnap = await getDocs(collection(db, 'businesses', businessId, 'items'));
  await Promise.all(itemsSnap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, 'businesses', businessId));
}

export async function adminUpdateBusiness(businessId: string, data: Partial<Business>): Promise<void> {
  await updateDoc(doc(db, 'businesses', businessId), data as Record<string, unknown>);
}

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

// ─── Invoice Log ──────────────────────────────────────────────

export function subscribeToInvoiceLog(
  businessId: string,
  callback: (entries: InvoiceLogEntry[]) => void
): () => void {
  const q = query(
    collection(db, 'businesses', businessId, 'invoiceLog'),
    orderBy('parsedAt', 'desc'),
    limit(5)
  );
  return onSnapshot(q, (snap) => {
    const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InvoiceLogEntry[];
    callback(entries);
  });
}

// ─── Reorder Suggestions ──────────────────────────────────────

export function subscribeToReorderSuggestions(
  businessId: string,
  callback: (suggestions: ReorderSuggestion[]) => void
): () => void {
  const q = query(
    collection(db, 'businesses', businessId, 'reorderSuggestions'),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const suggestions = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReorderSuggestion[];
    callback(suggestions);
  });
}
