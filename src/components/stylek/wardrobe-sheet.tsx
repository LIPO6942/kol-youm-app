
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { deleteWardrobeItem } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shirt, Milestone, Footprints, Gem, Trash2, Loader2 } from 'lucide-react';
import type { WardrobeItem } from '@/lib/firebase/firestore';

const categoryConfig = {
    haut: { label: 'Hauts', icon: Shirt },
    bas: { label: 'Bas', icon: Milestone },
    chaussures: { label: 'Chaussures', icon: Footprints },
    accessoires: { label: 'Accessoires', icon: Gem },
};

export function WardrobeSheet() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const wardrobeItems = userProfile?.wardrobe || [];
  const sortedItems = wardrobeItems.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  const groupedItems = sortedItems.reduce((acc, item) => {
    const category = item.type as keyof typeof categoryConfig;
    (acc[category] = acc[category] || []).push(item);
    return acc;
  }, {} as Record<WardrobeItem['type'], WardrobeItem[]>);

  const handleDelete = async (itemId: string) => {
    if (!user) return;
    setIsDeleting(itemId);
    try {
      await deleteWardrobeItem(user.uid, itemId);
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
      <p className="text-sm">Utilisez la fonction "Compléter ma tenue" pour y ajouter vos pièces préférées.</p>
    </div>
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">
            <Shirt className="mr-2 h-4 w-4" />
            Garde-Robe
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Ma Garde-Robe Virtuelle</SheetTitle>
          <SheetDescription>
            Consultez toutes les pièces que vous avez sauvegardées. Elles sont stockées sur votre appareil.
          </SheetDescription>
        </SheetHeader>
        <div className="relative flex-grow min-h-0">
          <ScrollArea className="absolute inset-0 pr-6">
            {wardrobeItems.length === 0 ? renderEmptyState() : (
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
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {items.map(item => (
                          <div key={item.id} className="group relative aspect-square">
                            <div className="relative h-full w-full rounded-md overflow-hidden border bg-secondary">
                               {isDeleting === item.id ? (
                                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                  </div>
                              ) : (
                                  <Image src={item.photoDataUri} alt={item.type} fill className="object-cover" />
                              )}
                            </div>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                  disabled={!!isDeleting}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                  <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer cette pièce ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                          Cette action est irréversible et supprimera l'article de votre garde-robe locale.
                                      </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDelete(item.id)}>Confirmer</AlertDialogAction>
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
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
