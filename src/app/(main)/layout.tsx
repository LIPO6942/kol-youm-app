import type { ReactNode } from 'react';
import BottomNav from '@/components/bottom-nav';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <h1 className="text-2xl font-headline font-bold text-center text-primary-foreground select-none bg-primary px-4 py-1 rounded-lg shadow-sm">
              kol youm
            </h1>
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
