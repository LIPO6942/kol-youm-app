
import { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { makeDecision } from '@/ai/flows/decision-maker-flow';
import type { Suggestion } from '@/ai/flows/decision-maker-flow.types';
import { Coffee, ShoppingBag, UtensilsCrossed, Mountain, MapPin, RotateCw, ArrowLeft, type LucideIcon, ChevronLeft, ChevronRight, Sandwich, Filter, X, Sun, Pizza, CupSoda, BarChart3, Plus, History, Calendar, Trash2, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile, addVisitLog, deleteVisitLog, type VisitLog } from '@/lib/firebase/firestore';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

const outingOptions: { id: string; label: string; icon: LucideIcon; description: string, colorClass: string, bgClass: string, hoverClass: string, selectedClass: string }[] = [
  { id: 'fast-food', label: 'Fast Food', icon: Sandwich, description: "Rapide et gourmand", colorClass: 'text-orange-700', bgClass: 'bg-orange-50', hoverClass: 'hover:bg-orange-100', selectedClass: 'border-orange-500 bg-orange-100' },
  { id: 'cafe', label: 'Café', icon: Coffee, description: "Pour se détendre", colorClass: 'text-amber-800', bgClass: 'bg-amber-50', hoverClass: 'hover:bg-amber-100', selectedClass: 'border-amber-600 bg-amber-100' },
  { id: 'brunch', label: 'Brunch', icon: Sun, description: "Gourmandise du matin", colorClass: 'text-yellow-600', bgClass: 'bg-yellow-50', hoverClass: 'hover:bg-yellow-100', selectedClass: 'border-yellow-500 bg-yellow-100' },
  { id: 'restaurant', label: 'Restaurant', icon: Pizza, description: "Un repas mémorable", colorClass: 'text-red-700', bgClass: 'bg-red-50', hoverClass: 'hover:bg-red-100', selectedClass: 'border-red-500 bg-red-100' },
  { id: 'balade', label: 'Balade', icon: Mountain, description: "Prendre l'air", colorClass: 'text-green-700', bgClass: 'bg-green-50', hoverClass: 'hover:bg-green-100', selectedClass: 'border-green-500 bg-green-100' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, description: "Trouver la perle", colorClass: 'text-pink-700', bgClass: 'bg-pink-50', hoverClass: 'hover:bg-pink-100', selectedClass: 'border-pink-500 bg-pink-100' },
];

const zones = [
  "La Marsa", "Gammarth", "El Aouina", "Ain Zaghouan Nord", "Les Berges du Lac 1", "Les Berges du Lac 2",
  "Jardins de Carthage", "Carthage", "La Goulette/Kram", "Boumhal", "Ezzahra", "Hammamet", "Nabeul", "Mégrine", "La Soukra",
  "Le Bardo", "Menzah 1", "Menzah 5", "Menzah 6", "Menzah 8", "Menzah 9", "Ennasr", "Centre-ville de Tunis",
  "Mutuelleville / Alain Savary", "El Manar"
];

const LoadingAnimation = ({ category }: { category: { label: string, icon: LucideIcon } | undefined }) => {
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

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    // And swap it with the current element.
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
  const [view, setView] = useState<'search' | 'stats'>('search');
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const { toast } = useToast();
  const { user, userProfile } = useAuth();
  const [carouselApi, setCarouselApi] = useState<CarouselApi | null>(null);

  // Assisted selection data
  const [allPlaces, setAllPlaces] = useState<{ name: string; category: string }[]>([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);

  useEffect(() => {
    async function fetchAllPlaces() {
      setIsFetchingPlaces(true);
      try {
        const response = await fetch('/api/places-database-firestore');
        const result = await response.json();
        if (result.success && result.data.zones) {
          const flatPlaces: { name: string; category: string }[] = [];
          result.data.zones.forEach((zone: any) => {
            Object.entries(zone.categories).forEach(([catKey, places]: [string, any]) => {
              // Map Firestore keys to UI labels
              const labelMap: Record<string, string> = {
                cafes: 'Café',
                restaurants: 'Restaurant',
                fastFoods: 'Fast Food',
                brunch: 'Brunch',
                balade: 'Balade',
                shopping: 'Shopping'
              };
              const categoryLabel = labelMap[catKey] || catKey;
              places.forEach((name: string) => {
                flatPlaces.push({ name, category: categoryLabel });
              });
            });
          });
          setAllPlaces(flatPlaces);
        }
      } catch (error) {
        console.error("Failed to fetch places for selection help", error);
      } finally {
        setIsFetchingPlaces(false);
      }
    }
    fetchAllPlaces();
  }, []);

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

  const fetchSuggestions = useCallback(async (category: (typeof outingOptions)[0], zones: string[]) => {
    setIsLoading(true);
    setSuggestions([]); // Clear old suggestions immediately

    if (!user) {
      toast({ variant: "destructive", title: "Erreur", description: "Veuillez vous connecter." });
      setIsLoading(false);
      return;
    }

    try {
      const combinedSeenPlaces = Array.from(new Set([...(userProfile?.seenKhroujSuggestions || []), ...seenSuggestions]));

      const response = await makeDecision({
        category: category.label,
        city: 'Tunis',
        zones: zones.length > 0 ? zones : undefined,
        seenPlaceNames: combinedSeenPlaces,
      });

      const newPlaceNames = response.suggestions.map(s => s.placeName);

      setSuggestions(shuffle(response.suggestions));

      const updatedSeenSuggestions = Array.from(new Set([...seenSuggestions, ...newPlaceNames]));
      setSeenSuggestions(updatedSeenSuggestions);

      if (newPlaceNames.length > 0) {
        await updateUserProfile(user.uid, { seenKhroujSuggestions: updatedSeenSuggestions });
      }

    } catch (error: any) {
      handleAiError(error);
      setSelectedCategory(undefined);
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile?.seenKhroujSuggestions, seenSuggestions, toast]);

  const handleCategorySelect = (category: (typeof outingOptions)[0]) => {
    setSeenSuggestions([]); // Reset session memory for the new category
    setSelectedCategory(category);
    fetchSuggestions(category, selectedZones);
  };

  const handleZoneChange = (zone: string, checked: boolean) => {
    setSelectedZones(prevSelectedZones => {
      const newSelectedZones = checked
        ? [...prevSelectedZones, zone]
        : prevSelectedZones.filter(z => z !== zone);
      return newSelectedZones;
    });
  };

  const handleReset = () => {
    setSuggestions([]);
    setSelectedCategory(undefined);
    setSeenSuggestions([]);
    if (carouselApi) {
      carouselApi.destroy();
    }
  };

  const handleVisit = async (suggestion: Suggestion) => {
    if (!user) return;
    try {
      await addVisitLog(user.uid, {
        placeName: suggestion.placeName,
        category: selectedCategory?.label || 'Autre',
        date: Date.now()
      });
      toast({
        title: "C'est noté !",
        description: `Visite à ${suggestion.placeName} enregistrée. Profitez bien !`,
      });
      // Redirect to Maps
      window.open(suggestion.googleMapsUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error(error);
    }
  };

  const handleRefresh = () => {
    if (selectedCategory) {
      fetchSuggestions(selectedCategory, selectedZones);
    }
  }

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
    setSelectedZones([]);
  }

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    const defaultStats = {
      total: 0,
      byCategory: {} as Record<string, number>,
      byPlace: [] as [string, { count: number; category: string; dates: number[] }][]
    };

    if (!userProfile?.visits) return defaultStats;

    const visits = userProfile.visits;
    const byCategory: Record<string, number> = {};
    const byPlaceMap: Record<string, { count: number; category: string; dates: number[] }> = {};

    visits.forEach(v => {
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;
      if (!byPlaceMap[v.placeName]) {
        byPlaceMap[v.placeName] = { count: 0, category: v.category, dates: [] };
      }
      byPlaceMap[v.placeName].count++;
      byPlaceMap[v.placeName].dates.push(v.date);
    });

    return {
      total: visits.length,
      byCategory,
      byPlace: Object.entries(byPlaceMap).sort((a, b) => b[1].count - a[1].count)
    };
  }, [userProfile?.visits]);


  const ManualVisitForm = () => {
    const [open, setOpen] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState("");
    const [selectedCat, setSelectedCat] = useState("Café");
    const [searchQuery, setSearchQuery] = useState("");

    const filteredSuggestions = useMemo(() => {
      if (!searchQuery) return [];
      return allPlaces
        .filter(p =>
          p.category === selectedCat &&
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5);
    }, [searchQuery, selectedCat, allPlaces]);

    const handleSave = async () => {
      const placeToSave = selectedPlace || searchQuery;
      if (!placeToSave) return;
      if (!user) return;

      await addVisitLog(user.uid, {
        placeName: placeToSave,
        category: selectedCat,
        date: Date.now()
      });

      toast({ title: "Visite ajoutée", description: `${placeToSave} a été ajouté à vos statistiques.` });
      setOpen(false);
      setSelectedPlace("");
      setSearchQuery("");
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> Ajouter manuellement
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Où êtes-vous allé ?</DialogTitle>
            <DialogDescription>Notez une sortie faite sans l'aide de l'application.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <div className="flex flex-wrap gap-2">
                {outingOptions.map(opt => (
                  <Badge
                    key={opt.id}
                    variant={selectedCat === opt.label ? "default" : "outline"}
                    className="cursor-pointer py-1 px-3"
                    onClick={() => {
                      setSelectedCat(opt.label);
                      setSelectedPlace("");
                    }}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label>Lieu</Label>
              <Input
                placeholder="Ex: Café Matignon..."
                value={selectedPlace || searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedPlace("");
                }}
              />
              {filteredSuggestions.length > 0 && !selectedPlace && (
                <Card className="absolute z-50 w-full mt-1 shadow-lg border-primary/20">
                  <ScrollArea className="h-auto max-h-[200px]">
                    <div className="p-1">
                      {filteredSuggestions.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-2 hover:bg-accent rounded-sm cursor-pointer text-sm flex items-center gap-2"
                          onClick={() => {
                            setSelectedPlace(p.name);
                            setSearchQuery("");
                          }}
                        >
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          {p.name}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </Card>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!(selectedPlace || searchQuery)}>Enregistrer la visite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const StatsDashboard = () => {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('search')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-2xl font-bold font-headline">Mes Habitudes</h2>
          </div>
          <ManualVisitForm />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-bold text-primary">{stats.total}</span>
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Total Sorties</span>
            </CardContent>
          </Card>
          {outingOptions.slice(0, 3).map(opt => (
            <Card key={opt.id} className="hover:bg-accent/50 transition-colors cursor-default">
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <opt.icon className={cn("h-5 w-5 mb-1", opt.colorClass)} />
                <span className="text-xl font-bold">{stats.byCategory[opt.label] || 0}</span>
                <span className="text-xs text-muted-foreground">{opt.label}s</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Lieux les plus fréquentés
          </h3>
          <div className="grid gap-3">
            {stats.byPlace.length > 0 ? (
              stats.byPlace.slice(0, 5).map(([name, data]) => (
                <Dialog key={name}>
                  <DialogTrigger asChild>
                    <Card className="hover:border-primary/50 transition-all cursor-pointer group">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-full group-hover:bg-primary/10 transition-colors">
                            <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">{data.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{data.count} visites</Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{name}</DialogTitle>
                      <DialogDescription>Historique de vos visites à cet endroit.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-3">
                        {data.dates.sort((a, b) => b - a).map((date, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex items-center gap-3 text-sm">
                              <Calendar className="h-4 w-4 text-primary" />
                              <span>{new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={async () => {
                                if (!user) return;
                                // Find the specific visit ID to delete
                                const visitId = userProfile?.visits?.find(v => v.placeName === name && v.date === date)?.id;
                                if (visitId) {
                                  await deleteVisitLog(user.uid, visitId);
                                  toast({ title: "Visite supprimée" });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </DialogContent>
                </Dialog>
              ))
            ) : (
              <p className="text-center py-8 text-muted-foreground italic">Aucune visite enregistrée pour le moment.</p>
            )}
          </div>
        </div>
      </div>
    );
  };


  if (isLoading) {
    return (
      <Card className="max-w-2xl mx-auto min-h-[400px] flex items-center justify-center">
        <LoadingAnimation category={selectedCategory} />
      </Card>
    )
  }

  if (view === 'stats') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="p-6">
          <StatsDashboard />
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length > 0 && selectedCategory) {
    return (
      <div className="space-y-4 animate-in fade-in-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handleReset}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Retour</span>
            </Button>
            <div>
              <h2 className="text-2xl font-bold font-headline tracking-tight">Suggestions de {selectedCategory.label}s</h2>
              <p className="text-muted-foreground">Voici quelques idées pour vous.</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setView('stats')}>
            <BarChart3 className="h-4 w-4 text-primary" /> Stats
          </Button>
        </div>

        <Carousel setApi={setCarouselApi} className="w-full max-w-xs mx-auto">
          <CarouselContent>
            {suggestions.map((suggestion, index) => {
              const Icon = outingOptions.find(o => o.id === selectedCategory.id)?.icon || MapPin;
              return (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <Card className="flex flex-col h-[380px]">
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
                      <CardFooter className="flex flex-col gap-2">
                        <Button className="w-full h-11" onClick={() => handleVisit(suggestion)}>
                          <MapPin className="mr-2 h-4 w-4" /> J'y vais !
                        </Button>
                        <Link href={suggestion.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                          <Button variant="ghost" className="w-full text-xs h-8">
                            Voir photos & infos
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
                <Card className="flex flex-col h-[380px] items-center justify-center text-center">
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
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div className="text-center w-full">
          <CardTitle className="font-headline text-3xl mb-2">Quelle est votre envie ?</CardTitle>
          <CardDescription>Cliquez sur une catégorie et laissez la magie opérer.</CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="absolute right-6 top-6" onClick={() => setView('stats')}>
          <BarChart3 className="h-6 w-6 text-primary" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <Collapsible className="space-y-2">
          <div className="flex justify-center items-center">
            <CollapsibleTrigger asChild>
              <Button variant="ocean">
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
                className={cn(
                  "group flex flex-col items-center justify-center rounded-lg border-2 p-4 text-card-foreground shadow-sm hover:-translate-y-1 transition-all duration-300 cursor-pointer space-y-2",
                  option.bgClass,
                  option.hoverClass,
                  "border-muted"
                )}
              >
                <Icon className={cn("h-8 w-8 mb-1 transition-colors duration-300", option.colorClass)} />
                <h3 className={cn("text-md font-semibold transition-colors duration-300", option.colorClass)}>{option.label}</h3>
                <p className="text-xs text-center text-muted-foreground">{option.description}</p>
                {stats.byCategory[option.label] > 0 && (
                  <Badge variant="secondary" className="mt-1">{stats.byCategory[option.label]} visites</Badge>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  );
}
