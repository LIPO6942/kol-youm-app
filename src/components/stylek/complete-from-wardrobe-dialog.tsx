
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { type UseFormReturn } from 'react-hook-form';
import { Loader2, Library, Shirt, Milestone, Footprints, Gem } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import type { WardrobeItem } from '@/lib/firebase/firestore';

interface CompleteFromWardrobeDialogProps {
  mainForm: UseFormReturn<any>;
  onCompleteOutfit: (values: any) => void;
  isGenerating: boolean;
}

const categoryConfig: Record<WardrobeItem['type'], { label: string; icon: LucideIcon }> = {
    haut: { label: 'Hauts', icon: Shirt },
    bas: { label: 'Bas', icon: Milestone },
    chaussures: { label: 'Chaussures', icon: Footprints },
    accessoires: { label: 'Accessoires', icon: Gem },
};


export function CompleteFromWardrobeDialog({ mainForm, onCompleteOutfit, isGenerating }: CompleteFromWardrobeDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WardrobeItem | null>(null);
  const { toast } = useToast();
  const { userProfile } = useAuth();
  
  const wardrobeItems = userProfile?.wardrobe || [];

  const groupedItems = wardrobeItems.reduce((acc, item) => {
    const category = item.type;
    (acc[category] = acc[category] || []).push(item);
    return acc;
  }, {} as Record<WardrobeItem['type'], WardrobeItem[]>);


  const handleItemSelect = (item: WardrobeItem) => {
    setSelectedItem(item);
  };

  const handleConfirmSelection = async () => {
    if (!selectedItem) {
      toast({ variant: 'destructive', title: 'Aucune sélection', description: 'Veuillez sélectionner une pièce.' });
      return;
    }
    
    const mainFormValues = mainForm.getValues();
    const isMainFormValid = await mainForm.trigger();
    if (!isMainFormValid) {
        toast({
            variant: 'destructive',
            title: 'Champs manquants',
            description: "Veuillez remplir les informations de base (activité, météo, occasion) avant de compléter une tenue.",
        });
        setIsDialogOpen(false);
        return;
    }

    const completeOutfitInput = {
      ...mainFormValues,
      baseItemPhotoDataUri: selectedItem.photoDataUri,
      baseItemType: selectedItem.type,
    };
    onCompleteOutfit(completeOutfitInput);
    setIsDialogOpen(false);
    setSelectedItem(null);
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-full py-20">
      <Shirt className="h-12 w-12 mb-4" />
      <h3 className="font-semibold text-lg text-foreground">Votre garde-robe est vide</h3>
      <p className="text-sm">Utilisez le bouton "Compléter ma tenue" pour y ajouter des pièces en prenant ou important une photo.</p>
    </div>
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
            setSelectedItem(null);
        }
    }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <Library className="mr-2 h-4 w-4" />
          Compléter depuis ma garde-robe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Choisir dans ma garde-robe</DialogTitle>
          <DialogDescription>
            Sélectionnez la pièce de base pour votre nouvelle tenue.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-grow pr-6 -mr-6">
            <div className="space-y-6 pr-2">
                {wardrobeItems.length === 0 ? renderEmptyState() :
                (Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map(categoryKey => {
                    const items = groupedItems[categoryKey];
                    const config = categoryConfig[categoryKey];
                    if (!items || items.length === 0) return null;

                    return (
                        <div key={categoryKey}>
                            <div className="flex items-center gap-2 mb-3">
                                <config.icon className="h-5 w-5 text-primary" />
                                <h3 className="text-lg font-semibold font-headline">{config.label}</h3>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).map(item => (
                                    <div 
                                        key={item.id} 
                                        className="group relative aspect-square"
                                        onClick={() => handleItemSelect(item)}
                                    >
                                        <div className={`relative h-full w-full rounded-md overflow-hidden border bg-secondary cursor-pointer ring-offset-background hover:ring-2 hover:ring-primary transition-all ${selectedItem?.id === item.id ? 'ring-2 ring-primary' : ''}`}>
                                            <Image src={item.photoDataUri} alt={item.style} fill className="object-cover h-full w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
        
        <DialogFooter className="pt-6">
            <Button type="button" onClick={handleConfirmSelection} disabled={!selectedItem || isGenerating} className="w-full">
                {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Valider et générer la tenue
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
