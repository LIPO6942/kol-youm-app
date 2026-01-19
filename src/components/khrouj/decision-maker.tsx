
'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { makeDecision } from '@/ai/flows/decision-maker-flow';
import type { Suggestion } from '@/ai/flows/decision-maker-flow.types';
import { Coffee, ShoppingBag, UtensilsCrossed, Mountain, MapPin, RotateCw, ArrowLeft, type LucideIcon, ChevronLeft, ChevronRight, Sandwich, Filter, X, Sun, Pizza, CupSoda, BarChart3, Plus, History, Calendar, Trash2, Building2, Crown, Compass, Award, Home, Zap, Star } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile, addVisitLog, deleteVisitLog, updateVisitLog, updateSpecialtyImage, type VisitLog } from '@/lib/firebase/firestore';
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
import { getWeekendHQ, getCulinaryPassport } from '@/lib/khrouj-stats-utils';
import { WeekendHQCard } from './weekend-hq-card';
import { CulinaryPassport } from './culinary-passport';

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
  const [showAllFrequent, setShowAllFrequent] = useState(false);
  const [pendingVisit, setPendingVisit] = useState<VisitLog | null>(null);

  // Check for pending visits from Momenty
  useEffect(() => {
    if (userProfile?.visits) {
      const pending = userProfile.visits.find(v => v.isPending);
      if (pending) {
        setPendingVisit(pending);
      } else {
        setPendingVisit(null);
      }
    }
  }, [userProfile?.visits]);

  const resolvePendingVisit = async (category: string) => {
    if (!user || !pendingVisit) return;
    try {
      await updateVisitLog(user.uid, pendingVisit.id, {
        category,
        isPending: false
      } as any);
      toast({
        title: "Catégorie confirmée",
        description: `Votre visite à ${pendingVisit.placeName} est classée en ${category}.`,
      });
      setPendingVisit(null);
    } catch (error) {
      console.error(error);
    }
  };


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
                const cleanedName = name.split('[')[0].trim();
                flatPlaces.push({
                  name: cleanedName,
                  category: categoryLabel,
                  zone: zone.zone,
                  specialties: specialtiesMap[name] || [] // Keep original name for specialty lookup if necessary or use cleaned if appropriate
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

  const cleanPlaceName = (name: string) => {
    return name.split('[')[0].trim();
  };

  const handleVisit = async (suggestion: Suggestion) => {
    if (!user) return;
    try {
      const cleanedName = cleanPlaceName(suggestion.placeName);
      await addVisitLog(user.uid, {
        placeName: cleanedName,
        category: selectedCategory?.label || 'Autre',
        date: Date.now()
      });
      toast({
        title: "C'est noté !",
        description: `Visite à ${cleanedName} enregistrée. Profitez bien !`,
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
      byZone: {} as Record<string, { count: number; uniquePlaces: Set<string>; totalInDb: number; categoryCounts: Record<string, number> }>,
      bySpecialty: {} as Record<string, { count: number; topPlaces: Record<string, number>; emoji: string }>,
      bySpecialty: {} as Record<string, { count: number; topPlaces: Record<string, number>; emoji: string }>,
      qgDuMois: null as { name: string; count: number; category: string } | null,
      weekendHQ: null as ReturnType<typeof getWeekendHQ>,
      passportStats: [] as ReturnType<typeof getCulinaryPassport>
    };

    if (!userProfile?.visits) return defaultStats;

    const visits = userProfile.visits;
    const byCategory: Record<string, number> = {};
    const byPlaceMap: Record<string, { count: number; category: string; dates: number[]; zone?: string }> = {};
    const byZone: Record<string, { count: number; uniquePlaces: Set<string>; totalInDb: number; categoryCounts: Record<string, number> }> = {};
    const bySpecialty: Record<string, { count: number; topPlaces: Record<string, number>; emoji: string }> = {};

    const specialtyMap: Record<string, { keywords: string[], emoji: string }> = {
      'Pizza': { keywords: ['pizza'], emoji: '🍕' },
      'Burger': { keywords: ['burger'], emoji: '🍔' },
      'Tacos': { keywords: ['tacos'], emoji: '🌮' },
      'Ma9loub': { keywords: ['ma9loub', 'makloub'], emoji: '🥙' },
      'Mlawi': { keywords: ['mlawi'], emoji: '🌯' },
      'Chapati': { keywords: ['chapati', 'croque', 'sandwich rond'], emoji: '🥪' },
      'Kaffteji': { keywords: ['kafteji', 'kaffteji'], emoji: '🥘' },
      'Lablebi': { keywords: ['lablebi', 'lablabi'], emoji: '🍲' },
      'Couscous': { keywords: ['couscous'], emoji: '🍚' },
      'Baguette Farcie': { keywords: ['baguette farcie', 'baguette'], emoji: '🥖' },
      'Pasta': { keywords: ['pasta', 'spaghetti', 'penne', 'pâte'], emoji: '🍝' },
      'Sushi': { keywords: ['sushi', 'maki', 'california'], emoji: '🍣' },
      'Brunch': { keywords: ['brunch', 'oeuf', 'pancake', 'benedict'], emoji: '🍳' },
      'Crêpe/Gaufre': { keywords: ['crêpe', 'gaufre', 'crepe'], emoji: '🥞' },
      'Glace/Dessert': { keywords: ['glace', 'cake', 'pâtisserie', 'chocolat', 'donut'], emoji: '🍦' },
      'Libanais': { keywords: ['libanais', 'chawarma', 'shawarma', 'falafel'], emoji: '🌯' },
      'Salade/Bowl': { keywords: ['salade', 'healthy', 'bowl'], emoji: '🥗' },
      'Grillade': { keywords: ['grillade', 'steak', 'entrecôte', 'kebab'], emoji: '🍖' },
      'Plat Tunisien': { keywords: ['fricassé', 'ojja', 'kammounia'], emoji: '🇹🇳' },
    };

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
      byZone[z] = { count: 0, uniquePlaces: new Set(), totalInDb: zoneCountsInDb[z], categoryCounts: {} };
    });

    visits.forEach((v: VisitLog) => {
      // Category stats
      byCategory[v.category] = (byCategory[v.category] || 0) + 1;

      // Specialty stats logic
      const processSpecialty = (text: string) => {
        const textLower = text.toLowerCase().trim();
        if (!textLower) return;

        let matched = false;
        // 1. Try Map with keywords (Group by main specialty)
        for (const [sName, sData] of Object.entries(specialtyMap)) {
          if (sData.keywords.some(kw => textLower.includes(kw))) {
            if (!bySpecialty[sName]) bySpecialty[sName] = { count: 0, topPlaces: {}, emoji: sData.emoji };
            bySpecialty[sName].count++;
            bySpecialty[sName].topPlaces[v.placeName] = (bySpecialty[sName].topPlaces[v.placeName] || 0) + 1;
            matched = true;
            break;
          }
        }

        // 2. Fallback: Catch-all for unique dishes
        if (!matched) {
          const formattedName = textLower.charAt(0).toUpperCase() + textLower.slice(1);
          if (!bySpecialty[formattedName]) {
            bySpecialty[formattedName] = { count: 0, topPlaces: {}, emoji: '🍽️' };
          }
          bySpecialty[formattedName].count++;
          bySpecialty[formattedName].topPlaces[v.placeName] = (bySpecialty[formattedName].topPlaces[v.placeName] || 0) + 1;
        }
      };

      // Specialty stats logic - Only count for Restaurant, Brunch, and Fast Food
      if (['Restaurant', 'Brunch', 'Fast Food'].includes(v.category)) {
        if (v.orderedItem) {
          processSpecialty(v.orderedItem);
        } else {
          // Fallback: If no dish was recorded, check the place's known specialties
          const placeData = allPlaces.find(p => p.name === v.placeName);
          if (placeData && placeData.specialties) {
            placeData.specialties.forEach((spec: string) => processSpecialty(spec));
          }
        }
      }

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
          byZone[zone] = { count: 0, uniquePlaces: new Set(), totalInDb: zoneCountsInDb[zone] || 0, categoryCounts: {} };
        }
        byZone[zone].count++;
        byZone[zone].uniquePlaces.add(v.placeName);
        byZone[zone].categoryCounts[v.category] = (byZone[zone].categoryCounts[v.category] || 0) + 1;
      }
    });

    return {
      total: visits.length,
      byCategory,
      byPlace: Object.entries(byPlaceMap).sort((a, b) => {
        if (b[1].count !== a[1].count) {
          return b[1].count - a[1].count;
        }
        // Tie-breaker: most recent visit date
        const maxA = Math.max(...a[1].dates);
        const maxB = Math.max(...b[1].dates);
        return maxB - maxA;
      }),
      byZone,
      bySpecialty,
      bySpecialty,
      qgDuMois,
      weekendHQ: getWeekendHQ(visits),
      passportStats: getCulinaryPassport(visits)
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
        const cleanedName = cleanPlaceName(placeToSave);
        // Enregistrer la visite
        await addVisitLog(user.uid, {
          placeName: cleanedName,
          category: selectedCat,
          date: Date.now(),
          orderedItem: orderedItem.trim() || undefined
        });

        // Si une nouvelle spécialité a été entrée, l'ajouter à la base de données du lieu
        if (orderedItem.trim()) {
          const trimmedItem = orderedItem.trim();
          const placeData = allPlaces.find((p: { name: string; category: string; zone: string; specialties: string[] }) => p.name === cleanedName);

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
          <Button
            className="group relative h-12 w-full sm:w-64 overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-indigo-600 p-px font-bold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-95"
          >
            <span className="relative flex h-full w-full items-center justify-center gap-2 rounded-[14px] bg-background/10 backdrop-blur-sm transition-colors group-hover:bg-background/0">
              <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/20 text-white group-hover:rotate-90 transition-transform duration-500">
                <Plus className="h-4 w-4 stroke-[3]" />
              </div>
              <span className="tracking-tight text-sm">Ajouter une pépite</span>
            </span>
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
              <div key={visit.id} className="group flex items-center gap-3 p-3 rounded-xl border bg-card/50 hover:bg-white hover:shadow-md hover:border-primary/20 transition-all duration-300 relative overflow-hidden">
                <div className={cn("h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110", cat.bgClass)}>
                  <cat.icon className={cn("h-5 w-5", cat.colorClass)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-bold text-sm sm:text-base truncate text-foreground/90 group-hover:text-primary transition-colors">{visit.placeName}</p>
                    <TypedBadge variant="outline" className="text-[10px] h-5 px-1.5 font-normal bg-background/50 text-muted-foreground whitespace-nowrap group-hover:opacity-0 transition-opacity">
                      {new Date(visit.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </TypedBadge>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className={cn("text-xs font-bold", cat.colorClass)}>
                      {cat.label}
                      {visit.orderedItem && (
                        <span className="text-muted-foreground font-medium ml-1 text-[11px]">
                          - {visit.orderedItem}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Safe Delete Button - Only visible on hover/group-hover */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!user) return;
                      await deleteVisitLog(user.uid, visit.id);
                      toast({ title: "Visite supprimée" });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
        <DialogContent className="max-w-md w-[95%] rounded-2xl max-h-[85vh] overflow-hidden grid grid-rows-[auto_1fr] p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl font-bold font-headline flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Exploration & QG
            </DialogTitle>
            <DialogDescription>
              Vos habitudes par quartier et votre spot favori.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 pr-2 mt-2">
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

                    const difficultyStars = Math.min(3, Math.ceil(data.totalInDb / 10));
                    const densityFactor = Math.max(1, data.totalInDb / 12);

                    const getPersona = () => {
                      const counts = data.categoryCounts;
                      if (!counts || Object.keys(counts).length === 0) return { label: "Explorateur", icon: Compass, color: "text-blue-600", bg: "bg-blue-50" };

                      const topCat = Object.entries(counts).sort((a: any, b: any) => b[1] - a[1])[0][0];
                      const catCount = counts[topCat];

                      // Identify level (1-5) scaled by density
                      let level = 1;
                      if (catCount >= Math.round(21 * densityFactor)) level = 5;
                      else if (catCount >= Math.round(11 * densityFactor)) level = 4;
                      else if (catCount >= Math.round(6 * densityFactor)) level = 3;
                      else if (catCount >= Math.round(3 * densityFactor)) level = 2;

                      // Detect specialty keyword
                      let specialty = "";
                      const specialtyKeywords = ['Tacos', 'Pizza', 'Burger', 'Shawarma', 'Sushi', 'Pasta', 'Crêpe', 'Glace', 'Sandwich', 'Kebab', 'Libanais', 'Chinois'];
                      const placesInZone = Array.from(data.uniquePlaces as Set<string>);
                      for (const kw of specialtyKeywords) {
                        if (placesInZone.some(p => p.toLowerCase().includes(kw.toLowerCase()))) {
                          specialty = kw;
                          break;
                        }
                      }

                      const configs: Record<string, { icon: LucideIcon, color: string, bg: string, titles: string[] }> = {
                        'Café': {
                          icon: Coffee, color: 'text-amber-700', bg: 'bg-amber-50',
                          titles: [
                            `Amateur de ${specialty || 'Café'}`,
                            `Pro du ${specialty || 'Café'}`,
                            `Expert du ${specialty || 'Café'}`,
                            `Maître du ${specialty || 'Café'}`,
                            `Dieu de la Caféine ⚡`
                          ]
                        },
                        'Restaurant': {
                          icon: UtensilsCrossed, color: 'text-red-700', bg: 'bg-red-50',
                          titles: [
                            `Amateur de ${specialty || 'Restos'}`,
                            `Pro de la Gastronomie`,
                            `Expert des Saveurs`,
                            `Maître Chef des Lieux`,
                            `Empereur Culinaire 👑`
                          ]
                        },
                        'Fast Food': {
                          icon: Sandwich, color: 'text-orange-700', bg: 'bg-orange-50',
                          titles: [
                            `Amateur de ${specialty || 'Snacks'}`,
                            `Pro du ${specialty || 'Fast-Food'}`,
                            `Expert du ${specialty || 'Comptoir'}`,
                            `Maître du ${specialty || 'Street-Food'}`,
                            `Légende du ${specialty || 'Gras'} 🏆`
                          ]
                        },
                        'Brunch': {
                          icon: Sun, color: 'text-yellow-700', bg: 'bg-yellow-50',
                          titles: [
                            `Amateur de Brunch`,
                            `Pro du Dimanche`,
                            `Expert du Petit-Déj`,
                            `Maître du Brunch`,
                            `Légende du Matin ☀️`
                          ]
                        },
                      };

                      const config = configs[topCat] || { icon: Compass, color: "text-blue-600", bg: "bg-blue-50", titles: ["Citadin Curieux", "Citadin Actif", "Habitant de Zone", "Expert Local", "Légende du Quartier"] };
                      return { label: config.titles[level - 1], icon: config.icon, color: config.color, bg: config.bg };
                    };

                    const getTier = () => {
                      const requiredForMayor = Math.round(30 * Math.max(1, data.totalInDb / 15));
                      if (visitPercent > requiredForMayor) return { label: "Maire", icon: Crown, color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-400", glow: "shadow-[0_0_12px_rgba(251,191,36,0.3)]", isMayor: true };
                      if (completionRate > 85) return { label: "Diamant", icon: Zap, color: "text-cyan-700", bg: "bg-cyan-50", border: "border-cyan-200" };
                      if (completionRate > 60) return { label: "Or", icon: Star, color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200" };
                      if (data.count > Math.round(8 * densityFactor)) return { label: "Argent", icon: Award, color: "text-slate-700", bg: "bg-slate-50", border: "border-slate-200" };
                      return { label: "Bronze", icon: Compass, color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" };
                    };

                    const getDiscoveryBadge = () => {
                      if (completionRate >= 100) return { label: "Légende Locale", color: "text-purple-700", bg: "bg-purple-100", border: "border-purple-200" };
                      if (completionRate >= 75) return { label: "Conquérant", color: "text-red-700", bg: "bg-red-100", border: "border-red-200" };
                      if (completionRate >= 50) return { label: "Cartographe", color: "text-indigo-700", bg: "bg-indigo-100", border: "border-indigo-200" };
                      if (completionRate >= 25) return { label: "Éclaireur", color: "text-emerald-700", bg: "bg-emerald-100", border: "border-emerald-200" };
                      if (data.count >= 1) return { label: "Pionnier", color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" };
                      return null;
                    };

                    const persona = getPersona();
                    const tier = getTier();
                    const discoveryBadge = getDiscoveryBadge();

                    return (
                      <div key={zone} className={cn(
                        "p-2.5 rounded-xl border bg-card/50 hover:bg-white hover:shadow-md transition-all duration-300",
                        tier.border,
                        tier.glow,
                        (tier as any).isMayor && "bg-gradient-to-br from-amber-50 to-white"
                      )}>
                        <div className="flex justify-between items-start gap-1 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                              <span className="font-bold text-xs truncate max-w-[80px] sm:max-w-none">{zone}</span>
                              <div className="flex items-center gap-0.5 ml-1">
                                {[...Array(difficultyStars)].map((_, i) => (
                                  <Star key={i} className="h-1.5 w-1.5 text-amber-400 fill-amber-400" />
                                ))}
                              </div>
                              <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter border shrink-0", tier.bg, tier.color, tier.border)}>
                                <tier.icon className="h-2 w-2" />
                                {tier.label}
                              </div>
                              {discoveryBadge && (
                                <div className={cn("px-1.5 py-0.5 rounded-full text-[6px] font-bold uppercase tracking-widest border shrink-0", discoveryBadge.bg, discoveryBadge.color, discoveryBadge.border)}>
                                  {discoveryBadge.label}
                                </div>
                              )}
                            </div>
                            <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-lg w-fit shrink-0", persona.bg)}>
                              <persona.icon className={cn("h-2.5 w-2.5", persona.color)} />
                              <span className={cn("text-[8px] font-bold", persona.color)}>{persona.label}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end shrink-0">
                            <span className="text-[10px] font-black text-primary leading-none uppercase">{visitPercent}%</span>
                            <span className="text-[6px] text-muted-foreground font-medium uppercase tracking-tighter">Pop.</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                            <span>Découverte</span>
                            <span>{data.uniquePlaces.size} / {data.totalInDb} spots</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
                            <div
                              className={cn("h-full transition-all duration-700",
                                completionRate > 70 ? "bg-cyan-500" :
                                  completionRate > 40 ? "bg-yellow-500" : "bg-primary"
                              )}
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

  const SpecialtyMasteryDialog = () => {
    const sortedSpecialties = Object.entries(stats.bySpecialty).sort((a, b) => b[1].count - a[1].count);
    const [editingSpecialty, setEditingSpecialty] = useState<{ name: string, current: string } | null>(null);
    const [newVal, setNewVal] = useState('');

    const specialtyThemes: Record<string, { gradient: string; tint: string }> = {
      'Pizza': { gradient: 'from-orange-500/20 to-red-500/20', tint: 'text-orange-600' },
      'Burger': { gradient: 'from-amber-600/20 to-orange-600/20', tint: 'text-amber-700' },
      'Tacos': { gradient: 'from-yellow-400/20 to-amber-500/20', tint: 'text-amber-800' },
      'Sandwich': { gradient: 'from-orange-300/20 to-yellow-400/20', tint: 'text-orange-700' },
      'Pasta': { gradient: 'from-red-400/20 to-rose-500/20', tint: 'text-red-700' },
      'Sushi': { gradient: 'from-emerald-400/20 to-cyan-500/20', tint: 'text-emerald-700' },
      'Brunch': { gradient: 'from-yellow-300/20 to-orange-400/20', tint: 'text-yellow-700' },
      'Dessert': { gradient: 'from-pink-300/20 to-rose-400/20', tint: 'text-pink-700' },
      'Tunisien': { gradient: 'from-red-500/20 to-primary/20', tint: 'text-primary' },
      'Salade': { gradient: 'from-green-300/20 to-emerald-400/20', tint: 'text-green-700' },
      'Viande': { gradient: 'from-rose-600/20 to-red-700/20', tint: 'text-rose-800' },
      'Chapati': { gradient: 'from-orange-200 to-orange-400/40', tint: 'text-orange-800' },
      'Mlawi': { gradient: 'from-amber-200 to-amber-500/40', tint: 'text-amber-900' },
      'Poulet': { gradient: 'from-orange-400/20 to-red-400/20', tint: 'text-orange-700' },
      'Petit Déj': { gradient: 'from-blue-100 to-cyan-300/30', tint: 'text-blue-700' },
      'Baguette Farcie': { gradient: 'from-yellow-200 to-amber-400/30', tint: 'text-amber-800' },
      'Kaffteji': { gradient: 'from-red-300/20 to-orange-400/20', tint: 'text-red-700' },
    };

    const getTier = (count: number) => {
      if (count >= 30) return { label: 'Légende', icon: '👑', color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-300', next: null, nextIcon: null };
      if (count >= 15) return { label: 'Maître', icon: '🔥', color: 'text-orange-600', bg: 'bg-orange-100', border: 'border-orange-300', next: 30, nextIcon: '👑', nextLabel: 'Légende' };
      if (count >= 7) return { label: 'Expert', icon: '🥇', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', next: 15, nextIcon: '🔥', nextLabel: 'Maître' };
      if (count >= 3) return { label: 'Fan', icon: '🥈', color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', next: 7, nextIcon: '🥇', nextLabel: 'Expert' };
      return { label: 'Amateur', icon: '🥉', color: 'text-orange-800/60', bg: 'bg-orange-50/50', border: 'border-orange-100', next: 3, nextIcon: '🥈', nextLabel: 'Fan' };
    };

    const handleUpdateImage = async () => {
      if (!user || !editingSpecialty) return;
      try {
        await updateSpecialtyImage(user.uid, editingSpecialty.name, newVal.trim());
        toast({ title: "Atlas mis à jour", description: `L'image pour ${editingSpecialty.name} a été modifiée.` });
        setEditingSpecialty(null);
        setNewVal('');
      } catch (error) {
        console.error(error);
      }
    };

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-all duration-300 shadow-sm border border-orange-100">
            <UtensilsCrossed className="h-5 w-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md w-[95%] rounded-[2.5rem] max-h-[85vh] overflow-hidden grid grid-rows-[auto_1fr] p-0 border-none shadow-2xl">
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-8 pb-12 text-white relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
              <UtensilsCrossed className="h-40 w-40" />
            </div>
            <DialogHeader className="relative z-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <UtensilsCrossed className="h-6 w-6 text-white" />
                </div>
                <DialogTitle className="text-3xl font-black font-headline tracking-tight text-white">
                  Atlas des Saveurs
                </DialogTitle>
              </div>
              <DialogDescription className="text-orange-50 text-base font-medium opacity-90">
                Vous avez découvert <span className="text-white font-black">{sortedSpecialties.length} types</span> de saveurs !
              </DialogDescription>
            </DialogHeader>
          </div>

          <ScrollArea className="bg-white -mt-8 rounded-t-[2.5rem] relative z-20">
            <div className="p-6 space-y-6 pb-10">
              {sortedSpecialties.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-4">
                  <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center animate-pulse">
                    <History className="h-10 w-10 opacity-30" />
                  </div>
                  <p className="text-lg font-bold tracking-tight">Votre atlas est vide...</p>
                  <p className="text-sm px-10">Notez vos plats lors de vos prochaines sorties pour débloquer des badges !</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {sortedSpecialties.map(([name, data]) => {
                    const customImage = userProfile?.specialtyImages?.[name];
                    const displayEmoji = customImage || data.emoji;
                    const isUrl = displayEmoji.startsWith('http') || displayEmoji.startsWith('/') || displayEmoji.startsWith('data:');

                    const tier = getTier(data.count);
                    const theme = specialtyThemes[name] || { gradient: 'from-blue-50/50 to-indigo-100/50', tint: 'text-blue-700' };
                    const top3 = Object.entries(data.topPlaces)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 3);

                    const progress = tier.next ? Math.min(100, (data.count / tier.next) * 100) : 100;

                    return (
                      <div
                        key={name}
                        onClick={() => {
                          setEditingSpecialty({ name, current: displayEmoji });
                          setNewVal(displayEmoji);
                        }}
                        className={cn(
                          "group p-4 rounded-[2rem] border-2 bg-gradient-to-br transition-all duration-500 hover:scale-[1.03] hover:shadow-xl cursor-pointer relative overflow-hidden flex flex-col items-center",
                          theme.gradient,
                          "border-transparent hover:border-white shadow-sm"
                        )}
                      >
                        <div className="absolute top-2 right-4 text-[9px] font-black opacity-10 group-hover:opacity-20 transition-opacity uppercase tracking-widest">
                          {tier.nextLabel || 'MAX'}
                        </div>

                        <div className="h-16 w-16 mb-3 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 flex items-center justify-center drop-shadow-md">
                          {isUrl ? (
                            <img src={displayEmoji} alt={name} className="h-full w-full object-contain" />
                          ) : (
                            <span className="text-5xl">{displayEmoji}</span>
                          )}
                        </div>

                        <h5 className="font-black text-sm uppercase tracking-wider mb-1 text-foreground/80">{name}</h5>

                        <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm bg-white/70 backdrop-blur-sm", tier.color)}>
                          <span>{tier.icon}</span>
                          {tier.label}
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full mt-4 space-y-1">
                          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-tighter opacity-60 px-1">
                            <span>{data.count} {data.count > 1 ? 'Plats' : 'Plat'}</span>
                            {tier.next && (
                              <div className="flex items-center gap-1">
                                <span>Goal: {tier.next}</span>
                                <span>{tier.nextIcon}</span>
                              </div>
                            )}
                          </div>
                          <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden p-[1px]">
                            <div
                              className={cn("h-full rounded-full transition-all duration-1000 ease-out", theme.tint.replace('text', 'bg'))}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          {tier.nextLabel && (
                            <p className="text-[7px] text-center font-bold opacity-40 uppercase tracking-tighter">
                              Prochain : {tier.nextLabel}
                            </p>
                          )}
                        </div>

                        {/* Bottom Info Expanded on Hover or subtle hint */}
                        <div className="mt-4 w-full pt-3 border-t border-black/5 flex flex-col gap-1.5">
                          <p className="text-[7px] text-muted-foreground uppercase font-black tracking-[0.2em] mb-0.5 opacity-50">Top Spots</p>
                          {top3.map(([pName, count], idx) => (
                            <div key={pName} className="flex justify-between items-center text-[9px] font-bold">
                              <span className="truncate flex-1 text-left pr-1 opacity-70 italic">#{idx + 1} {pName}</span>
                              <span className={cn("font-black shrink-0", theme.tint)}>{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Edit Dialog */}
          <Dialog open={!!editingSpecialty} onOpenChange={(open) => !open && setEditingSpecialty(null)}>
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle>Personnaliser {editingSpecialty?.name}</DialogTitle>
                <DialogDescription>
                  Entrez un emoji ou l'URL d'une image (3D, photo, sticker...).
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="flex flex-col gap-2">
                  <Label>Emoji ou URL Image</Label>
                  <Input
                    value={newVal}
                    onChange={(e) => setNewVal(e.target.value)}
                    placeholder="🍔 ou https://site.com/image.png"
                  />
                </div>
                {newVal && (
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <Label className="text-[10px] uppercase font-bold opacity-50">Aperçu</Label>
                    <div className="h-20 w-20 flex items-center justify-center bg-muted/30 rounded-2xl overflow-hidden border">
                      {(newVal.startsWith('http') || newVal.startsWith('/') || newVal.startsWith('data:')) ? (
                        <img src={newVal} alt="Aperçu" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-5xl">{newVal}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingSpecialty(null)}>Annuler</Button>
                <Button onClick={handleUpdateImage}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    );
  };

  const StatsDashboard = () => {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setView('search')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-2xl font-bold font-headline text-foreground tracking-tight">Mes Habitudes</h2>
              <SpecialtyMasteryDialog />
            </div>
          </div>
          <div className="flex justify-center w-full">
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

          {/* Location Dialog */}
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
              <>
                {(showAllFrequent ? stats.byPlace : stats.byPlace.slice(0, 5)).map(([name, data]: [string, { count: number; category: string; dates: number[]; zone?: string }]) => (
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
                ))}
                {stats.byPlace.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground hover:text-primary transition-colors mt-2"
                    onClick={() => setShowAllFrequent(!showAllFrequent)}
                  >
                    {showAllFrequent ? "Voir moins" : `Voir les ${stats.byPlace.length - 5} autres lieux`}
                  </Button>
                )}
              </>
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

        {/* Intelligence Section - Moved below Top Places */}
        {(stats.weekendHQ || stats.passportStats.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-bottom-5 duration-500 delay-150 mt-4">
            {stats.weekendHQ && <WeekendHQCard hq={stats.weekendHQ} />}
            {stats.passportStats.length > 0 && <CulinaryPassport stats={stats.passportStats} />}
          </div>
        )}
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

      <Dialog open={!!pendingVisit} onOpenChange={(open) => !open && setPendingVisit(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader className="items-center text-center">
            <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black font-headline tracking-tight">Où avez-vous mangé ?</DialogTitle>
            <DialogDescription className="text-base font-medium">
              Le lieu <span className="text-primary font-bold">"{pendingVisit?.placeName}"</span> appartient à plusieurs catégories. Choisissez celle qui convient pour cette sortie :
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {pendingVisit?.possibleCategories?.map((catLabel) => {
              const option = outingOptions.find(o => o.label === catLabel) || outingOptions[0];
              const Icon = option.icon;
              return (
                <Button
                  key={catLabel}
                  variant="outline"
                  className={cn(
                    "flex flex-col items-center justify-center h-28 gap-2 rounded-2xl border-2 transition-all duration-300 hover:scale-105 active:scale-95",
                    option.bgClass,
                    option.hoverClass,
                    "border-muted hover:border-primary/50"
                  )}
                  onClick={() => resolvePendingVisit(catLabel)}
                >
                  <Icon className={cn("h-7 w-7", option.colorClass)} />
                  <span className={cn("font-bold text-sm", option.colorClass)}>{catLabel}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
