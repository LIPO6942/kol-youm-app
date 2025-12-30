
'use client';

import { useMemo, useState } from 'react';
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

    // Helper: map occasion/schedule to wardrobe style
    const resolveTargetStyle = (occasion?: string, schedule?: string): 'Professionnel' | 'Décontracté' | 'Chic' | 'Sportif' => {
      const occ = (occasion || '').toLowerCase();
      const sch = (schedule || '').toLowerCase();
      if (occ.includes('professionnel') || sch.includes('réunion') || sch.includes('bureau')) return 'Professionnel';
      if (occ.includes('chic') || sch.includes('soirée') || sch.includes('gala') || sch.includes('mariage')) return 'Chic';
      if (occ.includes('sport') || sch.includes('sport') || sch.includes('gym') || sch.includes('course')) return 'Sportif';
      return 'Décontracté';
    };

    // Build a coherent suggestion from wardrobe (no AI) when selection is from wardrobe
    const trySuggestFromWardrobe = (): SuggestOutfitOutput | null => {
      const wardrobe = userProfile?.wardrobe || [];
      if (!wardrobe.length) return null;
      const targetStyle = resolveTargetStyle(input.occasion, input.scheduleKeywords);
      const filtered = wardrobe.filter((w: any) => w.style === targetStyle).sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      if (!filtered.length) return null;
      // Pick one per missing category, avoiding the base type
      const pick = (type: 'haut' | 'bas' | 'chaussures' | 'accessoires') => filtered.find((w: any) => w.type === type);
      const parts: Record<'haut' | 'bas' | 'chaussures' | 'accessoires', string> = {
        haut: 'N/A', bas: 'N/A', chaussures: 'N/A', accessoires: 'N/A'
      };
      const base = input.baseItemType;
      if (base !== 'haut') parts.haut = pick('haut') ? `${targetStyle} - haut assorti` : 'N/A';
      if (base !== 'bas') parts.bas = pick('bas') ? `${targetStyle} - bas assorti` : 'N/A';
      if (base !== 'chaussures') parts.chaussures = pick('chaussures') ? `${targetStyle} - chaussures adaptées` : 'N/A';
      if (base !== 'accessoires') {
        // Weather heuristic: add écharpe/parapluie mention
        const wx = (input.weather || '').toLowerCase();
        const acc = pick('accessoires');
        if (acc) {
          if (wx.includes('pluie')) parts.accessoires = `${targetStyle} - accessoires adaptés (parapluie si possible)`;
          else if (wx.includes('froid')) parts.accessoires = `${targetStyle} - accessoires chauds (écharpe si possible)`;
          else parts.accessoires = `${targetStyle} - accessoires discrets`;
        }
      }
      const summary = `Tenue ${targetStyle.toLowerCase()} construite autour de votre pièce, adaptée à la météo (${input.weather}).`;
      return {
        haut: parts.haut,
        bas: parts.bas,
        chaussures: parts.chaussures,
        accessoires: parts.accessoires,
        suggestionText: summary,
      };
    };

    try {
      if (input.baseItemPhotoDataUri && input.baseItemType) {
        // If source is wardrobe, use local coherent selection first
        // @ts-ignore
        if ((input as any).source === 'wardrobe') {
          const local = trySuggestFromWardrobe();
          if (local) {
            setSuggestion(local);
            return;
          }
        }
        const photoInput: GenerateOutfitFromPhotoInput = {
          ...commonInput,
          baseItemPhotoDataUri: input.baseItemPhotoDataUri,
          baseItemType: input.baseItemType,
        };
        setCurrentPhotoConstraints(photoInput);
        setBaseItemPhoto(input.baseItemPhotoDataUri);

        const descriptionResult = await generateOutfitFromPhoto(photoInput);

        const partsToGenerate = Object.entries(descriptionResult)
          .map(([key, value]: [string, any]) => ({ key: key as OutfitPart, description: (value?.description as string) }))
          .filter(p => p.description && p.description !== 'N/A');

        const initialPhotoSuggestion: PhotoSuggestion = {
          haut: { description: 'N/A', imageDataUri: '' },
          bas: { description: 'N/A', imageDataUri: '' },
          chaussures: { description: 'N/A', imageDataUri: '' },
          accessoires: { description: 'N/A', imageDataUri: '' },
        };

        // Fill descriptions first
        Object.entries(descriptionResult).forEach(([keyStr, value]: [string, any]) => {
          const key = keyStr as OutfitPart;
          if (value?.description && value.description !== 'N/A') {
            initialPhotoSuggestion[key].description = value.description;
          }
        });

        setPhotoSuggestion(initialPhotoSuggestion);
        setSuggestion(null);

        // Generate images progressively without artificial delays
        partsToGenerate.forEach((part) => {
          generateOutfitImage({ itemDescription: part.description, gender: userProfile?.gender, category: part.key })
            .then(imageResult => {
              setPhotoSuggestion(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  [part.key]: {
                    ...prev[part.key],
                    imageDataUri: imageResult.imageDataUri
                  }
                };
              });
            })
            .catch(error => {
              console.error(`Failed to generate image for ${part.key}:`, error);
            });
        });

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
        gender: userProfile?.gender,
        category: part
      });

      setPhotoSuggestion((prev: PhotoSuggestion | null) => {
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
