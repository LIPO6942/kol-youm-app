
'use client';

import { CardContent } from '@/components/ui/card';
import { GeneratedOutfitImage } from './generated-outfit-image';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';


interface GeneratedOutfitDisplayProps {
  suggestion: SuggestOutfitOutput;
  gender?: 'Homme' | 'Femme';
}

export function GeneratedOutfitDisplay({ suggestion, gender }: GeneratedOutfitDisplayProps) {
  return (
    <CardContent className="p-4 sm:p-6 w-full animate-in fade-in-50">
        <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue du Jour</h3>
        <div className="relative aspect-[3/4] w-full max-w-sm mx-auto bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
            <GeneratedOutfitImage description={suggestion.suggestionText} gender={gender} />
        </div>

        <div className="mt-6 max-w-sm mx-auto">
            <p className="text-sm font-semibold text-muted-foreground">Détails de la tenue :</p>
            <p className="text-sm text-foreground mt-1 mb-4 italic">"{suggestion.suggestionText}"</p>
        </div>
    </CardContent>
  );
}
