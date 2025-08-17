
'use client';

import Image from 'next/image';
import { Shirt, Milestone, Footprints, Gem, ImageOff, RotateCw, Loader2 } from 'lucide-react';
import type { PhotoSuggestion, OutfitPart } from './outfit-suggester';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
                    {title}
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

    return (
        <CardContent className="p-4 sm:p-6 w-full animate-in fade-in-50">
            <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue Personnalisée</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <h4 className="col-span-2 font-semibold text-center text-muted-foreground">Suggestions de l'IA</h4>
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

                <div className="space-y-4">
                    <h4 className="font-semibold text-center text-muted-foreground">Votre Pièce</h4>
                    <div className="relative aspect-[3/4] w-full bg-secondary rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
                        <Image src={baseItemPhoto} alt="Votre pièce de base" fill className="object-cover" />
                    </div>
                    <div className="space-y-3 text-sm">
                         <h4 className="font-semibold text-center text-muted-foreground">Détails de la tenue</h4>
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
    );
}
