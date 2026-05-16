'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/auth';

interface TopBarProps {
  businessName?: string;
}

export function TopBar({ businessName }: TopBarProps) {
  const router = useRouter();
  const [lang, setLang] = useState<'he' | 'en'>('he');

  useEffect(() => {
    const stored = localStorage.getItem('mlai_lang');
    if (stored === 'en' || stored === 'he') setLang(stored);
  }, []);

  function toggleLang() {
    const next = lang === 'he' ? 'en' : 'he';
    setLang(next);
    localStorage.setItem('mlai_lang', next);
  }

  async function handleSignOut() {
    await signOutUser();
    router.replace('/login');
  }

  return (
    <div className="flex items-center justify-between animate-slide-down">
      {/* RIGHT side in RTL: business name */}
      <p className="text-base font-bold text-gray-900 truncate max-w-[55%]">
        {businessName ?? ''}
      </p>

      {/* LEFT side in RTL: language toggle + logout */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggleLang}
          className="press text-xs font-semibold text-gray-500 glass rounded-lg px-2 py-1 select-none"
        >
          {lang === 'he' ? 'עב' : 'EN'}
        </button>
        <button
          onClick={handleSignOut}
          className="press flex items-center gap-1 text-sm text-gray-500 glass rounded-xl px-3 py-1.5"
        >
          יציאה
        </button>
      </div>
    </div>
  );
}
