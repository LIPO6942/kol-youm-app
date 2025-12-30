
'use client';

import { Loader2, Wand2 } from 'lucide-react';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import type { PhotoSuggestion, OutfitPart } from './outfit-suggester';

import { CardContent } from '@/components/ui/card';
import { PhotoOutfitDisplay } from './photo-outfit-display';
import { GeneratedOutfitDisplay } from './generated-outfit-display';

interface OutfitDisplayProps {
  isLoading: boolean;
  suggestion: SuggestOutfitOutput | null;
  photoSuggestion: PhotoSuggestion | null;
  gender?: 'Homme' | 'Femme';
  onRegeneratePart: (part: OutfitPart) => void;
  regeneratingPart: OutfitPart | null;
  baseItemPhoto: string | null;
}

const renderLoading = () => (
  <CardContent className="flex flex-col items-center text-muted-foreground p-8 text-center h-full justify-center">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
    <p className="mt-4 text-lg">Votre styliste IA compose votre tenue...</p>
    <p className="text-sm">Nous insistons auprès de l'IA pour obtenir le meilleur résultat, merci de patienter un instant.</p>
  </CardContent>
);

const renderPlaceholder = () => (
  <CardContent className="flex flex-col items-center text-muted-foreground p-8 text-center h-full justify-center">
    <Wand2 className="h-12 w-12 mx-auto" />
    <p className="mt-4 text-lg">Votre suggestion de tenue apparaîtra ici.</p>
    <p className="text-sm">Remplissez le formulaire et lancez la magie !</p>
  </CardContent>
);

export function OutfitDisplay({ isLoading, suggestion, photoSuggestion, gender, onRegeneratePart, regeneratingPart, baseItemPhoto }: OutfitDisplayProps) {

  if (isLoading) {
    return renderLoading();
  }

  if (baseItemPhoto && photoSuggestion) {
    return (
      <PhotoOutfitDisplay
        photoSuggestion={photoSuggestion}
        baseItemPhoto={baseItemPhoto}
        onRegeneratePart={onRegeneratePart}
        regeneratingPart={regeneratingPart}
      />
    );
  }

  if (suggestion) {
    return (
      <GeneratedOutfitDisplay
        suggestion={suggestion}
        gender={gender}
      />
    );
  }

  return renderPlaceholder();
}
