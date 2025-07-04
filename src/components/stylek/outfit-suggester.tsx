'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wand2, Loader2, PlusCircle, Check, Sun, Cloudy, CloudRain, Snowflake, Briefcase, Users, Dumbbell, Coffee } from 'lucide-react';
import Image from 'next/image';

import { suggestOutfit, type SuggestOutfitInput } from '@/ai/flows/intelligent-outfit-suggestion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const colors = [
    { name: 'Noir', value: '#1a1a1a' },
    { name: 'Blanc', value: '#ffffff' },
    { name: 'Gris', value: '#9ca3af' },
    { name: 'Beige', value: '#f5f5dc' },
    { name: 'Bleu', value: '#3b82f6' },
    { name: 'Rouge', value: '#ef4444' },
    { name: 'Vert', value: '#22c55e' },
    { name: 'Jaune', value: '#eab308' },
    { name: 'Rose', value: '#ec4899' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Marron', value: '#a16207' },
    { name: 'Orange', value: '#f97316' },
];

const ColorPicker = ({ value, onChange }: { value: string, onChange: (value: string) => void }) => {
  const selectedColors = value ? value.split(',') : [];

  const toggleColor = (color: string) => {
    const newColors = selectedColors.includes(color)
      ? selectedColors.filter(c => c !== color)
      : [...selectedColors, color];
    onChange(newColors.join(','));
  };

  return (
    <div className="flex flex-wrap gap-3">
      {colors.map(color => (
        <button
          key={color.name}
          type="button"
          onClick={() => toggleColor(color.name)}
          style={{ backgroundColor: color.value }}
          className={cn(
            'h-8 w-8 rounded-full border-2 flex items-center justify-center transition-all',
            selectedColors.includes(color.name) ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-muted',
            color.name === 'Blanc' && 'border-gray-300'
          )}
          aria-label={color.name}
        >
          {selectedColors.includes(color.name) && (
            <Check className="h-5 w-5" style={{ color: color.name === 'Blanc' || color.name === 'Beige' || color.name === 'Jaune' ? '#000' : '#fff' }} />
          )}
        </button>
      ))}
    </div>
  );
};

const formSchema = z.object({
  scheduleKeywords: z.string().min(1, 'Veuillez sélectionner une activité.'),
  weather: z.string().min(1, 'Veuillez sélectionner la météo.'),
  occasion: z.string().min(1, "Veuillez choisir une occasion."),
  preferredColors: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const completeOutfitFormSchema = z.object({
  itemType: z.string().min(1, 'Veuillez choisir un type de pièce.'),
  itemDescription: z.string().min(3, 'Veuillez décrire votre pièce.').max(100, 'La description est trop longue.'),
});

type CompleteOutfitFormValues = z.infer<typeof completeOutfitFormSchema>;

const occasionOptions = [
  { value: 'Professionnel', label: 'Professionnel' },
  { value: 'Décontracté', label: 'Décontracté' },
  { value: 'Chic', label: 'Chic' },
  { value: 'Sportif', label: 'Sportif' },
];

const scheduleOptions = [
  { value: 'Réunion Pro', label: 'Réunion Pro', icon: Briefcase },
  { value: 'Sortie entre amis', label: 'Sortie Amis', icon: Users },
  { value: 'Session de Sport', label: 'Sport', icon: Dumbbell },
  { value: 'Journée détente', label: 'Détente', icon: Coffee },
];

const weatherOptions = [
  { value: 'Ensoleillé', label: 'Ensoleillé', icon: Sun },
  { value: 'Nuageux', label: 'Nuageux', icon: Cloudy },
  { value: 'Pluvieux', label: 'Pluvieux', icon: CloudRain },
  { value: 'Froid', label: 'Froid', icon: Snowflake },
];

export default function OutfitSuggester() {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scheduleKeywords: 'Réunion Pro',
      weather: 'Ensoleillé',
      occasion: 'Décontracté',
      preferredColors: '',
    },
  });

  const completeOutfitForm = useForm<CompleteOutfitFormValues>({
    resolver: zodResolver(completeOutfitFormSchema),
    defaultValues: {
      itemType: '',
      itemDescription: '',
    }
  });

  async function handleSuggestOutfit(values: FormValues) {
    setIsLoading(true);
    setSuggestion(null);
    try {
      const input: SuggestOutfitInput = values;
      const result = await suggestOutfit(input);
      setSuggestion(result.outfitSuggestion);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite lors de la génération de la suggestion.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCompleteOutfit(values: CompleteOutfitFormValues) {
    const mainFormValues = form.getValues();
    const isMainFormValid = await form.trigger();

    if (!isMainFormValid) {
        toast({
            variant: 'destructive',
            title: 'Champs manquants',
            description: "Veuillez remplir les mots-clés de l'agenda, la météo et l'occasion avant de compléter une tenue.",
        });
        setIsDialogOpen(false);
        return;
    }

    setIsLoading(true);
    setSuggestion(null);
    setIsDialogOpen(false);

    try {
      const input: SuggestOutfitInput = {
        ...mainFormValues,
        baseItem: `${values.itemType}: ${values.itemDescription}`
      };
      const result = await suggestOutfit(input);
      setSuggestion(result.outfitSuggestion);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite lors de la génération de la suggestion.",
      });
    } finally {
      setIsLoading(false);
      completeOutfitForm.reset();
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Créateur de Tenue</CardTitle>
          <CardDescription>Remplissez les champs pour une suggestion sur-mesure ou complétez une tenue existante.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSuggestOutfit)}>
            <CardContent className="space-y-6">
            <FormField
                control={form.control}
                name="scheduleKeywords"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Activité du jour</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {scheduleOptions.map(opt => (
                           <FormItem key={opt.value} className="relative">
                            <FormControl>
                                <RadioGroupItem value={opt.value} className="sr-only" />
                            </FormControl>
                            <FormLabel className={cn(
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                field.value === opt.value && "border-primary"
                            )}>
                                <opt.icon className="h-6 w-6 mb-2" />
                                {opt.label}
                           </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weather"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Météo locale</FormLabel>
                     <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {weatherOptions.map(opt => (
                          <FormItem key={opt.value} className="relative">
                            <FormControl>
                                <RadioGroupItem value={opt.value} className="sr-only" />
                            </FormControl>
                            <FormLabel className={cn(
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                field.value === opt.value && "border-primary"
                            )}>
                                <opt.icon className="h-6 w-6 mb-2" />
                                {opt.label}
                           </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="occasion"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Occasion</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {occasionOptions.map(opt => (
                          <FormItem key={opt.value}>
                            <FormControl>
                                <RadioGroupItem value={opt.value} id={opt.value} className="peer sr-only" />
                            </FormControl>
                             <FormLabel htmlFor={opt.value} className="flex items-center justify-center rounded-md border-2 border-muted bg-popover p-4 font-normal hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                {opt.label}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" className="w-full">
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
                    <form onSubmit={completeOutfitForm.handleSubmit(handleCompleteOutfit)} className="space-y-4 pt-4">
                        <FormField
                            control={completeOutfitForm.control}
                            name="itemType"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type de pièce</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                    <SelectValue placeholder="Choisissez un type" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Un Haut">Un Haut (T-shirt, chemise, pull...)</SelectItem>
                                    <SelectItem value="Un Bas">Un Bas (Pantalon, jupe, short...)</SelectItem>
                                    <SelectItem value="Des Chaussures">Des Chaussures (Baskets, talons...)</SelectItem>
                                    <SelectItem value="Une Pièce Unique">Une Pièce Unique (Robe, combinaison...)</SelectItem>
                                    <SelectItem value="Un Accessoire">Un Accessoire (Sac, chapeau...)</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={completeOutfitForm.control}
                            name="itemDescription"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description de la pièce</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Ex: Jupe en jean bleu clair, Baskets blanches en cuir..." {...field}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isLoading} className="w-full">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Générer la tenue'}
                        </Button>
                    </form>
                </Form>
              </DialogContent>
            </Dialog>

            <FormField
                control={form.control}
                name="preferredColors"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Couleurs préférées (optionnel)</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value || ''} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Suggérer une tenue complète
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="min-h-[400px] flex flex-col justify-center items-center sticky top-24">
        {isLoading && (
          <div className="flex flex-col items-center text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-lg">Votre styliste IA réfléchit...</p>
          </div>
        )}
        {!isLoading && !suggestion && (
          <div className="text-center text-muted-foreground p-8">
            <Wand2 className="h-12 w-12 mx-auto" />
            <p className="mt-4 text-lg">Votre suggestion de tenue apparaîtra ici.</p>
          </div>
        )}
        {suggestion && (
          <CardContent className="p-6 w-full">
            <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue du Jour</h3>
            <div className="grid grid-cols-2 grid-rows-2 gap-4 mb-4">
                <div className="relative aspect-square bg-secondary rounded-lg overflow-hidden">
                    <Image src="https://placehold.co/300x300.png" alt="Haut" layout="fill" objectFit="cover" data-ai-hint="shirt" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-1 text-sm">Haut</div>
                </div>
                <div className="relative aspect-square bg-secondary rounded-lg overflow-hidden">
                    <Image src="https://placehold.co/300x300.png" alt="Bas" layout="fill" objectFit="cover" data-ai-hint="pants" />
                     <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-1 text-sm">Bas</div>
                </div>
                <div className="relative aspect-square bg-secondary rounded-lg overflow-hidden">
                    <Image src="https://placehold.co/300x300.png" alt="Chaussures" layout="fill" objectFit="cover" data-ai-hint="shoes" />
                     <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-1 text-sm">Chaussures</div>
                </div>
                <div className="relative aspect-square bg-secondary rounded-lg overflow-hidden">
                    <Image src="https://placehold.co/300x300.png" alt="Accessoires" layout="fill" objectFit="cover" data-ai-hint="watch" />
                     <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-center py-1 text-sm">Accessoires</div>
                </div>
            </div>
            <p className="text-sm text-center whitespace-pre-line">{suggestion}</p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
