'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCw, AlertTriangle, Home, Trash2 } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [hasAutoReloaded, setHasAutoReloaded] = useState(false);

  useEffect(() => {
    console.error('ErrorBoundary client intercepté:', error);

    // Détection stricte d'erreur de chunk (nouveau déploiement)
    const errorMsg = (error?.message || '').toLowerCase();
    const errorName = (error?.name || '').toLowerCase();
    const isChunkError =
      errorName.includes('chunkloaderror') ||
      errorMsg.includes('loading chunk') ||
      errorMsg.includes('failed to fetch dynamically imported module');

    if (isChunkError && typeof window !== 'undefined') {
      try {
        const lastAttempt = sessionStorage.getItem('chunk_reload_attempt');
        const now = Date.now();
        // N'autoriser qu'UN SEUL rechargement automatique toutes les 60 secondes pour éviter toute boucle infinie
        if (!lastAttempt || (now - parseInt(lastAttempt, 10)) > 60000) {
          sessionStorage.setItem('chunk_reload_attempt', now.toString());
          setHasAutoReloaded(true);
          window.location.reload();
          return;
        }
      } catch (e) {
        console.warn('Accès sessionStorage impossible:', e);
      }
    }
  }, [error]);

  const handleClearCacheAndRestart = () => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.clear();
        localStorage.removeItem('kolyoum_ranking_locks');
      } catch (e) {}
      window.location.href = '/';
    }
  };

  const handleRetry = () => {
    try {
      reset();
    } catch (e) {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  };

  const errorMsg = error?.message || 'Une exception client non gérée est survenue.';
  const isChunk =
    (error?.name || '').toLowerCase().includes('chunkloaderror') ||
    errorMsg.toLowerCase().includes('loading chunk');

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4 text-amber-500 shadow-sm">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <h2 className="text-xl sm:text-2xl font-bold font-headline mb-2 text-foreground">
        {isChunk ? "Mise à jour de l'application" : "Une anomalie est survenue"}
      </h2>

      <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
        {isChunk
          ? "Une nouvelle version a été déployée sur le serveur. Vous pouvez réinitialiser pour charger les nouveaux fichiers."
          : "Un problème temporaire a empêché l'affichage de cet écran."}
      </p>

      {/* Message d'erreur technique lisible */}
      <div className="w-full bg-muted/60 border border-border/60 rounded-xl p-3 mb-6 text-left overflow-x-auto">
        <p className="text-[11px] font-mono text-muted-foreground break-all">
          {errorMsg}
        </p>
        {error?.digest && (
          <p className="text-[10px] font-mono text-muted-foreground/70 mt-1">
            Digest: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
        <Button
          onClick={handleRetry}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-5 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2"
        >
          <RotateCw className="w-4 h-4" />
          <span>Réessayer</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => { window.location.href = '/'; }}
          className="rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>Accueil</span>
        </Button>

        <Button
          variant="ghost"
          onClick={handleClearCacheAndRestart}
          className="rounded-xl text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
          title="Nettoyer les verrous et recharger l'accueil"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Nettoyer le cache</span>
        </Button>
      </div>
    </div>
  );
}
