
'use client';

import { Loader2, Wand2 } from 'lucide-react';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import type { PhotoSuggestion } from './outfit-suggester';

import { CardContent } from '@/components/ui/card';
import { PhotoOutfitDisplay } from './photo-outfit-display';
import { GeneratedOutfitDisplay } from './generated-outfit-display';

interface OutfitDisplayProps {
  isLoading: boolean;
  suggestion: SuggestOutfitOutput | null;
  photoSuggestion: PhotoSuggestion | null;
  gender?: 'Homme' | 'Femme';
  onRegeneratePart: (part: 'haut' | 'bas' | 'chaussures' | 'accessoires') => void;
  baseItemPhoto: string | null;
}

const renderLoading = () => (
    <CardContent className="flex flex-col items-center text-muted-foreground p-8 text-center h-full justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-lg">Votre styliste IA réfléchit...</p>
        <p className="text-sm">La génération d'images peut prendre un moment.</p>
    </CardContent>
);

const renderPlaceholder = () => (
    <CardContent className="flex flex-col items-center text-muted-foreground p-8 text-center h-full justify-center">
        <Wand2 className="h-12 w-12 mx-auto" />
        <p className="mt-4 text-lg">Votre suggestion de tenue apparaîtra ici.</p>
        <p className="text-sm">Remplissez le formulaire et lancez la magie !</p>
    </CardContent>
);

export function OutfitDisplay({ isLoading, suggestion, photoSuggestion, gender, onRegeneratePart, baseItemPhoto }: OutfitDisplayProps) {

  if (isLoading) {
    return renderLoading();
  }

  // Path 1: Display for "Compléter ma tenue"
  // This is the primary check. If we have the result for this specific feature, we render its dedicated component.
  if (baseItemPhoto && photoSuggestion) {
    return (
        <PhotoOutfitDisplay 
            photoSuggestion={photoSuggestion}
            baseItemPhoto={baseItemPhoto}
        />
    );
  }
  
  // Path 2: Display for "Idée de tenue complète"
  if (suggestion) {
    return (
        <GeneratedOutfitDisplay 
            suggestion={suggestion}
            gender={gender}
        />
    );
  }

  // Fallback to placeholder if no data is available
  return renderPlaceholder();
}
