
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, Image as ImageIcon, X, Shirt, Milestone, Footprints, Gem } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';


const completeOutfitFormSchema = z.object({
  baseItemPhotoDataUri: z.string().min(1, { message: 'Veuillez importer une photo.' }),
  baseItemType: z.enum(['haut', 'bas', 'chaussures', 'accessoires'], {
    required_error: 'Veuillez sélectionner le type de votre pièce.',
  }),
});


type CompleteOutfitFormValues = z.infer<typeof completeOutfitFormSchema>;

interface CompleteOutfitDialogProps {
  mainForm: UseFormReturn<any>;
  onCompleteOutfit: (values: any) => void;
  isLoading: boolean;
}

const itemTypeOptions = [
  { value: 'haut', label: 'Haut', icon: Shirt },
  { value: 'bas', label: 'Bas', icon: Milestone },
  { value: 'chaussures', label: 'Chaussures', icon: Footprints },
  { value: 'accessoires', label: 'Accessoires', icon: Gem },
] as const;


export function CompleteOutfitDialog({ mainForm, onCompleteOutfit, isLoading }: CompleteOutfitDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const completeOutfitForm = useForm<CompleteOutfitFormValues>({
    resolver: zodResolver(completeOutfitFormSchema),
    defaultValues: { baseItemPhotoDataUri: '' }
  });

  const resetForm = useCallback(() => {
    completeOutfitForm.reset({ baseItemPhotoDataUri: '', baseItemType: undefined });
  }, [completeOutfitForm]);

  useEffect(() => {
    if (!isDialogOpen) {
        resetForm();
    }
  }, [isDialogOpen, resetForm]);


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
            completeOutfitForm.clearErrors('baseItemPhotoDataUri'); // Clear error message if user uploads photo
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
    
    const input = {
      ...mainFormValues,
      baseItemPhotoDataUri: values.baseItemPhotoDataUri,
      baseItemType: values.baseItemType,
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
      <DialogContent className="sm:max-w-[425px] grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Quelle pièce mettez-vous en vedette ?</DialogTitle>
          <DialogDescription>
            Importez la photo d'une pièce et précisez son type. L'IA créera une tenue autour.
          </DialogDescription>
        </DialogHeader>
        <Form {...completeOutfitForm}>
            <form onSubmit={completeOutfitForm.handleSubmit(handleCompleteOutfitSubmit)} className="space-y-6 pt-2 overflow-hidden flex flex-col">
                <ScrollArea className="flex-grow pr-6 -mr-6">
                    <div className="space-y-6 pr-1">
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
                            <div 
                                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <ImageIcon className="w-10 h-10 text-muted-foreground mb-2" />
                                <p className="text-sm text-muted-foreground">Cliquez pour importer une photo</p>
                            </div>
                        )}
                        
                        <FormField
                            control={completeOutfitForm.control}
                            name="baseItemPhotoDataUri"
                            render={() => <FormItem><FormMessage /></FormItem>}
                        />

                        {photoValue && (
                            <FormField
                                control={completeOutfitForm.control}
                                name="baseItemType"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Quel est le type de cette pièce ?</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {itemTypeOptions.map(opt => (
                                            <FormItem key={opt.value} className="relative">
                                            <FormControl>
                                                <RadioGroupItem value={opt.value} className="sr-only" />
                                            </FormControl>
                                            <Label className={cn(
                                                "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer h-20 text-xs",
                                                field.value === opt.value && "border-primary"
                                            )}>
                                                <opt.icon className="h-5 w-5 mb-1" />
                                                {opt.label}
                                            </Label>
                                            </FormItem>
                                        ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />
                        )}
                    </div>
                </ScrollArea>
                
                <DialogFooter className="pt-6">
                    <Button type="submit" disabled={isLoading || !photoValue} className="w-full">
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Générer la tenue'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
