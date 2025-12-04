
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { addPlace, deletePlace, PlaceItem } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, UserSquare, UploadCloud, MapPin, Plus, Trash2, Edit2, Save, X, Database, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  age: z.coerce.number().min(13, { message: 'Vous devez avoir au moins 13 ans.' }).max(120, { message: 'Âge invalide.' }).optional().or(z.literal('')),
});

const COUNTRIES = [
  'France', 'États-Unis', 'Royaume-Uni', 'Allemagne', 'Italie', 'Espagne',
  'Japon', 'Corée du Sud', 'Canada', 'Australie', 'Inde', 'Chine',
  'Mexique', 'Brésil', 'Argentine', 'Russie', 'Suède', 'Norvège',
  'Danemark', 'Pays-Bas', 'Belgique', 'Suisse', 'Autriche', 'Pologne'
];

interface TfarrejSettings {
  preferredCountries: string[];
  preferredMinRating: number;
}

interface PlaceFormData {
  name: string;
  category: 'café' | 'restaurant' | 'fast-food' | 'bar' | 'parc' | 'musée' | 'cinéma' | 'théâtre' | 'autre';
  address?: string;
  description?: string;
  predefinedArea?: string;
}

interface DatabasePlace {
  zone: string;
  places: string[];
}

interface PlacesDatabase {
  cafes: DatabasePlace[];
  restaurants?: DatabasePlace[];
  fastFoods?: DatabasePlace[];
  brunch?: DatabasePlace[];
  bars?: DatabasePlace[];
}

const PLACE_CATEGORIES = [
  { value: 'café', label: 'Café' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'fast-food', label: 'Fast Food' },
  { value: 'bar', label: 'Bar' },
  { value: 'parc', label: 'Parc' },
  { value: 'musée', label: 'Musée' },
  { value: 'cinéma', label: 'Cinéma' },
  { value: 'théâtre', label: 'Théâtre' },
  { value: 'autre', label: 'Autre' },
];

const PREDEFINED_AREAS = [
  'Ain Zaghouan Nord',
  'Boumhal',
  'Carthage',
  'Centre-ville de Tunis',
  'El Aouina',
  'El Manar',
  'Ennasr',
  'Ezzahra',
  'Gammarth',
  'Hammamet',
  'Jardins de Carthage',
  'La Goulette/Kram',
  'La Marsa',
  'La Soukra',
  'Le Bardo',
  'Les Berges du Lac 1',
  'Les Berges du Lac 2',
  'Menzah 1',
  'Menzah 5',
  'Menzah 6',
  'Menzah 8',
  'Menzah 9',
  'Mutuelleville / Alain Savary',
  'Mégrine',
  'Nabeul'
];

const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const PhotoUploader = ({
  title,
  currentImageUrl,
  onImageUpload,
}: {
  title: string,
  currentImageUrl?: string,
  onImageUpload: (dataUri: string) => Promise<void>,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit for base64
        toast({
            variant: 'destructive',
            title: 'Fichier trop volumineux',
            description: 'Veuillez choisir une image de moins de 5 Mo.',
        });
        return;
      }
      setIsUploading(true);
      try {
        const dataUri = await fileToDataUri(file);
        setPreviewUrl(dataUri); // Show local preview immediately
        await onImageUpload(dataUri);
      } catch (error) {
         console.error(error);
         toast({ variant: 'destructive', title: 'Erreur de lecture', description: 'Impossible de traiter le fichier image.' });
         setPreviewUrl(currentImageUrl || null); // Revert preview on error
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/png, image/jpeg"
      />
      <div
        className="relative w-full aspect-[3/4] rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-center p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {previewUrl ? (
          <Image src={previewUrl} alt={title} fill className="object-cover rounded-md" />
        ) : (
          <div className="text-muted-foreground">
            <UploadCloud className="h-10 w-10 mx-auto mb-2" />
            <p className="font-semibold">Cliquez pour téléverser</p>
            <p className="text-xs">PNG, JPG (max 5Mo)</p>
          </div>
        )}
      </div>
    </div>
  );
};


export default function SettingsPage() {
  const { user, userProfile, updateUserProfile: updateProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'tfarrej' | 'khrouj'>('profile');
  const [tfarrejSettings, setTfarrejSettings] = useState<TfarrejSettings>({
    preferredCountries: [],
    preferredMinRating: 6
  });
  const [isTfarrejLoading, setIsTfarrejLoading] = useState(false);
  const [newPlace, setNewPlace] = useState<PlaceFormData>({
    name: '',
    category: 'café',
    address: '',
    description: '',
    predefinedArea: ''
  });
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [databaseMode, setDatabaseMode] = useState(false);
  const [placesDatabase, setPlacesDatabase] = useState<PlacesDatabase | null>(null);
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editedPlaces, setEditedPlaces] = useState<string[]>([]);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [selectedZone, setSelectedZone] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('cafes');

  // Charger la base de données des lieux
  const loadPlacesDatabase = async () => {
    setIsLoadingDatabase(true);
    try {
      const response = await fetch('/api/places-database-firestore');
      const data = await response.json();
      
      if (data.success) {
        setPlacesDatabase(data.data);
        toast({
          title: 'Base de données chargée',
          description: 'Les lieux ont été chargés avec succès'
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: 'Impossible de charger la base de données'
        });
      }
    } catch (error) {
      console.error('Error loading places database:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors du chargement'
      });
    } finally {
      setIsLoadingDatabase(false);
    }
  };

  // Charger la base de données quand on active le mode base de données
  useEffect(() => {
    if (databaseMode && activeTab === 'khrouj') {
      loadPlacesDatabase();
    }
  }, [databaseMode, activeTab]);

  // Sélectionner automatiquement la première catégorie disponible quand la base de données est chargée
  useEffect(() => {
    if (placesDatabase && databaseMode) {
      // Vérifier si la catégorie actuelle existe et a des zones
      const currentCategoryData = placesDatabase[selectedCategory as keyof PlacesDatabase];
      const hasZones = Array.isArray(currentCategoryData) && currentCategoryData.length > 0;
      
      // Si la catégorie actuelle n'a pas de zones, sélectionner la première catégorie disponible
      if (!hasZones) {
        const availableCategories = ['cafes', 'restaurants', 'fastFoods', 'brunch', 'bars'];
        const firstAvailable = availableCategories.find(cat => {
          const data = placesDatabase[cat as keyof PlacesDatabase];
          return Array.isArray(data) && data.length > 0;
        });
        
        if (firstAvailable) {
          setSelectedCategory(firstAvailable);
        }
      }
    }
  }, [placesDatabase, databaseMode]);

  // Handlers pour la gestion de la base de données
  const handleUpdateZone = async (zone: string, places: string[], category: string) => {
    try {
      const response = await fetch('/api/places-database-firestore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          zone,
          places,
          category
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setEditingZone(null);
        setEditedPlaces([]);
        loadPlacesDatabase();
        toast({
          title: 'Zone mise à jour',
          description: `Les lieux de ${zone} (${category}) ont été mis à jour`
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: data.error || 'Impossible de mettre à jour la zone'
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Erreur lors de la mise à jour'
      });
    }
  };

  const handleAddPlaceToZone = (zone: string, category: string) => {
    if (!newPlaceName.trim()) return;
    
    const currentZone = placesDatabase?.[category as keyof PlacesDatabase]?.find((z: any) => z.zone === zone);
    const updatedPlaces = [...(currentZone?.places || []), newPlaceName.trim()];
    
    handleUpdateZone(zone, updatedPlaces, category);
    setNewPlaceName('');
  };

  const handleRemovePlaceFromZone = (zone: string, placeToRemove: string, category: string) => {
    const currentZone = placesDatabase?.[category as keyof PlacesDatabase]?.find((z: any) => z.zone === zone);
    const updatedPlaces = (currentZone?.places || []).filter((p: string) => p !== placeToRemove);
    
    handleUpdateZone(zone, updatedPlaces, category);
  };

  const handleStartEditingZone = (zone: string, category: string) => {
    const currentZone = placesDatabase?.[category as keyof PlacesDatabase]?.find((z: any) => z.zone === zone);
    setEditingZone(`${zone}-${category}`);
    setEditedPlaces(currentZone?.places || []);
  };

  const handleSaveZone = (zone: string, category: string) => {
    handleUpdateZone(zone, editedPlaces, category);
  };

  const handleAddPlaceToEditing = () => {
    if (!newPlaceName.trim()) return;
    setEditedPlaces([...editedPlaces, newPlaceName.trim()]);
    setNewPlaceName('');
  };

  const handleRemovePlaceFromEditing = (placeToRemove: string) => {
    setEditedPlaces(editedPlaces.filter(p => p !== placeToRemove));
  };

  // Obtenir les zones pour la catégorie sélectionnée
  const getCurrentCategoryZones = () => {
    if (!placesDatabase) return [];
    const categoryData = placesDatabase[selectedCategory as keyof PlacesDatabase];
    return Array.isArray(categoryData) ? categoryData : [];
  };

  // Obtenir le nom d'affichage de la catégorie
  const getCategoryDisplayName = (category: string) => {
    const names: { [key: string]: string } = {
      'cafes': 'Cafés',
      'restaurants': 'Restaurants',
      'fastFoods': 'Fast Food',
      'brunch': 'Brunch',
      'bars': 'Bars'
    };
    return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  // Obtenir les statistiques pour la catégorie sélectionnée
  const getCurrentCategoryStats = () => {
    const zones = getCurrentCategoryZones();
    const totalPlaces = zones.reduce((acc, zone) => acc + zone.places.length, 0);
    const averagePerZone = zones.length > 0 ? Math.round(totalPlaces / zones.length) : 0;
    
    return { totalPlaces, zonesCount: zones.length, averagePerZone };
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: userProfile?.age || '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({ age: userProfile.age || '' });
      setTfarrejSettings({
        preferredCountries: userProfile.preferredCountries || [],
        preferredMinRating: userProfile.preferredMinRating || 6
      });
    }
  }, [userProfile, form]);

  const handleCountryChange = (country: string, checked: boolean) => {
    setTfarrejSettings(prev => ({
      ...prev,
      preferredCountries: checked
        ? [...prev.preferredCountries, country]
        : prev.preferredCountries.filter(c => c !== country)
    }));
  };

  const handleRatingChange = (value: number[]) => {
    setTfarrejSettings(prev => ({
      ...prev,
      preferredMinRating: value[0]
    }));
  };

  const handleSaveTfarrejSettings = async () => {
    if (!user) return;

    setIsTfarrejLoading(true);
    try {
      await updateProfile({
        preferredCountries: tfarrejSettings.preferredCountries,
        preferredMinRating: tfarrejSettings.preferredMinRating
      });

      toast({
        title: 'Paramètres sauvegardés',
        description: 'Vos préférences Tfarrej ont été mises à jour'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres'
      });
    } finally {
      setIsTfarrejLoading(false);
    }
  };

  const handleAddPlace = async () => {
    if (!user || !newPlace.name.trim()) return;

    setIsAddingPlace(true);
    try {
      await addPlace(user.uid, {
        name: newPlace.name.trim(),
        category: newPlace.category,
        address: newPlace.address?.trim(),
        description: newPlace.description?.trim(),
        predefinedArea: newPlace.predefinedArea
      });

      setNewPlace({
        name: '',
        category: 'café',
        address: '',
        description: '',
        predefinedArea: ''
      });

      toast({
        title: 'Lieu ajouté',
        description: `${newPlace.name} a été ajouté à vos lieux`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'ajouter le lieu'
      });
    } finally {
      setIsAddingPlace(false);
    }
  };

  const handleDeletePlace = async (place: PlaceItem) => {
    if (!user) return;

    try {
      await deletePlace(user.uid, place);
      toast({
        title: 'Lieu supprimé',
        description: `${place.name} a été supprimé`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer le lieu'
      });
    }
  };

  const handleImageUpload = async (dataUri: string, type: 'fullBody' | 'closeup') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non connecté.' });
      return;
    }
    try {
      const fieldToUpdate = type === 'fullBody' ? 'fullBodyPhotoUrl' : 'closeupPhotoUrl';
      await updateUserProfile(user.uid, { [fieldToUpdate]: dataUri }, true); // Pass true to force local-only update for this
      toast({ title: 'Photo mise à jour !', description: 'Votre nouvelle photo a été enregistrée localement.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur de sauvegarde', description: 'Impossible de sauvegarder votre photo.' });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non connecté.' });
        return;
    }
    
    setIsLoading(true);
    try {
      const ageValue = values.age === '' ? undefined : Number(values.age);
      // We only send the age to Firestore, photos are handled locally
      await updateUserProfile(user.uid, { age: ageValue });
      toast({
        title: 'Profil mis à jour !',
        description: 'Vos informations ont été enregistrées avec succès.',
      });
      form.reset({age: ageValue}, { keepValues: true }); // Reset dirty state
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de sauvegarder vos informations.' });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Paramètres</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b">
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'profile'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          Profil
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'tfarrej'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('tfarrej')}
        >
          Tfarrej
        </button>
        <button
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'khrouj'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('khrouj')}
        >
          Khrouj
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight">Paramètres du Profil</h2>
            <p className="text-muted-foreground">
              Gérez vos informations pour une expérience sur mesure.
            </p>
          </div>

          <Card>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                  <CardTitle>Vos informations</CardTitle>
                  <CardDescription>
                    Ces informations nous aident à personnaliser les suggestions pour vous.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col space-y-2">
                    <FormLabel>Sexe</FormLabel>
                    <div className="flex items-center gap-2">
                        {userProfile?.gender === 'Femme' ? <User className="h-5 w-5 text-primary" /> : <UserSquare className="h-5 w-5 text-primary" />}
                        <Badge variant="outline">{userProfile?.gender || 'Non défini'}</Badge>
                    </div>
                     <p className="text-xs text-muted-foreground">
                        Ce choix a été fait lors de votre première connexion.
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Âge</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Ex: 28" {...field} className="max-w-xs" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Enregistrer les modifications
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
          
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Vos photos</CardTitle>
              <CardDescription>
                Ces photos sont utilisées pour la génération d'images dans StyleK.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <PhotoUploader 
                  title="Photo en pied" 
                  currentImageUrl={userProfile?.fullBodyPhotoUrl}
                  onImageUpload={(dataUri) => handleImageUpload(dataUri, 'fullBody')}
                />
                <PhotoUploader 
                  title="Photo de près"
                  currentImageUrl={userProfile?.closeupPhotoUrl}
                  onImageUpload={(dataUri) => handleImageUpload(dataUri, 'closeup')}
                />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'tfarrej' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtres de films</CardTitle>
              <CardDescription>
                Personnalisez vos suggestions de films selon vos préférences.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Pays préférés */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Pays préférés
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {COUNTRIES.map((country) => (
                    <div key={country} className="flex items-center space-x-2">
                      <Checkbox
                        id={country}
                        checked={tfarrejSettings.preferredCountries.includes(country)}
                        onCheckedChange={(checked) =>
                          handleCountryChange(country, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={country}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {country}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note minimale */}
              <div>
                <Label className="text-base font-medium mb-3 block">
                  Note minimale: {tfarrejSettings.preferredMinRating}/10
                </Label>
                <Slider
                  value={[tfarrejSettings.preferredMinRating]}
                  onValueChange={handleRatingChange}
                  min={0}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>5</span>
                  <span>10</span>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleSaveTfarrejSettings} disabled={isTfarrejLoading}>
                  {isTfarrejLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setTfarrejSettings({
                    preferredCountries: [],
                    preferredMinRating: 6
                  })}
                >
                  Réinitialiser
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'khrouj' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Base de données des lieux</CardTitle>
              <CardDescription>
                Gérez les cafés, restaurants et autres lieux du système IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Gestion de la base de données
                  </h3>
                  <p className="text-sm text-muted-foreground">Administrez tous les lieux du système IA</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadPlacesDatabase}
                    disabled={isLoadingDatabase}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingDatabase ? 'animate-spin' : ''}`} />
                    Actualiser
                  </Button>
                  <Button
                    variant={databaseMode ? "destructive" : "default"}
                    onClick={() => setDatabaseMode(!databaseMode)}
                  >
                    {databaseMode ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Quitter le mode BD
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Mode base de données
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {databaseMode && (
                <div className="space-y-6">
                  {isLoadingDatabase && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>Chargement de la base de données...</span>
                    </div>
                  )}

                  {placesDatabase && (
                    <>
                      {/* Sélecteur de catégorie */}
                      <div className="mb-6">
                        <h4 className="text-base font-medium mb-3">Sélectionner une catégorie</h4>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="w-full md:w-64">
                            <SelectValue placeholder="Choisir une catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {placesDatabase ? (
                              <>
                                <SelectItem value="cafes">
                                  Cafés ({placesDatabase.cafes?.length || 0} zones)
                                </SelectItem>
                                <SelectItem value="restaurants">
                                  Restaurants ({placesDatabase.restaurants?.length || 0} zones)
                                </SelectItem>
                                <SelectItem value="fastFoods">
                                  Fast Food ({placesDatabase.fastFoods?.length || 0} zones)
                                </SelectItem>
                                {placesDatabase.brunch && (
                                  <SelectItem value="brunch">
                                    Brunch ({placesDatabase.brunch.length} zones)
                                  </SelectItem>
                                )}
                                {placesDatabase.bars && (
                                  <SelectItem value="bars">
                                    Bars ({placesDatabase.bars.length} zones)
                                  </SelectItem>
                                )}
                              </>
                            ) : (
                              <SelectItem value="cafes" disabled>
                                Chargement...
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Statistiques */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-blue-600 font-medium">
                                  Total {getCategoryDisplayName(selectedCategory)}
                                </p>
                                <p className="text-2xl font-bold text-blue-900">
                                  {getCurrentCategoryStats().totalPlaces}
                                </p>
                              </div>
                              <MapPin className="h-8 w-8 text-blue-500" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-green-600 font-medium">Zones couvertes</p>
                                <p className="text-2xl font-bold text-green-900">
                                  {getCurrentCategoryStats().zonesCount}
                                </p>
                              </div>
                              <Database className="h-8 w-8 text-green-500" />
                            </div>
                          </CardContent>
                        </Card>
                        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm text-purple-600 font-medium">Moyenne/Zone</p>
                                <p className="text-2xl font-bold text-purple-900">
                                  {getCurrentCategoryStats().averagePerZone}
                                </p>
                              </div>
                              <Plus className="h-8 w-8 text-purple-500" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Gestion par zone */}
                      <div className="space-y-4">
                        <h4 className="text-base font-medium">Gestion des lieux par zone - {getCategoryDisplayName(selectedCategory)}</h4>
                        
                        {getCurrentCategoryZones().length === 0 ? (
                          <Card>
                            <CardContent className="p-6 text-center">
                              <p className="text-muted-foreground">
                                Aucune zone trouvée pour la catégorie "{getCategoryDisplayName(selectedCategory)}".
                              </p>
                              <p className="text-sm text-muted-foreground mt-2">
                                Les zones seront affichées ici une fois qu'elles seront ajoutées à la base de données.
                              </p>
                            </CardContent>
                          </Card>
                        ) : (
                          getCurrentCategoryZones().map((zoneData) => (
                          <Card key={zoneData.zone} className="overflow-hidden">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium">{zoneData.zone}</h5>
                                  <Badge variant="secondary" className="text-xs">
                                    {zoneData.places.length} lieux
                                  </Badge>
                                </div>
                                <div className="flex gap-1">
                                  {editingZone === `${zoneData.zone}-${selectedCategory}` ? (
                                    <>
                                      <Button size="sm" onClick={() => handleSaveZone(zoneData.zone, selectedCategory)}>
                                        <Save className="h-3 w-3 mr-1" />
                                        Sauver
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setEditingZone(null)}>
                                        <X className="h-3 w-3 mr-1" />
                                        Annuler
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button size="sm" variant="ghost" onClick={() => handleStartEditingZone(zoneData.zone, selectedCategory)}>
                                        <Edit2 className="h-3 w-3 mr-1" />
                                        Modifier
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        onClick={() => {
                                          setSelectedZone(zoneData.zone);
                                          setNewPlaceName('');
                                        }}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Ajouter
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {editingZone === `${zoneData.zone}-${selectedCategory}` ? (
                                <div className="space-y-3">
                                  {/* Ajouter un lieu en mode édition */}
                                  <div className="flex gap-2">
                                    <Input
                                      placeholder="Nouveau lieu..."
                                      value={newPlaceName}
                                      onChange={(e) => setNewPlaceName(e.target.value)}
                                      onKeyPress={(e) => e.key === 'Enter' && handleAddPlaceToEditing()}
                                      className="flex-1"
                                    />
                                    <Button size="sm" onClick={handleAddPlaceToEditing} disabled={!newPlaceName.trim()}>
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  
                                  {/* Liste des lieux en édition */}
                                  <div className="space-y-1">
                                    {editedPlaces.map((place, index) => (
                                      <div key={index} className="flex items-center justify-between p-2 border rounded bg-muted/30">
                                        <span className="text-sm">{place}</span>
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          onClick={() => handleRemovePlaceFromEditing(place)}
                                          className="text-red-500 h-6 w-6 p-0"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    {editedPlaces.length === 0 && (
                                      <p className="text-sm text-muted-foreground text-center py-2">
                                        Aucun lieu dans cette zone
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  {/* Ajout rapide de lieu */}
                                  {selectedZone === zoneData.zone && (
                                    <div className="flex gap-2 p-2 border rounded bg-blue-50">
                                      <Input
                                        placeholder="Nom du nouveau lieu..."
                                        value={newPlaceName}
                                        onChange={(e) => setNewPlaceName(e.target.value)}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            handleAddPlaceToZone(zoneData.zone, selectedCategory);
                                            setSelectedZone('');
                                          }
                                        }}
                                        className="flex-1"
                                      />
                                      <Button 
                                        size="sm" 
                                        onClick={() => {
                                          handleAddPlaceToZone(zoneData.zone, selectedCategory);
                                          setSelectedZone('');
                                        }}
                                        disabled={!newPlaceName.trim()}
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Ajouter
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => setSelectedZone('')}>
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                  
                                  {/* Liste des lieux */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                    {zoneData.places.map((place, index) => (
                                      <div key={index} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50 group">
                                        <span className="text-sm truncate">{place}</span>
                                        <Button 
                                          size="sm" 
                                          variant="ghost" 
                                          onClick={() => handleRemovePlaceFromZone(zoneData.zone, place, selectedCategory)}
                                          className="text-red-500 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                  {zoneData.places.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                      Aucun lieu dans cette zone
                                    </p>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
