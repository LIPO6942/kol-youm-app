'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { updateUserProfile } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, UserSquare } from 'lucide-react';
import { cn } from '@/lib/utils';


export default function PersonalizePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedGender, setSelectedGender] = useState<'Homme' | 'Femme' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Utilisateur non connecté.',
      });
      router.push('/login');
      return;
    }

    if (!selectedGender) {
        toast({
            variant: 'destructive',
            title: 'Sélection requise',
            description: 'Veuillez faire une sélection.',
        });
        return;
    }

    setIsLoading(true);
    try {
      await updateUserProfile(user.uid, {
        gender: selectedGender,
        personalizationComplete: true,
      });
      toast({
        title: 'Profil mis à jour !',
        description: "Bienvenue ! Nous allons maintenant personnaliser votre expérience.",
      });
      router.push('/stylek');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder votre choix.',
      });
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)]">
        <Card className="w-full max-w-md">
        <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">Une dernière étape</CardTitle>
            <CardDescription>
            Afin de vous proposer des expériences encore plus adaptées, êtes-vous :
            </CardDescription>
        </CardHeader>
        <CardContent>
            <RadioGroup
                onValueChange={(value: 'Homme' | 'Femme') => setSelectedGender(value)}
                className="grid grid-cols-2 gap-4"
            >
                <Label htmlFor="femme" className={cn(
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer h-24",
                    selectedGender === 'Femme' && 'border-primary'
                )}>
                    <RadioGroupItem value="Femme" id="femme" className="sr-only" />
                    <User className="h-8 w-8 mb-2"/>
                    Une Femme
                </Label>
                <Label htmlFor="homme" className={cn(
                    "flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer h-24",
                     selectedGender === 'Homme' && 'border-primary'
                )}>
                    <RadioGroupItem value="Homme" id="homme" className="sr-only" />
                    <UserSquare className="h-8 w-8 mb-2"/>
                    Un Homme
                </Label>
            </RadioGroup>
        </CardContent>
        <CardFooter>
            <Button className="w-full" onClick={handleSubmit} disabled={isLoading || !selectedGender}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continuer
            </Button>
        </CardFooter>
        </Card>
    </div>
  );
}
