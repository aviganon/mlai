'use client';
import { useRouter, usePathname } from 'next/navigation';

const tabs = [
  { label: 'בית', path: '/home', icon: '🏠' },
  { label: 'ספקים', path: '/suppliers', icon: '🚚' },
  { label: 'הגדרות', path: '/settings', icon: '⚙️' },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 right-0 left-0 bg-white border-t border-gray-100 z-20">
      <div className="flex">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => router.push(tab.path)}
              className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs ${
                active ? 'text-gray-900 font-medium' : 'text-gray-400'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
