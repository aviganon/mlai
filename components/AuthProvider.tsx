'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { consumeRedirectResult } from '@/lib/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // CRITICAL: await redirect result BEFORE reacting to null auth state.
    // Without this, Safari ITP triggers onAuthStateChanged with null
    // before the redirect promise resolves, causing immediate sign-out.
    const redirectPromise = consumeRedirectResult().catch(() => false);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!isMounted) return;

      if (firebaseUser) {
        setUser(firebaseUser);
        setLoading(false);
        return;
      }

      // Null user: wait for redirect result before deciding it's a real sign-out
      await redirectPromise;

      // CRITICAL guard: if currentUser is now set (redirect resolved during the await), bail.
      if (auth.currentUser) return;

      if (isMounted) {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
