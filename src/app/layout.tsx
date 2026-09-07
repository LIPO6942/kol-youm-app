import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/hooks/use-auth';
import { ToastProvider } from '@/hooks/use-toast';

export const metadata: Metadata = {
  title: 'kol youm',
  description: 'Un assistant personnel intelligent qui transforme la routine en opportunité de découverte.',
  manifest: '/manifest.json',
  themeColor: '#A98DDE',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var i = 0; i < registrations.length; i++) {
                    var reg = registrations[i];
                    var swUrl = (reg.active && reg.active.scriptURL) || (reg.waiting && reg.waiting.scriptURL) || (reg.installing && reg.installing.scriptURL) || '';
                    if (swUrl && swUrl.indexOf('firebase-messaging-sw') !== -1) {
                      continue;
                    }
                    reg.unregister();
                  }
                }).catch(function(err) {});
              }
            `,
          }}
        />
        <ToastProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
