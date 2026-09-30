import OutfitSuggester from '@/components/stylek/outfit-suggester';
import { ApiKeyAlert } from '@/components/stylek/api-key-alert';
import { Sparkles, Compass } from 'lucide-react';

export default function StylekPage() {
  return (
    <div className="space-y-4">
      {/* Editorial Chic Header */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-card/95 to-primary/10 p-4 sm:p-5 shadow-xs backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-3 w-3" />
                Stylek · Vestiaire du Jour
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-headline tracking-tight text-foreground">
              Votre Styliste Météo
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-normal max-w-xl leading-relaxed">
              L'art de s'habiller selon la météo et votre rythme.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-xl bg-background/80 border border-border/60 text-xs font-medium text-foreground/80 shadow-2xs">
            <Compass className="h-3.5 w-3.5 text-primary" />
            <span>Inspirations Prêt-à-Porter</span>
          </div>
        </div>
      </div>

      <ApiKeyAlert />
      <OutfitSuggester />
    </div>
  );
}
