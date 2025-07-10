'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

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
  type: z.string().min(1, 'Veuillez choisir un type.'),
  category: z.string().min(1, 'Veuillez choisir une catégorie.'),
  style: z.string().optional(),
  color: z.string().optional(),
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

  const completeOutfitForm = useForm<CompleteOutfitFormValues>({
    resolver: zodResolver(completeOutfitFormSchema),
    defaultValues: { type: '', category: '', style: '', color: '' }
  });

  const clothingData = useMemo(() => {
    return gender === 'Homme' ? clothingDataHomme : clothingDataFemme;
  }, [gender]);
  
  useEffect(() => {
    completeOutfitForm.reset({ type: '', category: '', style: '', color: '' });
  }, [clothingData, completeOutfitForm]);

  const typeValue = completeOutfitForm.watch('type');
  const categoryValue = completeOutfitForm.watch('category');

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
    const baseItemDescription = [values.category, values.style, values.color].filter(Boolean).join(' ');
    const input = {
      ...mainFormValues,
      baseItem: `${values.type}: ${baseItemDescription}`
    };
    
    onCompleteOutfit(input);
    completeOutfitForm.reset();
  };

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
            Décrivez une pièce de votre garde-robe et nous créerons une tenue autour.
          </DialogDescription>
        </DialogHeader>
        <Form {...completeOutfitForm}>
            <form onSubmit={completeOutfitForm.handleSubmit(handleCompleteOutfitSubmit)} className="space-y-4 pt-4">
                <FormField
                    control={completeOutfitForm.control}
                    name="type"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Type de pièce</FormLabel>
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

                <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Générer la tenue'}
                </Button>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
