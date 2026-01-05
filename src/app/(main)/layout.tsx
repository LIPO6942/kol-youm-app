```
'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import BottomNav from '@/components/bottom-nav';
import { Loader2, Settings, Shirt } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NavigationEvents } from '@/components/navigation-events';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { user, userProfile, loading } = useAuth();
  const pathname = usePathname();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <Suspense fallback={null}>
          <NavigationEvents />
        </Suspense>
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (userProfile && !userProfile.personalizationComplete) {
    // Render children if on personalize page, otherwise show loader while redirecting
    return (
       <>
         <Suspense fallback={null}>
            <NavigationEvents />
         </Suspense>
         {pathname === '/personalize' ? (
           <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
         ) : (
          <div className="flex items-center justify-center h-screen bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
         )}
       </>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Suspense fallback={null}>
        <NavigationEvents />
      </Suspense>

      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
                <Link href="/wardrobe" passHref>
                    <Button variant="ghost" size="icon">
                        <Shirt className="h-6 w-6" />
                        <span className="sr-only">Garde-Robe</span>
                    </Button>
                </Link>
            </div>
            <Link href="/stylek" className="cursor-pointer">
                <h1 className="text-2xl font-headline font-bold text-center text-primary-foreground select-none bg-primary px-4 py-1 rounded-lg shadow-sm">
                  kol youm
                </h1>
            </Link>
             <div className="flex items-center gap-2">
                <Link href="/settings" passHref>
                    <Button variant="ghost" size="icon">
                        <Settings className="h-6 w-6" />
                        <span className="sr-only">Paramètres</span>
                    </Button>
                </Link>
             </div>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
