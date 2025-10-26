'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Key, Zap, Image } from 'lucide-react';

export function HuggingFaceSetupCard() {
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Image className="h-5 w-5" />
          Génération d'Images IA Activée
        </CardTitle>
        <CardDescription className="text-blue-700">
          Configurez votre clé API Hugging Face pour générer des images de vêtements réalistes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Key className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Clé API Gratuite</h4>
              <p className="text-xs text-muted-foreground">
                30,000 requêtes/mois
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Stable Diffusion</h4>
              <p className="text-xs text-muted-foreground">
                Images haute qualité
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Image className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Mode Spécialisée</h4>
              <p className="text-xs text-muted-foreground">
                Optimisé pour la mode
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Comment configurer :</h4>
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>Allez sur <a href="https://huggingface.co" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
              huggingface.co <ExternalLink className="h-3 w-3" />
            </a></li>
            <li>Créez un compte gratuit</li>
            <li>Générez un token API dans Settings → Access Tokens</li>
            <li>Ajoutez-le dans votre fichier .env.local :</li>
          </ol>
          
          <div className="bg-gray-100 p-3 rounded-md font-mono text-xs">
            HUGGINGFACE_API_KEY=votre_token_ici
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            ✓ Compléter depuis ma garde-robe
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            ✓ Compléter ma tenue
          </Badge>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            ✓ Images réalistes
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
