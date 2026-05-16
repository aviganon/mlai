import { BottomNav } from '@/components/BottomNav';
export default function SuppliersPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 px-4 pt-12 pb-4">
        <h1 className="text-xl font-semibold text-right">ספקים</h1>
      </div>
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">ספקים יתווספו בשלב הבא</p>
      </div>
      <BottomNav />
    </div>
  );
}
