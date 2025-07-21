
'use client';

import Image from 'next/image';
import { Loader2, Wand2, RotateCw } from 'lucide-react';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';

import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GeneratedOutfitImage } from './generated-outfit-image';

interface OutfitDisplayProps {
  isLoading: boolean;
  suggestion: SuggestOutfitOutput | null;
  gender?: 'Homme' | 'Femme';
  regeneratingPart: 'haut' | 'bas' | 'chaussures' | 'accessoires' | null;
  onRegeneratePart: (part: 'haut' | 'bas' | 'chaussures' | 'accessoires') => void;
  baseItemPhoto: string | null;
}

export function OutfitDisplay({ isLoading, suggestion, gender, regeneratingPart, onRegeneratePart, baseItemPhoto }: OutfitDisplayProps) {

  if (isLoading && !suggestion) {
    return (
      <CardContent className="flex flex-col items-center text-muted-foreground p-8 text-center h-full justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-lg">Votre styliste IA réfléchit...</p>
        <p className="text-sm">Cela peut prendre quelques secondes.</p>
      </CardContent>
    );
  }

  if (!suggestion) {
    return (
      <CardContent className="flex flex-col items-center text-muted-foreground p-8 text-center h-full justify-center">
        <Wand2 className="h-12 w-12 mx-auto" />
        <p className="mt-4 text-lg">Votre suggestion de tenue apparaîtra ici.</p>
        <p className="text-sm">Remplissez le formulaire et lancez la magie !</p>
      </CardContent>
    );
  }

  const outfitParts: { key: keyof SuggestOutfitOutput; label: string }[] = [
    { key: 'haut', label: 'Haut' },
    { key: 'bas', label: 'Bas' },
    { key: 'chaussures', label: 'Chaussures' },
    { key: 'accessoires', label: 'Accessoires' },
  ];

  // If a base photo is provided, display the new layout
  if (baseItemPhoto) {
     return (
        <CardContent className="p-4 sm:p-6 w-full">
            <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue du Jour</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                {/* User's Item */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-center text-muted-foreground">Votre pièce</h4>
                    <div className="relative aspect-[3/4] w-full bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                        <Image src={baseItemPhoto} alt="Votre pièce de base" fill className="object-cover" />
                    </div>
                </div>
                
                {/* AI Suggestions */}
                <div className="space-y-2">
                    <h4 className="font-semibold text-center text-muted-foreground">Suggestions de l'IA</h4>
                     <div className="space-y-3">
                        {outfitParts.map(({ key, label }) => {
                        const value = suggestion[key];
                        if (!value || value === 'N/A') {
                            return null;
                        }
                        return (
                            <div key={key} className="p-3 bg-muted/50 rounded-lg text-sm">
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold text-muted-foreground">{label}</p>
                                <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onRegeneratePart(key as 'haut' | 'bas' | 'chaussures' | 'accessoires')}
                                disabled={!!regeneratingPart}
                                aria-label={`Regénérer ${label}`}
                                >
                                {regeneratingPart === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="font-medium">{value}</p>
                            </div>
                        );
                        })}
                    </div>
                </div>
            </div>
        </CardContent>
     )
  }

  // Default display: generated full outfit image
  return (
    <CardContent className="p-4 sm:p-6 w-full">
      <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue du Jour</h3>
      <div className="relative aspect-[3/4] w-full max-w-sm mx-auto bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
        <GeneratedOutfitImage description={suggestion.suggestionText} gender={gender} />
      </div>

      <div className="mt-6 space-y-3">
        {outfitParts.map(({ key, label }) => {
          const value = suggestion[key];
          if (!value || value === 'N/A') {
            return null;
          }
          return (
            <div key={key} className="p-3 bg-muted/50 rounded-lg text-sm">
              <div className="flex justify-between items-center mb-1">
                <p className="font-semibold text-muted-foreground">{label}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onRegeneratePart(key as 'haut' | 'bas' | 'chaussures' | 'accessoires')}
                  disabled={!!regeneratingPart}
                  aria-label={`Regénérer ${label}`}
                >
                  {regeneratingPart === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                </Button>
              </div>
              <p className="font-medium">{value}</p>
            </div>
          );
        })}
      </div>
    </CardContent>
  );
}
