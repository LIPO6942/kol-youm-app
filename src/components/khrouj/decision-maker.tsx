
'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { makeDecision } from '@/ai/flows/decision-maker-flow';
import type { Suggestion } from '@/ai/flows/decision-maker-flow.types';
import { Coffee, ShoppingBag, UtensilsCrossed, Mountain, MapPin, RotateCw, ArrowLeft, type LucideIcon, ChevronLeft, ChevronRight, Sandwich, Filter, X, Sun, Pizza, CupSoda, BarChart3, Plus, History, Calendar, Trash2, Building2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile, addVisitLog, deleteVisitLog, updateVisitLog, type VisitLog } from '@/lib/firebase/firestore';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
const TypedBadge = Badge as any;
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
  const [allPlaces, setAllPlaces] = useState<{ name: string; category: string; zone: string; specialties: string[] }[]>([]);
  const [isFetchingPlaces, setIsFetchingPlaces] = useState(false);

  useEffect(() => {
    async function fetchAllPlaces() {
      setIsFetchingPlaces(true);
      try {
        const response = await fetch('/api/places-database-firestore');
        const result = await response.json();
        if (result.success && result.data.zones) {
          const flatPlaces: { name: string; category: string; zone: string; specialties: string[] }[] = [];
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
              const specialtiesMap = zone.specialties || {};
              places.forEach((name: string) => {
                flatPlaces.push({
                  name,
                  category: categoryLabel,
                  zone: zone.zone,
                  specialties: specialtiesMap[name] || []
                });
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

  const fetchSuggestions = useCallback(async (category: (typeof outingOptions)[0], zones: string[], query?: string) => {
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
        query: query,
      });

      const newPlaceNames = response.suggestions.map(s => s.placeName);

      setSuggestions(shuffle(response.suggestions));

      const updatedSeenSuggestions = Array.from(new Set([...seenSuggestions, ...newPlaceNames]));
      setSeenSuggestions(updatedSeenSuggestions);

      if (newPlaceNames.length > 0) {
        await updateUserProfile(user.uid, { seenKhroujSuggestions: updatedSeenSuggestions } as any);
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

  // Deep Linking Logic
  const searchParams = useSearchParams();
  const hasAutoTriggered = useRef(false);

  useEffect(() => {
    if (user && !hasAutoTriggered.current) {
      const categoryParam = searchParams.get('category');
      const queryParam = searchParams.get('query');

      if (categoryParam || queryParam) {
        // Default to fast-food if only query is provided
        const normalizedCategory = (categoryParam || 'fast-food').toLowerCase().replace(/s$/, '');

        const targetOption = outingOptions.find(opt =>
          opt.id === normalizedCategory ||
          opt.label.toLowerCase() === normalizedCategory
        );

        if (targetOption) {
          hasAutoTriggered.current = true;
          // Reset session memory and set state
          setSeenSuggestions([]);
          setSelectedCategory(targetOption);

          // Fetch with query if present
          fetchSuggestions(targetOption, selectedZones, queryParam || undefined);

          toast({
            title: "Suggestion Automatique",
            description: queryParam
              ? `Recherche de ${targetOption.label}s pour : ${queryParam}...`
              : `Recherche de ${targetOption.label}s pour votre plat...`,
          });
        }
      }
    }
  }, [user, searchParams, fetchSuggestions, selectedZones]);


  const handleZoneChange = (zone: string, checked: boolean) => {
    setSelectedZones((prevSelectedZones: string[]) => {
      const newSelectedZones = checked
        ? [...prevSelectedZones, zone]
        : prevSelectedZones.filter((z: string) => z !== zone);
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
      byPlace: [] as [string, { count: number; category: string; dates: number[]; zone?: string }][],
      byZone: {} as Record<string, { count: number; uniquePlaces: Set<string>; totalInDb: number }>,
      qgDuMois: null as { name: string; count: number; category: string } | null
    };

    if (!userProfile?.visits) return defaultStats;

    const visits = userProfile.visits;
    const byCategory: Record<string, number> = {};
    const byPlaceMap: Record<string, { count: number; category: string; dates: number[]; zone?: string }> = {};
    const byZone: Record<string, { count: number; uniquePlaces: Set<string>; totalInDb: number }> = {};

    // QG du Mois Logic (Last 30 days)
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const recentCounts: Record<string, number> = {};
    visits.filter(v => v.date >= thirtyDaysAgo).forEach(v => {
      recentCounts[v.placeName] = (recentCounts[v.placeName] || 0) + 1;
    });
    const qgEntry = Object.entries(recentCounts).sort((a, b) => b[1] - a[1])[0];
    let qgDuMois = null;
    if (qgEntry) {
      const p = visits.find(v => v.placeName === qgEntry[0]);
      qgDuMois = { name: qgEntry[0], count: qgEntry[1], category: p?.category || 'Autre' };
    }

    // Initialize zones from DB to show completion even if 0 visits
    const zoneCountsInDb: Record<string, number> = {};
    allPlaces.forEach((p: any) => {
      if (p.zone) {
        zoneCountsInDb[p.zone] = (zoneCountsInDb[p.zone] || 0) + 1;
      }
    });

    Object.keys(zoneCountsInDb).forEach((z: string) => {
      byZone[z] = { count: 0, uniquePlaces: new Set(), totalInDb: zoneCountsInDb[z] };
    });

    visits.forEach((v: VisitLog) => {
      // Category stats
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;

      // Place stats
      if (!byPlaceMap[v.placeName]) {
        const placeDetails = allPlaces.find((p: any) => p.name === v.placeName);
        byPlaceMap[v.placeName] = {
          count: 0,
          category: v.category,
          dates: [],
          zone: placeDetails?.zone
        };
      }
      byPlaceMap[v.placeName].count++;
      byPlaceMap[v.placeName].dates.push(v.date);

      // Zone stats
      const zone = byPlaceMap[v.placeName].zone;
      if (zone) {
        if (!byZone[zone]) {
          byZone[zone] = { count: 0, uniquePlaces: new Set(), totalInDb: zoneCountsInDb[zone] || 0 };
        }
        byZone[zone].count++;
        byZone[zone].uniquePlaces.add(v.placeName);
      }
    });

    return {
      total: visits.length,
      byCategory,
      byPlace: Object.entries(byPlaceMap).sort((a, b) => b[1].count - a[1].count),
      byZone,
      qgDuMois
    };
  }, [userProfile?.visits, allPlaces]);


  const ManualVisitForm = () => {
    const [open, setOpen] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState("");
    const [selectedCat, setSelectedCat] = useState("Café");
    const [searchQuery, setSearchQuery] = useState("");
    const [orderedItem, setOrderedItem] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const filteredSuggestions = useMemo(() => {
      if (!searchQuery) return [];
      return allPlaces
        .filter((p: { name: string; category: string; zone: string; specialties: string[] }) =>
          p.category === selectedCat &&
          p.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .slice(0, 5);
    }, [searchQuery, selectedCat, allPlaces]);

    const handleSave = async () => {
      const placeToSave = selectedPlace || searchQuery;
      if (!placeToSave) return;
      if (!user) return;

      setIsSaving(true);
      try {
        // Enregistrer la visite
        await addVisitLog(user.uid, {
          placeName: placeToSave,
          category: selectedCat,
          date: Date.now(),
          orderedItem: orderedItem.trim() || undefined
        });

        // Si une nouvelle spécialité a été entrée, l'ajouter à la base de données du lieu
        if (orderedItem.trim()) {
          const trimmedItem = orderedItem.trim();
          const placeData = allPlaces.find((p: { name: string; category: string; zone: string; specialties: string[] }) => p.name === placeToSave);

          if (placeData) {
            const existingSpecialties = placeData.specialties || [];
            if (!existingSpecialties.some((s: string) => s.toLowerCase() === trimmedItem.toLowerCase())) {
              // Appeler l'API pour mettre à jour les spécialités du lieu
              try {
                await fetch('/api/places-database-firestore', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'update',
                    zone: placeData.zone,
                    specialties: { [placeData.name]: [...existingSpecialties, trimmedItem] }
                  })
                });
              } catch (e) {
                console.error("Erreur lors de l'ajout de la spécialité au lieu", e);
              }
            }
          }
        }

        toast({ title: "Visite ajoutée", description: `${placeToSave} a été ajouté à vos statistiques.` });
        setOpen(false);
        setSelectedPlace("");
        setSearchQuery("");
        setOrderedItem("");
      } finally {
        setIsSaving(false);
      }
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 group">
            <Plus className="h-4 w-4 text-primary group-hover:scale-125 transition-transform duration-300" />
            <span className="font-medium">Ajout <span className="hidden sm:inline">manuel</span></span>
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
                {outingOptions.map((opt: (typeof outingOptions)[0]) => (
                  <TypedBadge
                    key={opt.id}
                    variant={selectedCat === opt.label ? "default" : "outline"}
                    className="cursor-pointer py-1 px-3"
                    onClick={() => {
                      setSelectedCat(opt.label);
                      setSelectedPlace("");
                    }}
                  >
                    {opt.label}
                  </TypedBadge>
                ))}
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label>Lieu</Label>
              <Input
                placeholder="Ex: Café Matignon..."
                value={selectedPlace || searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearchQuery(e.target.value);
                  setSelectedPlace("");
                }}
              />
              {filteredSuggestions.length > 0 && !selectedPlace && (
                <Card className="absolute z-50 w-full mt-1 shadow-lg border-primary/20">
                  <ScrollArea className="h-auto max-h-[200px]">
                    <div className="p-1">
                      {filteredSuggestions.map((p: { name: string; category: string; zone: string; specialties: string[] }, idx: number) => (
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

            <div className="space-y-2">
              <Label>Qu'avez-vous commandé ? (Optionnel)</Label>
              <Input
                placeholder="Ex: Chapati, Café crème, Pizza..."
                value={orderedItem}
                onChange={(e) => setOrderedItem(e.target.value)}
              />
              {(selectedPlace || searchQuery) && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allPlaces.find((p: { name: string }) => p.name === (selectedPlace || searchQuery))?.specialties.map((s: string, idx: number) => (
                    <TypedBadge
                      key={idx}
                      variant="outline"
                      className="cursor-pointer hover:bg-primary/5 text-[10px] bg-white text-muted-foreground"
                      onClick={() => setOrderedItem(s)}
                    >
                      {s}
                    </TypedBadge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} disabled={!(selectedPlace || searchQuery) || isSaving}>
              {isSaving ? <RotateCw className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer la visite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  const VisitHistoryList = ({ placeName, dates }: { placeName: string; dates: number[] }) => {
    const [editingDateId, setEditingDateId] = useState<string | null>(null);
    const [editedDate, setEditedDate] = useState<string>('');
    const [editedDish, setEditedDish] = useState<string>('');

    const handleEditClick = (visit: VisitLog) => {
      setEditingDateId(visit.id);
      // Convert timestamp to datetime-local format (YYYY-MM-DDThh:mm)
      const dateObj = new Date(visit.date);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      setEditedDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      setEditedDish(visit.orderedItem || '');
    };

    const handleSaveVisit = async (visitId: string) => {
      if (!user) return;

      const updates: { date?: number; orderedItem?: string } = {};
      if (editedDate) updates.date = new Date(editedDate).getTime();
      updates.orderedItem = editedDish.trim() || undefined;

      await updateVisitLog(user.uid, visitId, updates);

      toast({
        title: "Visite modifiée",
        description: "Les informations de visite ont été mises à jour."
      });

      setEditingDateId(null);
      setEditedDate('');
      setEditedDish('');
    };

    const handleCancelEdit = () => {
      setEditingDateId(null);
      setEditedDate('');
    };

    return (
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-3">
          {dates.sort((a: number, b: number) => b - a).map((date: number, idx: number) => {
            const visit = userProfile?.visits?.find((v: VisitLog) => v.placeName === placeName && v.date === date);
            const visitId = visit?.id;
            if (!visitId) return null;

            const isEditing = editingDateId === visitId;

            return (
              <div key={idx} className={cn(
                "flex items-center justify-between p-3 rounded-lg border gap-2 transition-all duration-300",
                isEditing ? "border-primary bg-primary/5 shadow-sm" : "bg-muted/30 hover:bg-muted/50 border-transparent hover:border-muted-foreground/20"
              )}>
                {isEditing ? (
                  <>
                    <div className="flex flex-col gap-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary flex-shrink-0" />
                        <Input
                          type="datetime-local"
                          value={editedDate}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedDate(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="h-4 w-4 text-primary flex-shrink-0" />
                        <Input
                          placeholder="Plat commandé..."
                          value={editedDish}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedDish(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => handleSaveVisit(visitId)}
                      >
                        ✓
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCancelEdit}
                      >
                        ✕
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      className="flex flex-col gap-1 flex-1 cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleEditClick(visit)}
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span>{new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {visit.orderedItem && (
                        <div className="flex items-center gap-2 pl-7">
                          <UtensilsCrossed className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[11px] font-medium text-muted-foreground">{visit.orderedItem}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={async () => {
                        if (!user) return;
                        await deleteVisitLog(user.uid, visitId);
                        toast({ title: "Visite supprimée" });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  const GlobalHistoryList = () => {
    if (!userProfile?.visits || userProfile.visits.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-center gap-2 text-muted-foreground">
          <History className="h-12 w-12 opacity-20" />
          <p>Aucune sortie enregistrée.</p>
        </div>
      );
    }

    const sortedVisits = [...userProfile.visits].sort((a, b) => b.date - a.date);

    return (
      <ScrollArea className="h-[60vh] -mx-6 px-6">
        <div className="space-y-3 pb-6">
          {sortedVisits.map((visit: VisitLog) => {
            const cat = outingOptions.find((o: (typeof outingOptions)[0]) => o.label === visit.category) || {
              icon: MapPin,
              colorClass: "text-slate-600",
              bgClass: "bg-slate-100",
              label: visit.category
            };

            return (
              <div key={visit.id} className="group flex items-center gap-3 p-3 rounded-xl border bg-card/50 hover:bg-white hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110", cat.bgClass)}>
                  <cat.icon className={cn("h-5 w-5", cat.colorClass)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-bold text-sm sm:text-base truncate text-foreground/90 group-hover:text-primary transition-colors">{visit.placeName}</p>
                    <TypedBadge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-background/50 text-muted-foreground whitespace-nowrap">
                      {new Date(visit.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </TypedBadge>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className={cn("text-xs font-bold", cat.colorClass)}>
                      {cat.label}
                    </p>
                    {visit.orderedItem && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1 italic">
                        <UtensilsCrossed className="h-2.5 w-2.5" />
                        {visit.orderedItem}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  const ZoneExplorationDialog = () => {
    const sortedZones = Object.entries(stats.byZone)
      .filter(([_, data]) => data.totalInDb > 0 || data.count > 0)
      .sort((a, b) => b[1].count - a[1].count);

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Card className="bg-blue-50 border-blue-200 group hover:border-blue-400 transition-all duration-300 cursor-pointer overflow-hidden relative">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <MapPin className="h-7 w-7 mb-2 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
              <span className="text-xs font-bold text-blue-800">Quartiers</span>
              <span className="text-[9px] text-blue-600 uppercase tracking-tighter font-semibold">Discovery</span>
              <div className="absolute -bottom-1 -right-1 opacity-10">
                <MapPin className="h-10 w-10 text-blue-900" />
              </div>
            </CardContent>
          </Card>
        </DialogTrigger>
        <DialogContent className="max-w-md w-[95%] rounded-2xl max-h-[85vh] overflow-hidden flex flex-col p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Exploration & QG
            </DialogTitle>
            <DialogDescription>
              Vos habitudes par quartier et votre spot favori.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2 mt-2">
            <div className="space-y-6 pb-4">
              {/* QG DU MOIS */}
              {stats.qgDuMois && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <History className="h-3 w-3" /> Le QG du Mois
                  </h4>
                  <Card className="bg-gradient-to-br from-amber-500 to-orange-600 border-none text-white shadow-lg overflow-hidden relative group">
                    <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:scale-125 transition-transform duration-500">
                      <UtensilsCrossed className="h-12 w-12 rotate-12" />
                    </div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <TypedBadge className="bg-white/20 hover:bg-white/30 text-white border-none text-[8px] uppercase tracking-tighter mb-1 h-4 px-1">
                            30 derniers jours
                          </TypedBadge>
                          <h5 className="text-xl font-bold font-headline leading-tight mb-0.5">{stats.qgDuMois.name}</h5>
                          <p className="text-orange-100 text-[10px] font-medium opacity-90">{stats.qgDuMois.category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-black leading-none">{stats.qgDuMois.count}</p>
                          <p className="text-[10px] uppercase font-bold opacity-70">Visites</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* ZONES */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-3 w-3" /> Stats par Quartier
                </h4>
                <div className="grid gap-2">
                  {sortedZones.map(([zone, data]: [string, any]) => {
                    const completionRate = Math.min(100, Math.round((data.uniquePlaces.size / data.totalInDb) * 100)) || 0;
                    const visitPercent = Math.round((data.count / stats.total) * 100);

                    let status = { label: "Touriste", color: "bg-blue-100/80 text-blue-700" };
                    if (visitPercent > 30) status = { label: "Maire", color: "bg-red-100/80 text-red-700" };
                    else if (completionRate > 50) status = { label: "Connaisseur", color: "bg-green-100/80 text-green-700" };
                    else if (data.count > 5) status = { label: "Habitué", color: "bg-purple-100/80 text-purple-700" };

                    return (
                      <div key={zone} className="p-2.5 rounded-xl border bg-muted/20 hover:bg-white hover:border-primary/20 transition-all duration-300">
                        <div className="flex justify-between items-center mb-1.5">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-bold text-xs truncate max-w-[120px]">{zone}</span>
                            <TypedBadge className={cn("text-[7px] h-3.5 px-1 uppercase font-black flex-shrink-0 border-none", status.color)}>
                              {status.label}
                            </TypedBadge>
                          </div>
                          <span className="text-[11px] font-bold text-primary">{visitPercent}%</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                            <span>Découverte</span>
                            <span>{data.uniquePlaces.size} / {data.totalInDb} spots</span>
                          </div>
                          <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-700"
                              style={{ width: `${completionRate}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  };

  const StatsDashboard = () => {
    return (
      <div className="space-y-8 animate-in fade-in-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setView('search')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-3xl font-bold font-headline text-foreground tracking-tight">Mes Habitudes</h2>
          </div>
          <div className="w-full sm:w-auto">
            <ManualVisitForm />
          </div>
        </div>

        {/* Global Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Card className="bg-primary/5 border-primary/20 group hover:border-primary/40 transition-all duration-300 cursor-pointer">
                <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">{stats.total}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Total</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-md w-[95%] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Historique Complet
                </DialogTitle>
                <DialogDescription>
                  Retrouvez toutes vos sorties chronologiquement.
                </DialogDescription>
              </DialogHeader>
              <GlobalHistoryList />
            </DialogContent>
          </Dialog>

          {/* New Location Dialog Icon */}
          <ZoneExplorationDialog />

          {outingOptions.slice(0, 4).map(opt => (
            <Card key={opt.id} className={cn(
              "transition-all duration-300 cursor-default border group",
              opt.bgClass,
              opt.hoverClass,
              "hover:shadow-md hover:-translate-y-1"
            )}>
              <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <opt.icon className={cn("h-6 w-6 mb-2 group-hover:scale-110 transition-transform duration-300", opt.colorClass)} />
                <span className={cn("text-xl font-bold", opt.colorClass)}>{stats.byCategory[opt.label] || 0}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{opt.label}s</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Places */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold font-headline text-foreground tracking-tight flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Lieux les plus fréquentés
          </h3>
          <div className="grid gap-3">
            {stats.byPlace.length > 0 ? (
              stats.byPlace.slice(0, 5).map(([name, data]: [string, { count: number; category: string; dates: number[]; zone?: string }]) => (
                <Dialog key={name}>
                  <DialogTrigger asChild>
                    <Card className="hover:border-primary/50 transition-all duration-300 cursor-pointer group hover:shadow-md hover:bg-muted/30">
                      <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="p-1.5 sm:p-2 bg-muted rounded-full group-hover:bg-primary/10 transition-colors duration-300 flex-shrink-0">
                            <MapPin className="h-4 w-4 text-red-500 group-hover:text-primary transition-colors duration-300" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-base sm:text-lg font-headline tracking-tight group-hover:text-primary transition-colors duration-300 truncate">
                              {name}
                              <span className="text-xs text-blue-600 ml-1 sm:ml-2 font-normal">
                                {data.zone || ''}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground font-medium">{data.category}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <TypedBadge variant="secondary" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300 bg-secondary text-secondary-foreground">
                            {data.count}
                          </TypedBadge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform duration-300" />
                        </div>
                      </CardContent>
                    </Card>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold font-headline">{name}</DialogTitle>
                      <DialogDescription>Historique de vos visites à cet endroit. Cliquez sur une date pour la modifier.</DialogDescription>
                    </DialogHeader>
                    <VisitHistoryList placeName={name} dates={data.dates} />
                  </DialogContent>
                </Dialog>
              ))
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground space-y-2">
                  <MapPin className="h-8 w-8 opacity-20" />
                  <p className="italic">Aucune visite enregistrée pour le moment.</p>
                  <p className="text-xs">Utilisez l'ajout manuel pour commencer !</p>
                </CardContent>
              </Card>
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
        <CardContent className="p-3 sm:p-6">
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
          <Button variant="ghost" size="sm" className="sm:gap-2" onClick={() => setView('stats')}>
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Stats</span>
          </Button>
        </div>

        <Carousel setApi={setCarouselApi} className="w-full max-w-xs mx-auto">
          <CarouselContent>
            {suggestions.map((suggestion: Suggestion, index: number) => {
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
      <CardHeader className="text-center pb-7">
        <CardTitle className="font-headline text-3xl mb-2">Quelle est votre envie ?</CardTitle>
        <CardDescription>Cliquez sur une catégorie et laissez la magie opérer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Collapsible className="space-y-2">
          <div className="flex justify-center items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ocean">
                <Filter className="mr-2 h-4 w-4" />
                {getFilterButtonText()}
              </Button>
            </CollapsibleTrigger>
            <Button variant="outline" className="sm:gap-2" onClick={() => setView('stats')}>
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Mes Stats</span>
            </Button>
            {selectedZones.length > 0 && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClearZones}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CollapsibleContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md">
              {zones.sort().map((zone: string) => (
                <div key={zone} className="flex items-center space-x-2">
                  <Checkbox
                    id={zone}
                    checked={selectedZones.includes(zone)}
                    onCheckedChange={(checked: boolean | 'indeterminate') => handleZoneChange(zone, !!checked)}
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
          {outingOptions.map((option: (typeof outingOptions)[0]) => {
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
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card >
  );
}
