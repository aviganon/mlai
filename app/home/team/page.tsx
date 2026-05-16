'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useBusiness } from '@/hooks/useBusiness';
import { getOrCreateInviteCode, getTeamMembers, removeTeamMember } from '@/lib/firestore';
import { BottomNav } from '@/components/BottomNav';
import { BusinessMember } from '@/types';

export default function TeamPage() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const isOwner = business?.ownerId === user?.uid;

  useEffect(() => {
    if (!business) { setLoading(false); return; }
    setMembers(getTeamMembers(business));
    if (isOwner) {
      getOrCreateInviteCode(business.id).then(setInviteCode).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [business, isOwner]);

  async function handleCopy() {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleRemove(uid: string) {
    if (!business) return;
    await removeTeamMember(business.id, uid);
    setMembers((prev) => prev.filter((m) => m.uid !== uid));
    setConfirmRemove(null);
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin-smooth" />
    </div>
  );

  return (
    <div className="min-h-screen pb-28">
      <div className="glass-strong sticky top-0 z-10 px-4 pt-12 pb-4 animate-slide-down flex items-center gap-3">
        <button onClick={() => router.back()} className="press w-9 h-9 rounded-xl bg-white/70 border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm">←</button>
        <div className="flex-1 text-right">
          <h1 className="text-xl font-bold text-gray-900">הצוות שלי</h1>
          <p className="text-xs text-gray-400">{members.length + 1} חברי צוות</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 animate-slide-up">
        {/* Invite code - owner only */}
        {isOwner && inviteCode && (
          <div className="glass rounded-2xl p-5 text-center space-y-3">
            <p className="text-sm font-semibold text-gray-700">קוד הצטרפות לעסק</p>
            <div className="bg-white/80 rounded-2xl py-4 px-6 border border-gray-100">
              <p className="text-4xl font-bold tracking-widest text-gray-900 font-mono">{inviteCode}</p>
            </div>
            <p className="text-xs text-gray-400">שתף את הקוד עם עובדים שתרצה להוסיף</p>
            <button onClick={handleCopy} className="press w-full py-3 rounded-xl bg-gray-900 text-white text-sm font-medium">
              {copied ? '✓ הועתק!' : '📋 העתק קוד'}
            </button>
          </div>
        )}

        {/* Owner badge */}
        <div className="glass rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">{(user?.displayName ?? user?.email ?? '?')[0].toUpperCase()}</span>
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-semibold text-gray-900">{user?.displayName ?? 'אתה'}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-1 rounded-full font-medium">מנהל</span>
        </div>

        {/* Members list */}
        {members.map((m) => (
          <div key={m.uid} className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in">
            <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-500 text-sm font-bold">{(m.displayName ?? m.email ?? '?')[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 text-right min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{m.displayName ?? m.email}</p>
              <p className="text-xs text-gray-400 truncate">{m.email}</p>
            </div>
            {isOwner && (
              confirmRemove === m.uid ? (
                <div className="flex gap-1.5">
                  <button onClick={() => setConfirmRemove(null)} className="press px-2 py-1 rounded-lg border border-gray-200 text-xs bg-white">לא</button>
                  <button onClick={() => handleRemove(m.uid)} className="press px-2 py-1 rounded-lg bg-red-500 text-white text-xs">הסר</button>
                </div>
              ) : (
                <button onClick={() => setConfirmRemove(m.uid)} className="press text-xs text-red-400 border border-red-100 bg-red-50 px-2.5 py-1 rounded-xl">הסר</button>
              )
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="mb-1">עדיין אין עובדים</p>
            <p className="text-xs">שתף את קוד ההצטרפות עם העובדים שלך</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
