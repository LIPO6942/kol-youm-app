'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Flame, CheckCircle2, BookmarkPlus, Eye, ExternalLink, X, CalendarDays, Loader2, Clapperboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { addMovieToWatchlist, addSeriesToWatchlist, addSeenMovieWithDate, addSeenSeriesWithDate, MovieCategory } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { MovieCategoryPicker } from '@/components/tfarrej/movie-category-picker';
import { guessMovieCategory } from '@/lib/movie-category-utils';

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
  seenTitles?: string[];
  watchlistTitles?: string[];
}

const CACHE_TTL_MS = 60 * 60 * 1000;

function normalizeTitle(t: string) {
  return t.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Format date YYYY-MM-DD pour l'input date
function toDateInputValue(ts: number) {
  const d = new Date(ts);
  return d.toISOString().split('T')[0];
}

export function TrendingStrip({ type, seenTitles = [], watchlistTitles = [] }: TrendingStripProps) {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeItem, setActiveItem] = useState<TrendingItem | null>(null);
  const [actionLoading, setActionLoading] = useState<'watchlist' | 'seen' | null>(null);
  const [dateMode, setDateMode] = useState<'exact' | 'approx'>('exact');
  const [seenDate, setSeenDate] = useState<string>(toDateInputValue(Date.now()));
  const [approxYear, setApproxYear] = useState<string>('');
  const [chosenCategory, setChosenCategory] = useState<MovieCategory>('Drame');
  const [isCinema, setIsCinema] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const seenSet = React.useMemo(() => new Set(seenTitles.map(normalizeTitle)), [seenTitles]);
  const watchSet = React.useMemo(() => new Set(watchlistTitles.map(normalizeTitle)), [watchlistTitles]);

  useEffect(() => {
    const cacheKey = `tmdb_trending_${type}`;
    const cacheTs = `tmdb_trending_${type}_ts`;
    try {
      const ts = localStorage.getItem(cacheTs);
      if (ts && Date.now() - Number(ts) < CACHE_TTL_MS) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) { setItems(JSON.parse(cached)); return; }
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

  // Fermer le panel si on clique en dehors
  useEffect(() => {
    if (!activeItem) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setActiveItem(null);
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [activeItem]);

  const handleAddToWatchlist = async () => {
    if (!activeItem || !userProfile?.uid) return;
    setActionLoading('watchlist');
    try {
      if (type === 'tv') {
        await addSeriesToWatchlist(userProfile.uid, activeItem.title);
      } else {
        await addMovieToWatchlist(userProfile.uid, activeItem.title);
      }
      toast({ title: `📌 Ajouté à "À Voir"`, description: activeItem.title });
      setActiveItem(null);
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible d\'ajouter à la liste.' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAsSeen = async () => {
    if (!activeItem || !userProfile?.uid) return;
    setActionLoading('seen');

    let viewedAt: number | undefined = undefined;
    if (dateMode === 'exact') {
      const d = new Date(seenDate).getTime();
      viewedAt = !isNaN(d) ? d : Date.now();
    } else {
      const y = parseInt(approxYear, 10);
      if (!isNaN(y) && y >= 1900 && y <= 2100) {
        viewedAt = new Date(y, 6, 1, 12, 0, 0).getTime();
      } else {
        viewedAt = Date.now();
      }
    }

    try {
      if (type === 'tv' || activeItem.mediaType === 'tv') {
        await addSeenSeriesWithDate(userProfile.uid, {
          title: activeItem.title,
          viewedAt,
          posterUrl: activeItem.posterPath || undefined,
          year: activeItem.year || undefined,
          category: chosenCategory,
        });
      } else {
        await addSeenMovieWithDate(userProfile.uid, {
          title: activeItem.title,
          viewedAt,
          posterUrl: activeItem.posterPath || undefined,
          year: activeItem.year || undefined,
          category: chosenCategory,
          watchedInCinema: isCinema ? true : undefined,
        });
      }

      const dateDesc = dateMode === 'exact'
        ? `Vu le ${new Date(viewedAt).toLocaleDateString('fr-FR')}`
        : `Vu vers ${approxYear || new Date(viewedAt).getFullYear()}`;

      toast({
        title: `✅ Marqué comme vu${isCinema ? ' au cinéma 🍿' : ''}`,
        description: `${activeItem.title} (${chosenCategory}) — ${dateDesc}${isCinema ? ' (Séance cinéma)' : ''}`,
      });
      setActiveItem(null);
      setShowDatePicker(false);
    } catch {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de marquer comme vu.' });
    } finally {
      setActionLoading(null);
    }
  };

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
    <div className="relative w-full">
      {/* Bande principale */}
      <div className="w-full overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center">
          {/* Label fixe */}
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
            {items.map((item, i) => {
              const alreadySeen = seenSet.has(normalizeTitle(item.title));
              const inWatchlist = watchSet.has(normalizeTitle(item.title));
              const isActive = activeItem?.id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (isActive) { setActiveItem(null); setShowDatePicker(false); return; }
                    setActiveItem(item);
                    setSeenDate(toDateInputValue(Date.now()));
                    setApproxYear(item.year ? String(item.year) : String(new Date().getFullYear()));
                    setDateMode('exact');
                    setChosenCategory(guessMovieCategory(item.title));
                    setIsCinema(false);
                    setShowDatePicker(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 border-r border-white/[0.05] flex-shrink-0 transition-all duration-150 relative text-left ${
                    isActive
                      ? 'bg-white/[0.08] ring-1 ring-inset ring-orange-400/30'
                      : alreadySeen
                      ? 'opacity-60 hover:opacity-80 active:bg-white/[0.04]'
                      : 'hover:bg-white/[0.04] active:bg-white/[0.06]'
                  }`}
                >
                  {/* Affiche miniature */}
                  <div className="relative w-[22px] h-8 rounded-md overflow-hidden bg-white/5 flex-shrink-0 shadow-sm">
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
                    {alreadySeen && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      </div>
                    )}
                    {!alreadySeen && inWatchlist && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <BookmarkPlus className="w-3 h-3 text-blue-400" />
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-black text-white/25">#{i + 1}</span>
                      {item.voteAverage && item.voteAverage > 0 && (
                        <span className="text-[8px] font-bold text-amber-400/80">★{item.voteAverage}</span>
                      )}
                      {alreadySeen && <span className="text-[8px] font-bold text-emerald-400/80">✓</span>}
                      {!alreadySeen && inWatchlist && <span className="text-[8px] font-bold text-blue-400/80">📌</span>}
                    </div>
                    <p className="text-[9px] font-semibold text-white/65 whitespace-nowrap max-w-[72px] overflow-hidden text-ellipsis leading-tight">
                      {item.title}
                    </p>
                    {item.year && (
                      <span className="text-[8px] text-white/25 leading-none">{item.year}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panel d'actions — apparaît sous la bande */}
      {activeItem && (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150"
        >
          {/* Header du panel */}
          <div className="flex items-center gap-3 p-3 border-b border-white/[0.08]">
            {activeItem.posterPath && (
              <img
                src={`/api/image-proxy?url=${encodeURIComponent(activeItem.posterPath)}`}
                alt={activeItem.title}
                className="w-8 h-12 rounded-lg object-cover flex-shrink-0 shadow-sm"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{activeItem.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {activeItem.year && <span className="text-[10px] text-muted-foreground">{activeItem.year}</span>}
                {activeItem.voteAverage && activeItem.voteAverage > 0 && (
                  <span className="text-[10px] font-semibold text-amber-500">★ {activeItem.voteAverage}</span>
                )}
                <span className="text-[10px] text-muted-foreground capitalize">
                  {activeItem.mediaType === 'tv' ? 'Série' : 'Film'}
                </span>
              </div>
            </div>
            <button
              onClick={() => { setActiveItem(null); setShowDatePicker(false); }}
              className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="p-2 space-y-1">
            {/* Ajouter à À Voir */}
            {!seenSet.has(normalizeTitle(activeItem.title)) && !watchSet.has(normalizeTitle(activeItem.title)) && (
              <button
                onClick={handleAddToWatchlist}
                disabled={actionLoading !== null}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors text-left disabled:opacity-50"
              >
                {actionLoading === 'watchlist' ? (
                  <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                ) : (
                  <BookmarkPlus className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-semibold text-foreground">Ajouter à "À Voir"</p>
                  <p className="text-[10px] text-muted-foreground">Mettre de côté pour plus tard</p>
                </div>
              </button>
            )}

            {/* Déjà dans À Voir */}
            {watchSet.has(normalizeTitle(activeItem.title)) && !seenSet.has(normalizeTitle(activeItem.title)) && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-blue-500/5 border border-blue-500/15">
                <BookmarkPlus className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-blue-400">Déjà dans votre liste "À Voir"</p>
              </div>
            )}

            {/* Marquer comme vu */}
            {!seenSet.has(normalizeTitle(activeItem.title)) && (
              <>
                {!showDatePicker ? (
                  <button
                    onClick={() => setShowDatePicker(true)}
                    disabled={actionLoading !== null}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors text-left disabled:opacity-50"
                  >
                    <Eye className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">Marquer comme vu</p>
                      <p className="text-[10px] text-muted-foreground">Choisir une date de visionnage</p>
                    </div>
                  </button>
                ) : (
                  <div className="px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <p className="text-xs font-bold text-foreground">Date de visionnage</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {dateMode === 'exact' ? 'Date exacte' : 'Année approximative'}
                      </span>
                    </div>

                    {/* Onglets : Date précise vs Année approx */}
                    <div className="grid grid-cols-2 gap-1 p-0.5 rounded-lg bg-black/40 border border-white/10">
                      <button
                        type="button"
                        onClick={() => setDateMode('exact')}
                        className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
                          dateMode === 'exact'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                      >
                        📅 Date précise
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDateMode('approx');
                          if (!approxYear && activeItem.year) {
                            setApproxYear(String(activeItem.year));
                          }
                        }}
                        className={`py-1 px-2 rounded-md text-[11px] font-bold transition-all text-center cursor-pointer ${
                          dateMode === 'approx'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                      >
                        ⏳ Année approx.
                      </button>
                    </div>

                    {/* Champ selon le mode */}
                    {dateMode === 'exact' ? (
                      <input
                        type="date"
                        value={seenDate}
                        max={toDateInputValue(Date.now())}
                        onChange={e => setSeenDate(e.target.value)}
                        className="w-full rounded-lg bg-background border border-border/60 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
                      />
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1900}
                            max={new Date().getFullYear()}
                            placeholder={`Ex: ${activeItem.year || '2020'}`}
                            value={approxYear}
                            onChange={e => setApproxYear(e.target.value)}
                            className="flex-1 rounded-lg bg-background border border-border/60 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                          />
                          {activeItem.year && (
                            <button
                              type="button"
                              onClick={() => setApproxYear(String(activeItem.year))}
                              className="shrink-0 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20 transition-colors cursor-pointer"
                              title={`Année de sortie : ${activeItem.year}`}
                            >
                              Sortie ({activeItem.year})
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sélection de la Catégorie (Genre : Thriller, Comédie, Drame...) */}
                    <div className="space-y-1.5 pt-1 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                          <span>🏷️</span>
                          <span>Catégorie du {type === 'tv' ? 'programme' : 'film'} :</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {chosenCategory}
                        </span>
                      </div>
                      <MovieCategoryPicker
                        selectedCategory={chosenCategory}
                        onSelectCategory={(cat) => setChosenCategory(cat)}
                        size="sm"
                      />
                    </div>

                    {/* Option Vu au cinéma pour les films */}
                    {type !== 'tv' && activeItem.mediaType !== 'tv' && (
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-black/40 border border-white/10 hover:border-amber-400/40 cursor-pointer transition-colors group">
                        <input
                          type="checkbox"
                          checked={isCinema}
                          onChange={(e) => setIsCinema(e.target.checked)}
                          className="w-4 h-4 rounded border-white/30 text-amber-500 focus:ring-amber-400 focus:ring-offset-0 bg-black/60 cursor-pointer"
                        />
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clapperboard className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                          <span className="text-[11px] font-semibold text-foreground group-hover:text-amber-300">
                            Vu au cinéma
                          </span>
                        </div>
                        {isCinema && (
                          <span className="ml-auto text-[9.5px] font-bold text-amber-300 bg-amber-400/20 px-1.5 py-0.5 rounded-full border border-amber-400/30">
                            En salle 🎟️
                          </span>
                        )}
                      </label>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-white/5 border border-border/40 transition-colors cursor-pointer"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleMarkAsSeen}
                        disabled={actionLoading !== null || (dateMode === 'approx' && (!approxYear || parseInt(approxYear, 10) < 1900))}
                        className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                      >
                        {actionLoading === 'seen' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          '✓ Confirmer'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Déjà vu */}
            {seenSet.has(normalizeTitle(activeItem.title)) && (
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <p className="text-sm font-semibold text-emerald-400">Déjà vu — dans votre historique</p>
              </div>
            )}

            {/* Voir sur TMDB */}
            <a
              href={`https://www.themoviedb.org/${activeItem.mediaType === 'tv' ? 'tv' : 'movie'}/${activeItem.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.06] active:bg-white/[0.08] transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">Voir la fiche TMDB</p>
                <p className="text-[10px] text-muted-foreground">Synopsis, casting, bande-annonce</p>
              </div>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
