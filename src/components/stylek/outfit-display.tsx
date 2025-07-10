'use client';

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
}

export function OutfitDisplay({ isLoading, suggestion, gender, regeneratingPart, onRegeneratePart }: OutfitDisplayProps) {

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

  return (
    <CardContent className="p-4 sm:p-6 w-full">
      <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue du Jour</h3>
      <div className="relative aspect-[3/4] w-full max-w-sm mx-auto bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
        <GeneratedOutfitImage description={suggestion.suggestionText} gender={gender} />
      </div>

      <div className="mt-6 space-y-3">
         {[
            { key: 'haut', label: 'Haut' },
            { key: 'bas', label: 'Bas' },
            { key: 'chaussures', label: 'Chaussures' },
            { key: 'accessoires', label: 'Accessoires' },
        ] as const
        .filter(item => suggestion[item.key] && suggestion[item.key] !== 'N/A')
        .map(({ key, label }) => (
            <div key={key} className="p-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex justify-between items-center mb-1">
                    <p className="font-semibold text-muted-foreground">{label}</p>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7" 
                        onClick={() => onRegeneratePart(key)} 
                        disabled={!!regeneratingPart}
                        aria-label={`Regénérer ${label}`}
                    >
                        {regeneratingPart === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                    </Button>
                </div>
                <p className="font-medium">{suggestion[key]}</p>
            </div>
        ))}
      </div>
    </CardContent>
  );
}
