import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ResponsiveToaster } from '@/components/providers/ResponsiveToaster';

export const metadata: Metadata = {
  title: 'Lost & Found | PT. Vinix Seven Aurum',
  description: 'Sistem internal Lost & Found PT. Vinix Seven Aurum untuk melaporkan, melacak, dan mengklaim barang hilang atau temuan di lingkungan kantor.',
  applicationName: 'Vinix Lost & Found',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Vinix L&F',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#123356',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen flex flex-col bg-[#f5f5f7] text-[#1d1d1f] antialiased selection:bg-sky-500 selection:text-white touch-manipulation">
        <QueryProvider>
          <Suspense fallback={<div className="h-16 bg-white/80" />}>
            <Navbar />
          </Suspense>
          <main className="flex-1 w-full">
            {children}
          </main>
          <Footer />
          <ResponsiveToaster />
        </QueryProvider>
      </body>
    </html>
  );
}
