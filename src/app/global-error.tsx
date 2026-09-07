'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('Cannot find module');

    if (isChunkError && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      console.error('Erreur globale Next.js:', error);
    }
  }, [error]);

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#09090b', color: '#f4f4f5' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '24px' }}>
            ⚡
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            Mise à jour en cours
          </h1>
          <p style={{ fontSize: '14px', color: '#a1a1aa', maxWidth: '420px', margin: '0 0 24px 0', lineHeight: 1.5 }}>
            Une nouvelle version de l'application a été déployée. Cliquez ci-dessous pour actualiser et continuer.
          </p>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            style={{
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)'
            }}
          >
            Actualiser l'application
          </button>
        </div>
      </body>
    </html>
  );
}
