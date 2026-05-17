import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

const heebo = Heebo({
  subsets: ['latin', 'hebrew'],
  variable: '--font-heebo',
});

export const metadata: Metadata = {
  title: 'Mlai - ניהול מלאי פשוט',
  description: 'מערכת ניהול מלאי לעסקים',
};

export const viewport: Viewport = {
  themeColor: '#f5f3ef',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="bg-background">
      <body className={`${heebo.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
