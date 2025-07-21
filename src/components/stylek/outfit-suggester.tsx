
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import { suggestOutfit } from '@/ai/flows/intelligent-outfit-suggestion';
import type { SuggestOutfitInput, SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import { regenerateOutfitPart } from '@/ai/flows/regenerate-outfit-part-flow';
import { generateOutfitFromPhoto } from '@/ai/flows/generate-outfit-from-photo-flow';
import type { GenerateOutfitFromPhotoOutput } from '@/ai/flows/generate-outfit-from-photo-flow.types';

import { OutfitForm } from './outfit-form';
import { OutfitDisplay } from './outfit-display';

const handleAiError = (error: any, toast: any) => {
    const errorMessage = error.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast({
            variant: 'destructive',
            title: 'L\'IA est très demandée !',
            description: "Nous avons atteint notre limite de requêtes. L'IA se repose un peu, réessayez dans quelques minutes.",
        });
    } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
         toast({
            variant: 'destructive',
            title: 'L\'IA est en surchauffe !',
            description: "Nos serveurs sont un peu surchargés. Donnez-lui un instant pour reprendre son souffle et réessayez.",
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Erreur',
            description: "Une erreur inattendue s'est produite. Veuillez réessayer.",
        });
    }
    console.error(error);
};


export default function OutfitSuggester() {
  const { userProfile } = useAuth();
  const [suggestion, setSuggestion] = useState<SuggestOutfitOutput | null>(null);
  const [photoSuggestion, setPhotoSuggestion] = useState<GenerateOutfitFromPhotoOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [currentConstraints, setCurrentConstraints] = useState<SuggestOutfitInput | null>(null);
  const [regeneratingPart, setRegeneratingPart] = useState<'haut' | 'bas' | 'chaussures' | 'accessoires' | null>(null);
  const [baseItemPhoto, setBaseItemPhoto] = useState<string | null>(null);

  const getSuggestion = async (input: SuggestOutfitInput) => {
    setIsLoading(true);
    setSuggestion(null);
    setCurrentConstraints(null);
    setBaseItemPhoto(null);
    setPhotoSuggestion(null);

    const fullInput: SuggestOutfitInput = { 
      ...input, 
      gender: userProfile?.gender 
    };

    try {
      // If a photo is provided, use the new dedicated flow
      if (input.baseItemPhotoDataUri) {
        setBaseItemPhoto(input.baseItemPhotoDataUri);
        const result = await generateOutfitFromPhoto({
          baseItemPhotoDataUri: input.baseItemPhotoDataUri,
          scheduleKeywords: input.scheduleKeywords,
          weather: input.weather,
          occasion: input.occasion,
          preferredColors: input.preferredColors,
          gender: userProfile?.gender,
        });
        setPhotoSuggestion(result);
        // We still set a text-based suggestion for consistency in regeneration logic
        setSuggestion({
            haut: result.haut.description,
            bas: result.bas.description,
            chaussures: result.chaussures.description,
            accessoires: result.accessoires.description,
            suggestionText: 'Tenue complète générée à partir d\'une photo.',
        });

      } else {
        // Otherwise, use the text-based flow
        const result = await suggestOutfit(fullInput);
        setSuggestion(result);
      }
      setCurrentConstraints(fullInput);
    } catch (error) {
      handleAiError(error, toast);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePart = async (part: 'haut' | 'bas' | 'chaussures' | 'accessoires') => {
    if (!currentConstraints || !suggestion || regeneratingPart) return;

    // Regeneration is text-based for now.
    // To support image regeneration, this would need to call a different flow.
    if (baseItemPhoto) {
        toast({
            title: "Non implémenté",
            description: "La regénération d'une seule pièce n'est pas encore disponible pour les tenues basées sur une photo."
        });
        return;
    }

    setRegeneratingPart(part);
    try {
      const newSuggestion = await regenerateOutfitPart({
        originalConstraints: currentConstraints,
        currentOutfit: suggestion,
        partToChange: part,
      });
      setSuggestion(newSuggestion);
    } catch (error) {
      handleAiError(error, toast);
    } finally {
      setRegeneratingPart(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <OutfitForm 
          isLoading={isLoading} 
          onSuggestOutfit={getSuggestion} 
        />
      </Card>

      <Card className="min-h-[600px] flex flex-col justify-center items-center sticky top-24">
        <OutfitDisplay
          isLoading={isLoading}
          suggestion={suggestion}
          photoSuggestion={photoSuggestion}
          gender={userProfile?.gender}
          regeneratingPart={regeneratingPart}
          onRegeneratePart={handleRegeneratePart}
          baseItemPhoto={baseItemPhoto}
        />
      </Card>
    </div>
  );
}
