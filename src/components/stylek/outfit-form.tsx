
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Briefcase, Users, Dumbbell, Coffee, Sun, Cloudy, CloudRain, Snowflake, Wand2, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CompleteOutfitDialog } from './complete-outfit-dialog';

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

interface OutfitFormProps {
    isLoading: boolean;
    onSuggestOutfit: (values: FormValues & { baseItem?: string, baseItemPhotoDataUri?: string }) => void;
}

export function OutfitForm({ isLoading, onSuggestOutfit }: OutfitFormProps) {
  const searchParams = useSearchParams();
  const { userProfile } = useAuth();
  
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

  const handleSuggestOutfit = (values: FormValues) => {
    onSuggestOutfit(values);
  };
  
  return (
    <>
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
            <CompleteOutfitDialog
              gender={userProfile?.gender}
              mainForm={form}
              onCompleteOutfit={onSuggestOutfit}
              isLoading={isLoading}
            />
            <Button type="submit" variant="outline" disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
              Idée de tenue complète
            </Button>
          </CardFooter>
        </form>
      </Form>
    </>
  );
}
