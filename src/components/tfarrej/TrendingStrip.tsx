'use client';

import React, { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';

interface TrendingItem {
  id: number;
  title: string;
  posterPath: string | null;
  voteAverage: number | null;
  year: number | null;
  mediaType: string;
}

interface TrendingStripProps {
  type: 'movie' | 'tv';
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 heure

export function TrendingStrip({ type }: TrendingStripProps) {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const cacheKey = `tmdb_trending_${type}`;
    const cacheTs = `tmdb_trending_${type}_ts`;

    try {
      const ts = localStorage.getItem(cacheTs);
      if (ts && Date.now() - Number(ts) < CACHE_TTL_MS) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          setItems(JSON.parse(cached));
          return;
        }
      }
    } catch {}

    setLoading(true);
    fetch(`/api/tmdb-trending?type=${type}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.results) {
          setItems(data.results);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(data.results));
            localStorage.setItem(cacheTs, String(Date.now()));
          } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 w-full overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
        <Flame className="w-3 h-3 text-orange-400/50 flex-shrink-0 animate-pulse" />
        <div className="flex gap-2 flex-1 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
              <div className="w-6 h-9 rounded bg-white/5 animate-pulse" />
              <div className="w-16 h-2 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.06]">
      <div className="flex items-center">

        {/* Label fixe — "bande de news" */}
        <div className="flex items-center gap-1.5 px-2.5 py-2 border-r border-white/[0.08] flex-shrink-0 bg-orange-500/10">
          <Flame className="w-3 h-3 text-orange-400 flex-shrink-0" />
          <span className="text-[9px] font-black text-orange-300/80 uppercase tracking-widest whitespace-nowrap">
            Tendances
          </span>
        </div>

        {/* Bande scrollable */}
        <div
          className="flex items-center gap-0 flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item, i) => (
            <div
              key={item.id}
              className="flex items-center gap-1.5 px-2.5 py-1.5 border-r border-white/[0.05] flex-shrink-0 cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors duration-150"
            >
              {/* Affiche miniature */}
              <div className="w-[22px] h-8 rounded-md overflow-hidden bg-white/5 flex-shrink-0 shadow-sm">
                {item.posterPath ? (
                  <img
                    src={`/api/image-proxy?url=${encodeURIComponent(item.posterPath)}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-white/10" />
                )}
              </div>

              {/* Infos */}
              <div className="flex flex-col min-w-0">
                {/* Rang + note */}
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-black text-white/25">#{i + 1}</span>
                  {item.voteAverage && item.voteAverage > 0 && (
                    <span className="text-[8px] font-bold text-amber-400/80">★{item.voteAverage}</span>
                  )}
                </div>
                {/* Titre */}
                <p className="text-[9px] font-semibold text-white/65 whitespace-nowrap max-w-[72px] overflow-hidden text-ellipsis leading-tight">
                  {item.title}
                </p>
                {/* Année */}
                {item.year && (
                  <span className="text-[8px] text-white/25 leading-none">{item.year}</span>
                )}
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
