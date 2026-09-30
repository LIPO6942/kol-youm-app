'use client';

import { CardContent } from '@/components/ui/card';
import { GeneratedOutfitImage } from './generated-outfit-image';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import { Shirt, Footprints, Sparkles, Layers } from 'lucide-react';

interface GeneratedOutfitDisplayProps {
  suggestion: SuggestOutfitOutput;
  gender?: 'Homme' | 'Femme';
}

export function GeneratedOutfitDisplay({ suggestion, gender }: GeneratedOutfitDisplayProps) {
  const hasPiecesBreakdown = Boolean(
    (suggestion.haut && suggestion.haut !== 'N/A') ||
    (suggestion.bas && suggestion.bas !== 'N/A') ||
    (suggestion.chaussures && suggestion.chaussures !== 'N/A') ||
    (suggestion.accessoires && suggestion.accessoires !== 'N/A')
  );

  return (
    <CardContent className="p-4 sm:p-6 w-full animate-in fade-in-50 space-y-5">
      <div className="text-center space-y-1">
        <h3 className="text-xl sm:text-2xl font-bold font-headline tracking-tight text-foreground">
          Votre Silhouette du Jour
        </h3>
        <p className="text-xs text-muted-foreground font-body">
          Harmonisée selon la météo et votre rythme
        </p>
      </div>

      {/* Main Visual Image Preview */}
      <div className="relative aspect-[3/4] w-full max-w-xs mx-auto bg-secondary/80 rounded-2xl overflow-hidden flex items-center justify-center border border-border/60 shadow-xs">
        <GeneratedOutfitImage description={suggestion.suggestionText} gender={gender} />
      </div>

      {/* 4-Piece Breakdown Cards (Chic & Concrete) */}
      {hasPiecesBreakdown && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-md mx-auto pt-1">
          {suggestion.haut && suggestion.haut !== 'N/A' && (
            <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs space-y-1">
              <div className="flex items-center space-x-1.5 text-primary text-xs font-semibold">
                <Shirt className="h-3.5 w-3.5" />
                <span>Haut</span>
              </div>
              <p className="text-xs text-foreground/90 leading-snug font-medium">
                {suggestion.haut}
              </p>
            </div>
          )}

          {suggestion.bas && suggestion.bas !== 'N/A' && (
            <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs space-y-1">
              <div className="flex items-center space-x-1.5 text-primary text-xs font-semibold">
                <Layers className="h-3.5 w-3.5" />
                <span>Bas</span>
              </div>
              <p className="text-xs text-foreground/90 leading-snug font-medium">
                {suggestion.bas}
              </p>
            </div>
          )}

          {suggestion.chaussures && suggestion.chaussures !== 'N/A' && (
            <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs space-y-1">
              <div className="flex items-center space-x-1.5 text-primary text-xs font-semibold">
                <Footprints className="h-3.5 w-3.5" />
                <span>Chaussures</span>
              </div>
              <p className="text-xs text-foreground/90 leading-snug font-medium">
                {suggestion.chaussures}
              </p>
            </div>
          )}

          {suggestion.accessoires && suggestion.accessoires !== 'N/A' && (
            <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs space-y-1">
              <div className="flex items-center space-x-1.5 text-primary text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Accessoires</span>
              </div>
              <p className="text-xs text-foreground/90 leading-snug font-medium">
                {suggestion.accessoires}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Stylist Summary note */}
      <div className="max-w-md mx-auto rounded-xl bg-muted/40 border border-border/50 p-3.5 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Note de Style
        </p>
        <p className="text-xs sm:text-sm text-foreground/90 italic leading-relaxed">
          "{suggestion.suggestionText}"
        </p>
      </div>
    </CardContent>
  );
}
