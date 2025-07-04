'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { makeDecision, type MakeDecisionOutput } from '@/ai/flows/decision-maker-flow';
import { Sparkles, Loader2, MapPin, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

const outingOptions = [
    { id: 'cafe', label: '☕ Café' },
    { id: 'brunch', label: '🍳 Brunch' },
    { id: 'restaurant', label: '🍴 Restaurant' },
    { id: 'balade', label: '🌅 Balade' },
    { id: 'shopping', label: '🛍️ Shopping' },
];

const LoadingAnimation = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
        <div className="relative h-24 w-24">
             <Sparkles className="absolute h-16 w-16 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-ping" />
             <Sparkles className="relative h-24 w-24 text-primary" />
        </div>
        <p className="text-lg font-semibold text-muted-foreground">Un instant, l'inspiration arrive...</p>
    </div>
);

export default function DecisionMaker() {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MakeDecisionOutput | null>(null);
  const { toast } = useToast();

  const handleCheckboxChange = (optionLabel: string) => {
    setSelectedOptions(prev =>
      prev.includes(optionLabel)
        ? prev.filter(item => item !== optionLabel)
        : [...prev, optionLabel]
    );
  };

  const handleDecideClick = async () => {
    if (selectedOptions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Aucune sélection',
        description: 'Veuillez choisir au moins une option.',
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await makeDecision({ options: selectedOptions.map(o => o.split(' ')[1]), city: 'Tunis' });
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite. Veuillez réessayer.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedOptions([]);
  }

  if (isLoading) {
    return (
        <Card className="max-w-md mx-auto min-h-[400px] flex items-center justify-center">
            <LoadingAnimation />
        </Card>
    )
  }

  if (result) {
    return (
        <Card className="max-w-md mx-auto text-center animate-in fade-in-50 zoom-in-95">
            <CardHeader>
                <CardTitle className="text-primary font-headline text-3xl">{result.chosenOption} !</CardTitle>
                <CardDescription>Et si vous essayiez...</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-2xl font-bold">{result.placeName}</p>
                <p className="text-muted-foreground">"{result.description}"</p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Suggéré à {result.location}</span>
                </div>
            </CardContent>
            <CardFooter className="flex-col sm:flex-row gap-4 justify-center">
                <Button variant="outline" className="w-full sm:w-auto">
                    <MapPin className="mr-2 h-4 w-4" /> Voir sur la carte
                </Button>
                <Button className="w-full sm:w-auto" onClick={handleReset}>
                    <Sparkles className="mr-2 h-4 w-4" /> Autre idée
                </Button>
            </CardFooter>
        </Card>
    );
  }
  
  return (
    <Card className="max-w-md mx-auto">
        <CardHeader>
            <CardTitle className="font-headline">Entre quoi tu hésites aujourd'hui ?</CardTitle>
            <CardDescription>Sélectionnez une ou plusieurs options et laissez la magie opérer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                {outingOptions.map(option => (
                    <div key={option.id} className="flex items-center space-x-2">
                        <Checkbox 
                            id={option.id}
                            onCheckedChange={() => handleCheckboxChange(option.label)}
                            checked={selectedOptions.includes(option.label)}
                        />
                        <Label htmlFor={option.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                            {option.label}
                        </Label>
                    </div>
                ))}
            </div>
        </CardContent>
        <CardFooter>
            <Button 
                className="w-full" 
                onClick={handleDecideClick}
                disabled={selectedOptions.length === 0}
            >
                <Sparkles className="mr-2 h-5 w-5" />
                Décide pour moi !
            </Button>
        </CardFooter>
    </Card>
  );
}
