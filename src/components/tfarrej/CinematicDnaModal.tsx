'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { MOVIE_CATEGORY_CONFIG, MovieCategory } from '@/lib/firebase/firestore';
import { calculateCinematicDna, CategoryDnaScore } from '@/lib/cinematic-dna-utils';
import { CategoryBadge, CATEGORY_HEX_COLORS } from '@/components/tfarrej/movie-category-picker';
import {
  Dna,
  Trophy,
  Sparkles,
  Swords,
  Calendar,
  Globe,
  Film,
  Zap,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CinematicDnaModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMonthKey?: string;
  onOpenDuel?: () => void;
}

export function CinematicDnaModal({
  isOpen,
  onOpenChange,
  currentMonthKey,
  onOpenDuel,
}: CinematicDnaModalProps) {
  const { userProfile } = useAuth();
  const [period, setPeriod] = useState<'all' | 'month'>('all');

  // Mois courant calculé si non fourni
  const effectiveMonthKey = useMemo(() => {
    if (currentMonthKey) return currentMonthKey;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [currentMonthKey]);

  // Calcul du résultat d'ADN selon la période
  const dna = useMemo(() => {
    return calculateCinematicDna(userProfile, {
      monthKey: period === 'month' ? effectiveMonthKey : undefined,
    });
  }, [userProfile, period, effectiveMonthKey]);

  const activeScores = useMemo(() => {
    return dna.scores.filter(s => s.percentage > 0 || s.points > 0);
  }, [dna.scores]);

  // Helper pour formater l'affiche
  const getPosterUrl = (url?: string) => {
    if (!url || url.startsWith('default:')) return null;
    let finalUrl = url;
    if (!url.startsWith('http')) {
      finalUrl = `https://image.tmdb.org/t/p/w500${url.startsWith('/') ? '' : '/'}${url}`;
    }
    return `/api/image-proxy?url=${encodeURIComponent(finalUrl)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px] w-[95vw] max-h-[92vh] overflow-hidden p-0 border border-indigo-500/30 bg-[#0B0C14] text-white shadow-[0_25px_80px_rgba(79,70,229,0.35)] flex flex-col !z-[200] [&>button]:text-white [&>button]:opacity-80 [&>button:hover]:opacity-100 [&>button]:bg-white/10 [&>button]:p-1.5 [&>button]:rounded-full [&>button]:transition-all">
        {/* Header néon holographique */}
        <div className="relative px-6 py-4 border-b border-white/10 bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
              <Dna className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>ADN Cinématographique</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-mono font-bold tracking-normal">
                  Pondéré par vos duels
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-white/60">
                Votre profil cinéphile génétique calculé d'après vos classements officiels.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Sélecteur de période */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-between gap-2 border-b border-white/5 bg-black/40">
          <span className="text-xs font-semibold text-white/60 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" />
            Période d'analyse :
          </span>
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            <button
              type="button"
              onClick={() => setPeriod('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                period === 'all'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" />
              Tous les temps
            </button>
            <button
              type="button"
              onClick={() => setPeriod('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                period === 'month'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Ce mois-ci
            </button>
          </div>
        </div>

        {/* Corps défilable */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4 space-y-5">
          {/* 1. CARTE D'IDENTITÉ CINÉPHILE (ARCHÉTYPE) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-3xl p-5 sm:p-6 border border-white/15 bg-gradient-to-br ${dna.archetype.gradient} overflow-hidden shadow-2xl`}
          >
            {/* Effet lueur de fond */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-xs font-black uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {dna.archetype.badge}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-white/90 text-[11px] font-semibold">
                  <Zap className="w-3 h-3 text-amber-300" />
                  Éclectisme : {dna.eclecticismIndex}%
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
                  {dna.archetype.title}
                </h3>
                <p className="text-xs sm:text-sm font-semibold text-white/90 mt-0.5">
                  « {dna.archetype.tagline} »
                </p>
              </div>

              <p className="text-xs text-white/80 leading-relaxed max-w-xl bg-black/25 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
                {dna.archetype.description}
              </p>
            </div>
          </motion.div>

          {/* 2. SPECTRE GÉNÉTIQUE VISUEL (HÉLICE / BARRE MULTICOLORE) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-white/80 flex items-center gap-1.5">
                <Dna className="w-4 h-4 text-indigo-400" />
                Spectre du Génome Cinématographique
              </span>
              <span className="text-indigo-300 font-mono text-[11px]">
                {dna.totalRankedMovies} œuvre{dna.totalRankedMovies > 1 ? 's' : ''} analysée{dna.totalRankedMovies > 1 ? 's' : ''}
              </span>
            </div>

            {/* Barre segmentée lumineuse */}
            <div className="h-4 w-full rounded-xl overflow-hidden bg-white/5 border border-white/15 p-0.5 flex gap-0.5 shadow-inner">
              {activeScores.map((score) => {
                const hex = CATEGORY_HEX_COLORS[score.category] || '#6366f1';
                return (
                  <div
                    key={score.category}
                    className="h-full rounded-sm transition-all duration-500 hover:brightness-125 relative group cursor-pointer"
                    style={{
                      width: `${score.percentage}%`,
                      backgroundColor: hex,
                    }}
                    title={`${score.category} : ${score.percentage}%`}
                  />
                );
              })}
            </div>

            {/* Légende rapide des 4 premiers genres */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {activeScores.slice(0, 4).map((score) => {
                const config = MOVIE_CATEGORY_CONFIG[score.category];
                return (
                  <span
                    key={score.category}
                    className="text-[11px] font-semibold text-white/75 flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-lg border border-white/10"
                  >
                    <span>{config?.emoji}</span>
                    <span>{score.category}</span>
                    <span className="font-bold text-white font-mono">{score.percentage}%</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* 3. PODIUM DES GÈNES PILIERS & LEURS AMBASSADEURS */}
          {dna.dominantGene && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-extrabold text-white/90 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400" />
                Piliers Fondateurs de votre ADN
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { gene: dna.dominantGene, label: "Gène Dominant", badgeEmoji: "🥇", ring: "border-amber-400/50 bg-amber-500/10" },
                  { gene: dna.secondaryGene, label: "Gène Secondaire", badgeEmoji: "🥈", ring: "border-slate-300/40 bg-slate-500/10" },
                  { gene: dna.tertiaryGene, label: "Gène Émergent", badgeEmoji: "🥉", ring: "border-orange-400/40 bg-orange-500/10" },
                ]
                  .filter(item => Boolean(item.gene))
                  .map(({ gene, label, badgeEmoji, ring }) => {
                    if (!gene) return null;
                    const config = MOVIE_CATEGORY_CONFIG[gene.category];
                    const poster = getPosterUrl(gene.topMoviePosterUrl);

                    return (
                      <div
                        key={gene.category}
                        className={`rounded-2xl p-3 border ${ring} backdrop-blur-md flex flex-col justify-between space-y-2 transition-all hover:scale-[1.02]`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                            {label}
                          </span>
                          <span className="text-base leading-none">{badgeEmoji}</span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {poster ? (
                            <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white/20 bg-black aspect-[2/3] shadow">
                              <Image
                                src={poster}
                                alt={gene.topMovieTitle || gene.category}
                                fill
                                sizes="45px"
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-14 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-xl shrink-0">
                              {config?.emoji}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                              <span className="text-xs">{config?.emoji}</span>
                              <span className="text-xs font-bold text-white truncate">{gene.category}</span>
                            </div>
                            <div className="text-lg font-black font-mono text-white">
                              {gene.percentage}%
                            </div>
                            {gene.topMovieTitle && (
                              <p className="text-[10px] text-white/50 truncate" title={gene.topMovieTitle}>
                                🏆 {gene.topMovieTitle}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 4. DÉTAIL COMPLET DES GÈNES EN POURCENTAGES (%) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-extrabold text-white/90 uppercase tracking-wider flex items-center justify-between">
              <span>Répartition Complète du Génome (%)</span>
              <span className="text-[11px] text-white/50 font-normal">Pondération quadratique</span>
            </h4>

            <div className="space-y-2">
              {activeScores.map((item) => {
                const config = MOVIE_CATEGORY_CONFIG[item.category];
                const hex = CATEGORY_HEX_COLORS[item.category] || '#6366f1';

                return (
                  <div
                    key={item.category}
                    className="p-2.5 sm:p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 transition-all flex items-center gap-3"
                  >
                    <span className="text-lg sm:text-xl shrink-0">{config?.emoji}</span>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                          <span>{item.category}</span>
                          {item.movieCount > 0 && (
                            <span className="text-[10px] text-white/40 font-normal">
                              ({item.movieCount} film{item.movieCount > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                        <div className="font-black text-sm sm:text-base font-mono text-white flex items-baseline gap-0.5">
                          <span style={{ color: hex }}>{item.percentage}</span>
                          <span className="text-xs text-white/50">%</span>
                        </div>
                      </div>

                      {/* Jauge individuelle colorée */}
                      <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: hex,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bannière explicative sur le mode de calcul */}
          <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-400/20 text-indigo-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1 leading-relaxed">
              <p className="font-semibold text-white">
                Comment est calculé votre ADN Cinéphile ?
              </p>
              <p className="text-white/70 text-[11px]">
                Contrairement à un simple décompte de films vus, votre ADN s'appuie sur le <strong>classement de vos duels</strong>. Les films classés <strong>#1, #2 et #3</strong> reçoivent une pondération exponentielle : vos véritables chefs-d'œuvre façonnent vos gènes dominants !
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-black/60 flex items-center justify-between gap-3">
          {onOpenDuel && (
            <Button
              size="sm"
              onClick={() => {
                onOpenChange(false);
                onOpenDuel();
              }}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-md gap-1.5"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Affiner via un Duel</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="ml-auto border-white/20 text-white hover:bg-white/10 rounded-xl text-xs font-semibold"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
