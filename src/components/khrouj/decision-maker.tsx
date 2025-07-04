'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { makeDecision } from '@/ai/flows/decision-maker-flow';
import type { MakeDecisionOutput } from '@/ai/flows/decision-maker-flow.types';
import { Coffee, ShoppingBag, UtensilsCrossed, Mountain, MapPin, RotateCw, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const outingOptions: { id: string; label: string; icon: LucideIcon; description: string }[] = [
    { id: 'cafe', label: 'Café', icon: Coffee, description: "Pour un moment de détente" },
    { id: 'brunch', label: 'Brunch', icon: UtensilsCrossed, description: "Gourmandise du week-end" },
    { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, description: "Un repas mémorable" },
    { id: 'balade', label: 'Balade', icon: Mountain, description: "Prendre un bol d'air frais" },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag, description: "Trouver la perle rare" },
];

const LoadingAnimation = ({ category }: { category: {label: string, icon: LucideIcon} | undefined }) => {
    if (!category) return null;
    const Icon = category.icon;
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 space-y-6 animate-in fade-in-50">
            <div className="relative h-28 w-28 flex items-center justify-center">
                <div className="absolute h-full w-full bg-primary/10 rounded-full animate-ping"></div>
                <Icon className="relative h-16 w-16 text-primary" />
            </div>
            <p className="text-lg font-semibold text-muted-foreground animate-pulse">Recherche du meilleur spot "{category.label}" pour vous...</p>
        </div>
    );
};

export default function DecisionMaker() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<MakeDecisionOutput | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<(typeof outingOptions)[0] | undefined>(undefined);
  const { toast } = useToast();

  const handleDecideClick = async (category: typeof outingOptions[0]) => {
    setIsLoading(true);
    setResult(null);
    setSelectedCategory(category);

    try {
      const response = await makeDecision({ category: category.label, city: 'Tunis' });
      setResult(response);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite. Veuillez réessayer.",
      });
      handleReset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedCategory(undefined);
  }

  if (isLoading) {
    return (
        <Card className="max-w-md mx-auto min-h-[400px] flex items-center justify-center">
            <LoadingAnimation category={selectedCategory} />
        </Card>
    )
  }

  if (result) {
    const ResultIcon = outingOptions.find(o => o.label === result.chosenOption)?.icon || MapPin;
    return (
        <Card className="max-w-md mx-auto text-center animate-in fade-in-50 zoom-in-95">
            <CardHeader className="items-center">
                 <div className="p-3 bg-primary/10 rounded-full mb-2">
                    <ResultIcon className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-primary font-headline text-3xl">{result.placeName}</CardTitle>
                <CardDescription>Votre suggestion pour un(e) {result.chosenOption.toLowerCase()} parfait(e) !</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground text-lg">"{result.description}"</p>
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
                    <MapPin className="h-4 w-4" />
                    <span>Suggéré à {result.location}</span>
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-4 justify-center pt-6">
                <Button className="w-full" onClick={handleReset}>
                    <RotateCw className="mr-2 h-4 w-4" /> Une autre idée
                </Button>
                <Button variant="outline" className="w-full">
                    <MapPin className="mr-2 h-4 w-4" /> M'y emmener
                </Button>
            </CardFooter>
        </Card>
    );
  }
  
  return (
    <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <CardTitle className="font-headline">Quelle est votre envie du moment ?</CardTitle>
            <CardDescription>Cliquez sur une catégorie et laissez la magie opérer.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {outingOptions.map((option) => {
            const Icon = option.icon;
            return (
              <div 
                key={option.id}
                onClick={() => handleDecideClick(option)}
                className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed bg-card p-6 text-card-foreground shadow-sm hover:shadow-xl hover:border-primary hover:-translate-y-1 transition-all duration-300 cursor-pointer space-y-3"
              >
                  <div className="p-4 bg-muted group-hover:bg-primary/10 rounded-full transition-colors duration-300">
                    <Icon className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                  </div>
                  <h3 className="text-lg font-semibold">{option.label}</h3>
                  <p className="text-xs text-center text-muted-foreground">{option.description}</p>
              </div>
            )
          })}
        </CardContent>
    </Card>
  );
}
