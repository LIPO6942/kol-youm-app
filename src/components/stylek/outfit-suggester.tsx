
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Wand2, Loader2, PlusCircle, Check, Sun, Cloudy, CloudRain, Snowflake, Briefcase, Users, Dumbbell, Coffee, XCircle, RotateCw } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

import { suggestOutfit } from '@/ai/flows/intelligent-outfit-suggestion';
import type { SuggestOutfitInput, SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import { generateOutfitImage } from '@/ai/flows/generate-outfit-image';
import { regenerateOutfitPart } from '@/ai/flows/regenerate-outfit-part-flow';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

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
  type: z.string().min(1, 'Veuillez choisir un type.'),
  category: z.string().min(1, 'Veuillez choisir une catégorie.'),
  style: z.string().optional(),
  color: z.string().optional(),
});

type CompleteOutfitFormValues = z.infer<typeof completeOutfitFormSchema>;


const occasionOptions = [
  { value: 'Professionnel', label: 'Pro' },
  { value: 'Décontracté', label: 'Casual' },
  { value: 'Chic', label: 'Chic' },
  { value: 'Sportif', label: 'Sport' },
];

const scheduleOptions = [
  { value: 'Réunion Pro', label: 'Réunion', icon: Briefcase },
  { value: 'Sortie entre amis', label: 'Amis', icon: Users },
  { value: 'Session de Sport', label: 'Sport', icon: Dumbbell },
  { value: 'Journée détente', label: 'Détente', icon: Coffee },
];

const weatherOptions = [
  { value: 'Ensoleillé', label: 'Soleil', icon: Sun },
  { value: 'Nuageux', label: 'Nuages', icon: Cloudy },
  { value: 'Pluvieux', label: 'Pluie', icon: CloudRain },
  { value: 'Froid', label: 'Froid', icon: Snowflake },
];

const handleAiError = (error: any, toast: any) => {
    const errorMessage = error.message || '';
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast({
            variant: 'destructive',
            title: 'L\'IA est très demandée !',
            description: "Nous avons atteint notre limite de requêtes. L'IA se repose un peu, réessayez dans quelques minutes.",
        });
    } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
         toast({
            variant: 'destructive',
            title: 'L\'IA est en surchauffe !',
            description: "Nos serveurs sont un peu surchargés. Donnez-lui un instant pour reprendre son souffle et réessayez.",
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Erreur',
            description: "Une erreur inattendue s'est produite. Veuillez réessayer.",
        });
    }
    console.error(error);
};

const GeneratedOutfitImage = ({ description, gender }: { description: string; gender?: 'Homme' | 'Femme' }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const generate = async () => {
      if (!description) return;
      setIsLoading(true);
      setError(false);
      setImageUrl(null);
      try {
        const result = await generateOutfitImage({ itemDescription: description, gender });
        setImageUrl(result.imageDataUri);
      } catch (e) {
        console.error(`Failed to generate outfit image`, e);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };
    generate();
  }, [description, gender]);

  return (
    <div className="relative aspect-[3/4] w-full max-w-sm mx-auto bg-secondary rounded-lg overflow-hidden flex items-center justify-center">
      {isLoading && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
      {error && <div className="text-center p-4">
          <XCircle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-xs text-destructive-foreground mt-2">Erreur Image</p>
      </div>}
      {imageUrl && <Image src={imageUrl} alt="Tenue suggérée" fill className="object-cover" />}
    </div>
  );
};


export default function OutfitSuggester() {
  const { userProfile } = useAuth();
  const [suggestion, setSuggestion] = useState<SuggestOutfitOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [currentConstraints, setCurrentConstraints] = useState<SuggestOutfitInput | null>(null);
  const [regeneratingPart, setRegeneratingPart] = useState<'haut' | 'bas' | 'chaussures' | 'accessoires' | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      scheduleKeywords: 'Réunion Pro',
      weather: 'Ensoleillé',
      occasion: 'Décontracté',
      preferredColors: '',
    },
  });

  useEffect(() => {
    const occasion = searchParams.get('occasion');
    if (occasion && occasionOptions.some(o => o.value === occasion)) {
        form.setValue('occasion', occasion);
    }
  }, [searchParams, form]);


  const completeOutfitForm = useForm<CompleteOutfitFormValues>({
    resolver: zodResolver(completeOutfitFormSchema),
    defaultValues: {
      type: '',
      category: '',
      style: '',
      color: '',
    }
  });

  const clothingData = useMemo(() => {
    if (userProfile?.gender === 'Homme') {
        return clothingDataHomme;
    }
    // Default to Femme if gender is not set or is Femme
    return clothingDataFemme;
  }, [userProfile?.gender]);
  
  useEffect(() => {
    completeOutfitForm.reset({
      type: '',
      category: '',
      style: '',
      color: '',
    });
  }, [clothingData, completeOutfitForm]);

  const typeValue = completeOutfitForm.watch('type');
  const categoryValue = completeOutfitForm.watch('category');


  const getSuggestion = async (input: SuggestOutfitInput) => {
    setIsLoading(true);
    setSuggestion(null);
    setCurrentConstraints(null);

    const fullInput: SuggestOutfitInput = { 
      ...input, 
      gender: userProfile?.gender 
    };

    try {
      const result = await suggestOutfit(fullInput);
      setSuggestion(result);
      setCurrentConstraints(fullInput);
    } catch (error) {
      handleAiError(error, toast);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSuggestOutfit = (values: FormValues) => {
    getSuggestion(values);
  };
  
  const handleCompleteOutfit = async (values: CompleteOutfitFormValues) => {
    const mainFormValues = form.getValues();
    const isMainFormValid = await form.trigger();

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

    const baseItemDescription = [values.category, values.style, values.color].filter(Boolean).join(' ');
    const input: SuggestOutfitInput = {
      ...mainFormValues,
      baseItem: `${values.type}: ${baseItemDescription}`
    };
    
    await getSuggestion(input);
    completeOutfitForm.reset();
  };

  const handleRegeneratePart = async (part: 'haut' | 'bas' | 'chaussures' | 'accessoires') => {
    if (!currentConstraints || !suggestion || regeneratingPart) return;

    setRegeneratingPart(part);
    try {
      const newSuggestion = await regenerateOutfitPart({
        originalConstraints: currentConstraints,
        currentOutfit: suggestion,
        partToChange: part,
      });
      setSuggestion(newSuggestion);
    } catch (error) {
      handleAiError(error, toast);
    } finally {
      setRegeneratingPart(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Votre Styliste Personnel</CardTitle>
          <CardDescription>Obtenez une tenue sur-mesure en quelques clics.</CardDescription>
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
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                        {scheduleOptions.map(opt => (
                           <FormItem key={opt.value} className="relative">
                            <FormControl>
                                <RadioGroupItem value={opt.value} className="sr-only" />
                            </FormControl>
                            <FormLabel className={cn(
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer h-20",
                                field.value === opt.value && "border-primary"
                            )}>
                                <opt.icon className="h-5 w-5 mb-1" />
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
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                        {weatherOptions.map(opt => (
                          <FormItem key={opt.value} className="relative">
                            <FormControl>
                                <RadioGroupItem value={opt.value} className="sr-only" />
                            </FormControl>
                            <FormLabel className={cn(
                                "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer h-20",
                                field.value === opt.value && "border-primary"
                            )}>
                                <opt.icon className="h-5 w-5 mb-1" />
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
                    <FormLabel>Style de l'occasion</FormLabel>
                    <FormControl>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
                        {occasionOptions.map(opt => (
                          <FormItem key={opt.value}>
                            <FormControl>
                                <RadioGroupItem value={opt.value} id={opt.value} className="peer sr-only" />
                            </FormControl>
                             <FormLabel htmlFor={opt.value} className="flex h-12 items-center justify-center rounded-md border-2 border-muted bg-popover p-2 font-normal hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
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
            <CardFooter className="flex-col sm:flex-row gap-2 pt-6">
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
                        <form onSubmit={completeOutfitForm.handleSubmit(handleCompleteOutfit)} className="space-y-4 pt-4">
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
                
                <Button type="submit" variant="outline" disabled={isLoading} className="w-full">
                    {isLoading && !suggestion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Idée de tenue complète
                </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card className="min-h-[600px] flex flex-col justify-center items-center sticky top-24">
        {(isLoading && !suggestion) && (
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
          <CardContent className="p-4 sm:p-6 w-full">
            <h3 className="text-xl font-bold font-headline text-center mb-4">Votre Tenue du Jour</h3>
            <GeneratedOutfitImage description={suggestion.suggestionText} gender={userProfile?.gender} />

            <div className="mt-6 space-y-3">
               {[
                  { key: 'haut', label: 'Haut' },
                  { key: 'bas', label: 'Bas' },
                  { key: 'chaussures', label: 'Chaussures' },
                  { key: 'accessoires', label: 'Accessoires' },
              ] as const).map(({ key, label }) => (
                  suggestion[key] !== 'N/A' && (
                  <div key={key} className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex justify-between items-center mb-1">
                          <p className="font-semibold text-muted-foreground">{label}</p>
                          <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7" 
                              onClick={() => handleRegeneratePart(key)} 
                              disabled={!!regeneratingPart}
                              aria-label={`Regénérer ${label}`}
                          >
                              {regeneratingPart === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
                          </Button>
                      </div>
                      <p className="font-medium">{suggestion[key]}</p>
                  </div>
                  )
              ))}
            </div>
            
          </CardContent>
        )}
      </Card>
    </div>
  );
}
