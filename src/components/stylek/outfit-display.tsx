
'use client';

import Image from 'next/image';
import { Loader2, Wand2, Shirt, Milestone, Footprints, Gem } from 'lucide-react';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import type { GenerateOutfitFromPhotoOutput } from '@/ai/flows/generate-outfit-from-photo-flow.types';

import { CardContent } from '@/components/ui/card';
import { GeneratedOutfitImage } from './generated-outfit-image';

interface OutfitDisplayProps {
  isLoading: boolean;
  suggestion: SuggestOutfitOutput | null;
  photoSuggestion: GenerateOutfitFromPhotoOutput | null;
  gender?: 'Homme' | 'Femme';
  regeneratingPart: 'haut' | 'bas' | 'chaussures' | 'accessoires' | null;
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

const SuggestedItem = ({ item }: { item: { description: string, imageDataUri: string }}) => {
    if (!item?.imageDataUri) return null;
    return (
        <div className="relative aspect-[3/4] w-full bg-secondary rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
            <Image src={item.imageDataUri} alt={item.description} fill className="object-cover" />
        </div>
    );
};

export function OutfitDisplay({ isLoading, suggestion, photoSuggestion, gender, regeneratingPart, onRegeneratePart, baseItemPhoto }: OutfitDisplayProps) {

  if (isLoading) {
    return renderLoading();
  }

  if (!suggestion) {
    return renderPlaceholder();
  }

  // New layout for when the suggestion is based on a user's photo
  if (baseItemPhoto && photoSuggestion) {
     const suggestedParts = [photoSuggestion.haut, photoSuggestion.bas, photoSuggestion.chaussures, photoSuggestion.accessoires];
     return (
        <CardContent className="p-4 sm:p-6 w-full">
            <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue Personnalisée</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                {/* AI Suggestions (Left, Larger) */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <h4 className="col-span-2 font-semibold text-center text-muted-foreground">Suggestions de l'IA</h4>
                    {suggestedParts.map((item, index) => item.imageDataUri && <SuggestedItem key={index} item={item} />)}
                </div>

                {/* User's Item and full description (Right, Smaller) */}
                <div className="space-y-4">
                    <h4 className="font-semibold text-center text-muted-foreground">Votre Pièce</h4>
                    <div className="relative aspect-[3/4] w-full bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
                        <Image src={baseItemPhoto} alt="Votre pièce de base" fill className="object-cover" />
                    </div>
                    <div className="space-y-3 text-sm">
                        {[
                            { Icon: Shirt, label: 'Haut', text: photoSuggestion.haut.description },
                            { Icon: Milestone, label: 'Bas', text: photoSuggestion.bas.description },
                            { Icon: Footprints, label: 'Chaussures', text: photoSuggestion.chaussures.description },
                            { Icon: Gem, label: 'Accessoires', text: photoSuggestion.accessoires.description },
                        ].map(({ Icon, label, text }) => (
                            text && text !== 'N/A' && (
                                <div key={label} className="p-2 bg-muted/50 rounded-md">
                                    <p className="font-semibold text-muted-foreground flex items-center gap-2"><Icon className="w-4 h-4"/> {label}</p>
                                    <p className="pl-6">{text}</p>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
        </CardContent>
     )
  }

  // Default display: generated full outfit image (text-based suggestion)
  return (
    <CardContent className="p-4 sm:p-6 w-full">
      <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue du Jour</h3>
      <div className="relative aspect-[3/4] w-full max-w-sm mx-auto bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
        <GeneratedOutfitImage description={suggestion.suggestionText} gender={gender} />
      </div>

      {/* Regeneration UI (only for text-based suggestions for now) */}
      <div className="mt-6 max-w-sm mx-auto">
        <p className="text-sm font-semibold text-muted-foreground">Détails de la tenue :</p>
        <p className="text-sm text-foreground mt-1 mb-4 italic">"{suggestion.suggestionText}"</p>
      </div>
    </CardContent>
  );
}
