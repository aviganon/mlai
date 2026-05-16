import { addDoc, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
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

export async function createPendingUser(email: string): Promise<string> {
  const uid = `pending-${Date.now()}`;
  await setDoc(doc(db, 'mlaiUsers', uid), {
    email,
    displayName: email.split('@')[0],
    isOwner: false,
    businessId: null,
    role: 'owner',
    lastSeen: serverTimestamp(),
    createdAt: serverTimestamp(),
    uid,
  });
  return uid;
}
