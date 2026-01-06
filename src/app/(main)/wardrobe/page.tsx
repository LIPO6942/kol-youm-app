
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { deleteWardrobeItem } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Shirt, Milestone, Footprints, Gem, Trash2, Loader2 } from 'lucide-react';
import type { WardrobeItem } from '@/lib/firebase/firestore';

const categoryConfig = {
    haut: { label: 'Hauts', icon: Shirt },
    bas: { label: 'Bas', icon: Milestone },
    chaussures: { label: 'Chaussures', icon: Footprints },
    accessoires: { label: 'Accessoires', icon: Gem },
};

const styleFilters = ['Tout', 'Décontracté', 'Professionnel', 'Chic', 'Sportif'];

function ColorDot({ color }: { color: { name: string; hex: string } }) {
    const [showName, setShowName] = useState(false);
    return (
        <div
            className="flex flex-col items-center gap-1 cursor-pointer group"
            onClick={(e) => {
                e.stopPropagation();
                setShowName(!showName);
            }}
        >
            <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-lg transition-transform group-hover:scale-110"
                style={{ backgroundColor: color.hex }}
                title={color.name}
            />
            {showName && (
                <span className="text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded-md backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                    {color.name}
                </span>
            )}
        </div>
    );
}

export default function WardrobePage() {
    const { user, userProfile, forceProfileRefresh } = useAuth();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [activeStyle, setActiveStyle] = useState('Tout');

    const wardrobeItems = userProfile?.wardrobe || [];

    const filteredItems = wardrobeItems.filter(item => {
        if (activeStyle === 'Tout') return true;
        return item.style === activeStyle;
    }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    const groupedItems = filteredItems.reduce((acc, item) => {
        const category = item.type as keyof typeof categoryConfig;
        (acc[category] = acc[category] || []).push(item);
        return acc;
    }, {} as Record<WardrobeItem['type'], WardrobeItem[]>);

    const handleDelete = async (item: WardrobeItem) => {
        if (!user) return;
        setIsDeleting(item.id);
        try {
            await deleteWardrobeItem(user.uid, item);
            await forceProfileRefresh(); // This should now correctly refresh the state
            toast({ title: 'Article supprimé', description: 'La pièce a été retirée de votre garde-robe.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Erreur", description: "Impossible de supprimer l'article." });
        } finally {
            setIsDeleting(null);
        }
    };

    const renderEmptyState = () => (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full py-20">
            <Shirt className="h-12 w-12 mb-4" />
            <h3 className="font-semibold text-lg text-foreground">Votre garde-robe est vide</h3>
            <p className="text-sm">Utilisez la fonction "Compléter ma tenue" dans la section 'Stylek' pour y ajouter vos pièces préférées.</p>
        </div>
    );

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-2xl font-bold font-headline tracking-tight">Ma Garde-Robe Virtuelle</h2>
                <p className="text-muted-foreground">
                    Consultez et gérez toutes les pièces que vous avez sauvegardées.
                </p>
            </div>

            <div className="flex flex-wrap gap-2 pb-4 border-b">
                {styleFilters.map(style => (
                    <Button
                        key={style}
                        variant={activeStyle === style ? 'default' : 'outline'}
                        onClick={() => setActiveStyle(style)}
                        className="rounded-full"
                    >
                        {style}
                    </Button>
                ))}
            </div>

            {filteredItems.length === 0 ? renderEmptyState() : (
                <div className="space-y-6 py-4">
                    {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map(categoryKey => {
                        const items = groupedItems[categoryKey];
                        const config = categoryConfig[categoryKey];
                        if (!items || items.length === 0) return null;

                        return (
                            <div key={categoryKey}>
                                <div className="flex items-center gap-2 mb-3">
                                    <config.icon className="h-5 w-5 text-primary" />
                                    <h3 className="text-lg font-semibold font-headline">{config.label}</h3>
                                </div>
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                    {items.map(item => (
                                        <div key={item.id} className="group relative aspect-square">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <div className="relative h-full w-full rounded-md overflow-hidden border bg-secondary cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all">
                                                        {isDeleting === item.id ? (
                                                            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                                                                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                                            </div>
                                                        ) : (
                                                            <Image src={item.photoDataUri} alt={`${item.style} ${item.type}`} width={80} height={80} className="object-cover h-full w-full" />
                                                        )}
                                                        {item.matchingColors && item.matchingColors.length > 0 && (
                                                            <>
                                                                {console.log("Item with colors:", item.id, item.matchingColors)}
                                                                <div className="absolute bottom-1 right-1 flex space-x-1 z-10 bg-background/50 p-1 rounded-full backdrop-blur-sm">
                                                                    {item.matchingColors.map((color, idx) => (
                                                                        <div
                                                                            key={idx}
                                                                            title={color.name}
                                                                            className="w-3 h-3 rounded-full border border-white shadow-sm"
                                                                            style={{ backgroundColor: color.hex }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                </DialogTrigger>

                                                <DialogContent className="p-0 border-0 max-w-2xl bg-transparent shadow-none overflow-visible">
                                                    <DialogHeader>
                                                        <DialogTitle className="sr-only">Aperçu de la pièce: {item.style} {item.type}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="relative group">
                                                        <Image src={item.photoDataUri} alt={`Aperçu de ${item.style} ${item.type}`} width={1024} height={1024} className="object-contain rounded-lg w-full h-auto shadow-2xl" />

                                                        {item.matchingColors && item.matchingColors.length > 0 && (
                                                            <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 flex gap-3 p-3 bg-black/40 rounded-2xl backdrop-blur-md border border-white/20">
                                                                {item.matchingColors.map((color, idx) => (
                                                                    <ColorDot key={idx} color={color} />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </DialogContent>
                                            </Dialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                        disabled={!!isDeleting}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Supprimer cette pièce ?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Cette action est irréversible et supprimera l'article de votre garde-robe.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(item)}>Confirmer</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
