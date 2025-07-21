'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Image as ImageIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '../ui/separator';

const clothingDataFemme = {
  'Un Haut': {
    'Chemisier': ['en soie', 'en coton', 'à motifs', 'sans manches'],
    'T-shirt': ['à col V', 'à col rond', 'imprimé', 'uni'],
    'Pull': ['en laine', 'en cachemire', 'à col roulé', 'crop top'],
    'Top': ['débardeur', 'à bretelles', 'bustier', 'en dentelle']
  },
  'Un Bas': {
    'Pantalon': ['tailleur', 'en jean', 'cargo', 'large (palazzo)'],
    'Jupe': ['en jean', 'plissée', 'crayon', 'longue'],
    'Short': ['en jean', 'tailleur', 'de sport', 'en lin'],
  },
  'Des Chaussures': {
    'Baskets': ['basses', 'montantes', 'plateformes', 'en toile'],
    'Talons': ['aiguilles', 'compensés', 'carrés', 'sandales à'],
    'Bottes': ['en cuir', 'de pluie', 'chelsea', 'cuissardes'],
    'Chaussures plates': ['ballerines', 'mocassins', 'mules']
  },
  'Une Pièce Unique': {
    'Robe': ['d\'été', 'de soirée', 'pull', 'chemise'],
    'Combinaison': ['pantalon', 'short', 'élégante'],
  },
  'Un Accessoire': {
    'Sac': ['à main', 'à dos', 'bandoulière', 'pochette'],
    'Chapeau': ['capeline', 'bob', 'fedora', 'béret'],
    'Bijou': ['collier', 'bracelet', 'boucles d\'oreilles', 'montre'],
  }
};

const clothingDataHomme = {
  'Un Haut': {
    'Chemise': ['en lin', 'en coton', 'formelle', 'à carreaux'],
    'T-shirt': ['à col V', 'à col rond', 'imprimé', 'uni'],
    'Pull': ['en laine', 'en cachemire', 'à col roulé', 'à capuche'],
    'Polo': ['à manches courtes', 'à manches longues', 'en coton piqué']
  },
  'Un Bas': {
    'Pantalon': ['chino', 'en jean', 'cargo', 'de costume'],
    'Short': ['en jean', 'bermuda', 'de sport', 'en lin'],
  },
  'Des Chaussures': {
    'Baskets': ['basses', 'montantes', 'de course', 'en toile'],
    'Chaussures de ville': ['richelieu', 'derby', 'mocassins', 'en cuir'],
    'Bottes': ['en cuir', 'chelsea', 'desert boots'],
  },
  'Une Pièce Unique': {
    'Costume': ['deux pièces', 'trois pièces', 'décontracté'],
  },
  'Un Accessoire': {
    'Sac': ['à dos', 'bandoulière', 'sacoche'],
    'Chapeau': ['casquette', 'bob', 'fedora', 'béret'],
    'Accessoire': ['montre', 'ceinture', 'cravate', 'lunettes de soleil'],
  }
};
const colorOptions = ['Noir', 'Blanc', 'Gris', 'Beige', 'Bleu', 'Rouge', 'Vert', 'Jaune', 'Rose', 'Violet', 'Marron', 'Orange', 'Argenté', 'Doré', 'Clair', 'Foncé'];

const completeOutfitFormSchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  style: z.string().optional(),
  color: z.string().optional(),
  baseItemPhotoDataUri: z.string().optional(),
}).refine(data => data.baseItemPhotoDataUri || (data.type && data.category), {
    message: 'Veuillez soit importer une photo, soit décrire la pièce.',
    path: ['type'], 
});


type CompleteOutfitFormValues = z.infer<typeof completeOutfitFormSchema>;

interface CompleteOutfitDialogProps {
  gender?: 'Homme' | 'Femme';
  mainForm: UseFormReturn<any>;
  onCompleteOutfit: (values: any) => void;
  isLoading: boolean;
}

export function CompleteOutfitDialog({ gender, mainForm, onCompleteOutfit, isLoading }: CompleteOutfitDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completeOutfitForm = useForm<CompleteOutfitFormValues>({
    resolver: zodResolver(completeOutfitFormSchema),
    defaultValues: { type: '', category: '', style: '', color: '', baseItemPhotoDataUri: '' }
  });

  const clothingData = useMemo(() => {
    return gender === 'Homme' ? clothingDataHomme : clothingDataFemme;
  }, [gender]);
  
  const resetForm = useCallback(() => {
    completeOutfitForm.reset({ type: '', category: '', style: '', color: '', baseItemPhotoDataUri: '' });
  }, [completeOutfitForm]);

  useEffect(() => {
    if (!isDialogOpen) {
        resetForm();
    }
  }, [isDialogOpen, resetForm]);

  useEffect(() => {
    resetForm();
  }, [clothingData, resetForm]);

  const typeValue = completeOutfitForm.watch('type');
  const categoryValue = completeOutfitForm.watch('category');
  const photoValue = completeOutfitForm.watch('baseItemPhotoDataUri');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 4 * 1024 * 1024) { // 4MB limit
            toast({
                variant: 'destructive',
                title: 'Fichier trop volumineux',
                description: 'Veuillez choisir une image de moins de 4 Mo.',
            });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            completeOutfitForm.setValue('baseItemPhotoDataUri', reader.result as string);
            completeOutfitForm.clearErrors('type'); // Clear error message if user uploads photo
        };
        reader.readAsDataURL(file);
    }
  };

  const handleCompleteOutfitSubmit = async (values: CompleteOutfitFormValues) => {
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
    
    setIsDialogOpen(false);
    const mainFormValues = mainForm.getValues();
    
    let baseItemDescription;
    if (values.baseItemPhotoDataUri) {
        baseItemDescription = { baseItemPhotoDataUri: values.baseItemPhotoDataUri };
    } else {
        const textDescription = [values.category, values.style, values.color].filter(Boolean).join(' ');
        baseItemDescription = { baseItem: `${values.type}: ${textDescription}` };
    }

    const input = {
      ...mainFormValues,
      ...baseItemDescription,
    };
    
    onCompleteOutfit(input);
  };
    
  const resetPhoto = () => {
      completeOutfitForm.setValue('baseItemPhotoDataUri', '');
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  }


  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Compléter ma tenue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Quelle pièce mettez-vous en vedette ?</DialogTitle>
          <DialogDescription>
            Décrivez une pièce ou importez sa photo. L'IA créera une tenue autour.
          </DialogDescription>
        </DialogHeader>
        <Form {...completeOutfitForm}>
            <form onSubmit={completeOutfitForm.handleSubmit(handleCompleteOutfitSubmit)} className="space-y-4 pt-4">
                 <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg, image/webp"
                 />
                 
                {photoValue ? (
                    <div className='space-y-2'>
                        <Label>Aperçu de la photo</Label>
                        <div className="relative aspect-square w-full rounded-md border bg-muted overflow-hidden">
                             <Image src={photoValue} alt="Aperçu de la pièce" fill className="object-contain" />
                             <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/50 hover:bg-background/80 h-7 w-7" onClick={resetPhoto}>
                                <X className="h-4 w-4" />
                             </Button>
                        </div>
                    </div>
                ) : (
                    <>
                         <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                           <ImageIcon className="mr-2 h-4 w-4" />
                           Importer une photo
                         </Button>

                        <div className="flex items-center text-xs text-muted-foreground">
                            <Separator className="flex-1" />
                            <span className="px-2">OU</span>
                            <Separator className="flex-1" />
                        </div>
                    
                        <FormField
                            control={completeOutfitForm.control}
                            name="type"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Décrire la pièce</FormLabel>
                                <Select onValueChange={(value) => {
                                    field.onChange(value);
                                    completeOutfitForm.resetField('category');
                                    completeOutfitForm.resetField('style');
                                    completeOutfitForm.resetField('color');
                                }} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Choisissez un type" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    {Object.keys(clothingData).map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        {typeValue && (
                            <FormField
                                control={completeOutfitForm.control}
                                name="category"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Catégorie</FormLabel>
                                    <Select onValueChange={(value) => {
                                        field.onChange(value);
                                        completeOutfitForm.resetField('style');
                                        completeOutfitForm.resetField('color');
                                    }} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Choisissez une catégorie" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    {Object.keys(clothingData[typeValue as keyof typeof clothingData]).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                        {categoryValue && (
                            <FormField
                                control={completeOutfitForm.control}
                                name="style"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Style/Matière (optionnel)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Précisez le style" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    {(clothingData[typeValue as keyof typeof clothingData][categoryValue as keyof typeof clothingData[keyof typeof clothingData]] as string[]).map(style => <SelectItem key={style} value={style}>{style}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                        {categoryValue && (
                            <FormField
                                control={completeOutfitForm.control}
                                name="color"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Couleur (optionnel)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Précisez la couleur" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                    {colorOptions.map(color => <SelectItem key={color} value={color}>{color}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        )}
                    </>
                )}

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Générer la tenue'}
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
