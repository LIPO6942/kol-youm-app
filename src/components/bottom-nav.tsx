
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Palette, Film, BrainCircuit, MapPin, MapPinPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

export function getKhroujCurrentSeason(): 'winter' | 'spring' | 'summer' | 'autumn' {
  const month = new Date().getMonth();
  if (month === 11 || month === 0 || month === 1) return 'winter';
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  return 'autumn';
}

const seasonalKhroujClasses = [
  'theme-khrouj-winter',
  'theme-khrouj-spring',
  'theme-khrouj-summer',
  'theme-khrouj-autumn'
];

export default function BottomNav() {
  const pathname = usePathname();

  useEffect(() => {
    const themeClasses = ['theme-stylek', 'theme-tfarrej', 'theme-5amem', 'theme-khrouj', ...seasonalKhroujClasses];
    
    // Remove any existing theme classes from the body
    document.body.classList.remove(...themeClasses, 'theme-profil', 'theme-settings', 'theme-wardrobe'); 

    // Find the current section and add its theme class
    if (pathname.startsWith('/stylek')) {
      document.body.classList.add('theme-stylek');
    } else if (pathname.startsWith('/tfarrej')) {
      document.body.classList.add('theme-tfarrej');
    } else if (pathname.startsWith('/5amem')) {
      document.body.classList.add('theme-5amem');
    } else if (pathname.startsWith('/khrouj')) {
      const season = getKhroujCurrentSeason();
      document.body.classList.add('theme-khrouj', `theme-khrouj-${season}`);
    } else {
      document.body.classList.add('theme-stylek');
    }
  }, [pathname]);

  const isStylekActive = pathname.startsWith('/stylek');
  const isTfarrejActive = pathname.startsWith('/tfarrej');
  const is5amemActive = pathname.startsWith('/5amem');
  const isKhroujActive = pathname.startsWith('/khrouj') && !pathname.includes('open=add-pepite');

  return (
    <nav className="sticky bottom-0 z-30 bg-background/85 backdrop-blur-md border-t border-border/60 shadow-lg">
      <div className="container mx-auto px-2 sm:px-6 lg:px-8">
        <div className="grid grid-cols-5 h-16 items-center">
          {/* 1. Stylek */}
          <Link
            href="/stylek"
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              isStylekActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Palette className="h-5 w-5" strokeWidth={isStylekActive ? 2.5 : 2} />
            <span className="text-[11px]">Stylek</span>
          </Link>

          {/* 2. Tfarrej */}
          <Link
            href="/tfarrej"
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              isTfarrejActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Film className="h-5 w-5" strokeWidth={isTfarrejActive ? 2.5 : 2} />
            <span className="text-[11px]">Tfarrej</span>
          </Link>

          {/* 3. Action Centrale : + Pépite */}
          <Link
            href="/khrouj?open=add-pepite"
            className="flex flex-col items-center justify-center gap-0.5 text-xs font-medium group transition-transform active:scale-95"
            aria-label="Ajouter une pépite"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary/25 group-hover:scale-110 transition-transform">
              <MapPinPlus className="h-5 w-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] font-bold text-primary tracking-tight">+ Pépite</span>
          </Link>

          {/* 4. 5amem */}
          <Link
            href="/5amem"
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              is5amemActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <BrainCircuit className="h-5 w-5" strokeWidth={is5amemActive ? 2.5 : 2} />
            <span className="text-[11px]">5amem</span>
          </Link>

          {/* 5. Khrouj */}
          <Link
            href="/khrouj"
            className={cn(
              'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
              isKhroujActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <MapPin className="h-5 w-5" strokeWidth={isKhroujActive ? 2.5 : 2} />
            <span className="text-[11px]">Khrouj</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
