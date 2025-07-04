'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
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

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push('/stylek'); // Will be redirected by main layout if personalization needed
    } catch (error: any) {
      let description = "Une erreur inattendue est survenue.";
      if (error.code) {
          switch (error.code) {
              case 'auth/invalid-credential':
                  description = "L'e-mail ou le mot de passe est incorrect. Veuillez vérifier vos informations.";
                  break;
              case 'auth/network-request-failed':
                  description = "Erreur de réseau. Il est probable que votre domaine Vercel ne soit pas autorisé. Veuillez vérifier vos paramètres Firebase.";
                  break;
              case 'auth/api-key-not-valid':
                description = "La clé d'API Firebase n'est pas valide. Vérifiez vos variables d'environnement sur Vercel.";
                break;
              default:
                  description = `Une erreur est survenue (${error.code}). Vérifiez la console pour plus de détails.`;
                  break;
          }
      }
      toast({
        variant: 'destructive',
        title: 'Erreur de connexion',
        description: description,
      });
      console.error("Login Error:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Connexion</CardTitle>
        <CardDescription>Accédez à votre assistant personnel.</CardDescription>
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
              Se connecter
            </Button>
            <p className="text-sm text-muted-foreground">
                Vous n'avez pas de compte ?{' '}
                <Link href="/signup" className="font-semibold text-primary hover:underline">
                    Inscrivez-vous
                </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
