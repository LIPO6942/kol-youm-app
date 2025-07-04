'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Shirt, Film, BrainCircuit } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/stylek', label: 'Style', icon: Shirt },
  { href: '/tfarrej', label: 'Ciné', icon: Film },
  { href: '/5amem', label: 'Esprit', icon: BrainCircuit },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t md:hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 h-16">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon
                  className="h-6 w-6"
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
