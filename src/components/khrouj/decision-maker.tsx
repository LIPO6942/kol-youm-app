
'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { makeDecision } from '@/ai/flows/decision-maker-flow';
import type { Suggestion } from '@/ai/flows/decision-maker-flow.types';
import { Coffee, ShoppingBag, UtensilsCrossed, Mountain, MapPin, RotateCw, ArrowLeft, type LucideIcon, ChevronLeft, ChevronRight, Sandwich, Filter, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const outingOptions: { id: string; label: string; icon: LucideIcon; description: string }[] = [
    { id: 'fast-food', label: 'Fast Food', icon: Sandwich, description: "Une envie rapide et gourmande" },
    { id: 'cafe', label: 'Café', icon: Coffee, description: "Pour un moment de détente" },
    { id: 'brunch', label: 'Brunch', icon: UtensilsCrossed, description: "Gourmandise du week-end" },
    { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed, description: "Un repas mémorable" },
    { id: 'balade', label: 'Balade', icon: Mountain, description: "Prendre un bol d'air frais" },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag, description: "Trouver la perle rare" },
];

const zones = [
    "La Marsa", "Gammarth", "El Aouina", "Les Berges du Lac 1", "Les Berges du Lac 2",
    "Jardins de Carthage", "Boumhal", "Ezzahra", "Hammamet", "Nabeul", "Mégrine", "La Soukra",
    "Le Bardo", "Menzah 1", "Menzah 5", "Menzah 6", "Menzah 8", "Menzah 9", "Ennasr", "Centre-ville de Tunis", 
    "Mutuelleville / Alain Savary", "El Manar"
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

// Function to shuffle an array
const shuffle = <T,>(array: T[]): T[] => {
  let currentIndex = array.length, randomIndex;

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
};

export default function DecisionMaker() {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [seenSuggestions, setSeenSuggestions] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<(typeof outingOptions)[0] | undefined>(undefined);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  const handleAiError = (error: any) => {
    const errorMessage = String(error.message || '');
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast({
            variant: 'destructive',
            title: 'L\'IA est très demandée !',
            description: "Nous avons atteint notre limite de requêtes. L'IA se repose un peu, réessayez dans quelques minutes.",
        });
    } else if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable')) {
         toast({
            variant: 'destructive',
            title: 'L\'IA est en surchauffe !',
            description: "Nos serveurs sont un peu surchargés. Donnez-lui un instant pour reprendre son souffle et réessayez.",
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Erreur Inattendue',
            description: "Une erreur s'est produite. Veuillez réessayer.",
        });
    }
    console.error(error);
  };

  const fetchSuggestions = useCallback(async (categoryLabel: string, zonesToFilter: string[], isNewRequest: boolean = false) => {
    setIsLoading(true);
    if (isNewRequest) {
      setSuggestions([]);
      setSeenSuggestions([]);
    }
    
    if (!user) {
        toast({ variant: "destructive", title: "Erreur", description: "Veuillez vous connecter." });
        setIsLoading(false);
        return;
    }

    try {
      const combinedSeenPlaces = Array.from(new Set([...(userProfile?.seenKhroujSuggestions || []), ...seenSuggestions]));

      const response = await makeDecision({ 
          category: categoryLabel, 
          city: 'Tunis',
          zones: zonesToFilter.length > 0 ? zonesToFilter : undefined,
          seenPlaceNames: combinedSeenPlaces,
      });
      
      const newPlaceNames = response.suggestions.map(s => s.placeName);
      
      // Shuffle the suggestions before displaying them
      setSuggestions(shuffle(response.suggestions));
      
      const updatedSeenSuggestions = Array.from(new Set([...seenSuggestions, ...newPlaceNames]));
      setSeenSuggestions(updatedSeenSuggestions);
      
      if (newPlaceNames.length > 0) {
        await updateUserProfile(user.uid, { seenKhroujSuggestions: updatedSeenSuggestions });
      }

    } catch (error: any) {
        handleAiError(error);
        if (isNewRequest) handleReset();
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile?.seenKhroujSuggestions, seenSuggestions, toast]);

  const handleCategorySelect = (category: typeof outingOptions[0]) => {
    setSelectedCategory(category);
    // When a category is selected, use the currently selected zones for the filter.
    fetchSuggestions(category.label, selectedZones, true);
  };

  const handleReset = () => {
    setSuggestions([]);
    setSeenSuggestions([]);
    setSelectedCategory(undefined);
    setSelectedZones([]);
    if (carouselApi) {
        carouselApi.destroy();
    }
  };

  const handleRefresh = () => {
    if (selectedCategory) {
        fetchSuggestions(selectedCategory.label, selectedZones, true);
    }
  }

  const handleZoneChange = (zone: string, checked: boolean) => {
    const newZones = checked ? [...selectedZones, zone] : selectedZones.filter(z => z !== zone);
    setSelectedZones(newZones);
    
    // If a category is already selected, re-fetch suggestions with the new zone filters.
    if (selectedCategory) {
        fetchSuggestions(selectedCategory.label, newZones, true);
    }
  };
  
  const getFilterButtonText = () => {
    if (selectedZones.length === 0) {
        return "Filtrer par zone (optionnel)";
    }
    if (selectedZones.length === 1) {
        return `Zone : ${selectedZones[0]}`;
    }
    return `${selectedZones.length} zones sélectionnées`;
  }

  const handleClearZones = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newZones: string[] = [];
    setSelectedZones(newZones);
    if (selectedCategory) {
        fetchSuggestions(selectedCategory.label, newZones, true);
    }
  }


  if (isLoading && suggestions.length === 0) {
    return (
        <Card className="max-w-2xl mx-auto min-h-[400px] flex items-center justify-center">
            <LoadingAnimation category={selectedCategory} />
        </Card>
    )
  }
  
  if (suggestions.length > 0 && selectedCategory) {
    return (
      <div className="space-y-4 animate-in fade-in-50">
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

        <Carousel setApi={setCarouselApi} className="w-full max-w-xs mx-auto">
          <CarouselContent>
            {suggestions.map((suggestion, index) => {
              const Icon = outingOptions.find(o => o.id === selectedCategory.id)?.icon || MapPin;
              return (
                <CarouselItem key={index}>
                    <div className="p-1">
                    <Card className="flex flex-col h-[350px]">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="font-headline text-2xl text-primary">{suggestion.placeName}</CardTitle>
                            <CardDescription>{suggestion.location}</CardDescription>
                          </div>
                          <div className="p-2 bg-primary/10 rounded-full ml-4 flex-shrink-0">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-muted-foreground text-sm italic">"{suggestion.description}"</p>
                      </CardContent>
                      <CardFooter>
                        <Link href={suggestion.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                          <Button variant="outline" className="w-full">
                            <MapPin className="mr-2 h-4 w-4" /> M'y emmener
                          </Button>
                        </Link>
                      </CardFooter>
                    </Card>
                    </div>
                </CarouselItem>
              );
            })}
             <CarouselItem>
                <div className="p-1">
                    <Card className="flex flex-col h-[350px] items-center justify-center text-center">
                        <CardHeader>
                            <CardTitle>Plus d'idées ?</CardTitle>
                            <CardDescription>Demandez à l'IA de nouvelles suggestions.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleRefresh} disabled={isLoading}>
                                {isLoading ? <RotateCw className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                                Actualiser
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </CarouselItem>
          </CarouselContent>
          <CarouselPrevious className="left-[-50px]" />
          <CarouselNext className="right-[-50px]" />
        </Carousel>
      </div>
    );
  }
  
  return (
    <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
            <CardTitle className="font-headline">Quelle est votre envie du moment ?</CardTitle>
            <CardDescription>Cliquez sur une catégorie et laissez la magie opérer.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <Collapsible className="space-y-2">
                <div className="flex justify-center items-center">
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="text-sm">
                            <Filter className="mr-2 h-4 w-4" />
                            {getFilterButtonText()}
                        </Button>
                    </CollapsibleTrigger>
                    {selectedZones.length > 0 && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearZones}>
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
                <CollapsibleContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
                        {zones.sort().map(zone => (
                            <div key={zone} className="flex items-center space-x-2">
                                <Checkbox
                                    id={zone}
                                    checked={selectedZones.includes(zone)}
                                    onCheckedChange={(checked) => handleZoneChange(zone, !!checked)}
                                />
                                <Label 
                                    htmlFor={zone}
                                    className="text-sm font-normal cursor-pointer"
                                >
                                    {zone}
                                </Label>
                            </div>
                        ))}
                    </div>
                </CollapsibleContent>
            </Collapsible>

            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
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
            </div>
        </CardContent>
    </Card>
  );
}
 

    
    