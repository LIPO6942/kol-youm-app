
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { uploadProfileImage } from '@/lib/firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, UserSquare, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  age: z.coerce.number().min(13, { message: 'Vous devez avoir au moins 13 ans.' }).max(120, { message: 'Âge invalide.' }).optional().or(z.literal('')),
});

const PhotoUploader = ({
  title,
  currentImageUrl,
  onImageUpload,
}: {
  title: string,
  currentImageUrl?: string,
  onImageUpload: (file: File) => Promise<void>,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentImageUrl || null);
  }, [currentImageUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      setPreviewUrl(URL.createObjectURL(file)); // Show local preview immediately
      try {
        await onImageUpload(file);
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-2">
      <FormLabel>{title}</FormLabel>
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
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      age: userProfile?.age || '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({ age: userProfile.age || '' });
    }
  }, [userProfile, form]);

  const handleImageUpload = async (file: File, type: 'fullBody' | 'closeup') => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Utilisateur non connecté.' });
      return;
    }
    try {
      const downloadURL = await uploadProfileImage(user.uid, file, type);
      const fieldToUpdate = type === 'fullBody' ? 'fullBodyPhotoUrl' : 'closeupPhotoUrl';
      await updateUserProfile(user.uid, { [fieldToUpdate]: downloadURL });
      toast({ title: 'Photo mise à jour !', description: 'Votre nouvelle photo a été enregistrée.' });
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur de téléversement', description: 'Impossible de sauvegarder votre photo.' });
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
            Ces photos seront utilisées pour les futures fonctionnalités d'essayage virtuel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <PhotoUploader 
              title="Photo en pied" 
              currentImageUrl={userProfile?.fullBodyPhotoUrl}
              onImageUpload={(file) => handleImageUpload(file, 'fullBody')}
            />
            <PhotoUploader 
              title="Photo de près"
              currentImageUrl={userProfile?.closeupPhotoUrl}
              onImageUpload={(file) => handleImageUpload(file, 'closeup')}
            />
        </CardContent>
      </Card>
    </div>
  );
}
