'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

export default function SettingsPage() {
  const router = useRouter();
  const { user, userProfile, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'general' | 'tfarrej'>('general');
  const [settings, setSettings] = useState<TfarrejSettings>({
    preferredCountries: [],
    preferredMinRating: 6
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setSettings({
        preferredCountries: userProfile.preferredCountries || [],
        preferredMinRating: userProfile.preferredMinRating || 6
      });
    }
  }, [userProfile]);

  const handleCountryChange = (country: string, checked: boolean) => {
    setSettings(prev => ({
      ...prev,
      preferredCountries: checked
        ? [...prev.preferredCountries, country]
        : prev.preferredCountries.filter(c => c !== country)
    }));
  };

  const handleRatingChange = (value: number[]) => {
    setSettings(prev => ({
      ...prev,
      preferredMinRating: value[0]
    }));
  };

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      await updateUserProfile({
        preferredCountries: settings.preferredCountries,
        preferredMinRating: settings.preferredMinRating
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
      setIsLoading(false);
    }
  };

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
            activeTab === 'general'
              ? 'text-primary border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('general')}
        >
          Général
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
      </div>

      {activeTab === 'tfarrej' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filtres de films</CardTitle>
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
                        checked={settings.preferredCountries.includes(country)}
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
                  Note minimale: {settings.preferredMinRating}/10
                </Label>
                <Slider
                  value={[settings.preferredMinRating]}
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
                <Button onClick={handleSave} disabled={isLoading}>
                  {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSettings({
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

      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>Paramètres généraux</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Les paramètres généraux seront bientôt disponibles...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
