
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Palette, Film, BrainCircuit, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

const navItems = [
  { href: '/stylek', label: 'Stylek', icon: Palette },
  { href: '/tfarrej', label: 'Tfarrej', icon: Film },
  { href: '/5amem', label: '5amem', icon: BrainCircuit },
  { href: '/khrouj', label: 'Khrouj', icon: MapPin },
];

export default function BottomNav() {
  const pathname = usePathname();

  useEffect(() => {
    // List of all possible theme classes
    const themeClasses = navItems.map(item => `theme-${item.href.slice(1)}`);
    
    // Remove any existing theme classes from the body
    document.body.classList.remove(...themeClasses, 'theme-profil', 'theme-settings', 'theme-stylek', 'theme-wardrobe'); 

    // Find the current section and add its theme class
    const section = navItems.find(item => pathname.startsWith(item.href));
    if (section) {
        const themeClass = `theme-${section.href.slice(1)}`; 
        document.body.classList.add(themeClass);
    } else if (pathname.startsWith('/settings') || pathname.startsWith('/wardrobe')) {
        // Special case for settings page since it's not in navItems anymore
        document.body.classList.add('theme-stylek');
    } else {
        // Apply a default theme if no section matches
        document.body.classList.add('theme-stylek');
    }
  }, [pathname]);


  return (
    <nav className="sticky bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-4 h-16">
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
