import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="absolute top-8">
            <h1 className="text-3xl font-headline font-bold text-center text-primary-foreground select-none bg-primary px-4 py-2 rounded-lg shadow-md">
                kol youm
            </h1>
        </div>
        <div className="w-full max-w-md">
            {children}
        </div>
    </div>
  );
}
