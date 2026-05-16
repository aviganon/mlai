import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as fbSignOut,
} from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();

function isIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  return isIOS && isSafari;
}

export async function signInWithGoogle(): Promise<void> {
  if (isIOSSafari()) {
    await signInWithRedirect(auth, provider);
  } else {
    await signInWithPopup(auth, provider);
  }
}

export async function consumeRedirectResult(): Promise<boolean> {
  const result = await getRedirectResult(auth);
  return result !== null;
}

export async function signOutUser(): Promise<void> {
  await fbSignOut(auth);
}
