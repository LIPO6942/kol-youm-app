
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, XCircle } from 'lucide-react';
import { generateOutfitImage } from '@/ai/flows/generate-outfit-image-hf';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const GeneratedOutfitImage = ({ description, gender }: { description: string; gender?: 'Homme' | 'Femme' }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const { toast } = useToast();

  const handleAiError = useCallback((error: any) => {
    const errorMessage = String(error.message || '');
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast({
            variant: 'destructive',
            title: 'L\'IA est très demandée !',
            description: "Le générateur d'images se repose, réessayez dans un instant.",
        });
    } else if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable')) {
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
