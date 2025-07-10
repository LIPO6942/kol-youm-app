
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, Wand2, XCircle, RotateCw } from 'lucide-react';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import { generateOutfitImage } from '@/ai/flows/generate-outfit-image';

import { CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const GeneratedOutfitImage = ({ description, gender }: { description: string; gender?: 'Homme' | 'Femme' }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const { toast } = useToast();

  const handleAiError = useCallback((error: any) => {
    const errorMessage = error.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast({
            variant: 'destructive',
            title: 'L\'IA est très demandée !',
            description: "Le générateur d'images se repose, réessayez dans un instant.",
        });
    } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
         toast({
            variant: 'destructive',
            title: 'L\'IA est en surchauffe !',
            description: "Nos serveurs sont un peu surchargés pour l'imagerie. Réessayez dans un instant.",
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Erreur d\'image',
            description: "Impossible de générer l'image. Veuillez réessayer.",
        });
    }
    console.error(`Failed to generate outfit image`, error);
  }, [toast]);

  const generate = useCallback(async () => {
    if (!description) return;
    setIsLoading(true);
    setError(false);
    setImageUrl(null);
    try {
      const result = await generateOutfitImage({ itemDescription: description, gender });
      setImageUrl(result.imageDataUri);
    } catch (e: any) {
      setError(true);
      handleAiError(e);
    } finally {
      setIsLoading(false);
    }
  }, [description, gender, handleAiError]);

  useEffect(() => {
    generate();
  }, [generate]);

  if (isLoading) {
    return (
        <div className="absolute inset-0 bg-secondary/50 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }
  
  if (error) {
    return (
        <div className="absolute inset-0 bg-secondary/50 flex flex-col items-center justify-center text-center p-4">
          <XCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-xs text-muted-foreground mt-2">Erreur Image</p>
           <Button variant="ghost" size="sm" className="mt-2 text-xs h-auto" onClick={generate}>
             Réessayer
           </Button>
        </div>
    );
  }
  
  if (imageUrl) {
    return <Image src={imageUrl} alt="Tenue suggérée" fill className="object-cover" />;
  }

  return null;
};

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
        ] as const).map(({ key, label }) => (
            suggestion[key] !== 'N/A' && (
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
            )
        ))}
      </div>
    </CardContent>
  );
}
