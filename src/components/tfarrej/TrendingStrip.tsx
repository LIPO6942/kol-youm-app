'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Flame, ChevronRight } from 'lucide-react';

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cacheKey = `tmdb_trending_${type}`;
    const cacheTs = `tmdb_trending_${type}_ts`;

    // Vérifier le cache localStorage
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
      <div className="flex items-center gap-2 px-1 py-1.5">
        <Flame className="w-3 h-3 text-orange-400/60 flex-shrink-0" />
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="w-10 h-14 rounded-lg bg-white/5 animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="flex items-center gap-2 group">
      {/* Label discret */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Flame className="w-3 h-3 text-orange-400" />
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider whitespace-nowrap">
          En ce moment
        </span>
      </div>

      {/* Bande scrollable horizontale */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1 pb-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            title={`${item.title}${item.year ? ` (${item.year})` : ''}`}
            className="relative flex-shrink-0 w-10 h-14 rounded-lg overflow-hidden border border-white/10 hover:border-orange-400/50 transition-all duration-200 cursor-pointer hover:scale-105 group/card"
          >
            {item.posterPath ? (
              <img
                src={`/api/image-proxy?url=${encodeURIComponent(item.posterPath)}`}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center text-[8px] text-white/30 text-center px-0.5 leading-tight">
                {item.title}
              </div>
            )}

            {/* Note en overlay */}
            {item.voteAverage && item.voteAverage > 0 && (
              <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[7px] font-black text-amber-300 text-center leading-none py-0.5">
                ★{item.voteAverage}
              </div>
            )}

            {/* Tooltip au hover */}
            <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-all duration-200" />
          </div>
        ))}
      </div>

      <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />
    </div>
  );
}
