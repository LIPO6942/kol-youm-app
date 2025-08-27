
'use client';

import Image from 'next/image';
import { Shirt, Milestone, Footprints, Gem, ImageOff, RotateCw, Loader2 } from 'lucide-react';
import type { PhotoSuggestion, OutfitPart } from './outfit-suggester';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

interface SuggestedItemProps {
    item: { description: string, imageDataUri: string };
    title: string;
    onRegenerate: () => void;
    isRegenerating: boolean;
}

const SuggestedItem = ({ item, title, onRegenerate, isRegenerating }: SuggestedItemProps) => {
    const hasFailed = !item?.imageDataUri && !isRegenerating;

    return (
        <div className={cn(
            "relative aspect-[3/4] w-full bg-secondary rounded-lg overflow-hidden flex flex-col items-center justify-center shadow-inner text-center p-2",
            hasFailed && "border-2 border-dashed border-muted-foreground/50"
        )}>
            {isRegenerating && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            )}
            
            {hasFailed && (
                <>
                    <ImageOff className="h-8 w-8 text-muted-foreground mb-2"/>
                    <p className="font-semibold text-sm">{title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                </>
            )}

            {!isRegenerating && !hasFailed && item.imageDataUri && (
                 <Image src={item.imageDataUri} alt={item.description} fill className="object-cover" />
            )}

            <div className="absolute top-1 right-1 z-20">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="bg-black/30 hover:bg-black/60 text-white hover:text-white h-7 w-7 rounded-full backdrop-blur-sm"
                    onClick={onRegenerate}
                    disabled={isRegenerating}
                    aria-label={`Régénérer ${title}`}
                >
                    <RotateCw className="h-4 w-4" />
                </Button>
            </div>

            {!isRegenerating && !hasFailed && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white p-2 text-center text-xs backdrop-blur-sm">
                    <p className="truncate">{item.description}</p>
                </div>
            )}
        </div>
    );
};


interface PhotoOutfitDisplayProps {
  photoSuggestion: PhotoSuggestion;
  baseItemPhoto: string;
  onRegeneratePart: (part: OutfitPart) => void;
  regeneratingPart: OutfitPart | null;
}

export function PhotoOutfitDisplay({ photoSuggestion, baseItemPhoto, onRegeneratePart, regeneratingPart }: PhotoOutfitDisplayProps) {
    const suggestedParts = [
        { key: 'haut', part: photoSuggestion.haut, title: "Haut" },
        { key: 'bas', part: photoSuggestion.bas, title: "Bas" },
        { key: 'chaussures', part: photoSuggestion.chaussures, title: "Chaussures" },
        { key: 'accessoires', part: photoSuggestion.accessoires, title: "Accessoires" }
    ];

    const allDescriptions = [
        { label: 'Haut', text: photoSuggestion.haut.description },
        { label: 'Bas', text: photoSuggestion.bas.description },
        { label: 'Chaussures', text: photoSuggestion.chaussures.description },
        { label: 'Accessoires', text: photoSuggestion.accessoires.description },
    ].filter(d => d.text && d.text !== 'N/A').map(d => `${d.label}: ${d.text}`).join(' · ');

    return (
        <CardContent className="p-4 sm:p-6 w-full animate-in fade-in-50">
            <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue Personnalisée</h3>
            
            <div className="flex flex-col items-center gap-2 mb-4">
                <h4 className="font-semibold text-center text-muted-foreground text-sm">Votre Pièce</h4>
                <div className="relative aspect-square w-24 bg-secondary rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
                    <Image src={baseItemPhoto} alt="Votre pièce de base" fill className="object-cover" />
                </div>
            </div>
            
            <div className="text-center mb-4">
                <p className="text-sm font-semibold text-muted-foreground">Détails de la tenue :</p>
                <p className="text-xs text-foreground mt-1 italic">"{allDescriptions}"</p>
            </div>

            <Separator className="my-4" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {suggestedParts.map((item) => (
                    item.part.description && item.part.description !== 'N/A' && (
                        <SuggestedItem 
                            key={item.key} 
                            item={item.part} 
                            title={item.title} 
                            onRegenerate={() => onRegeneratePart(item.key as OutfitPart)}
                            isRegenerating={regeneratingPart === item.key}
                        />
                    )
                ))}
            </div>

        </CardContent>
    );
}
