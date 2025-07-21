
'use client';

import Image from 'next/image';
import { Shirt, Milestone, Footprints, Gem, ImageOff } from 'lucide-react';
import type { PhotoSuggestion } from './outfit-suggester';

import { CardContent } from '@/components/ui/card';

interface PhotoOutfitDisplayProps {
  photoSuggestion: PhotoSuggestion;
  baseItemPhoto: string;
}

const SuggestedItem = ({ item, title }: { item: { description: string, imageDataUri: string }, title: string }) => {
    // Render a placeholder if the image is missing or failed to generate
    if (!item?.imageDataUri) {
        return (
             <div className="relative aspect-[3/4] w-full bg-secondary rounded-lg overflow-hidden flex flex-col items-center justify-center shadow-inner text-center p-2">
                <ImageOff className="h-8 w-8 text-muted-foreground mb-2"/>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
        )
    }
    return (
        <div className="relative aspect-[3/4] w-full bg-secondary rounded-lg overflow-hidden flex items-center justify-center shadow-lg">
            <Image src={item.imageDataUri} alt={item.description} fill className="object-cover" />
            <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white p-2 text-center text-xs backdrop-blur-sm">
                {title}
            </div>
        </div>
    );
};


export function PhotoOutfitDisplay({ photoSuggestion, baseItemPhoto }: PhotoOutfitDisplayProps) {
    const suggestedParts = [
        { part: photoSuggestion.haut, title: "Haut" },
        { part: photoSuggestion.bas, title: "Bas" },
        { part: photoSuggestion.chaussures, title: "Chaussures" },
        { part: photoSuggestion.accessoires, title: "Accessoires" }
    ];

    return (
        <CardContent className="p-4 sm:p-6 w-full animate-in fade-in-50">
            <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue Personnalisée</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                
                {/* AI Suggestions (Left, Larger) */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                    <h4 className="col-span-2 font-semibold text-center text-muted-foreground">Suggestions de l'IA</h4>
                    {suggestedParts.map((item, index) => (
                        // Render only if the part has a valid description. 'N/A' parts are skipped.
                        item.part.description && item.part.description !== 'N/A' && <SuggestedItem key={index} item={item.part} title={item.title} />
                    ))}
                </div>

                {/* User's Item and full description (Right, Smaller) */}
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
                            // Render description only if it's valid.
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
