'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useAuth } from '@/hooks/use-auth';
import { createUserProfile } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Adresse e-mail invalide.' }),
  password: z.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
});

export default function SignupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      const searchParams = new URLSearchParams(window.location.search);
      const nextUrl = searchParams.get('next');
      router.replace(nextUrl || '/stylek');
    }
  }, [user, loading, router]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await createUserProfile(userCredential.user.uid, { email: userCredential.user.email });
      router.push('/personalize');
    } catch (error: any) {
      console.error("Signup Error Full Details:", error);
      let description = "Une erreur inattendue s'est produite. Veuillez réessayer.";

      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            description = "Cette adresse e-mail est déjà utilisée par un autre compte.";
            break;
          case 'auth/invalid-email':
            description = "L'adresse e-mail n'est pas valide.";
            break;
          case 'auth/weak-password':
            description = "Le mot de passe est trop faible. Il doit contenir au moins 6 caractères.";
            break;
          case 'permission-denied':
            description = "Permission refusée. Vos règles de sécurité Firestore n'autorisent probablement pas un nouvel utilisateur à créer son propre profil. Veuillez les vérifier.";
            break;
          case 'auth/network-request-failed':
            description = "Erreur de réseau. Votre domaine Vercel est-il bien autorisé dans les paramètres d'authentification Firebase ?";
            break;
          case 'auth/api-key-not-valid':
            description = "La clé d'API Firebase n'est pas valide. Vérifiez vos variables d'environnement sur Vercel.";
            break;
          default:
            // For any other error, show the technical details to help debug
            description = `Erreur technique: ${error.code}. Veuillez vérifier la configuration de votre projet Firebase.`;
            break;
        }
      } else {
        description = `Une erreur inattendue est survenue: ${error.message || 'Veuillez vérifier la console.'}`;
      }

      toast({
        variant: 'destructive',
        title: "Erreur d'inscription",
        description: description,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Inscription</CardTitle>
        <CardDescription>Créez votre compte pour commencer l'expérience.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="votre@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mot de passe</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="********" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer un compte
            </Button>
            <p className="text-sm text-muted-foreground">
              Vous avez déjà un compte ?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Connectez-vous
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
