import {
  doc, getDoc, setDoc, updateDoc, collection, getDocs,
  serverTimestamp, deleteDoc, query, orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { MlaiUser } from '@/types';
import { User } from 'firebase/auth';

export async function createOrUpdateUser(firebaseUser: User): Promise<void> {
  const ref = doc(db, 'mlaiUsers', firebaseUser.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      isOwner: false,
      businessId: null,
      role: 'owner',
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  } else {
    await updateDoc(ref, { lastSeen: serverTimestamp() });
  }
}

export async function updateLastSeen(uid: string): Promise<void> {
  await updateDoc(doc(db, 'mlaiUsers', uid), { lastSeen: serverTimestamp() });
}

export async function getUser(uid: string): Promise<MlaiUser | null> {
  const snap = await getDoc(doc(db, 'mlaiUsers', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as MlaiUser;
}

export async function getAllUsers(): Promise<MlaiUser[]> {
  const snap = await getDocs(query(collection(db, 'mlaiUsers'), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() })) as MlaiUser[];
}

export async function setUserBusiness(uid: string, businessId: string | null, role: 'owner' | 'employee'): Promise<void> {
  await updateDoc(doc(db, 'mlaiUsers', uid), { businessId, role });
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, 'mlaiUsers', uid));
}
