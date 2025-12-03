
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
import { Loader2, User, UserSquare, UploadCloud, MapPin, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db as firestoreDb } from '@/lib/firebase/client';

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

interface Category {
  id: string;
  name: string;
  value: string;
  createdAt: any;
}

interface AdminPlace {
  id: string;
  name: string;
  category: string;
  address?: string;
  description?: string;
  predefinedArea?: string;
  createdAt: any;
  userId?: string;
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
  const [adminMode, setAdminMode] = useState(false);
  const [allPlaces, setAllPlaces] = useState<AdminPlace[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingPlace, setEditingPlace] = useState<string | null>(null);
  const [editedPlace, setEditedPlace] = useState<AdminPlace | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Charger toutes les données admin
  const loadAdminData = async () => {
    setIsLoadingData(true);
    try {
      // Charger tous les lieux de tous les utilisateurs
      const usersSnapshot = await getDocs(collection(firestoreDb, 'users'));
      const places: AdminPlace[] = [];
      
      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();
        if (userData.places && Array.isArray(userData.places)) {
          userData.places.forEach((place: any) => {
            places.push({
              ...place,
              userId: userDoc.id
            });
          });
        }
      });
      
      setAllPlaces(places.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })));
      
      // Charger les catégories personnalisées (si collection existe)
      try {
        const categoriesSnapshot = await getDocs(collection(firestoreDb, 'categories'));
        const categoriesData: Category[] = [];
        categoriesSnapshot.forEach(catDoc => {
          const catData = catDoc.data();
          categoriesData.push({
            id: catDoc.id,
            name: catData.name,
            value: catData.value,
            createdAt: catData.createdAt
          });
        });
        setCategories(categoriesData);
      } catch (error) {
        console.log('Collection categories non existante ou vide');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les données admin'
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Charger les données admin quand on active le mode admin
  useEffect(() => {
    if (adminMode && activeTab === 'khrouj') {
      loadAdminData();
    }
  }, [adminMode, activeTab]);

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

  // Handlers admin pour les catégories
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const categoryValue = newCategoryName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const categoryRef = doc(collection(firestoreDb, 'categories'));
      await setDoc(categoryRef, {
        name: newCategoryName.trim(),
        value: categoryValue,
        createdAt: serverTimestamp()
      });

      setNewCategoryName('');
      loadAdminData();
      toast({
        title: 'Catégorie ajoutée',
        description: `${newCategoryName} a été ajoutée`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible d\'ajouter la catégorie'
      });
    }
  };

  const handleUpdateCategory = async (categoryId: string, newName: string) => {
    try {
      const categoryRef = doc(firestoreDb, 'categories', categoryId);
      await updateDoc(categoryRef, {
        name: newName.trim()
      });

      setEditingCategory(null);
      loadAdminData();
      toast({
        title: 'Catégorie modifiée',
        description: `La catégorie a été mise à jour`
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de modifier la catégorie'
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await deleteDoc(doc(firestoreDb, 'categories', categoryId));
      loadAdminData();
      toast({
        title: 'Catégorie supprimée',
        description: 'La catégorie a été supprimée'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de supprimer la catégorie'
      });
    }
  };

  // Handlers admin pour les lieux
  const handleUpdatePlace = async () => {
    if (!editedPlace || !editingPlace) return;

    try {
      const userRef = doc(firestoreDb, 'users', editedPlace.userId!);
      const userData = (await getDoc(userRef)).data();
      const places = userData.places || [];
      
      const updatedPlaces = places.map((place: any) => 
        place.id === editingPlace ? editedPlace : place
      );
      
      await updateDoc(userRef, { places: updatedPlaces });
      
      setEditingPlace(null);
      setEditedPlace(null);
      loadAdminData();
      toast({
        title: 'Lieu modifié',
        description: 'Le lieu a été mis à jour'
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de modifier le lieu'
      });
    }
  };

  const handleDeleteAdminPlace = async (place: AdminPlace) => {
    try {
      const userRef = doc(firestoreDb, 'users', place.userId!);
      const userData = (await getDoc(userRef)).data();
      const places = userData.places || [];
      
      const updatedPlaces = places.filter((p: any) => p.id !== place.id);
      
      await updateDoc(userRef, { places: updatedPlaces });
      
      loadAdminData();
      toast({
        title: 'Lieu supprimé',
        description: `${place.name} a été supprimé de la base de données`
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
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mes Lieux Khrouj
              </CardTitle>
              <CardDescription>
                Gérez vos lieux préférés pour vos sorties (cafés, restaurants, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formulaire d'ajout */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h3 className="text-sm font-medium">Ajouter un nouveau lieu</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="place-name" className="text-sm">Nom du lieu *</Label>
                    <Input
                      id="place-name"
                      placeholder="Ex: Café de la Paix"
                      value={newPlace.name}
                      onChange={(e) => setNewPlace(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="place-category" className="text-sm">Catégorie</Label>
                    <Select
                      value={newPlace.category}
                      onValueChange={(value: any) => setNewPlace(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {PLACE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="place-area" className="text-sm">Zone géographique</Label>
                    <Select
                      value={newPlace.predefinedArea}
                      onValueChange={(value) => setNewPlace(prev => ({ ...prev, predefinedArea: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir une zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_AREAS.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="place-address" className="text-sm">Adresse</Label>
                    <Input
                      id="place-address"
                      placeholder="123 Avenue Habib Bourguiba, Rades"
                      value={newPlace.address}
                      onChange={(e) => setNewPlace(prev => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="place-description" className="text-sm">Description</Label>
                    <Textarea
                      id="place-description"
                      placeholder="Description optionnelle du lieu..."
                      value={newPlace.description}
                      onChange={(e) => setNewPlace(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddPlace} 
                  disabled={!newPlace.name.trim() || isAddingPlace}
                  className="w-full md:w-auto"
                >
                  {isAddingPlace ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Ajout...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter le lieu
                    </>
                  )}
                </Button>
              </div>

              {/* Liste des lieux */}
              <div>
                <h3 className="text-sm font-medium mb-3">Mes lieux ({userProfile?.places?.length || 0})</h3>
                {userProfile?.places && userProfile.places.length > 0 ? (
                  <div className="space-y-2">
                    {userProfile.places
                      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))
                      .map((place) => (
                        <div key={place.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{place.name}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {PLACE_CATEGORIES.find(cat => cat.value === place.category)?.label || place.category}
                              </Badge>
                              {place.predefinedArea && (
                                <Badge variant="outline" className="text-xs">
                                  📍 {place.predefinedArea}
                                </Badge>
                              )}
                            </div>
                            {place.address && (
                              <p className="text-sm text-muted-foreground mb-1">
                                📍 {place.address}
                              </p>
                            )}
                            {place.description && (
                              <p className="text-sm text-muted-foreground">{place.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlace(place)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Vous n'avez pas encore ajouté de lieux.</p>
                    <p className="text-sm">Ajoutez vos cafés, restaurants et autres lieux préférés !</p>
                  </div>
                )}
              </div>

              {/* Section Admin */}
              <div className="mt-8 pt-8 border-t">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium">Gestion des catégories et lieux</h3>
                    <p className="text-sm text-muted-foreground">Administrez toutes les catégories et lieux de la base de données</p>
                  </div>
                  <Button
                    variant={adminMode ? "destructive" : "default"}
                    onClick={() => setAdminMode(!adminMode)}
                  >
                    {adminMode ? (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Quitter le mode admin
                      </>
                    ) : (
                      <>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Mode admin
                      </>
                    )}
                  </Button>
                </div>

                {adminMode && (
                  <div className="space-y-6">
                    {isLoadingData && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Chargement des données...</span>
                      </div>
                    )}

                    {/* Gestion des catégories */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Catégories ({categories.length})</CardTitle>
                        <CardDescription>Gérez les catégories disponibles pour les lieux</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Ajouter une catégorie */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Nouvelle catégorie..."
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                          />
                          <Button onClick={handleAddCategory} disabled={!newCategoryName.trim()}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Liste des catégories */}
                        <div className="space-y-2">
                          {/* Catégories par défaut */}
                          {PLACE_CATEGORIES.map((cat) => (
                            <div key={cat.value} className="flex items-center justify-between p-2 border rounded bg-muted/30">
                              <span className="text-sm">{cat.label}</span>
                              <Badge variant="outline" className="text-xs">Par défaut</Badge>
                            </div>
                          ))}
                          
                          {/* Catégories personnalisées */}
                          {categories.map((category) => (
                            <div key={category.id} className="flex items-center justify-between p-2 border rounded">
                              {editingCategory === category.id ? (
                                <div className="flex gap-2 flex-1">
                                  <Input
                                    defaultValue={category.name}
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') {
                                        handleUpdateCategory(category.id, (e.target as HTMLInputElement).value);
                                      }
                                    }}
                                    className="flex-1"
                                  />
                                  <Button size="sm" onClick={() => handleUpdateCategory(category.id, (document.querySelector('input') as HTMLInputElement).value)}>
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingCategory(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <span className="text-sm">{category.name}</span>
                                  <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => setEditingCategory(category.id)}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteCategory(category.id)} className="text-red-500">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Gestion des lieux */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Tous les lieux ({allPlaces.length})</CardTitle>
                        <CardDescription>Tous les lieux ajoutés par les utilisateurs</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {allPlaces.length > 0 ? (
                          <div className="space-y-2">
                            {allPlaces.map((place) => (
                              <div key={place.id} className="flex items-start justify-between p-3 border rounded-lg">
                                {editingPlace === place.id ? (
                                  <div className="flex-1 space-y-2">
                                    <Input
                                      defaultValue={place.name}
                                      onChange={(e) => setEditedPlace(prev => prev ? {...prev, name: e.target.value} : null)}
                                      placeholder="Nom du lieu"
                                    />
                                    <Select
                                      defaultValue={place.category}
                                      onValueChange={(value) => setEditedPlace(prev => prev ? {...prev, category: value} : null)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {[...PLACE_CATEGORIES, ...categories.map(cat => ({value: cat.value, label: cat.name}))].map((cat) => (
                                          <SelectItem key={cat.value} value={cat.value}>
                                            {cat.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <Input
                                      defaultValue={place.address || ''}
                                      onChange={(e) => setEditedPlace(prev => prev ? {...prev, address: e.target.value} : null)}
                                      placeholder="Adresse"
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={handleUpdatePlace}>
                                        <Save className="h-3 w-3 mr-1" />
                                        Sauvegarder
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={() => {setEditingPlace(null); setEditedPlace(null);}}>
                                        Annuler
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-medium text-sm">{place.name}</h4>
                                        <Badge variant="secondary" className="text-xs">
                                          {[...PLACE_CATEGORIES, ...categories].find(cat => cat.value === place.category)?.label || place.category}
                                        </Badge>
                                      </div>
                                      {place.address && (
                                        <p className="text-xs text-muted-foreground">📍 {place.address}</p>
                                      )}
                                      {place.predefinedArea && (
                                        <p className="text-xs text-muted-foreground">🌍 {place.predefinedArea}</p>
                                      )}
                                    </div>
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" onClick={() => {setEditingPlace(place.id); setEditedPlace(place);}}>
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={() => handleDeleteAdminPlace(place)} className="text-red-500">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>Aucun lieu trouvé dans la base de données</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
