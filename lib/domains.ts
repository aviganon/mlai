import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, orderBy, setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { Domain, ItemUnit } from '@/types';

export const DEFAULT_DOMAINS: Omit<Domain, 'id'>[] = [
  { name: 'מסעדה', icon: '🍽️', isDefault: true, categories: ['בשר', 'עוף', 'ירקות', 'פירות', 'דגים', 'יבשים', 'אלכוהול', 'חלב וביצים', 'מאפייה', 'רטבים ותבלינים', 'אחר'], units: ['ק"ג', 'גרם', 'ליטר', 'מ"ל', 'יחידה', 'ארגז', 'שקית', 'אחר'] as ItemUnit[] },
  { name: 'קפה', icon: '☕', isDefault: true, categories: ['קפה וחליטות', 'חלב וחלופות', 'סירופים', 'מאפים', 'חטיפים', 'כלים חד-פעמיים', 'אחר'], units: ['ק"ג', 'גרם', 'ליטר', 'מ"ל', 'יחידה', 'שקית', 'בקבוק', 'אחר'] as ItemUnit[] },
  { name: 'סופרמרקט', icon: '🛒', isDefault: true, categories: ['פירות וירקות', 'מוצרי חלב', 'קצבייה', 'דגים', 'אוכל יבש', 'שתייה', 'מוצרי ניקיון', 'חטיפים', 'אחר'], units: ['יחידה', 'ק"ג', 'ליטר', 'ארגז', 'שקית', 'בקבוק', 'אחר'] as ItemUnit[] },
  { name: 'חנות', icon: '🏪', isDefault: true, categories: ['בגדים', 'נעליים', 'אביזרים', 'תיקים', 'אחר'], units: ['יחידה', 'זוג', 'ארגז', 'שקית', 'אחר'] as ItemUnit[] },
  { name: 'אחר', icon: '📦', isDefault: true, categories: ['כללי', 'חומרים', 'ציוד', 'אחר'], units: ['יחידה', 'ק"ג', 'ליטר', 'אחר'] as ItemUnit[] },
];

export async function seedDefaultDomains(): Promise<void> {
  const snap = await getDocs(collection(db, 'mlaiDomains'));
  if (!snap.empty) return;
  for (const d of DEFAULT_DOMAINS) {
    await addDoc(collection(db, 'mlaiDomains'), { ...d, createdAt: new Date() });
  }
}

export function subscribeToDomains(callback: (domains: Domain[]) => void): () => void {
  const q = query(collection(db, 'mlaiDomains'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const domains = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Domain[];
    callback(domains);
  });
}

export async function getDomains(): Promise<Domain[]> {
  const snap = await getDocs(query(collection(db, 'mlaiDomains'), orderBy('name')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Domain[];
}

export async function addDomain(data: Omit<Domain, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'mlaiDomains'), { ...data, createdAt: new Date() });
  return ref.id;
}

export async function updateDomain(id: string, data: Partial<Omit<Domain, 'id'>>): Promise<void> {
  await updateDoc(doc(db, 'mlaiDomains', id), data);
}

export async function deleteDomain(id: string): Promise<void> {
  await deleteDoc(doc(db, 'mlaiDomains', id));
}
