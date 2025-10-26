'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Database, Globe } from 'lucide-react';

export function AIStatusCard() {
  return (
    <Card className="mb-6 border-green-200 bg-green-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-800">
          <CheckCircle className="h-5 w-5" />
          IA Gratuite Activée
        </CardTitle>
        <CardDescription className="text-green-700">
          Vos modules IA fonctionnent maintenant avec des alternatives 100% gratuites
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Zap className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Hugging Face API</h4>
              <p className="text-xs text-muted-foreground">
                30,000 requêtes/mois gratuites
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Database className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Base de Données Locale</h4>
              <p className="text-xs text-muted-foreground">
                Fonctionne hors ligne
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Globe className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Aucune Carte Bancaire</h4>
              <p className="text-xs text-muted-foreground">
                Totalement gratuit
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            ✓ Suggestions de tenues
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            ✓ Recommandations de films
          </Badge>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            ✓ Suggestions de restaurants
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
