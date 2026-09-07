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
    console.error('GlobalError Next.js:', error);
  }, [error]);

  const errorMsg = error?.message || 'Erreur globale de rendu.';

  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#09090b', color: '#f4f4f5' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '24px' }}>
            ⚠️
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
            Anomalie de chargement
          </h1>
          <p style={{ fontSize: '14px', color: '#a1a1aa', margin: '0 0 16px 0', lineHeight: 1.5 }}>
            Une erreur est survenue lors de l'initialisation de la page.
          </p>
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', textAlign: 'left', wordBreak: 'break-all', fontSize: '11px', fontFamily: 'monospace', color: '#e4e4e7' }}>
            {errorMsg}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              Réessayer
            </button>
            <button
              type="button"
              onClick={() => { window.location.href = '/'; }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: '#ffffff',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px',
                padding: '10px 20px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              Accueil
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
