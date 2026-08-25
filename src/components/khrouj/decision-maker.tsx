
'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { makeDecision } from '@/ai/flows/decision-maker-flow';
import type { Suggestion } from '@/ai/flows/decision-maker-flow.types';
import { Coffee, ShoppingBag, UtensilsCrossed, Mountain, MapPin, RotateCw, ArrowLeft, type LucideIcon, ChevronLeft, ChevronRight, Sandwich, Filter, X, Sun, Pizza, CupSoda, BarChart3, Plus, History, Calendar, Trash2, Building2, Crown, Compass, Award, Home, Zap, Star, Soup, Cake, IceCream, Fish, Drumstick, Cherry, Apple, Carrot, Cookie, Beer, Wine, GlassWater, Beef, Egg, Flame, ExternalLink, Search, Clapperboard, Film, ChevronDown, Sparkles, Clock, SlidersHorizontal, ArrowUpDown, FilterX, Layers } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile, addVisitLog, deleteVisitLog, updateVisitLog, updateSpecialtyCustomization, addSeenMovieWithDate, type VisitLog } from '@/lib/firebase/firestore';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getWeekendHQ, getCulinaryPassport, getVisitFrequencies, getWeeklyHeatmap, getMonthlyHeatmap, getYearlyHeatmap, getDishEmoji } from '@/lib/khrouj-stats-utils';
import { WeekendHQCard } from './weekend-hq-card';
import { CulinaryPassport } from './culinary-passport';
import { HabitFrequency } from './habit-frequency';

const getSeasonalBackground = () => {
  const month = new Date().getMonth(); // 0 = Jan, 11 = Dec
  // Winter: Dec (11), Jan (0), Feb (1)
  if (month === 11 || month === 0 || month === 1) {
    return {
      url: '/images/khrouj/winter.png',
      label: 'Hiver ❄️',
      borderColor: 'border-blue-400/50 shadow-blue-500/20',
      titleGradient: 'from-blue-600 via-indigo-500 to-cyan-500 dark:from-blue-400 dark:via-indigo-300 dark:to-cyan-300'
    };
  }
  // Spring: Mar (2), Apr (3), May (4)
  if (month >= 2 && month <= 4) {
    return {
      url: '/images/khrouj/spring.png',
      label: 'Printemps 🌸',
      borderColor: 'border-pink-400/50 shadow-pink-500/20',
      titleGradient: 'from-pink-600 via-purple-500 to-rose-500 dark:from-pink-400 dark:via-purple-300 dark:to-rose-300'
    };
  }
  // Summer: Jun (5), Jul (6), Aug (7)
  if (month >= 5 && month <= 7) {
    return {
      url: '/images/khrouj/summer.png',
      label: 'Été ☀️',
      borderColor: 'border-yellow-400/50 shadow-yellow-500/20',
      titleGradient: 'from-amber-500 via-orange-500 to-yellow-500 dark:from-yellow-400 dark:via-amber-300 dark:to-orange-400'
    };
  }
  // Autumn: Sep (8), Oct (9), Nov (10)
  return {
    url: '/images/khrouj/autumn.png',
    label: 'Automne 🍂',
    borderColor: 'border-orange-500/50 shadow-orange-500/20',
    titleGradient: 'from-orange-600 via-amber-600 to-red-500 dark:from-orange-400 dark:via-amber-400 dark:to-red-400'
  };
};

const getDayName = (dateInput: Date | number) => {
  const date = new Date(dateInput);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return days[date.getDay()];
};

const getInitialLocalDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};




const outingOptions: { id: string; label: string; icon: LucideIcon; description: string, colorClass: string, bgClass: string, hoverClass: string, selectedClass: string, barBgClass: string }[] = [
  { id: 'fast-food', label: 'Fast Food', icon: Sandwich, description: "Rapide et gourmand", colorClass: 'text-orange-700', bgClass: 'bg-orange-50', hoverClass: 'hover:bg-orange-100', selectedClass: 'border-orange-500 bg-orange-100', barBgClass: 'bg-orange-500' },
  { id: 'cafe', label: 'Café', icon: Coffee, description: "Pour se détendre", colorClass: 'text-amber-800', bgClass: 'bg-amber-50', hoverClass: 'hover:bg-amber-100', selectedClass: 'border-amber-600 bg-amber-100', barBgClass: 'bg-amber-700' },
  { id: 'brunch', label: 'Brunch', icon: Sun, description: "Gourmandise du matin", colorClass: 'text-yellow-600', bgClass: 'bg-yellow-50', hoverClass: 'hover:bg-yellow-100', selectedClass: 'border-yellow-500 bg-yellow-100', barBgClass: 'bg-yellow-500' },
  { id: 'restaurant', label: 'Restaurant', icon: Pizza, description: "Un repas mémorable", colorClass: 'text-red-700', bgClass: 'bg-red-50', hoverClass: 'hover:bg-red-100', selectedClass: 'border-red-500 bg-red-100', barBgClass: 'bg-red-600' },
  { id: 'kharjet', label: 'Kharjet', icon: Compass, description: "Baignades, soirées, glaces & sorties", colorClass: 'text-emerald-700 dark:text-emerald-400', bgClass: 'bg-emerald-50 dark:bg-emerald-950/30', hoverClass: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40', selectedClass: 'border-emerald-500 bg-emerald-100 dark:bg-emerald-900/50', barBgClass: 'bg-emerald-600' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, description: "Trouver la perle", colorClass: 'text-pink-700', bgClass: 'bg-pink-50', hoverClass: 'hover:bg-pink-100', selectedClass: 'border-pink-500 bg-pink-100', barBgClass: 'bg-pink-600' },
  { id: 'cinema', label: 'Cinéma', icon: Clapperboard, description: "Soirée 7ème art", colorClass: 'text-violet-700', bgClass: 'bg-violet-50', hoverClass: 'hover:bg-violet-100', selectedClass: 'border-violet-500 bg-violet-100', barBgClass: 'bg-violet-600' },
];

const zones = [
  "La Marsa", "Gammarth", "El Aouina", "Ain Zaghouan Nord", "Les Berges du Lac 1", "Les Berges du Lac 2",
  "Jardins de Carthage", "Carthage", "La Goulette/Kram", "Boumhal", "Ezzahra", "Hammamet", "Nabeul", "Mégrine", "La Soukra",
  "Le Bardo", "Menzah 1", "Menzah 5", "Menzah 6", "Menzah 8", "Menzah 9", "Ennasr", "Centre-ville de Tunis",
  "Mutuelleville / Alain Savary", "El Manar"
];

const AVAILABLE_SPECIALTIES = [
  { label: "Baignade/Plage", emoji: "🏖️" },
  { label: "Soirée", emoji: "🌅" },
  { label: "Glace/Dessert", emoji: "🍦" },
  { label: "Plein air/Nature", emoji: "🌲" },
  { label: "Activité/Loisir", emoji: "🎯" },
  { label: "Randonnée", emoji: "🥾" },
  { label: "Pizza", emoji: "🍕" },
  { label: "Burger", emoji: "🍔" },
  { label: "Tacos", emoji: "🌮" },
  { label: "Ma9loub", emoji: "🥙" },
  { label: "Mlawi", emoji: "🌯" },
  { label: "Chapati", emoji: "🥪" },
  { label: "Kaffteji", emoji: "🥘" },
  { label: "Lablebi", emoji: "🍲" },
  { label: "Couscous", emoji: "🍚" },
  { label: "Baguette Farcie", emoji: "🥖" },
  { label: "Pasta", emoji: "🍝" },
  { label: "Sushi", emoji: "🍣" },
  { label: "Brunch", emoji: "🍳" },
  { label: "Crêpe/Gaufre", emoji: "🥞" },
  { label: "Libanais/Oriental", emoji: "🥙" },
  { label: "Salade/Bowl", emoji: "🥗" },
  { label: "Grillade", emoji: "🍖" },
  { label: "Plat Tunisien", emoji: "🇹🇳" }
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [availableZones, setAvailableZones] = useState<string[]>(zones);
  const [view, setView] = useState<'search' | 'stats'>('search');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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
                kharjet: 'Kharjet',
                balade: 'Kharjet',
                shopping: 'Shopping',
                cinemas: 'Cinéma'
              };
              const categoryLabel = labelMap[catKey] || catKey;
              const specialtiesMap = zone.specialties || {};
              places.forEach((name: string) => {
                const cleanedName = name.split('[')[0].trim();
                flatPlaces.push({
                  name: cleanedName,
                  category: categoryLabel,
                  zone: zone.zone,
                  specialties: specialtiesMap[name] || specialtiesMap[cleanedName] || []
                });
              });
            });
          });
          setAllPlaces(flatPlaces);

          // Extract unique zones dynamically
          const dbZones = Array.from(new Set(result.data.zones.map((z: any) => z.zone))) as string[];
          if (dbZones.length > 0) {
            setAvailableZones(dbZones.sort());
          }
        }
      } catch (error) {
        console.error("Failed to fetch places for selection help", error);
      } finally {
        setIsFetchingPlaces(false);
      }
    }
    fetchAllPlaces();
  }, []);

  // Retroactive sync: push Kharjet visit-places that are missing from Firestore
  useEffect(() => {
    if (!userProfile?.visits || allPlaces.length === 0) return;

    const kharjetVisits = userProfile.visits.filter(
      (v: VisitLog) => v.category === 'Kharjet' || v.category === 'Balade'
    );
    if (kharjetVisits.length === 0) return;

    const kharjetInDb = new Set(
      allPlaces.filter(p => p.category === 'Kharjet').map(p => p.name.toLowerCase())
    );

    const missing = kharjetVisits.filter(
      (v: VisitLog) => !kharjetInDb.has(v.placeName.toLowerCase())
    );

    if (missing.length === 0) return;

    // Deduplicate by placeName
    const seen = new Set<string>();
    const uniqueMissing = missing.filter((v: VisitLog) => {
      const key = v.placeName.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Push each missing place to Firestore silently
    uniqueMissing.forEach(async (v: VisitLog) => {
      try {
        // Try to find zone from combinedPlaces, fallback to 'La Marsa'
        const knownPlace = combinedPlaces.find(
          p => p.name.toLowerCase() === v.placeName.toLowerCase() && p.category === 'Kharjet'
        );
        const zone = knownPlace?.zone || 'La Marsa';
        const tags = (v.orderedItem || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        await fetch('/api/places-database-firestore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'addPlace',
            zone,
            category: 'kharjet',
            placeName: v.placeName,
            specialties: tags
          })
        });
        // Update local state
        setAllPlaces(prev => {
          const alreadyThere = prev.some(
            p => p.name.toLowerCase() === v.placeName.toLowerCase() && p.category === 'Kharjet'
          );
          if (alreadyThere) return prev;
          return [...prev, { name: v.placeName, category: 'Kharjet', zone, specialties: tags }];
        });
      } catch (e) {
        console.error('Retroactive Kharjet sync failed for', v.placeName, e);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPlaces.length, userProfile?.visits]);

  // Base general zones (default predefined Tunis zones + any zone from DB that has non-Kharjet categories)
  const generalZones = useMemo(() => {
    const nonKharjetZonesInDb = allPlaces
      .filter(p => p.category !== 'Kharjet' && p.category !== 'Balade')
      .map(p => p.zone)
      .filter(Boolean);
    return Array.from(new Set([...zones, ...nonKharjetZonesInDb])).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [allPlaces]);

  // Kharjet-specific zones (includes all general zones + any zone specific to Kharjet/outdoor visits)
  const kharjetZones = useMemo(() => {
    const kharjetZonesInDb = allPlaces
      .filter(p => p.category === 'Kharjet' || p.category === 'Balade')
      .map(p => p.zone)
      .filter(Boolean);
    return Array.from(new Set([...generalZones, ...kharjetZonesInDb])).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [allPlaces, generalZones]);

  // Consolidated list of places combining Firestore database and all past user visits with tags
  const combinedPlaces = useMemo(() => {
    const map = new Map<string, { name: string; category: string; zone: string; specialties: string[]; visitCount: number; lastVisited?: number }>();

    // 1. Add places from Firestore database
    allPlaces.forEach(p => {
      const key = `${p.category.toLowerCase()}:::${p.name.toLowerCase()}`;
      map.set(key, {
        name: p.name,
        category: p.category,
        zone: p.zone,
        specialties: [...(p.specialties || [])],
        visitCount: 0
      });
    });

    // 2. Add or enrich with user's past visits from userProfile?.visits
    (userProfile?.visits || []).forEach((v: VisitLog) => {
      if (!v.placeName) return;
      const cat = (v.category === 'Balade' || v.category === 'Kharjet') ? 'Kharjet' : (v.category || 'Autre');
      const cleanPlace = v.placeName.split('[')[0].trim();
      const key = `${cat.toLowerCase()}:::${cleanPlace.toLowerCase()}`;

      const visitTags = (v.orderedItem || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.visitCount = (existing.visitCount || 0) + 1;
        if (!existing.lastVisited || v.date > existing.lastVisited) {
          existing.lastVisited = v.date;
        }
        // Merge tags/specialties
        visitTags.forEach(t => {
          if (!existing.specialties.some(s => s.toLowerCase() === t.toLowerCase())) {
            existing.specialties.push(t);
          }
        });
      } else {
        map.set(key, {
          name: cleanPlace,
          category: cat,
          zone: (cat === 'Kharjet' ? kharjetZones[0] : generalZones[0]) || 'La Marsa',
          specialties: visitTags,
          visitCount: 1,
          lastVisited: v.date
        });
      }
    });

    return Array.from(map.values());
  }, [allPlaces, userProfile?.visits, generalZones, kharjetZones]);

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
        toast({
          title: "Suggestions prêtes !",
          description: `L'IA a trouvé ${newPlaceNames.length} idées pour vous.`,
        });
      } else {
        toast({
          title: "Aucune nouveauté",
          description: "L'IA n'a pas trouvé de nouveaux lieux, voici à nouveau nos recommandations.",
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'obtenir des suggestions de l'IA.",
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile?.seenKhroujSuggestions, seenSuggestions, toast]);

  const handleCategorySelect = (category: (typeof outingOptions)[0]) => {
    setSeenSuggestions([]); // Reset session memory for the new category
    setSelectedCategory(category);
    fetchSuggestions(category, selectedZones, searchQuery === "none" ? undefined : searchQuery);
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

  // Fix old /timeline?id= links to the correct /plats?id= route
  const normalizeMomentyUrl = (url: string) => {
    return url
      .replace('momenty.vercel.app', 'momenty-ten.vercel.app')
      .replace('/timeline?id=', '/plats?id=');
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
      fetchSuggestions(selectedCategory, selectedZones, searchQuery === "none" ? undefined : searchQuery);
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
      qgDuMois: null as { name: string; count: number; category: string } | null,
      weekendHQ: null as ReturnType<typeof getWeekendHQ>,
      passportStats: [] as ReturnType<typeof getCulinaryPassport>,
      frequencyStats: [] as ReturnType<typeof getVisitFrequencies>,
      heatmap: [] as number[],
      monthlyHeatmap: [] as number[],
      yearlyHeatmap: [] as number[]
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
      'Mlawi': { keywords: ['mlawi', 'melaoui'], emoji: '🌯' },
      'Chapati': { keywords: ['chapati', 'croque', 'sandwich rond'], emoji: '🥪' },
      'Ciabatta': { keywords: ['ciabatta', 'ciabata'], emoji: '🥪' },
      'Escalope / Poulet': { keywords: ['escalope', 'escalop', 'scalop', 'pané', 'panée', 'poulet', 'chicken', 'djedj', 'djaj'], emoji: '🍗' },
      'Risotto / Riz': { keywords: ['risotto', 'paella'], emoji: '🥘' },
      'Fruits de Mer / Crevettes': { keywords: ['crevette', 'crevettes', 'shrimp', 'seafood', 'fruit de mer', 'fruits de mer', 'calamar', 'poisson', 'saumon'], emoji: '🦐' },
      'Kaffteji': { keywords: ['kafteji', 'kaffteji'], emoji: '🥘' },
      'Lablebi': { keywords: ['lablebi', 'lablabi'], emoji: '🍲' },
      'Couscous': { keywords: ['couscous'], emoji: '🍚' },
      'Baguette Farcie': { keywords: ['baguette farcie', 'baguette'], emoji: '🥖' },
      'Pasta': { keywords: ['pasta', 'spaghetti', 'penne', 'pâte'], emoji: '🍝' },
      'Sushi': { keywords: ['sushi', 'maki', 'california'], emoji: '🍣' },
      'Brunch': { keywords: ['brunch', 'oeuf', 'pancake', 'benedict'], emoji: '🍳' },
      'Crêpe/Gaufre': { keywords: ['crêpe', 'gaufre', 'crepe'], emoji: '🥞' },
      'Glace/Dessert': { keywords: ['glace', 'cake', 'pâtisserie', 'chocolat', 'donut'], emoji: '🍦' },
      'Viande / Grillade': { keywords: ['viande', 'steak', 'entrecôte', 'entrecote', 'lahma', 'lahmé', 'lahme', 'lahem', 'lahm', 'lham', 'l7am', 'l7em', 'lhem', 'l7ma', 'لحمة', 'لحم', 'boeuf', 'bœuf', 'veau', 'agneau', 'mouton', 'côtelette', 'cotelette', 'bavette', 'filet de boeuf', 'kefta', 'kafta', 'kofta', 'senia', 'siniye', 'siniyeh', 'lahma bel senia', 'lahmé bi siniyé', 'mechoui', 'grillade'], emoji: '🥩' },
      'Libanais/Oriental': { keywords: ['libanais', 'chawarma', 'shawarma', 'falafel', 'kebab', 'kabab', 'kabeb', 'kebeb', 'taouk', 'chich taouk', 'maajouka', 'maajou9a', 'mchakkel', 'mchakel', 'tahina', 'tahini', 'tahine', 'arayes', 'manakish', 'manouche'], emoji: '🥙' },
      'Salade/Bowl': { keywords: ['salade', 'healthy', 'bowl'], emoji: '🥗' },
      'Plat Tunisien': { keywords: ['fricassé', 'ojja', 'kammounia', 'brik', 'couscous', 'tunisien', 'mloukhia'], emoji: '🇹🇳' },
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

        // Skip if it looks like a cinema theater or a movie-related entry (e.g. if category was misassigned)
        if (v.category === 'Cinéma' || textLower.includes('cinéma') || textLower.includes('pathé') || textLower.includes('abc') || textLower.includes('amiral')) return;

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

        // 2. Fallback: Catch-all for unique dishes with automatic emoji detection
        if (!matched) {
          const formattedName = textLower.charAt(0).toUpperCase() + textLower.slice(1);
          if (!bySpecialty[formattedName]) {
            bySpecialty[formattedName] = { count: 0, topPlaces: {}, emoji: getDishEmoji(textLower) };
          }
          bySpecialty[formattedName].count++;
          bySpecialty[formattedName].topPlaces[v.placeName] = (bySpecialty[formattedName].topPlaces[v.placeName] || 0) + 1;
        }
      };

      // Specialty stats logic - Only count for Restaurant, Brunch, and Fast Food
      if (['Restaurant', 'Brunch', 'Fast Food'].includes(v.category)) {
        if (v.orderedItem) {
          const items = v.orderedItem.split(',').map(s => s.trim()).filter(Boolean);
          items.forEach(item => processSpecialty(item));
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

    const totalWithoutKharjet = visits.filter(v => v.category !== 'Kharjet' && v.category !== 'Balade').length;

    return {
      total: totalWithoutKharjet,
      allTotal: visits.length,
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
      qgDuMois,
      weekendHQ: getWeekendHQ(visits),
      passportStats: getCulinaryPassport(visits, userProfile?.customDishRules || {}),
      frequencyStats: getVisitFrequencies(visits),
      heatmap: getWeeklyHeatmap(visits),
      monthlyHeatmap: getMonthlyHeatmap(visits, selectedYear),
      yearlyHeatmap: getYearlyHeatmap(visits, selectedYear)
    };
  }, [userProfile?.visits, allPlaces, selectedYear]);


  const ManualVisitForm = () => {
    const [open, setOpen] = useState(false);
    const [selectedPlace, setSelectedPlace] = useState("");
    const [selectedCat, setSelectedCat] = useState("Café");
    const [selectedZoneToAdd, setSelectedZoneToAdd] = useState<string>("La Marsa");
    const [isCreatingNewZone, setIsCreatingNewZone] = useState(false);
    const [newCustomZone, setNewCustomZone] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [orderedItem, setOrderedItem] = useState("");
    const [orderedItem2, setOrderedItem2] = useState("");
    const [orderedItem3, setOrderedItem3] = useState("");
    const [kharjetNote, setKharjetNote] = useState("");
    const [showSecondCommand, setShowSecondCommand] = useState(false);
    const [showThirdCommand, setShowThirdCommand] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [viewedDate, setViewedDate] = useState(getInitialLocalDateTime());

    // For Cinema
    const [movieSearchQuery, setMovieSearchQuery] = useState("");
    const [movieSearchResults, setMovieSearchResults] = useState<any[]>([]);
    const [selectedMovie, setSelectedMovie] = useState<any | null>(null);

    // Debounce movie search
    useEffect(() => {
      const timer = setTimeout(async () => {
        if (selectedCat === 'Cinéma' && movieSearchQuery.length >= 2) {
          try {
            const response = await fetch(`/api/tmdb-search?q=${encodeURIComponent(movieSearchQuery)}&type=movie`);
            if (response.ok) {
              const data = await response.json();
              setMovieSearchResults(data.results || []);
            }
          } catch (error) {
            console.error(error);
          }
        } else {
          setMovieSearchResults([]);
        }
      }, 300);
      return () => clearTimeout(timer);
    }, [movieSearchQuery, selectedCat]);

    const cinemaOptions = useMemo(() => {
      const globalCinemas = allPlaces
        .filter(p => p.category === 'Cinéma')
        .map(p => p.name);
      return Array.from(new Set(globalCinemas)).sort();
    }, [allPlaces]);

    const filteredSuggestions = useMemo(() => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return [];
      return combinedPlaces
        .filter((p) =>
          p.category.toLowerCase() === selectedCat.toLowerCase() &&
          p.name.toLowerCase().includes(query)
        )
        .sort((a, b) => {
          const aStarts = a.name.toLowerCase().startsWith(query);
          const bStarts = b.name.toLowerCase().startsWith(query);
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return (b.visitCount || 0) - (a.visitCount || 0);
        })
        .slice(0, 6);
    }, [searchQuery, selectedCat, combinedPlaces]);

    const handleSelectPlace = (p: { name: string; category: string; zone: string; specialties: string[] }) => {
      setSelectedPlace(p.name);
      setSearchQuery("");
      if (p.zone) setSelectedZoneToAdd(p.zone);
      setIsCreatingNewZone(false);
      setNewCustomZone("");
    };

    const currentMatchedPlace = useMemo(() => {
      const targetName = (selectedPlace || searchQuery).trim().toLowerCase();
      if (!targetName) return null;
      return combinedPlaces.find(p =>
        p.category.toLowerCase() === selectedCat.toLowerCase() &&
        p.name.toLowerCase() === targetName
      );
    }, [selectedPlace, searchQuery, selectedCat, combinedPlaces]);

    const handleSave = async () => {
      const placeToSave = selectedPlace || searchQuery.trim();
      if (!placeToSave) return;
      if (!user) return;

      setIsSaving(true);
      try {
        const cleanedName = cleanPlaceName(placeToSave);
        const parsedDate = new Date(viewedDate).getTime();
        const dateMs = !isNaN(parsedDate) ? parsedDate : Date.now();

        if (selectedCat === 'Cinéma') {
          const finalOrderedItem = selectedMovie ? selectedMovie.title : movieSearchQuery.trim();

          // Enregistrer la visite
          await addVisitLog(user.uid, {
            placeName: cleanedName,
            category: selectedCat,
            date: dateMs,
            orderedItem: finalOrderedItem || undefined
          });

          // Sync avec Tfarrej si c'est un cinéma
          if (finalOrderedItem) {
              const movieData: any = {
                  title: finalOrderedItem,
                  viewedAt: dateMs,
                  watchedInCinema: true,
                  cinemaPlace: cleanedName,
              };
              if (selectedMovie) {
                  if (selectedMovie.posterUrl) movieData.posterUrl = selectedMovie.posterUrl;
                  if (selectedMovie.year) movieData.year = selectedMovie.year;
                  if (selectedMovie.rating) movieData.rating = selectedMovie.rating;
              }

              // Check if the movie was in watchlist ('moviesToWatch')
              const wasInWatchlist = userProfile?.moviesToWatch?.some(
                (t: string) => t.toLowerCase() === finalOrderedItem.toLowerCase()
              );

              await addSeenMovieWithDate(user.uid, movieData);

              if (wasInWatchlist) {
                toast({
                  title: "🎬 Film transféré depuis 'À voir' !",
                  description: `"${finalOrderedItem}" était dans votre liste 'À voir'. Il a été automatiquement retiré de 'À voir' et ajouté à vos 'Films vus' !`,
                  className: "bg-emerald-600 text-white font-bold border-none shadow-lg",
                });
              } else {
                toast({
                  title: "🎬 Sortie Cinéma enregistrée",
                  description: `"${finalOrderedItem}" a été ajouté à vos films vus au cinéma.`,
                });
              }
          }
        } else {
          // For other categories, allow multiple commands / tags in a single visit log (comma separated)
          const commands = [orderedItem, orderedItem2, orderedItem3]
            .map(c => c.trim())
            .filter(Boolean);

          const finalOrderedItem = commands.length > 0 ? commands.join(', ') : undefined;

          await addVisitLog(user.uid, {
            placeName: cleanedName,
            category: selectedCat,
            date: dateMs,
            orderedItem: finalOrderedItem,
            note: selectedCat === 'Kharjet' && kharjetNote.trim() ? kharjetNote.trim() : undefined
          });

          const existingPlace = allPlaces.find((p: { name: string; category: string; zone: string; specialties: string[] }) =>
            p.name.toLowerCase() === cleanedName.toLowerCase() &&
            p.category.toLowerCase() === selectedCat.toLowerCase()
          );

          const customZoneName = newCustomZone.trim();
          const finalZone = (selectedCat === 'Kharjet' && isCreatingNewZone && customZoneName)
            ? customZoneName
            : (selectedZoneToAdd || (selectedCat === 'Kharjet' ? kharjetZones[0] : generalZones[0]) || 'La Marsa');

          const targetZone = existingPlace ? existingPlace.zone : finalZone;

          if (!existingPlace) {
            // C'est un nouveau lieu : l'enregistrer dans Firestore et dans allPlaces
            try {
              const catKey = selectedCat === 'Kharjet' ? 'kharjet' : selectedCat.toLowerCase();
              await fetch('/api/places-database-firestore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'addPlace',
                  zone: targetZone,
                  category: catKey,
                  placeName: cleanedName,
                  specialties: commands
                })
              });

              setAllPlaces(prev => [
                ...prev,
                {
                  name: cleanedName,
                  category: selectedCat,
                  zone: targetZone,
                  specialties: commands
                }
              ]);
            } catch (e) {
              console.error("Erreur lors de l'ajout du nouveau lieu à la base", e);
            }
          } else {
            // Le lieu existe déjà : mettre à jour ses tags/spécialités si de nouvelles ont été entrées
            const existingSpecialties = existingPlace.specialties || [];
            let newSpecialties = [...existingSpecialties];
            let updated = false;

            for (const cmd of commands) {
              if (cmd && !newSpecialties.some((s: string) => s.toLowerCase() === cmd.toLowerCase())) {
                newSpecialties.push(cmd);
                updated = true;
              }
            }

            if (updated) {
              try {
                await fetch('/api/places-database-firestore', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'update',
                    zone: existingPlace.zone,
                    specialties: { [existingPlace.name]: newSpecialties }
                  })
                });

                setAllPlaces(prev =>
                  prev.map(p =>
                    p.name.toLowerCase() === existingPlace.name.toLowerCase() && p.category.toLowerCase() === selectedCat.toLowerCase()
                      ? { ...p, specialties: newSpecialties }
                      : p
                  )
                );
              } catch (e) {
                console.error("Erreur lors de la mise à jour des spécialités du lieu", e);
              }
            }
          }
        }

        toast({
          title: selectedCat === 'Kharjet' ? "✨ Kharja enregistrée !" : "Visite ajoutée",
          description: `${cleanedName} a été enregistré avec succès.`
        });
        setOpen(false);
        setSelectedPlace("");
        setSearchQuery("");
        setOrderedItem("");
        setOrderedItem2("");
        setOrderedItem3("");
        setKharjetNote("");
        setShowSecondCommand(false);
        setShowThirdCommand(false);
        setMovieSearchQuery("");
        setSelectedMovie(null);
        setIsCreatingNewZone(false);
        setNewCustomZone("");
        setViewedDate(getInitialLocalDateTime());
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
                      setSearchQuery("");
                      setOrderedItem("");
                      setOrderedItem2("");
                      setOrderedItem3("");
                      setKharjetNote("");
                      setShowSecondCommand(false);
                      setShowThirdCommand(false);
                      setMovieSearchQuery("");
                      setSelectedMovie(null);
                      setIsCreatingNewZone(false);
                      setNewCustomZone("");
                      if (opt.label === 'Kharjet') {
                        if (!kharjetZones.includes(selectedZoneToAdd)) {
                          setSelectedZoneToAdd(kharjetZones[0] || "La Marsa");
                        }
                      } else {
                        if (!generalZones.includes(selectedZoneToAdd)) {
                          setSelectedZoneToAdd(generalZones[0] || "La Marsa");
                        }
                      }
                    }}
                  >
                    {opt.label}
                  </TypedBadge>
                ))}
              </div>
            </div>
            <div className="space-y-2 relative">
              <Label>{selectedCat === 'Cinéma' ? 'Salle de Cinéma' : 'Lieu / Nom du spot'}</Label>
              {selectedCat === 'Cinéma' ? (
                <Select
                  value={selectedPlace}
                  onValueChange={(val) => {
                    setSelectedPlace(val);
                    setSearchQuery("");
                  }}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Choisir une salle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {cinemaOptions.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))}
                    {cinemaOptions.length === 0 && (
                      <SelectItem value="none" disabled>Aucune salle définie dans les paramètres</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : selectedPlace ? (
                <div className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  selectedCat === 'Kharjet'
                    ? 'border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-primary/30 bg-primary/5'
                }`}>
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      selectedCat === 'Kharjet'
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-primary/20 text-primary'
                    }`}>
                      {selectedCat === 'Kharjet' ? <Compass className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-foreground truncate">{selectedPlace}</p>
                      <p className="text-[11px] text-muted-foreground">{selectedZoneToAdd || 'Zone principale'}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setSelectedPlace("");
                      setSearchQuery("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder={selectedCat === 'Kharjet' ? "Ex: Plage Ghar El Melh, Gelateria Marsa, Rooftop..." : "Ex: Café Matignon, Baguette & Baguette..."}
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setSearchQuery(e.target.value);
                    }}
                  />
                  {filteredSuggestions.length > 0 && (
                    <Card className="absolute z-50 w-full mt-1 shadow-xl border-emerald-500/30 bg-popover/95 backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <ScrollArea className="h-auto max-h-[220px]">
                        <div className="p-1.5 space-y-1">
                          {filteredSuggestions.map((p, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg cursor-pointer text-sm flex flex-col gap-1 transition-colors border border-transparent hover:border-emerald-500/20"
                              onClick={() => handleSelectPlace(p)}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 truncate">
                                  {selectedCat === 'Kharjet' ? (
                                    <Compass className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                                  ) : (
                                    <Building2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                  )}
                                  <span className="font-semibold text-foreground truncate">{p.name}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                                  {p.zone}
                                </span>
                              </div>

                              {p.specialties && p.specialties.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 pl-5.5 pt-0.5">
                                  <span className="text-[10px] text-muted-foreground font-medium">Tag{p.specialties.length > 1 ? 's' : ''} :</span>
                                  {p.specialties.map((spec, sIdx) => {
                                    const emoji = selectedCat === 'Kharjet' ? getDishEmoji(spec.toLowerCase()) : '🍽️';
                                    return (
                                      <span
                                        key={sIdx}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                          selectedCat === 'Kharjet'
                                            ? 'bg-emerald-100/80 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-700/60'
                                            : 'bg-primary/10 text-primary border border-primary/20'
                                        }`}
                                      >
                                        {selectedCat === 'Kharjet' && emoji !== '🍽️' && <span>{emoji}</span>}
                                        {spec}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {!selectedPlace && selectedCat !== 'Cinéma' && (
              <div className="space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-primary" /> Zone / Emplacement du lieu
                  </Label>
                  {selectedCat === 'Kharjet' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-1 font-medium"
                      onClick={() => {
                        setIsCreatingNewZone(!isCreatingNewZone);
                        if (!isCreatingNewZone) {
                          setNewCustomZone("");
                        }
                      }}
                    >
                      {isCreatingNewZone ? (
                        <>
                          <X className="h-3 w-3" /> Choisir existante
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" /> Nouvelle zone
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {selectedCat === 'Kharjet' && isCreatingNewZone ? (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <Input
                      placeholder="Ex: Ghar El Melh, Zaghouan, Haouaria, Cap Angela..."
                      value={newCustomZone}
                      onChange={(e) => setNewCustomZone(e.target.value)}
                      className="h-9 text-sm border-emerald-500/40 focus-visible:ring-emerald-500"
                      autoFocus
                    />
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      ✨ Cette zone sera enregistrée spécifiquement pour la catégorie « Kharjet ».
                    </p>
                  </div>
                ) : (
                  <Select
                    value={selectedZoneToAdd}
                    onValueChange={(val) => {
                      if (val === '__new_kharjet_zone__') {
                        setIsCreatingNewZone(true);
                        setNewCustomZone("");
                      } else {
                        setSelectedZoneToAdd(val);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-background h-9 text-sm">
                      <SelectValue placeholder="Choisir la zone..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedCat === 'Kharjet' ? kharjetZones : generalZones).map((z: string) => (
                        <SelectItem key={z} value={z}>{z}</SelectItem>
                      ))}
                      {selectedCat === 'Kharjet' && (
                        <SelectItem value="__new_kharjet_zone__" className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer border-t border-muted mt-1 pt-1">
                          ✨ + Ajouter une nouvelle zone...
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {selectedCat === 'Cinéma' ? (
                <div className="space-y-2">
                  <Label>Quel film avez-vous vu ?</Label>
                  {!selectedMovie ? (
                    <div className="relative">
                      <Input
                        placeholder="Rechercher un film..."
                        value={movieSearchQuery}
                        onChange={(e) => setMovieSearchQuery(e.target.value)}
                      />
                      {movieSearchQuery.length >= 2 && movieSearchResults.length > 0 && (
                        <Card className="absolute z-50 w-full mt-1 max-h-[200px] overflow-y-auto shadow-lg">
                          {movieSearchResults.map((movie) => (
                            <div
                              key={movie.id}
                              className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                              onClick={() => {
                                setSelectedMovie(movie);
                                setMovieSearchQuery('');
                              }}
                            >
                              {movie.posterUrl ? (
                                <img src={movie.posterUrl} alt={movie.title} className="w-8 h-12 object-cover rounded" />
                              ) : (
                                <div className="w-8 h-12 bg-muted flex items-center justify-center rounded">
                                  <Film className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{movie.title}</p>
                                <p className="text-xs text-muted-foreground">{movie.year}</p>
                              </div>
                            </div>
                          ))}
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                      <div className="flex items-center gap-2">
                        {selectedMovie.posterUrl ? (
                          <img src={selectedMovie.posterUrl} alt={selectedMovie.title} className="w-8 h-12 object-cover rounded" />
                        ) : (
                          <div className="w-8 h-12 bg-muted flex items-center justify-center rounded">
                            <Film className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{selectedMovie.title}</p>
                          <p className="text-xs text-muted-foreground">{selectedMovie.year}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setSelectedMovie(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
            ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>
                        {selectedCat === 'Kharjet' ? "Tags & Activités (ex: Baignade, Glace, Soirée...)" : "Qu'avez-vous commandé ? (Optionnel)"}
                      </Label>
                      {!showSecondCommand && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 flex items-center gap-1"
                          onClick={() => setShowSecondCommand(true)}
                        >
                          <Plus className="h-3.5 w-3.5" /> {selectedCat === 'Kharjet' ? "Tag 2" : "Commande 2"}
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder={selectedCat === 'Kharjet' ? "Ex: Plage, Glace, Soirée coucher de soleil..." : "Ex: Chapati, Café crème, Pizza..."}
                      value={orderedItem}
                      onChange={(e) => setOrderedItem(e.target.value)}
                    />
                  </div>

                  {/* Badges de tags habituels enregistrés pour ce spot */}
                  {currentMatchedPlace && currentMatchedPlace.specialties && currentMatchedPlace.specialties.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 space-y-1.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          {selectedCat === 'Kharjet' ? "Tags associés à ce lieu :" : "Spécialités de ce lieu :"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">Cliquez pour appliquer</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {currentMatchedPlace.specialties.map((s: string, idx: number) => {
                          const emoji = selectedCat === 'Kharjet' ? getDishEmoji(s.toLowerCase()) : '🍽️';
                          return (
                            <TypedBadge
                              key={idx}
                              variant="outline"
                              className="cursor-pointer hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-500 dark:hover:text-black text-[11px] bg-background border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 transition-colors py-0.5 px-2 rounded-md flex items-center gap-1"
                              onClick={() => {
                                if (!orderedItem) {
                                  setOrderedItem(s);
                                } else if (orderedItem.toLowerCase() === s.toLowerCase()) {
                                  // already tag 1
                                } else if (!orderedItem2 || !showSecondCommand) {
                                  setShowSecondCommand(true);
                                  setOrderedItem2(s);
                                } else if (orderedItem2.toLowerCase() === s.toLowerCase()) {
                                  // already tag 2
                                } else if (!orderedItem3 || !showThirdCommand) {
                                  setShowThirdCommand(true);
                                  setOrderedItem3(s);
                                } else {
                                  setOrderedItem(s);
                                }
                              }}
                            >
                              {selectedCat === 'Kharjet' && (emoji !== '🍽️' ? `${emoji} ` : '✨ ')}{s}
                            </TypedBadge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Suggestions de tags prédéfinis pour Kharjet */}
                  {selectedCat === 'Kharjet' && (
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-muted-foreground block">Suggestions rapides :</span>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {["🏖️ Baignade", "🍦 Glace", "🌅 Soirée", "🌲 Nature", "🎯 Activité", "🥾 Randonnée", "☕ Pause Café", "🍹 Rooftop"].map((tag, idx) => (
                          <TypedBadge
                            key={idx}
                            variant="outline"
                            className="cursor-pointer hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 text-[11px] bg-background border-emerald-200 dark:border-emerald-800 transition-colors py-0.5"
                            onClick={() => {
                              const cleanTag = tag.replace(/^[^\w\s\u0600-\u06FF]+/u, '').trim();
                              if (!orderedItem) {
                                setOrderedItem(cleanTag);
                              } else if (!orderedItem2 || !showSecondCommand) {
                                setShowSecondCommand(true);
                                setOrderedItem2(cleanTag);
                              } else if (!orderedItem3 || !showThirdCommand) {
                                setShowThirdCommand(true);
                                setOrderedItem3(cleanTag);
                              } else {
                                setOrderedItem(cleanTag);
                              }
                            }}
                          >
                            {tag}
                          </TypedBadge>
                        ))}
                      </div>
                    </div>
                  )}

                  {showSecondCommand && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          {selectedCat === 'Kharjet' ? "Deuxième tag (Optionnel)" : "Deuxième commande (Optionnelle)"}
                        </Label>
                        <div className="flex items-center gap-1">
                          {!showThirdCommand && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              className="h-6 px-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 flex items-center gap-1"
                              onClick={() => setShowThirdCommand(true)}
                            >
                              <Plus className="h-3.5 w-3.5" /> {selectedCat === 'Kharjet' ? "Tag 3" : "Commande 3"}
                            </Button>
                          )}
                          <Button 
                            type="button" 
                            variant="ghost" 
                            className="h-6 px-1.5 text-xs text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                            onClick={() => {
                              setShowSecondCommand(false);
                              setOrderedItem2("");
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <Input
                        placeholder={selectedCat === 'Kharjet' ? "Ex: Soirée, Glace, Activité..." : "Ex: Thé, Tarte aux pommes..."}
                        value={orderedItem2}
                        onChange={(e) => setOrderedItem2(e.target.value)}
                      />
                    </div>
                  )}

                  {showThirdCommand && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">
                          {selectedCat === 'Kharjet' ? "Troisième tag (Optionnel)" : "Troisième commande (Optionnelle)"}
                        </Label>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="h-6 px-1.5 text-xs text-destructive hover:text-destructive/80 hover:bg-destructive/5"
                          onClick={() => {
                            setShowThirdCommand(false);
                            setOrderedItem3("");
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <Input
                        placeholder={selectedCat === 'Kharjet' ? "Ex: Randonnée, Baignade..." : "Ex: Coca-Cola, Frites..."}
                        value={orderedItem3}
                        onChange={(e) => setOrderedItem3(e.target.value)}
                      />
                    </div>
                  )}
                </div>
            )}

            {/* Kharjet-only free text note */}
            {selectedCat === 'Kharjet' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label className="flex items-center gap-1.5">
                  <span>📝</span>
                  <span>Note libre (Optionnel)</span>
                </Label>
                <textarea
                  rows={3}
                  placeholder="Raconte cette sortie en quelques mots... ambiance, anecdote, avec qui tu étais, ce que tu as ressenti ✨"
                  value={kharjetNote}
                  onChange={(e) => setKharjetNote(e.target.value)}
                  className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
                />
                {kharjetNote.length > 0 && (
                  <p className="text-[10px] text-muted-foreground text-right">{kharjetNote.length} caractères</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Date et heure de la visite</Label>
              <Input
                type="datetime-local"
                value={viewedDate}
                onChange={(e) => setViewedDate(e.target.value)}
                max={getInitialLocalDateTime()}
              />
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
                        {(visit.category === 'Kharjet' || visit.category === 'Balade') ? (
                          <Layers className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <UtensilsCrossed className="h-4 w-4 text-primary flex-shrink-0" />
                        )}
                        <Input
                          placeholder={(visit.category === 'Kharjet' || visit.category === 'Balade') ? "Tags / activités..." : "Plat commandé..."}
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
                        <span>{getDayName(date)} {new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        {visit.source === 'momenty' && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-[7px] text-muted-foreground/60 italic ml-1 select-none">via Momenty</span>
                            <Link
                              href={visit.momentyUrl ? normalizeMomentyUrl(visit.momentyUrl) : 'https://momenty-ten.vercel.app/plats'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary/70 hover:text-primary transition-colors ml-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-2 w-2" />
                            </Link>
                          </span>
                        )}
                      </div>
                      {visit.orderedItem && (
                        <div className="flex items-center gap-2 pl-7">
                          {(visit.category === 'Kharjet' || visit.category === 'Balade') ? (
                            <Layers className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <UtensilsCrossed className="h-3 w-3 text-muted-foreground" />
                          )}
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [onlyMomenty, setOnlyMomenty] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name'>('newest');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

    if (!userProfile?.visits || userProfile.visits.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3 text-muted-foreground">
          <div className="h-16 w-16 bg-muted/40 rounded-full flex items-center justify-center">
            <History className="h-8 w-8 opacity-40" />
          </div>
          <p className="font-semibold text-foreground/80 text-base">Aucune sortie enregistrée</p>
          <p className="text-xs text-muted-foreground max-w-xs">Enregistrez vos premières sorties manuellement ou importez-les depuis Momenty !</p>
        </div>
      );
    }

    const allVisits = userProfile.visits;
    // Kharjet has its own dedicated widget — exclude it from the "Total" counter
    const nonKharjetVisits = allVisits.filter(v => v.category !== 'Kharjet' && v.category !== 'Balade');
    const totalMomentyVisits = allVisits.filter(v => (v as any).source === 'momenty').length;
    const uniquePlacesTotal = new Set(nonKharjetVisits.map(v => v.placeName)).size;

    // Filter Logic
    const filteredVisits = allVisits.filter(v => {
      // Always exclude Kharjet — it has its own dedicated widget
      if (v.category === 'Kharjet' || v.category === 'Balade') return false;

      // 1. Momenty filter
      if (onlyMomenty && (v as any).source !== 'momenty') return false;

      // 2. Category filter
      if (selectedCategory !== 'all' && v.category !== selectedCategory) return false;

      // 3. Period filter
      if (selectedPeriod === '30days') {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        if (v.date < thirtyDaysAgo) return false;
      } else if (selectedPeriod === 'thisYear') {
        const currentYear = new Date().getFullYear();
        if (new Date(v.date).getFullYear() !== currentYear) return false;
      } else if (selectedPeriod === 'lastYear') {
        const lastYear = new Date().getFullYear() - 1;
        if (new Date(v.date).getFullYear() !== lastYear) return false;
      }

      // 4. Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = v.placeName.toLowerCase().includes(q);
        const matchesDish = v.orderedItem && v.orderedItem.toLowerCase().includes(q);
        const matchesCategory = v.category && v.category.toLowerCase().includes(q);
        return matchesName || matchesDish || matchesCategory;
      }

      return true;
    });

    // Sort Logic
    const sortedVisits = [...filteredVisits].sort((a, b) => {
      if (sortBy === 'newest') return b.date - a.date;
      if (sortBy === 'oldest') return a.date - b.date;
      if (sortBy === 'name') return a.placeName.localeCompare(b.placeName);
      return 0;
    });

    const isAnyFilterActive = onlyMomenty || selectedCategory !== 'all' || selectedPeriod !== 'all' || searchQuery.trim().length > 0 || sortBy !== 'newest';

    const handleResetFilters = () => {
      setSearchQuery('');
      setOnlyMomenty(false);
      setSelectedCategory('all');
      setSelectedPeriod('all');
      setSortBy('newest');
    };

    return (
      <div className="flex flex-col h-full space-y-3">
        {/* Top Stats Banner */}
        <div className="grid grid-cols-3 gap-2 px-1 pt-1">
          <div className="bg-primary/5 border border-primary/15 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-black text-primary leading-none">{nonKharjetVisits.length}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tight mt-0.5">Total</span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center">
            <span className="text-lg font-black text-slate-700 dark:text-slate-200 leading-none">{uniquePlacesTotal}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-tight mt-0.5">Lieux</span>
          </div>

          <button
            type="button"
            onClick={() => setOnlyMomenty(!onlyMomenty)}
            className={cn(
              "rounded-2xl p-2.5 flex flex-col items-center justify-center text-center transition-all duration-300 border cursor-pointer group",
              onlyMomenty
                ? "bg-gradient-to-br from-amber-500/20 via-pink-500/20 to-purple-500/20 border-pink-500/50 shadow-md shadow-pink-500/10 ring-2 ring-pink-500/30"
                : "bg-pink-50/60 dark:bg-pink-950/30 border-pink-200/80 dark:border-pink-900 hover:bg-pink-100/60"
            )}
          >
            <div className="flex items-center gap-1">
              <Sparkles className={cn("h-3.5 w-3.5 text-pink-600 transition-transform duration-300", onlyMomenty ? "scale-125 rotate-12" : "group-hover:rotate-12")} />
              <span className="text-lg font-black text-pink-600 leading-none">{totalMomentyVisits}</span>
            </div>
            <span className="text-[10px] text-pink-700 dark:text-pink-300 font-bold uppercase tracking-tight mt-0.5 flex items-center gap-0.5">
              Momenty
              {onlyMomenty && <span className="h-1.5 w-1.5 rounded-full bg-pink-600 inline-block animate-ping" />}
            </span>
          </button>
        </div>

        {/* Search Bar and Quick Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors duration-200", isSearchFocused ? "text-primary" : "text-muted-foreground/60")} />
            <Input
              placeholder="Rechercher un lieu, un plat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              className="h-10 pl-9 pr-8 bg-muted/40 border-muted-foreground/20 rounded-xl text-sm focus-visible:ring-primary/20 focus-visible:border-primary"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-5 w-5 rounded-full hover:bg-muted text-muted-foreground transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filter options toggle */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "h-10 px-3 rounded-xl border transition-all duration-200 shrink-0 flex items-center gap-1.5 text-xs font-semibold",
              showAdvancedFilters || selectedPeriod !== 'all' || sortBy !== 'newest'
                ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Options de tri et filtres temporels"
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">Filtres</span>
          </Button>
        </div>

        {/* Categories Horizontal Scrollbar - Native smooth horizontal scroll */}
        <div className="relative w-full">
          <div className="flex gap-1.5 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none touch-pan-x scroll-smooth -mx-1 px-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border flex items-center gap-1.5 shrink-0 select-none",
                selectedCategory === 'all'
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/40 hover:bg-muted/80 text-muted-foreground border-transparent"
              )}
            >
              <span>Tout</span>
              <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full", selectedCategory === 'all' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground")}>
                {nonKharjetVisits.length}
              </span>
            </button>

            {outingOptions.filter(opt => opt.id !== 'kharjet').map((opt) => {
              const count = nonKharjetVisits.filter(v => v.category === opt.label).length;
              if (count === 0) return null;
              const isSelected = selectedCategory === opt.label;
              const Icon = opt.icon;

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? 'all' : opt.label)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border flex items-center gap-1.5 shrink-0 select-none",
                    isSelected
                      ? cn(opt.bgClass, opt.colorClass, "border-current shadow-sm ring-1 ring-current/20")
                      : "bg-muted/40 hover:bg-muted/80 text-muted-foreground border-transparent"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{opt.label}</span>
                  <span className={cn("text-[10px] px-1.5 py-0.2 rounded-full font-bold", isSelected ? "bg-black/10 text-current" : "bg-muted text-muted-foreground")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Collapsible Advanced Filters: Period & Sort */}
        {showAdvancedFilters && (
          <div className="p-3 bg-muted/30 border border-muted-foreground/15 rounded-2xl space-y-2.5 animate-in fade-in-50 slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Period Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Période
                </span>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger className="h-8 text-xs bg-background rounded-lg border-muted-foreground/20">
                    <SelectValue placeholder="Période" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les dates</SelectItem>
                    <SelectItem value="30days">30 derniers jours</SelectItem>
                    <SelectItem value="thisYear">Cette année ({new Date().getFullYear()})</SelectItem>
                    <SelectItem value="lastYear">Année précédente ({new Date().getFullYear() - 1})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort By Filter */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <ArrowUpDown className="h-3 w-3" /> Ordre de tri
                </span>
                <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                  <SelectTrigger className="h-8 text-xs bg-background rounded-lg border-muted-foreground/20">
                    <SelectValue placeholder="Tri" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Plus récentes en premier ⬇️</SelectItem>
                    <SelectItem value="oldest">Plus anciennes en premier ⬆️</SelectItem>
                    <SelectItem value="name">Nom du lieu (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary bar */}
        <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="font-bold text-foreground">{sortedVisits.length}</span> sortie{sortedVisits.length > 1 ? 's' : ''}
            {isAnyFilterActive && (
              <span className="text-[11px] text-muted-foreground">
                sur {allVisits.length}
              </span>
            )}
            {onlyMomenty && (
              <TypedBadge className="bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border-none text-[9px] h-4 px-1.5 flex items-center gap-0.5">
                <Sparkles className="h-2.5 w-2.5" /> Momenty seul
              </TypedBadge>
            )}
          </div>

          {isAnyFilterActive && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-bold text-primary hover:text-primary/80 hover:underline flex items-center gap-1 transition-colors"
            >
              <FilterX className="h-3 w-3" />
              Réinitialiser
            </button>
          )}
        </div>

        {/* Main List of Visits */}
        <ScrollArea className="h-[55vh] -mx-6 px-6">
          <div className="space-y-2.5 pb-6">
            {sortedVisits.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-3 text-muted-foreground">
                <div className="h-12 w-12 bg-muted/40 rounded-full flex items-center justify-center">
                  <Search className="h-6 w-6 opacity-30" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground/80 text-sm">Aucune sortie trouvée</p>
                  <p className="text-xs text-muted-foreground">Modifiez vos critères de recherche ou réinitialisez les filtres.</p>
                </div>
                {isAnyFilterActive && (
                  <Button variant="outline" size="sm" onClick={handleResetFilters} className="text-xs rounded-xl h-8 gap-1.5 mt-1">
                    <FilterX className="h-3.5 w-3.5" />
                    Effacer les filtres
                  </Button>
                )}
              </div>
            ) : (
              sortedVisits.map((visit: VisitLog) => {
                const cat = outingOptions.find((o: (typeof outingOptions)[0]) => o.label === visit.category) || {
                  icon: MapPin,
                  colorClass: "text-slate-600",
                  bgClass: "bg-slate-100",
                  label: visit.category || 'Autre'
                };
                const isMomenty = (visit as any).source === 'momenty';

                return (
                  <div
                    key={visit.id}
                    className={cn(
                      "group flex items-start gap-3 p-3 rounded-2xl border transition-all duration-300 relative overflow-hidden",
                      isMomenty
                        ? "bg-card/70 border-pink-200/50 dark:border-pink-900/40 hover:border-pink-400 hover:shadow-md hover:bg-white dark:hover:bg-card"
                        : "bg-card/50 hover:bg-white dark:hover:bg-card hover:shadow-md hover:border-primary/20"
                    )}
                  >
                    {/* Category Icon Badge */}
                    <div className={cn("h-10 w-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-105 mt-0.5", cat.bgClass)}>
                      <cat.icon className={cn("h-5 w-5", cat.colorClass)} />
                    </div>

                    {/* Visit Info */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <p className="font-bold text-sm sm:text-base text-foreground/90 group-hover:text-primary transition-colors leading-tight break-words flex items-center gap-1.5 flex-wrap">
                          <span>{visit.placeName}</span>
                          {isMomenty && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-500/15 border border-pink-400/30 text-[9px] font-extrabold text-pink-700 dark:text-pink-300">
                              <Sparkles className="h-2.5 w-2.5 text-pink-600 animate-pulse" />
                              Momenty
                              <Link
                                href={visit.momentyUrl ? normalizeMomentyUrl(visit.momentyUrl) : 'https://momenty-ten.vercel.app/plats'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-600 hover:text-pink-800 transition-colors ml-0.5"
                                onClick={(e) => e.stopPropagation()}
                                title="Voir sur Momenty"
                              >
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Category and Orders */}
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={cn("text-xs font-bold", cat.colorClass)}>
                          {cat.label}
                        </span>

                        {visit.orderedItem && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/60 text-muted-foreground text-[11px] font-medium max-w-full truncate">
                            {visit.category === 'Cinéma' ? (
                              <Film className="h-3 w-3 text-violet-600 shrink-0" />
                            ) : (
                              <UtensilsCrossed className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                            )}
                            <span className="truncate">{visit.orderedItem}</span>
                          </span>
                        )}
                      </div>

                      {/* Free-text note for Kharjet */}
                      {visit.note && (
                        <p className="mt-1.5 text-[10px] text-emerald-700 dark:text-emerald-400 italic flex items-start gap-1 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-lg px-2 py-1 border border-emerald-200/60 dark:border-emerald-800/50 leading-relaxed">
                          <span className="flex-shrink-0 mt-px">📝</span>
                          <span>{visit.note}</span>
                        </p>
                      )}

                      {/* Date & Time display */}
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-primary/70" />
                          <span className="font-semibold text-foreground/80">{getDayName(visit.date)}</span> {new Date(visit.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-[10px]">
                          <Clock className="h-2.5 w-2.5 text-muted-foreground/70" />
                          {new Date(visit.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Safe Delete Button */}
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-xl"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!user) return;
                          await deleteVisitLog(user.uid, visit.id);
                          toast({ title: "Visite supprimée" });
                        }}
                        title="Supprimer cette visite"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
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
                        'Cinéma': {
                          icon: Clapperboard, color: 'text-violet-700', bg: 'bg-violet-50',
                          titles: [
                            `Amateur de Cinéma`,
                            `Cinéphile`,
                            `Critique Film`,
                            `Expert du 7ème Art`,
                            `Légende d'Hollywood 🎬`
                          ]
                        },
                        'Kharjet': {
                          icon: Compass, color: 'text-emerald-700', bg: 'bg-emerald-50',
                          titles: [
                            `Explorateur de Sorties`,
                            `Globe-Trotter Local`,
                            `Aventurier Urbain`,
                            `Maître des Khrejat`,
                            `Légende de la Kharjet ✨`
                          ]
                        },
                        'Balade': {
                          icon: Compass, color: 'text-emerald-700', bg: 'bg-emerald-50',
                          titles: [
                            `Explorateur de Sorties`,
                            `Globe-Trotter Local`,
                            `Aventurier Urbain`,
                            `Maître des Khrejat`,
                            `Légende de la Kharjet ✨`
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
      </Dialog >
    );
  };

  const SpecialtyMasteryDialog = () => {
    const sortedSpecialties = Object.entries(stats.bySpecialty).sort((a, b) => b[1].count - a[1].count);
    const [editingSpecialty, setEditingSpecialty] = useState<{ name: string, current: string } | null>(null);
    const [newVal, setNewVal] = useState('');
    const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);

    const iconOptions = [
      { id: 'lucide:Pizza', icon: Pizza },
      { id: 'lucide:Sandwich', icon: Sandwich },
      { id: 'lucide:Soup', icon: Soup },
      { id: 'lucide:Cake', icon: Cake },
      { id: 'lucide:IceCream', icon: IceCream },
      { id: 'lucide:Fish', icon: Fish },
      { id: 'lucide:Drumstick', icon: Drumstick },
      { id: 'lucide:Beef', icon: Beef },
      { id: 'lucide:Egg', icon: Egg },
      { id: 'lucide:Coffee', icon: Coffee },
      { id: 'lucide:CupSoda', icon: CupSoda },
      { id: 'lucide:Cherry', icon: Cherry },
      { id: 'lucide:Apple', icon: Apple },
      { id: 'lucide:Carrot', icon: Carrot },
      { id: 'lucide:Cookie', icon: Cookie },
      { id: 'lucide:Beer', icon: Beer },
      { id: 'lucide:Wine', icon: Wine },
      { id: 'lucide:GlassWater', icon: GlassWater },
      { id: 'lucide:Flame', icon: Flame },
    ];

    const colorOptions = [
      { name: 'Orange', value: 'from-orange-500/20 to-red-500/20', tint: 'bg-orange-600' },
      { name: 'Amber', value: 'from-amber-600/20 to-orange-600/20', tint: 'bg-amber-700' },
      { name: 'Yellow', value: 'from-yellow-400/20 to-amber-500/20', tint: 'bg-amber-800' },
      { name: 'Red', value: 'from-red-400/20 to-rose-500/20', tint: 'bg-red-700' },
      { name: 'Pink', value: 'from-pink-300/20 to-rose-400/20', tint: 'bg-pink-700' },
      { name: 'Violet', value: 'from-violet-400/20 to-purple-500/20', tint: 'bg-violet-700' },
      { name: 'Blue', value: 'from-blue-400/20 to-indigo-500/20', tint: 'bg-blue-700' },
      { name: 'Cyan', value: 'from-cyan-400/20 to-teal-500/20', tint: 'bg-cyan-700' },
      { name: 'Emerald', value: 'from-emerald-400/20 to-green-500/20', tint: 'bg-emerald-700' },
      { name: 'Green', value: 'from-green-300/20 to-emerald-400/20', tint: 'bg-green-700' },
      { name: 'Slate', value: 'from-slate-300/20 to-slate-500/20', tint: 'bg-slate-700' },
    ];

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
      'Viande / Grillade': { gradient: 'from-rose-600/20 to-red-700/20', tint: 'text-rose-800' },
      'Grillade': { gradient: 'from-amber-700/20 to-red-800/20', tint: 'text-red-800' },
      'Lahma': { gradient: 'from-rose-600/20 to-red-700/20', tint: 'text-rose-800' },
      'Lahmé': { gradient: 'from-rose-600/20 to-red-700/20', tint: 'text-rose-800' },
      'Libanais/Oriental': { gradient: 'from-amber-500/20 to-orange-600/20', tint: 'text-amber-800' },
      'Oriental': { gradient: 'from-amber-500/20 to-orange-600/20', tint: 'text-amber-800' },
      'Chapati': { gradient: 'from-orange-200 to-orange-400/40', tint: 'text-orange-800' },
      'Mlawi': { gradient: 'from-amber-200 to-amber-500/40', tint: 'text-amber-900' },
      'Poulet': { gradient: 'from-orange-400/20 to-red-400/20', tint: 'text-orange-700' },
      'Escalope / Poulet': { gradient: 'from-orange-400/20 to-red-400/20', tint: 'text-orange-700' },
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

    const handleUpdateCustomization = async () => {
      if (!user || !editingSpecialty) return;
      try {
        await updateSpecialtyCustomization(user.uid, editingSpecialty.name, {
          imageUrl: newVal.trim(),
          color: selectedColor
        });
        toast({ title: "Atlas mis à jour", description: `La personnalisation pour ${editingSpecialty.name} a été modifiée.` });
        setEditingSpecialty(null);
        setNewVal('');
        setSelectedColor(undefined);
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
                    const customColor = userProfile?.specialtyColors?.[name];
                    const rawEmoji = (data.emoji && data.emoji !== '🍽️') ? data.emoji : getDishEmoji(name);
                    const displayEmoji = customImage || rawEmoji;

                    const isUrl = displayEmoji.startsWith('http') || displayEmoji.startsWith('/') || displayEmoji.startsWith('data:');
                    const isLucide = displayEmoji.startsWith('lucide:');

                    const tier = getTier(data.count);
                    const theme = customColor
                      ? { gradient: customColor, tint: colorOptions.find(c => c.value === customColor)?.tint.replace('bg-', 'text-') || 'text-primary' }
                      : (specialtyThemes[name] || { gradient: 'from-blue-50/50 to-indigo-100/50', tint: 'text-blue-700' });
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
                          {isLucide ? (() => {
                            const iconName = displayEmoji.split(':')[1];
                            const Icon = iconOptions.find(o => o.id === displayEmoji)?.icon || UtensilsCrossed;
                            return <Icon className={cn("h-12 w-12", theme.tint)} />;
                          })() : isUrl ? (
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
          <Dialog open={!!editingSpecialty} onOpenChange={(open) => {
            if (!open) {
              setEditingSpecialty(null);
              setSelectedColor(undefined);
            }
          }}>
            <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black">Personnaliser {editingSpecialty?.name}</DialogTitle>
                <DialogDescription className="font-medium">
                  Choisissez une icône, une couleur ou une image personnalisée.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 pr-4">
                <div className="py-4 space-y-6">
                  {/* Icon Selection */}
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-50">Icône Lucide</Label>
                    <div className="grid grid-cols-5 gap-2">
                      {iconOptions.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setNewVal(opt.id)}
                            className={cn(
                              "h-12 w-full rounded-xl flex items-center justify-center transition-all border-2",
                              newVal === opt.id ? "border-primary bg-primary/10" : "border-transparent bg-muted/40 hover:bg-muted"
                            )}
                          >
                            <Icon className={cn("h-6 w-6", newVal === opt.id ? "text-primary" : "text-muted-foreground")} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest opacity-50">Couleur du Widget</Label>
                    <div className="flex flex-wrap gap-2">
                      {colorOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setSelectedColor(opt.value)}
                          className={cn(
                            "h-8 w-8 rounded-full border-2 transition-all p-0.5",
                            (selectedColor || userProfile?.specialtyColors?.[editingSpecialty?.name || '']) === opt.value ? "border-primary scale-110" : "border-transparent"
                          )}
                          title={opt.name}
                        >
                          <div className={cn("w-full h-full rounded-full", opt.tint)} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Manual Entry */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-black uppercase tracking-widest opacity-50">Emoji ou URL Image</Label>
                    </div>
                    <Input
                      value={newVal.startsWith('lucide:') ? '' : newVal}
                      onChange={(e) => setNewVal(e.target.value)}
                      placeholder="🍔 ou https://site.com/image.png"
                    />
                  </div>

                  {/* Preview */}
                  {newVal && (
                    <div className="flex flex-col items-center gap-2 pt-2 pb-4">
                      <Label className="text-xs font-black uppercase tracking-widest opacity-50">Aperçu du Widget</Label>
                      <div className={cn(
                        "h-32 w-48 rounded-[2rem] flex flex-col items-center justify-center gap-2 border-2 shadow-inner transition-all duration-500",
                        selectedColor || userProfile?.specialtyColors?.[editingSpecialty?.name || ''] || 'bg-muted/30'
                      )}>
                        {newVal.startsWith('lucide:') ? (() => {
                          const Icon = iconOptions.find(o => o.id === newVal)?.icon || UtensilsCrossed;
                          return <Icon className="h-12 w-12 text-primary" />;
                        })() : (newVal.startsWith('http') || newVal.startsWith('/') || newVal.startsWith('data:')) ? (
                          <img src={newVal} alt="Aperçu" className="h-16 w-16 object-contain" />
                        ) : (
                          <span className="text-5xl">{newVal}</span>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{editingSpecialty?.name}</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={() => {
                  setEditingSpecialty(null);
                  setSelectedColor(undefined);
                }}>Annuler</Button>
                <Button onClick={handleUpdateCustomization} className="font-bold">Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </DialogContent>
      </Dialog>
    );
  };

  const triggerFireworks = () => {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval: any = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } } as any);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } } as any);
    }, 250);
  };

  const triggerCategoryAnimation = (emojis: string[]) => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const interval: any = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }

      confetti({
        spread: 360,
        ticks: 60,
        gravity: 0.8,
        decay: 0.94,
        startVelocity: 30,
        zIndex: 9999,
        particleCount: 15,
        scalar: 2.5,
        shapes: ['text'],
        shapeOptions: {
          text: {
            value: emojis
          }
        },
        origin: {
          x: Math.random(),
          y: Math.random() - 0.2
        }
      } as any);
    }, 200);
  };

  // Sub-component for category dialog content — needs its own state for "show all" toggle
  const CategoryDialogContent = ({
    opt,
    categoryVisits,
    sortedPlaces,
    count,
  }: {
    opt: (typeof outingOptions)[0];
    categoryVisits: VisitLog[];
    sortedPlaces: [string, { count: number; lastDate: number; dates: number[]; orderedItems: string[] }][];
    count: number;
  }) => {
    const INITIAL_SHOWN = 5;
    const [showAllVisits, setShowAllVisits] = useState(false);
    const visibleVisits = showAllVisits ? categoryVisits : categoryVisits.slice(0, INITIAL_SHOWN);
    const hiddenCount = categoryVisits.length - INITIAL_SHOWN;

    return (
      <ScrollArea className="bg-white -mt-8 rounded-t-[2rem] relative z-20 min-h-0">
        <div className="p-5 space-y-5 pb-8">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3 text-muted-foreground">
              <opt.icon className="h-12 w-12 opacity-20" />
              <p className="font-medium">Aucune sortie enregistrée.</p>
              <p className="text-xs">Utilisez l'ajout manuel pour commencer !</p>
            </div>
          ) : (
            <>
              {/* Recent visits timeline */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3 w-3" /> Toutes les sorties
                  <span className="ml-auto font-black text-foreground">{categoryVisits.length}</span>
                </h4>
                <div className="space-y-2">
                  {visibleVisits.map((v: VisitLog, idx: number) => (
                    <div key={v.id || idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors animate-in fade-in-50 duration-200">
                      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5", opt.bgClass)}>
                        <opt.icon className={cn("h-4 w-4", opt.colorClass)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm leading-tight truncate">{v.placeName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {getDayName(v.date)} {new Date(v.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {' · '}
                          <span className="font-semibold text-foreground/70">{new Date(v.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </p>
                        {v.orderedItem && (
                          <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                            {opt.label === 'Cinéma' ? (
                              <Film className="h-2.5 w-2.5 flex-shrink-0 text-violet-600" />
                            ) : opt.label === 'Kharjet' ? (
                              <Layers className="h-2.5 w-2.5 flex-shrink-0 text-emerald-500" />
                            ) : (
                              <UtensilsCrossed className="h-2.5 w-2.5 flex-shrink-0" />
                            )}
                            <span>{v.orderedItem}</span>
                          </p>
                        )}
                        {v.note && (
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 flex items-start gap-1 mt-1 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-lg px-2 py-1 border border-emerald-200/60 dark:border-emerald-800/50">
                            <span className="flex-shrink-0 mt-px">📝</span>
                            <span className="italic leading-relaxed">{v.note}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Show more / less toggle */}
                {categoryVisits.length > INITIAL_SHOWN && (
                  <button
                    onClick={() => setShowAllVisits(!showAllVisits)}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-200",
                      opt.bgClass,
                      opt.colorClass,
                      "hover:opacity-80"
                    )}
                  >
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-300", showAllVisits && "rotate-180")} />
                    {showAllVisits
                      ? "Voir moins"
                      : `Voir les ${hiddenCount} autre${hiddenCount > 1 ? 's' : ''} visite${hiddenCount > 1 ? 's' : ''}`}
                  </button>
                )}
              </div>

              {/* Top places for this category */}
              {sortedPlaces.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-3 w-3" /> Lieux favoris
                  </h4>
                  <div className="space-y-2">
                    {sortedPlaces.slice(0, 8).map(([placeName, data], idx) => {
                      const barWidth = Math.max(8, Math.round((data.count / (sortedPlaces[0]?.[1]?.count || 1)) * 100));
                      return (
                        <div key={placeName} className="flex items-center gap-3">
                          <span className={cn("text-[9px] font-black w-4 shrink-0 text-right", opt.colorClass)}>#{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-bold truncate">{placeName}</span>
                              <span className={cn("text-xs font-black ml-2 shrink-0", opt.colorClass)}>{data.count}×</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all duration-700", opt.barBgClass)}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <p className="text-[9px] text-muted-foreground mt-0.5">
                              Dernière visite : {getDayName(data.lastDate)} {new Date(data.lastDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    );
  };

  const StatsDashboard = () => {
    const [historyOpen, setHistoryOpen] = useState(false);


    useEffect(() => {
      if (!historyOpen) return;

      const total = stats.total;
      const cafeCount = stats.byCategory['Café'] || 0;
      const restauCount = stats.byCategory['Restaurant'] || 0;
      const brunchCount = stats.byCategory['Brunch'] || 0;

      let delay = 200;

      if (total > 0 && total % 100 === 0) {
        setTimeout(() => {
          triggerFireworks();
          toast({
            title: "🎉 Palier historique atteint !",
            description: `Incroyable ! Vous avez visité ${total} lieux au total !`,
            className: "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-bold border-none",
          });
        }, delay);
        delay += 2500;
      }

      if (cafeCount > 0 && cafeCount % 50 === 0) {
        setTimeout(() => {
          triggerCategoryAnimation(['☕', '🥐', '🍪', '🍩', '🥤', '🍰']);
          toast({
            title: "☕ Palier Café atteint !",
            description: `Vous avez atteint ${cafeCount} cafés visités !`,
            className: "bg-amber-100 dark:bg-amber-900 border border-amber-500 text-amber-900 dark:text-amber-100 font-semibold",
          });
        }, delay);
        delay += 2500;
      }

      if (restauCount > 0 && restauCount % 50 === 0) {
        setTimeout(() => {
          triggerCategoryAnimation(['🍕', '🍔', '🍟', '🍝', '🌮', '🥗', '🍣', '🍜', '🍽️', '🍗']);
          toast({
            title: "🍕 Palier Restaurant atteint !",
            description: `Vous avez atteint ${restauCount} restaurants visités !`,
            className: "bg-red-100 dark:bg-red-900 border border-red-500 text-red-900 dark:text-red-100 font-semibold",
          });
        }, delay);
        delay += 2500;
      }

      if (brunchCount > 0 && brunchCount % 50 === 0) {
        setTimeout(() => {
          triggerCategoryAnimation(['🥞', '🍳', '🧇', '🥓', '🥑', '🍞', '☕', '🍓', '🍊']);
          toast({
            title: "🥞 Palier Brunch atteint !",
            description: `Vous avez atteint ${brunchCount} brunchs visités !`,
            className: "bg-yellow-100 dark:bg-yellow-900 border border-yellow-500 text-yellow-900 dark:text-yellow-100 font-semibold",
          });
        }, delay);
      }
    }, [historyOpen]);

    const totalHasMilestone = stats.total > 0 && stats.total % 100 === 0;

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
          <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
            <DialogTrigger asChild>
              <Card className={cn(
                "bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 border-primary/20 group hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer relative overflow-hidden",
                totalHasMilestone && "border-primary/60 shadow-lg shadow-primary/20"
              )}>
                <CardContent className="p-4 flex flex-col items-center justify-center text-center relative">
                  {totalHasMilestone && (
                    <span className="absolute top-1 right-1 text-xs animate-bounce">🎉</span>
                  )}
                  <div className="absolute -right-2 -bottom-2 opacity-10 pointer-events-none group-hover:scale-110 transition-transform duration-300">
                    <History className="h-12 w-12 text-primary" />
                  </div>
                  <span className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">{stats.total}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-1">Total</span>
                  {userProfile?.visits?.some(v => (v as any).source === 'momenty') && (
                    <span className="inline-flex items-center gap-0.5 text-[8px] text-pink-600 dark:text-pink-400 font-extrabold bg-pink-100/90 dark:bg-pink-950/60 px-1.5 py-0.5 rounded-full mt-1.5 shadow-xs">
                      <Sparkles className="h-2 w-2" />
                      {userProfile.visits.filter(v => (v as any).source === 'momenty').length} Momenty
                    </span>
                  )}
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-lg sm:max-w-xl w-[95%] rounded-3xl max-h-[88vh] overflow-hidden grid grid-rows-[auto_1fr] p-0 border-none shadow-2xl">
              <div className="bg-gradient-to-br from-primary/15 via-primary/5 to-background p-5 sm:p-6 pb-4 relative overflow-hidden border-b">
                <div className="absolute right-[-10px] top-[-10px] opacity-10 rotate-12 pointer-events-none">
                  <History className="h-28 w-28 text-primary" />
                </div>
                <DialogHeader className="relative z-10 text-left">
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="bg-primary/10 p-2 rounded-xl text-primary backdrop-blur-md">
                      <History className="h-5 w-5" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl sm:text-2xl font-black font-headline tracking-tight text-foreground">
                        Historique Complet
                      </DialogTitle>
                    </div>
                  </div>
                  <DialogDescription className="text-muted-foreground text-xs sm:text-sm font-medium">
                    Toutes vos sorties enregistrées avec filtres rapides, Momenty et recherche instantanée.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="p-4 sm:p-5 pt-3 overflow-hidden">
                <GlobalHistoryList />
              </div>
            </DialogContent>
          </Dialog>

          {/* Location Dialog */}
          <ZoneExplorationDialog />

          {outingOptions.slice(0, 4).map(opt => {
            const count = stats.byCategory[opt.label] || 0;
            const hasMilestone = count > 0 && count % 50 === 0;

            // Get all visits for this category, sorted by date desc
            const categoryVisits = (userProfile?.visits || [])
              .filter((v: VisitLog) => v.category === opt.label)
              .sort((a: VisitLog, b: VisitLog) => b.date - a.date);

            // Group by place with visit count and last date
            const placeMap: Record<string, { count: number; lastDate: number; dates: number[]; orderedItems: string[] }> = {};
            categoryVisits.forEach((v: VisitLog) => {
              if (!placeMap[v.placeName]) {
                placeMap[v.placeName] = { count: 0, lastDate: v.date, dates: [], orderedItems: [] };
              }
              placeMap[v.placeName].count++;
              placeMap[v.placeName].dates.push(v.date);
              if (v.orderedItem) placeMap[v.placeName].orderedItems.push(v.orderedItem);
              if (v.date > placeMap[v.placeName].lastDate) placeMap[v.placeName].lastDate = v.date;
            });
            const sortedPlaces = Object.entries(placeMap).sort((a, b) => b[1].count - a[1].count);

            return (
              <Dialog key={opt.id}>
                <DialogTrigger asChild>
                  <Card
                    className={cn(
                      "transition-all duration-300 border group cursor-pointer",
                      hasMilestone ? "border-primary/40 animate-pulse shadow-md shadow-primary/5" : "",
                      opt.bgClass,
                      opt.hoverClass,
                      "hover:shadow-md hover:-translate-y-1"
                    )}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center relative">
                      {hasMilestone && (
                        <span className="absolute top-1 right-1 text-xs animate-bounce">🎉</span>
                      )}
                      <opt.icon className={cn("h-6 w-6 mb-2 group-hover:scale-110 transition-transform duration-300", opt.colorClass)} />
                      <span className={cn("text-xl font-bold", opt.colorClass)}>{count}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{opt.label}s</span>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                <DialogContent className="max-w-md w-[95%] rounded-2xl max-h-[85vh] overflow-hidden grid grid-rows-[auto_1fr] p-0 border-none shadow-2xl">
                  {/* Header gradient */}
                  <div className={cn("p-6 pb-10 relative overflow-hidden", opt.bgClass)}>
                    <div className="absolute right-[-16px] top-[-16px] opacity-10 rotate-12">
                      <opt.icon className="h-32 w-32" />
                    </div>
                    <DialogHeader className="relative z-10">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="bg-white/60 p-2 rounded-xl backdrop-blur-md">
                          <opt.icon className={cn("h-5 w-5", opt.colorClass)} />
                        </div>
                        <DialogTitle className={cn("text-2xl font-black font-headline tracking-tight", opt.colorClass)}>
                          {opt.label}s
                        </DialogTitle>
                      </div>
                      <DialogDescription className="text-muted-foreground font-medium">
                        <span className="font-black text-foreground">{count}</span> sortie{count > 1 ? 's' : ''} · {sortedPlaces.length} lieu{sortedPlaces.length > 1 ? 'x' : ''} visité{sortedPlaces.length > 1 ? 's' : ''}
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <CategoryDialogContent
                    opt={opt}
                    categoryVisits={categoryVisits}
                    sortedPlaces={sortedPlaces}
                    count={count}
                  />
                </DialogContent>
              </Dialog>
            );
          })}
        </div>

        {/* Full-width Kharjet & Outings Widget */}
        {(() => {
          const kharjetOpt = outingOptions.find(o => o.id === 'kharjet') || outingOptions[4];
          const kharjetVisits = (userProfile?.visits || [])
            .filter((v: VisitLog) => v.category === 'Kharjet' || v.category === 'Balade')
            .sort((a: VisitLog, b: VisitLog) => b.date - a.date);
          const count = kharjetVisits.length;

          // Group by place
          const placeMap: Record<string, { count: number; lastDate: number; dates: number[]; orderedItems: string[] }> = {};
          const tagCounts: Record<string, number> = {};

          kharjetVisits.forEach((v: VisitLog) => {
            if (!placeMap[v.placeName]) {
              placeMap[v.placeName] = { count: 0, lastDate: v.date, dates: [], orderedItems: [] };
            }
            placeMap[v.placeName].count++;
            placeMap[v.placeName].dates.push(v.date);
            if (v.orderedItem) placeMap[v.placeName].orderedItems.push(v.orderedItem);
            if (v.date > placeMap[v.placeName].lastDate) placeMap[v.placeName].lastDate = v.date;

            const rawTags = (v.orderedItem || '').split(',').map(s => s.trim()).filter(Boolean);
            if (rawTags.length > 0) {
              rawTags.forEach(tag => {
                const cleanTag = tag.trim();
                tagCounts[cleanTag] = (tagCounts[cleanTag] || 0) + 1;
              });
            } else {
              const placeData = combinedPlaces.find(p => p.name.toLowerCase() === v.placeName.toLowerCase());
              if (placeData && placeData.specialties && placeData.specialties.length > 0) {
                placeData.specialties.forEach((spec: string) => {
                  tagCounts[spec] = (tagCounts[spec] || 0) + 1;
                });
              }
            }
          });

          const sortedPlaces = Object.entries(placeMap).sort((a, b) => b[1].count - a[1].count);
          const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

          return (
            <Dialog>
              <DialogTrigger asChild>
                <Card className="w-full relative overflow-hidden border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-background hover:border-emerald-500/45 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 cursor-pointer group">
                  <div className="absolute right-[-12px] top-[-12px] opacity-10 group-hover:opacity-15 transition-opacity duration-300 pointer-events-none rotate-12">
                    <Compass className="h-32 w-32 text-emerald-600" />
                  </div>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 shadow-xs">
                          <Compass className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-bold font-headline text-foreground group-hover:text-emerald-600 transition-colors">
                              Kharjet
                            </h3>
                            <TypedBadge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 px-2 py-0.2">
                              Non-food & activités
                            </TypedBadge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Baignades, soirées, glaces, parcs & loisirs
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 self-start sm:self-center">
                        <div className="text-left sm:text-right">
                          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                            {count}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium block">
                            sortie{count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    {/* Comptabilisation par tags en petit */}
                    {sortedTags.length > 0 ? (
                      <div className="pt-2.5 border-t border-emerald-500/15">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Sparkles className="h-3 w-3 text-emerald-500" /> Répartition par tags
                          </span>
                          <span className="text-[10px] text-muted-foreground font-semibold">
                            {sortedPlaces.length} spot{sortedPlaces.length > 1 ? 's' : ''} visité{sortedPlaces.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {sortedTags.map(([tag, tagCount]) => {
                            const tagEmoji = getDishEmoji(tag.toLowerCase());
                            return (
                              <span
                                key={tag}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-100 text-xs font-medium"
                              >
                                <span className="text-sm">{tagEmoji !== '🍽️' ? tagEmoji : '✨'}</span>
                                <span className="truncate max-w-[130px] font-semibold">{tag}</span>
                                <span className="h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                                  {tagCount}
                                </span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-2.5 border-t border-emerald-500/15 flex items-center justify-between text-xs text-muted-foreground">
                        <span className="italic">Aucune sortie Kharjet enregistrée pour le moment.</span>
                        <span className="text-[11px] font-bold text-emerald-600">Ajouter une sortie +</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-md w-[95%] rounded-2xl max-h-[85vh] overflow-hidden grid grid-rows-[auto_1fr] p-0 border-none shadow-2xl">
                <div className="p-6 pb-10 relative overflow-hidden bg-emerald-50 dark:bg-emerald-950/40">
                  <div className="absolute right-[-16px] top-[-16px] opacity-10 rotate-12">
                    <Compass className="h-32 w-32 text-emerald-600" />
                  </div>
                  <DialogHeader className="relative z-10">
                    <div className="flex items-center gap-3 mb-1">
                      <div className="bg-white/60 dark:bg-black/30 p-2 rounded-xl backdrop-blur-md">
                        <Compass className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <DialogTitle className="text-2xl font-black font-headline tracking-tight text-emerald-700 dark:text-emerald-300">
                        Kharjet
                      </DialogTitle>
                    </div>
                    <DialogDescription className="text-muted-foreground font-medium">
                      <span className="font-black text-foreground">{count}</span> sortie{count > 1 ? 's' : ''} · {sortedPlaces.length} lieu{sortedPlaces.length > 1 ? 'x' : ''} visité{sortedPlaces.length > 1 ? 's' : ''}
                    </DialogDescription>
                  </DialogHeader>
                </div>

                <CategoryDialogContent
                  opt={kharjetOpt}
                  categoryVisits={kharjetVisits}
                  sortedPlaces={sortedPlaces}
                  count={count}
                />
              </DialogContent>
            </Dialog>
          );
        })()}

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
                              <p className="font-medium text-base sm:text-lg font-headline tracking-tight group-hover:text-primary transition-colors duration-300 leading-tight break-words">
                                {name}
                                <span className="text-xs text-blue-600 ml-1 sm:ml-2 font-normal whitespace-nowrap">
                                  {data.zone || ''}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground font-medium mt-0.5">{data.category}</p>
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
        {(stats.weekendHQ || stats.passportStats.length > 0 || stats.frequencyStats.length > 0) && (
          <div className="space-y-4 animate-in slide-in-from-bottom-5 duration-500 delay-150 mt-4">
            {stats.frequencyStats.length > 0 && (
              <HabitFrequency
                frequencies={stats.frequencyStats}
                heatmap={stats.heatmap}
                monthlyHeatmap={stats.monthlyHeatmap}
                yearlyHeatmap={stats.yearlyHeatmap}
                visits={userProfile?.visits || []}
                selectedYear={selectedYear}
                onYearChange={setSelectedYear}
              />
            )}

            {(stats.weekendHQ || stats.passportStats.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.weekendHQ && <WeekendHQCard hq={stats.weekendHQ} />}
                {stats.passportStats.length > 0 && <CulinaryPassport stats={stats.passportStats} />}
              </div>
            )}
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
      <div className="space-y-4 animate-in fade-in-50">
        <div className="flex items-center gap-4 max-w-2xl mx-auto">
          <Button variant="outline" size="icon" onClick={() => setView('search')}>
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Retour</span>
          </Button>
          <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight">Mes Statistiques Sorties</h2>
            <p className="text-muted-foreground text-sm">Visualise tes pépites préférées et tes habitudes de sortie.</p>
          </div>
        </div>
        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-3 sm:p-6">
            <StatsDashboard />
          </CardContent>
        </Card>
      </div>
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

  const seasonalBg = getSeasonalBackground();

  const userName = user?.displayName || userProfile?.email?.split('@')[0] || '';
  const firstName = userName ? userName.split(/[\s._-]/)[0] : '';
  const capitalizedName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : '';

  const getSeasonalEmoji = () => {
    const month = new Date().getMonth();
    if (month === 11 || month === 0 || month === 1) return "❄️";
    if (month >= 2 && month <= 4) return "🌸";
    if (month >= 5 && month <= 7) return "☀️";
    return "🍂";
  };

  const isFemale = userProfile?.gender === 'Femme';
  const hesitatingWord = isFemale ? "Hésitante" : "Hésitant";
  const seasonalEmoji = getSeasonalEmoji();

  const subtitleText = capitalizedName
    ? `${hesitatingWord}, ${capitalizedName} ? Laisse-moi choisir ta sortie du jour ${seasonalEmoji}`
    : `${hesitatingWord} ? Laisse-moi choisir ta sortie du jour ${seasonalEmoji}`;

  return (
    <div className="space-y-4">
      <div className="animate-in fade-in-50 duration-500">
        <h2 className={cn(
          "text-3xl font-extrabold font-headline tracking-tight bg-clip-text text-transparent bg-gradient-to-r",
          seasonalBg.titleGradient
        )}>
          Décide pour moi !
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base mt-1 font-medium">
          {subtitleText}
        </p>
      </div>

      <Card className={`relative overflow-hidden border ${seasonalBg.borderColor} shadow-lg max-w-2xl mx-auto animate-in fade-in-50`}>
        {/* Cinematic Tunisian Seasonal Outing Background with Dynamic Fade Overlay */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-75 transform scale-105 transition-all duration-1000 ease-in-out"
            style={{ backgroundImage: `url('${seasonalBg.url}')` }}
          />
          {/* Soft card linear gradient to fade and blend into the active light/dark theme */}
          <div className="absolute inset-0 bg-gradient-to-b from-card/85 via-card/15 to-card/90" />
        </div>

        <CardHeader className="relative z-10 text-center pb-3 pt-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2 backdrop-blur-sm animate-pulse mx-auto">
            <span>Ambiance : {seasonalBg.label}</span>
          </div>
          <CardTitle className="font-headline text-2xl mb-1">Quelle est votre envie ?</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10 space-y-3 pb-4">
          <Collapsible className="space-y-2">
            <div className="flex flex-wrap justify-center items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="default" className="h-10 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-md border-0">
                  <Filter className="mr-2 h-4 w-4 text-white" />
                  <span className="hidden sm:inline font-medium">{getFilterButtonText()}</span>
                  <span className="sm:hidden font-medium">Zones</span>
                </Button>
              </CollapsibleTrigger>

              <Select value={searchQuery} onValueChange={setSearchQuery}>
                <SelectTrigger className="w-[180px] sm:w-[220px] h-10 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md border-0 transition-all font-medium data-[state=open]:ring-2 data-[state=open]:ring-orange-400">
                  <SelectValue placeholder="Spécialité ?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Toutes spécialités</SelectItem>
                  {AVAILABLE_SPECIALTIES.map(s => (
                    <SelectItem key={s.label} value={s.label}>
                      {s.emoji} {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="default" className="h-10 sm:gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-md border-0" onClick={() => setView('stats')}>
                <BarChart3 className="h-4 w-4 text-white" />
                <span className="hidden sm:inline font-medium">Mes Stats</span>
              </Button>

              {selectedZones.length > 0 && (
                <Button variant="ghost" size="icon" className="h-10 w-10 text-red-500 hover:bg-red-500/20 hover:text-red-600 transition-colors" onClick={handleClearZones}>
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>
            
            <CollapsibleContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto p-2 border rounded-md bg-card/65 backdrop-blur-md">
                {generalZones.map((zone: string) => (
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
            {outingOptions.filter(o => o.id !== 'cinema').map((option: (typeof outingOptions)[0]) => {
              const Icon = option.icon;
              
              // Map categories to high-end frosted glass variants of their respective accent colors
              let glassBg = "bg-primary/5 hover:bg-primary/10 border-primary/20";
              let textColor = option.colorClass;
              
              switch (option.id) {
                case 'fast-food':
                  glassBg = "bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20 hover:border-orange-500/30";
                  textColor = "text-orange-600 dark:text-orange-400";
                  break;
                case 'cafe':
                  glassBg = "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 hover:border-amber-500/30";
                  textColor = "text-amber-600 dark:text-amber-400";
                  break;
                case 'brunch':
                  glassBg = "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/20 hover:border-yellow-500/30";
                  textColor = "text-yellow-600 dark:text-yellow-400";
                  break;
                case 'restaurant':
                  glassBg = "bg-red-500/10 hover:bg-red-500/20 border-red-500/20 hover:border-red-500/30";
                  textColor = "text-red-600 dark:text-red-400";
                  break;
                case 'kharjet':
                case 'balade':
                  glassBg = "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/30";
                  textColor = "text-emerald-600 dark:text-emerald-400";
                  break;
                case 'shopping':
                  glassBg = "bg-pink-500/10 hover:bg-pink-500/20 border-pink-500/20 hover:border-pink-500/30";
                  textColor = "text-pink-600 dark:text-pink-400";
                  break;
              }

              return (
                <div
                  key={option.id}
                  onClick={() => handleCategorySelect(option)}
                  className={cn(
                    "group flex flex-col items-center justify-center rounded-2xl border-2 p-5 text-card-foreground shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer space-y-2 backdrop-blur-md",
                    glassBg
                  )}
                >
                  <Icon className={cn("h-8 w-8 mb-1 transition-transform duration-300 group-hover:scale-110", textColor)} />
                  <h3 className={cn("text-md font-bold transition-colors duration-300", textColor)}>{option.label}</h3>
                  <p className="text-xs text-center text-muted-foreground/90 font-medium">{option.description}</p>
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
    </div>
  );
}
