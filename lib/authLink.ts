import { GoogleAuthProvider, linkWithPopup, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from './firebase';
import { db } from './firebase';

export const googleProvider = new GoogleAuthProvider();

/**
 * Opens a Google sign-in popup and links the Google credential to the
 * given (or current) Firebase user. Used when a user already signed in
 * with email/password and wants to also link their Google account.
 */
export async function linkGoogleToCurrentUser(user?: User): Promise<void> {
  const target = user ?? auth.currentUser;
  if (!target) throw new Error('No authenticated user to link');
  await linkWithPopup(target, googleProvider);
}

/**
 * Creates an `mlaiUsers` Firestore document for `user` if one does not
 * already exist. Called after a successful Google sign-in so that every
 * Firebase Auth user has a corresponding app-level profile.
 */
export async function ensureMlaiUserDoc(user: {
  uid: string;
  displayName: string | null;
  email: string | null;
}): Promise<void> {
  const ref = doc(db, 'mlaiUsers', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      role: 'employee',
      businessId: null,
      isOwner: false,
      lastSeen: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
  }
}
