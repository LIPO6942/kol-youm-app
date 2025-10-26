
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

import { suggestOutfit } from '@/ai/flows/intelligent-outfit-suggestion-fixed';
import type { SuggestOutfitInput, SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import { generateOutfitFromPhoto } from '@/ai/flows/generate-outfit-from-photo-flow-fixed';
import { generateOutfitImage } from '@/ai/flows/generate-outfit-image-hf';
import type { GenerateOutfitFromPhotoOutput, GenerateOutfitFromPhotoInput } from '@/ai/flows/generate-outfit-from-photo-flow.types';
import { regeneratePhotoOutfitPart } from '@/ai/flows/regenerate-photo-outfit-part-flow-fixed';

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
export type OutfitPart = keyof PhotoSuggestion;


const handleAiError = (error: any, toast: any) => {
    const errorMessage = String(error.message || '');
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast({
            variant: 'destructive',
            title: 'L\'IA est très demandée !',
            description: "Nous avons atteint notre limite de requêtes. L'IA se repose un peu, réessayez dans quelques minutes.",
        });
    } else if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable')) {
         toast({
            variant: 'destructive',
            title: 'L\'IA est en surchauffe !',
            description: "Nos serveurs sont un peu surchargés. Donnez-lui un instant pour reprendre son souffle et réessayez.",
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Erreur Inattendue',
            description: "Une erreur s'est produite. Veuillez réessayer.",
        });
    }
    console.error(error);
};


export default function OutfitSuggester() {
  const { userProfile } = useAuth();
  const [suggestion, setSuggestion] = useState<SuggestOutfitOutput | null>(null);
  const [photoSuggestion, setPhotoSuggestion] = useState<PhotoSuggestion | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const [currentPhotoConstraints, setCurrentPhotoConstraints] = useState<GenerateOutfitFromPhotoInput | null>(null);
  const [regeneratingPart, setRegeneratingPart] = useState<OutfitPart | null>(null);
  const [baseItemPhoto, setBaseItemPhoto] = useState<string | null>(null);

  const getSuggestion = async (input: SuggestOutfitInput & { baseItemPhotoDataUri?: string, baseItemType?: 'haut' | 'bas' | 'chaussures' | 'accessoires' }) => {
    setIsGenerating(true);
    setSuggestion(null);
    setPhotoSuggestion(null);
    setBaseItemPhoto(null);
    setCurrentPhotoConstraints(null);

    const commonInput = {
      scheduleKeywords: input.scheduleKeywords,
      weather: input.weather,
      occasion: input.occasion,
      preferredColors: input.preferredColors,
      gender: userProfile?.gender,
    };

    try {
      if (input.baseItemPhotoDataUri && input.baseItemType) {
        const photoInput: GenerateOutfitFromPhotoInput = {
          ...commonInput,
          baseItemPhotoDataUri: input.baseItemPhotoDataUri,
          baseItemType: input.baseItemType,
        };
        setCurrentPhotoConstraints(photoInput);
        setBaseItemPhoto(input.baseItemPhotoDataUri);

        const descriptionResult = await generateOutfitFromPhoto(photoInput);

        const partsToGenerate = Object.entries(descriptionResult)
            .map(([key, value]) => ({ key: key as OutfitPart, description: value.description }))
            .filter(p => p.description && p.description !== 'N/A');

        const imagePromises = partsToGenerate.map(part => 
            generateOutfitImage({ itemDescription: part.description, gender: userProfile?.gender })
                .then(imageResult => ({
                    key: part.key,
                    description: part.description,
                    imageDataUri: imageResult.imageDataUri
                }))
                .catch(error => {
                    console.error(`Failed to generate image for ${part.key}:`, error);
                    handleAiError(error, toast);
                    return { key: part.key, description: part.description, imageDataUri: '' };
                })
        );
        
        const generatedImages = await Promise.all(imagePromises);

        const finalPhotoSuggestion: PhotoSuggestion = {
            haut: { description: 'N/A', imageDataUri: '' },
            bas: { description: 'N/A', imageDataUri: '' },
            chaussures: { description: 'N/A', imageDataUri: '' },
            accessoires: { description: 'N/A', imageDataUri: '' },
        };
        
        generatedImages.forEach(image => {
            if (image) {
                finalPhotoSuggestion[image.key] = {
                    description: image.description,
                    imageDataUri: image.imageDataUri,
                };
            }
        });
        
        Object.keys(descriptionResult).forEach(keyStr => {
            const key = keyStr as OutfitPart;
            if(descriptionResult[key] && descriptionResult[key].description !== 'N/A' && !finalPhotoSuggestion[key].description) {
                finalPhotoSuggestion[key].description = descriptionResult[key].description;
            }
        });
        
        setPhotoSuggestion(finalPhotoSuggestion);
        setSuggestion(null);
        
      } else {
        setPhotoSuggestion(null);
        const result = await suggestOutfit({ ...commonInput, baseItem: input.baseItem });
        setSuggestion(result);
      }
      
    } catch (error) {
      handleAiError(error, toast);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegeneratePhotoPart = async (part: OutfitPart) => {
    if (!currentPhotoConstraints || !photoSuggestion || regeneratingPart) return;

    setRegeneratingPart(part);
    try {
        const currentOutfitDescriptions = {
            haut: photoSuggestion.haut.description,
            bas: photoSuggestion.bas.description,
            chaussures: photoSuggestion.chaussures.description,
            accessoires: photoSuggestion.accessoires.description,
        };

        const { newDescription } = await regeneratePhotoOutfitPart({
            originalInput: currentPhotoConstraints,
            currentOutfitDescriptions: currentOutfitDescriptions,
            partToChange: part,
            currentPartDescription: photoSuggestion[part].description,
        });

        const { imageDataUri } = await generateOutfitImage({
            itemDescription: newDescription,
            gender: userProfile?.gender
        });

        setPhotoSuggestion(prev => {
            if (!prev) return null;
            return {
                ...prev,
                [part]: {
                    description: newDescription,
                    imageDataUri: imageDataUri
                }
            };
        });

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
          isLoading={isGenerating} 
          onSuggestOutfit={getSuggestion} 
        />
      </Card>

      <Card className="min-h-[600px] flex flex-col justify-center items-center sticky top-24">
        <OutfitDisplay
          isLoading={isGenerating}
          suggestion={suggestion}
          photoSuggestion={photoSuggestion}
          gender={userProfile?.gender}
          onRegeneratePart={handleRegeneratePhotoPart}
          regeneratingPart={regeneratingPart}
          baseItemPhoto={baseItemPhoto}
        />
      </Card>
    </div>
  );
}
