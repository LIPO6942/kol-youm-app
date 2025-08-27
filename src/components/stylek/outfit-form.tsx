
'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams } from 'next/navigation';
import { Briefcase, Users, Dumbbell, Coffee, Sun, Cloudy, CloudRain, Snowflake, Wand2, Loader2, Check, Sparkles, Building, Shirt } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  { value: 'Professionnel', label: 'Pro', icon: Building, colorClass: 'text-indigo-700', bgClass: 'bg-indigo-50', hoverClass: 'hover:bg-indigo-100', selectedClass: 'border-indigo-500 bg-indigo-100' },
  { value: 'Décontracté', label: 'Casual', icon: Shirt, colorClass: 'text-cyan-700', bgClass: 'bg-cyan-50', hoverClass: 'hover:bg-cyan-100', selectedClass: 'border-cyan-500 bg-cyan-100' },
  { value: 'Chic', label: 'Chic', icon: Sparkles, colorClass: 'text-fuchsia-700', bgClass: 'bg-fuchsia-50', hoverClass: 'hover:bg-fuchsia-100', selectedClass: 'border-fuchsia-500 bg-fuchsia-100' },
  { value: 'Sportif', label: 'Sport', icon: Dumbbell, colorClass: 'text-red-700', bgClass: 'bg-red-50', hoverClass: 'hover:bg-red-100', selectedClass: 'border-red-500 bg-red-100' },
];


const scheduleOptions = [
  { value: 'Réunion Pro', label: 'Réunion', icon: Briefcase, colorClass: 'text-blue-700', bgClass: 'bg-blue-50', hoverClass: 'hover:bg-blue-100', selectedClass: 'border-blue-500 bg-blue-100' },
  { value: 'Sortie entre amis', label: 'Amis', icon: Users, colorClass: 'text-green-700', bgClass: 'bg-green-50', hoverClass: 'hover:bg-green-100', selectedClass: 'border-green-500 bg-green-100' },
  { value: 'Session de Sport', label: 'Sport', icon: Dumbbell, colorClass: 'text-red-700', bgClass: 'bg-red-50', hoverClass: 'hover:bg-red-100', selectedClass: 'border-red-500 bg-red-100' },
  { value: 'Journée détente', label: 'Détente', icon: Coffee, colorClass: 'text-amber-800', bgClass: 'bg-amber-50', hoverClass: 'hover:bg-amber-100', selectedClass: 'border-amber-600 bg-amber-100' },
];


const weatherOptions = [
  { value: 'Ensoleillé', label: 'Soleil', icon: Sun, colorClass: 'text-amber-600', bgClass: 'bg-amber-50', hoverClass: 'hover:bg-amber-100', selectedClass: 'border-amber-500 bg-amber-100' },
  { value: 'Nuageux', label: 'Nuages', icon: Cloudy, colorClass: 'text-slate-600', bgClass: 'bg-slate-100', hoverClass: 'hover:bg-slate-200', selectedClass: 'border-slate-500 bg-slate-200' },
  { value: 'Pluvieux', label: 'Pluie', icon: CloudRain, colorClass: 'text-blue-600', bgClass: 'bg-blue-50', hoverClass: 'hover:bg-blue-100', selectedClass: 'border-blue-500 bg-blue-100' },
  { value: 'Froid', label: 'Froid', icon: Snowflake, colorClass: 'text-sky-600', bgClass: 'bg-sky-50', hoverClass: 'hover:bg-sky-100', selectedClass: 'border-sky-500 bg-sky-100' },
];


interface OutfitFormProps {
    isLoading: boolean;
    onSuggestOutfit: (values: FormValues & { baseItem?: string, baseItemPhotoDataUri?: string }) => void;
}

export function OutfitForm({ isLoading, onSuggestOutfit }: OutfitFormProps) {
  const searchParams = useSearchParams();
  
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
  
  const handleSuggestOutfit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      onSuggestOutfit(form.getValues());
    }
  };
  
  return (
    <>
      <CardHeader>
        <CardTitle className="font-headline">Votre Styliste Personnel</CardTitle>
        <CardDescription>Obtenez une tenue sur-mesure en quelques clics.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
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
                              "flex flex-col items-center justify-center rounded-md border-2 border-muted p-2 font-normal cursor-pointer h-20 transition-colors",
                              opt.bgClass,
                              opt.hoverClass,
                              field.value === opt.value ? opt.selectedClass : "text-foreground"
                          )}>
                              <opt.icon className={cn("h-5 w-5 mb-1", opt.colorClass)} />
                              <span className={cn("text-sm font-medium", opt.colorClass)}>{opt.label}</span>
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
                              "flex flex-col items-center justify-center rounded-md border-2 border-muted p-2 font-normal cursor-pointer h-20 transition-colors",
                              opt.bgClass,
                              opt.hoverClass,
                              field.value === opt.value ? opt.selectedClass : "text-foreground"
                          )}>
                              <opt.icon className={cn("h-5 w-5 mb-1", opt.colorClass)} />
                              <span className={cn("text-sm font-medium", opt.colorClass)}>{opt.label}</span>
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
                              <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                          </FormControl>
                           <FormLabel htmlFor={opt.value} className={cn(
                              "flex flex-col items-center justify-center rounded-md border-2 border-muted p-2 font-normal cursor-pointer h-20 transition-colors",
                              opt.bgClass,
                              opt.hoverClass,
                              field.value === opt.value ? opt.selectedClass : "text-foreground"
                           )}>
                              <opt.icon className={cn("h-5 w-5 mb-1", opt.colorClass)} />
                              <span className={cn("text-sm font-medium", opt.colorClass)}>{opt.label}</span>
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
          <CardFooter className="flex-col pt-6 space-y-2">
            <CompleteOutfitDialog
              mainForm={form}
              onCompleteOutfit={onSuggestOutfit}
              isGenerating={isLoading}
            />
          </CardFooter>
        </form>
      </Form>
    </>
  );
}
