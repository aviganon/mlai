import { doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function setUserOwner(uid: string, isOwner: boolean): Promise<void> {
  await updateDoc(doc(db, 'mlaiUsers', uid), { isOwner });
}
