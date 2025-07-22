
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import { suggestOutfit } from '@/ai/flows/intelligent-outfit-suggestion';
import type { SuggestOutfitInput, SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import { regenerateOutfitPart } from '@/ai/flows/regenerate-outfit-part-flow';
import { generateOutfitFromPhoto } from '@/ai/flows/generate-outfit-from-photo-flow';
import { generateOutfitImage } from '@/ai/flows/generate-outfit-image';
import type { GenerateOutfitFromPhotoOutput, GenerateOutfitFromPhotoInput } from '@/ai/flows/generate-outfit-from-photo-flow.types';

import { OutfitForm } from './outfit-form';
import { OutfitDisplay } from './outfit-display';

// Extended type to include imageDataUri for each part
export type PhotoSuggestionPart = {
    description: string;
    imageDataUri: string;
};
export type PhotoSuggestion = {
    haut: PhotoSuggestionPart;
    bas: PhotoSuggestionPart;
    chaussures: PhotoSuggestionPart;
    accessoires: PhotoSuggestionPart;
};

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
  const [photoSuggestion, setPhotoSuggestion] = useState<PhotoSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const [currentConstraints, setCurrentConstraints] = useState<SuggestOutfitInput | null>(null);
  const [regeneratingPart, setRegeneratingPart] = useState<'haut' | 'bas' | 'chaussures' | 'accessoires' | null>(null);
  const [baseItemPhoto, setBaseItemPhoto] = useState<string | null>(null);

  const getSuggestion = async (input: SuggestOutfitInput & { baseItemPhotoDataUri?: string, baseItemType?: 'haut' | 'bas' | 'chaussures' | 'accessoires' }) => {
    setIsLoading(true);
    // **Crucial: Reset all states to ensure a clean slate for each request**
    setSuggestion(null);
    setPhotoSuggestion(null);
    setBaseItemPhoto(null);
    setCurrentConstraints(null);

    const fullInput: SuggestOutfitInput = { 
      ...input, 
      gender: userProfile?.gender 
    };
    setCurrentConstraints(fullInput);

    try {
      // Logic Path 1: "Compléter ma tenue" (with a photo)
      if (input.baseItemPhotoDataUri && input.baseItemType) {
        setBaseItemPhoto(input.baseItemPhotoDataUri);

        // 1. Get text descriptions for the outfit parts
        const descriptionResult = await generateOutfitFromPhoto({
          baseItemPhotoDataUri: input.baseItemPhotoDataUri,
          baseItemType: input.baseItemType,
          scheduleKeywords: input.scheduleKeywords,
          weather: input.weather,
          occasion: input.occasion,
          preferredColors: input.preferredColors,
          gender: userProfile?.gender,
        });

        // 2. Generate images for each part in parallel
        const partsToGenerate = [
            { key: 'haut', description: descriptionResult.haut.description },
            { key: 'bas', description: descriptionResult.bas.description },
            { key: 'chaussures', description: descriptionResult.chaussures.description },
            { key: 'accessoires', description: descriptionResult.accessoires.description },
        ].filter(p => p.description && p.description !== 'N/A');

        const imagePromises = partsToGenerate.map(part => 
            generateOutfitImage({ itemDescription: part.description, gender: userProfile?.gender })
                .then(imageResult => ({
                    key: part.key,
                    description: part.description,
                    imageDataUri: imageResult.imageDataUri
                }))
                .catch(error => {
                    // If one image fails, we still want to show the others.
                    console.error(`Failed to generate image for ${part.key}:`, error);
                    handleAiError(error, toast);
                    return {
                        key: part.key,
                        description: part.description,
                        imageDataUri: '' // Represents a failed image
                    };
                })
        );
        
        const generatedImages = await Promise.all(imagePromises);

        // 3. Assemble the final photo suggestion object
        const finalPhotoSuggestion: PhotoSuggestion = {
            haut: { description: 'N/A', imageDataUri: '' },
            bas: { description: 'N/A', imageDataUri: '' },
            chaussures: { description: 'N/A', imageDataUri: '' },
            accessoires: { description: 'N/A', imageDataUri: '' },
        };
        
        generatedImages.forEach(image => {
            if (image) {
                finalPhotoSuggestion[image.key as keyof PhotoSuggestion] = {
                    description: image.description,
                    imageDataUri: image.imageDataUri,
                };
            }
        });
        
        // Ensure descriptions are present even if image generation failed
        Object.keys(descriptionResult).forEach(keyStr => {
            const key = keyStr as keyof GenerateOutfitFromPhotoOutput;
            if(descriptionResult[key] && !finalPhotoSuggestion[key].description) {
                finalPhotoSuggestion[key].description = descriptionResult[key].description;
            }
        });
        
        setPhotoSuggestion(finalPhotoSuggestion);
        setSuggestion(null); // CRITICAL: Clear the other suggestion type state
        
      } else {
        // Logic Path 2: "Idée de tenue complète" (text-based)
        setPhotoSuggestion(null); // CRITICAL: Clear the other suggestion type state
        const result = await suggestOutfit(fullInput);
        setSuggestion(result);
      }
      
    } catch (error) {
      handleAiError(error, toast);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegeneratePart = async (part: 'haut' | 'bas' | 'chaussures' | 'accessoires') => {
    if (!currentConstraints || regeneratingPart) return;

    if (baseItemPhoto || photoSuggestion) {
        toast({
            title: "Fonctionnalité non disponible",
            description: "La regénération d'une seule pièce n'est pas encore possible pour les tenues basées sur une photo."
        });
        return;
    }
    
    if (!suggestion) return;

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
          onRegeneratePart={handleRegeneratePart}
          baseItemPhoto={baseItemPhoto}
        />
      </Card>
    </div>
  );
}
