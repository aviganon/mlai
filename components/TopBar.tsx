'use client';
import { useRouter } from 'next/navigation';
import { signOutUser } from '@/lib/auth';

interface TopBarProps {
  businessName?: string;
}

export function TopBar({ businessName }: TopBarProps) {
  const router = useRouter();

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

      {/* LEFT side in RTL: language + logout */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-400 glass rounded-lg px-2 py-1 select-none">
          עב
        </span>
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
