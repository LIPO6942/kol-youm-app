'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw, AlertTriangle } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Si l'erreur est liée au chargement d'un chunk suite à un déploiement récent
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('Cannot find module');

    if (isChunkError) {
      console.warn('ChunkLoadError détecté après déploiement. Rechargement propre de la page...');
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } else {
      console.error('Erreur client non interceptée:', error);
    }
  }, [error]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    } else {
      reset();
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-500 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold font-headline mb-2 text-foreground">
        Une mise à jour a été déployée
      </h2>

      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">
        L'application a été mise à jour avec de nouvelles fonctionnalités. Un simple rechargement permet de synchroniser votre session avec la dernière version.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleReload}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-6 py-2 rounded-xl shadow-md flex items-center gap-2"
        >
          <RotateCw className="w-4 h-4" />
          <span>Recharger l'application</span>
        </Button>
        <Button
          variant="outline"
          onClick={() => reset()}
          className="rounded-xl font-medium"
        >
          <span>Réessayer</span>
        </Button>
      </div>
    </div>
  );
}
