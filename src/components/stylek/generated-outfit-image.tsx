
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, XCircle } from 'lucide-react';
import { generateOutfitImage } from '@/ai/flows/generate-outfit-image-ai';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export const GeneratedOutfitImage = ({
  description,
  gender,
  category = 'model',
  className = '',
  objectFit = 'cover',
}: {
  description: string;
  gender?: 'Homme' | 'Femme';
  category?: 'model' | 'haut' | 'bas' | 'chaussures' | 'accessoire' | string;
  className?: string;
  objectFit?: 'cover' | 'contain';
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const { toast } = useToast();

  const getCacheKey = useCallback((desc: string, g?: string, cat?: string) => {
    const clean = desc.slice(0, 45).replace(/[^a-zA-Z0-9]/g, '_');
    return `kolyoum_outfit_img_${cat || 'model'}_${g || 'all'}_${clean}`;
  }, []);

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

  const generate = useCallback(async (forceRefresh = false) => {
    if (!description) return;

    const cacheKey = getCacheKey(description, gender, category);

    // Vérifier le cache local pour réutilisation immédiate
    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setImageUrl(cached);
          setIsLoading(false);
          setError(false);
          return;
        }
      } catch (e) {
        console.warn('Erreur lecture cache image:', e);
      }
    }

    setIsLoading(true);
    setError(false);
    setImageUrl(null);

    try {
      const result = await generateOutfitImage({ itemDescription: description, gender, category });
      setImageUrl(result.imageDataUri);

      // Sauvegarder dans le cache local
      if (typeof window !== 'undefined' && result.imageDataUri) {
        try {
          localStorage.setItem(cacheKey, result.imageDataUri);
        } catch (e) {
          console.warn('Erreur sauvegarde cache image:', e);
        }
      }
    } catch (e: any) {
      setError(true);
      handleAiError(e);
    } finally {
      setIsLoading(false);
    }
  }, [description, gender, category, getCacheKey, handleAiError]);

  useEffect(() => {
    generate(false);
  }, [generate]);

  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-secondary/50 flex flex-col items-center justify-center p-3 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <span className="text-[10px] text-muted-foreground mt-2 font-medium">Génération visuelle...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 bg-secondary/50 flex flex-col items-center justify-center text-center p-3">
        <XCircle className="h-6 w-6 text-destructive mx-auto" />
        <p className="text-[11px] text-muted-foreground mt-1 font-medium">Visuel indisponible</p>
        <Button variant="outline" size="sm" className="mt-2 text-[10px] h-6 px-2.5 rounded-lg" onClick={() => generate(true)}>
          Réessayer
        </Button>
      </div>
    );
  }

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={description}
        fill
        sizes="(max-width: 768px) 100vw, 500px"
        className={objectFit === 'contain' ? `object-contain p-2 ${className}` : `object-cover ${className}`}
        unoptimized
      />
    );
  }

  return null;
};
