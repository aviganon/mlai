import { addDoc, arrayUnion, collection, doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function createBusiness(data: {
  name: string;
  type: string;
  ownerId: string;
  branch?: string;
  managerInfo?: string;
}): Promise<string> {
  const { managerInfo: _managerInfo, ...firestoreData } = data;
  const ref = await addDoc(collection(db, 'businesses'), {
    ...firestoreData,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createPendingUser(data: {
  email: string;
  displayName: string;
  role: 'owner' | 'employee' | 'manager';
  businessId: string | null;
  isOwner: boolean;
}): Promise<string> {
  const uid = `pending-${Date.now()}`;
  await setDoc(doc(db, 'mlaiUsers', uid), {
    uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    businessId: data.businessId,
    isOwner: data.isOwner,
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return uid;
}

export async function addPendingMember(businessId: string, email: string): Promise<void> {
  await updateDoc(doc(db, 'businesses', businessId), {
    pendingMembers: arrayUnion(email),
  });
}
