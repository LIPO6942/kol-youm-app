'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { makeDecision } from '@/ai/flows/decision-maker-flow';
import type { Suggestion } from '@/ai/flows/decision-maker-flow.types';
import { Coffee, ShoppingBag, UtensilsCrossed, Mountain, MapPin, RotateCw, ArrowLeft, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/firebase/firestore';

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
            <p className="text-lg font-semibold text-muted-foreground animate-pulse">Recherche des meilleurs spots "{category.label}" pour vous...</p>
        </div>
    );
};

export default function DecisionMaker() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<(typeof outingOptions)[0] | undefined>(undefined);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();

  const fetchSuggestions = async (categoryLabel: string) => {
    setIsLoading(true);
    setResults(null); 
    if (!user) {
        toast({ variant: "destructive", title: "Erreur", description: "Veuillez vous connecter." });
        setIsLoading(false);
        return;
    }

    try {
      const seenPlaces = userProfile?.seenKhroujSuggestions || [];
      const response = await makeDecision({ 
          category: categoryLabel, 
          city: 'Tunis',
          seenPlaceNames: seenPlaces,
      });
      
      setResults(response.suggestions);
      
      // Add newly suggested places to the seen list so they aren't repeated in the next fetch
      const suggestedPlaceNames = response.suggestions.map(s => s.placeName);
      if (suggestedPlaceNames.length > 0) {
        await updateUserProfile(user.uid, { seenKhroujSuggestions: suggestedPlaceNames });
      }

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: "Une erreur s'est produite. Veuillez réessayer." });
      handleReset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategorySelect = (category: typeof outingOptions[0]) => {
    setSelectedCategory(category);
    fetchSuggestions(category.label);
  };

  const handleReset = () => {
    setResults(null);
    setSelectedCategory(undefined);
  };

  if (isLoading || (selectedCategory && !results)) {
    return (
        <Card className="max-w-2xl mx-auto min-h-[400px] flex items-center justify-center">
            <LoadingAnimation category={selectedCategory} />
        </Card>
    )
  }
  
  if (results && selectedCategory) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handleReset}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Retour</span>
            </Button>
            <div>
                <h2 className="text-2xl font-bold font-headline tracking-tight">Suggestions de {selectedCategory.label}s</h2>
                <p className="text-muted-foreground">Voici quelques idées pour vous, dans des zones différentes.</p>
            </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((suggestion, index) => {
            const Icon = outingOptions.find(o => o.id === selectedCategory.id)?.icon || MapPin;
            return (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="font-headline text-2xl text-primary">{suggestion.placeName}</CardTitle>
                      <CardDescription>{suggestion.location}</CardDescription>
                    </div>
                    <div className="p-2 bg-primary/10 rounded-full ml-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-muted-foreground text-sm">"{suggestion.description}"</p>
                </CardContent>
                <CardFooter>
                  <Link href={suggestion.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="w-full">
                      <MapPin className="mr-2 h-4 w-4" /> M'y emmener
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
        <div className="text-center">
          <Button onClick={() => fetchSuggestions(selectedCategory.label)}>
            <RotateCw className="mr-2 h-4 w-4" /> Actualiser les suggestions
          </Button>
        </div>
      </div>
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
                onClick={() => handleCategorySelect(option)}
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
