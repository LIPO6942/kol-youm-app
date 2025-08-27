
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, PlusCircle, X, Shirt, Milestone, Footprints, Gem, Upload, Camera, CameraOff } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { addWardrobeItem } from '@/lib/firebase/firestore';


const completeOutfitFormSchema = z.object({
  baseItemPhotoDataUri: z.string().min(1, { message: 'Veuillez importer ou prendre une photo.' }),
  baseItemType: z.enum(['haut', 'bas', 'chaussures', 'accessoires'], {
    required_error: 'Veuillez sélectionner le type de votre pièce.',
  }),
});


type CompleteOutfitFormValues = z.infer<typeof completeOutfitFormSchema>;

interface CompleteOutfitDialogProps {
  mainForm: UseFormReturn<any>;
  onCompleteOutfit: (values: any) => void;
  isGenerating: boolean;
}

const itemTypeOptions = [
  { value: 'haut', label: 'Haut', icon: Shirt },
  { value: 'bas', label: 'Bas', icon: Milestone },
  { value: 'chaussures', label: 'Chaussures', icon: Footprints },
  { value: 'accessoires', label: 'Accessoires', icon: Gem },
] as const;


export function CompleteOutfitDialog({ mainForm, onCompleteOutfit, isGenerating }: CompleteOutfitDialogProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [view, setView] = useState<'idle' | 'camera'>('idle');
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user, forceProfileRefresh } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const completeOutfitForm = useForm<CompleteOutfitFormValues>({
    resolver: zodResolver(completeOutfitFormSchema),
    defaultValues: { baseItemPhotoDataUri: '' }
  });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
  }, []);

  const resetFormAndState = useCallback(() => {
    completeOutfitForm.reset({ baseItemPhotoDataUri: '', baseItemType: undefined });
    setPreviewImage(null);
    setView('idle');
    stopCamera();
    setHasCameraPermission(null);
  }, [completeOutfitForm, stopCamera]);

  useEffect(() => {
    if (!isDialogOpen) {
        resetFormAndState();
    }
  }, [isDialogOpen, resetFormAndState]);

  const setupCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'environment' }
          });
          streamRef.current = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
          setHasCameraPermission(true);
      } catch (error) {
          console.error("Error accessing camera:", error);
          setHasCameraPermission(false);
          toast({
              variant: 'destructive',
              title: 'Accès Caméra Refusé',
              description: "Veuillez autoriser l'accès à la caméra dans les paramètres de votre navigateur.",
          });
          setView('idle');
      }
  };

  const handleCameraView = () => {
    setView('camera');
    setupCamera();
  }

  const uploadImage = async (file: File | Blob) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
    
    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error.message || 'Upload failed');
      }
      
      const { secure_url } = await response.json();
      setPreviewImage(secure_url);
      completeOutfitForm.setValue('baseItemPhotoDataUri', secure_url, { shouldValidate: true });

    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur de téléversement', description: (error as Error).message });
      resetPhoto();
    } finally {
      setIsUploading(false);
    }
  };


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast({
                variant: 'destructive',
                title: 'Fichier trop volumineux',
                description: 'Veuillez choisir une image de moins de 10 Mo.',
            });
            return;
        }
        await uploadImage(file);
    }
  };

  const handleCapturePhoto = async () => {
    if (videoRef.current) {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');

        if (context) {
            context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            canvas.toBlob(async (blob) => {
                if (blob) {
                    await uploadImage(blob);
                }
            }, 'image/jpeg', 0.95);
            stopCamera();
            setView('idle');
        }
    }
  };


  const handleCompleteOutfitSubmit = async (values: CompleteOutfitFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Non connecté", description: "Veuillez vous connecter." });
        return;
    }

    const mainFormValues = mainForm.getValues();
    const isMainFormValid = await mainForm.trigger();
    if (!isMainFormValid) {
        toast({
            variant: 'destructive',
            title: 'Champs manquants',
            description: "Veuillez remplir les informations de base (activité, météo, occasion) avant de compléter une tenue.",
        });
        setIsDialogOpen(false);
        return;
    }
    
    try {
        await addWardrobeItem(user.uid, {
            type: values.baseItemType,
            style: mainFormValues.occasion,
            photoDataUri: values.baseItemPhotoDataUri,
        });

        await forceProfileRefresh();
        
        toast({
            title: "Pièce ajoutée !",
            description: "Votre article a été sauvegardé dans votre garde-robe virtuelle.",
        });

        const completeOutfitInput = {
          ...mainFormValues,
          baseItemPhotoDataUri: values.baseItemPhotoDataUri,
          baseItemType: values.baseItemType,
        };
        onCompleteOutfit(completeOutfitInput);

    } catch (error) {
        console.error("Failed to save wardrobe item or generate outfit:", error);
        toast({
            variant: "destructive",
            title: "Erreur de Traitement",
            description: "Impossible de sauvegarder la photo ou de générer la tenue.",
        });
    }

    setIsDialogOpen(false);
  };
    
  const resetPhoto = () => {
      completeOutfitForm.setValue('baseItemPhotoDataUri', '');
      setPreviewImage(null);
      if (fileInputRef.current) {
          fileInputRef.current.value = '';
      }
      setView('idle');
  }

  const renderIdleView = () => (
    <div className="space-y-4">
      <Button variant="outline" className="w-full h-20" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
        <Upload className="mr-2" /> Importer une photo
      </Button>
      <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
      />
      <Button variant="outline" className="w-full h-20" onClick={handleCameraView} disabled={isUploading}>
        <Camera className="mr-2" /> Prendre une photo
      </Button>
    </div>
  );

  const renderCameraView = () => (
    <div className="space-y-4">
        <div className="relative aspect-square w-full rounded-md border bg-muted overflow-hidden">
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                    <CameraOff className="h-10 w-10 mb-4" />
                    <p className="font-bold">Accès caméra requis</p>
                    <p className="text-sm">Veuillez autoriser l'accès dans votre navigateur.</p>
                </div>
            )}
        </div>
        <Button onClick={handleCapturePhoto} className="w-full" disabled={!hasCameraPermission || isUploading}>Capturer</Button>
        <Button variant="ghost" onClick={() => { stopCamera(); setView('idle'); }} className="w-full">Annuler</Button>
    </div>
  );

  const renderFormContent = () => (
    <>
      <div className='space-y-2'>
          <Label>Aperçu de la photo</Label>
          <div className="relative aspect-square w-full rounded-md border bg-muted overflow-hidden">
              {isUploading && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {previewImage && <Image src={previewImage} alt="Aperçu de la pièce" fill className="object-cover" />}
              <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 bg-background/50 hover:bg-background/80 h-7 w-7" onClick={resetPhoto}>
                  <X className="h-4 w-4" />
              </Button>
          </div>
      </div>
      <FormField
          control={completeOutfitForm.control}
          name="baseItemPhotoDataUri"
          render={() => <FormItem><FormMessage /></FormItem>}
      />
      <FormField
          control={completeOutfitForm.control}
          name="baseItemType"
          render={({ field }) => (
              <FormItem className="space-y-3">
              <FormLabel>Quel est le type de cette pièce ?</FormLabel>
              <FormControl>
                  <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {itemTypeOptions.map(opt => (
                          <div key={opt.value}>
                              <RadioGroupItem value={opt.value} id={opt.value} className="sr-only" />
                              <Label 
                                  htmlFor={opt.value}
                                  className={cn(
                                      "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-2 font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer h-20 text-xs",
                                      field.value === opt.value && "border-primary"
                                  )}
                              >
                                  <opt.icon className="h-5 w-5 mb-1" />
                                  {opt.label}
                              </Label>
                          </div>
                      ))}
                  </RadioGroup>
              </FormControl>
              <FormMessage />
              </FormItem>
          )}
      />
    </>
  );


  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="w-full">
          <PlusCircle className="mr-2 h-4 w-4" />
          Compléter ma tenue
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] grid-rows-[auto_minmax(0,1fr)_auto] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Quelle pièce mettez-vous en vedette ?</DialogTitle>
          <DialogDescription>
            Importez ou prenez une photo, précisez son type, et l'IA créera une tenue autour.
          </DialogDescription>
        </DialogHeader>
        <Form {...completeOutfitForm}>
            <form onSubmit={completeOutfitForm.handleSubmit(handleCompleteOutfitSubmit)} className="space-y-6 pt-2 overflow-hidden flex flex-col">
                <ScrollArea className="flex-grow pr-6 -mr-6">
                    <div className="space-y-6 pr-1">
                      {view === 'camera' && renderCameraView()}
                      {view === 'idle' && !previewImage && renderIdleView()}
                      {(view === 'idle' && previewImage) && renderFormContent()}
                    </div>
                </ScrollArea>
                
                <DialogFooter className="pt-6">
                    <Button type="submit" disabled={isUploading || isGenerating || !previewImage} className="w-full">
                        {(isUploading || isGenerating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Générer la tenue
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
