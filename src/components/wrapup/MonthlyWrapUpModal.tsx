"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { X, Share2, Camera, Clapperboard, Award, Sparkles, MapPin, Film, Star, TrendingUp, Flame, Coffee } from 'lucide-react';
import { useMonthlyWrapUp, WrapUpStats } from '@/hooks/use-monthly-wrapup';
import type { UserProfile } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';

type Props = {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  targetDate?: Date;
};

const SLIDE_DURATION = 7000;

// ─── Variants Framer Motion ─────────────────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.15 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 28, filter: 'blur(6px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};
const iconVariants = {
  hidden: { scale: 0, rotate: -15, opacity: 0 },
  show: { scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 18, delay: 0.05 } },
};
const numberVariants = {
  hidden: { scale: 0.5, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 20, delay: 0.2 } },
};

// ─── Compteur animé ──────────────────────────────────────────────────────────
function CountUp({ to, duration = 1.2 }: { to: number; duration?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(count, to, { duration });
    const unsub = rounded.onChange((v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [to]);
  return <span>{display}</span>;
}

// ─── Background collage (films) ──────────────────────────────────────────────
function CollageBackground({ posters }: { posters: string[] }) {
  if (!posters || posters.length === 0) return null;
  const displayPosters = posters.slice(0, 9);
  const count = displayPosters.length;
  let gridClass = 'grid-cols-1';
  if (count === 2) gridClass = 'grid-cols-2';
  else if (count >= 3 && count <= 4) gridClass = 'grid-cols-2 grid-rows-2';
  else if (count >= 5) gridClass = 'grid-cols-3 grid-rows-3';
  return (
    <motion.div
      initial={{ scale: 1.1, opacity: 0 }}
      animate={{ scale: 1.05, opacity: 0.55 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className={`absolute inset-0 z-0 grid ${gridClass} gap-0.5 blur-[1px]`}
    >
      {displayPosters.map((url, i) => {
        let finalUrl = url;
        if (!url.startsWith('http')) {
           finalUrl = `https://image.tmdb.org/t/p/w500${url.startsWith('/') ? '' : '/'}${url}`;
        }
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(finalUrl)}`;
          
        return (
          <div key={i} className="relative w-full h-full overflow-hidden">
            <img
              src={proxyUrl}
              alt="Poster"
              className="w-full h-full object-cover"
            />
          </div>
        );
      })}
    </motion.div>
  );
}

// ─── Orbes flottants décoratifs ───────────────────────────────────────────────
function FloatingOrbs({ colors }: { colors: [string, string, string] }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[
        { color: colors[0], size: 200, x: -60, y: -60, delay: 0 },
        { color: colors[1], size: 150, x: '70%', y: '60%', delay: 0.5 },
        { color: colors[2], size: 100, x: '30%', y: '-10%', delay: 1 },
      ].map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full opacity-20 blur-3xl"
          style={{ width: orb.size, height: orb.size, background: orb.color, left: orb.x, top: orb.y }}
          animate={{ scale: [1, 1.2, 1], x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
          transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: orb.delay }}
        />
      ))}
    </div>
  );
}

// ─── Particules flottantes ✨ ────────────────────────────────────────────────
function Particles({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 bg-white rounded-full opacity-20 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
          initial={{ 
            x: Math.random() * 100 + '%', 
            y: '110%',
            scale: Math.random() * 1 + 0.5
          }}
          animate={{ 
            y: ['110%', '-10%'],
            x: (Math.random() * 100) + (Math.random() > 0.5 ? 5 : -5) + '%',
            opacity: [0, 0.4, 0.4, 0]
          }}
          transition={{ 
            duration: Math.random() * 8 + 8, 
            repeat: Infinity, 
            ease: 'linear',
            delay: Math.random() * 10
          }}
        />
      ))}
    </div>
  );
}

// ─── SlideContainer ─────────────────────────────────────────────────────────
function SlideContainer({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 ${className}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
export function MonthlyWrapUpModal({ user, isOpen, onClose, targetDate = new Date() }: Props) {
  const previousMonthDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);

  const [placesWithZones, setPlacesWithZones] = useState<{ name: string; zone: string }[]>([]);
  useEffect(() => {
    if (!isOpen) return;
    async function fetchPlaces() {
      try {
        const res = await fetch('/api/places-database-firestore');
        const data = await res.json();
        if (data.success && data.data?.zones) {
          const flat: { name: string; zone: string }[] = [];
          data.data.zones.forEach((z: any) => {
            Object.values(z.categories).forEach((places: any) => {
              (places as string[]).forEach((name: string) => {
                flat.push({ name: name.split('[')[0].trim(), zone: z.zone });
              });
            });
          });
          setPlacesWithZones(flat);
        }
      } catch (e) {
        console.error('Failed to fetch places for zones in wrapup', e);
      }
    }
    fetchPlaces();
  }, [isOpen]);

  const stats = useMonthlyWrapUp(user, previousMonthDate, placesWithZones);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const storyRef = useRef<HTMLDivElement>(null);

  const [cinemaPosters, setCinemaPosters] = useState<string[]>([]);
  useEffect(() => {
    if (!isOpen || !stats?.cinema?.movieTitles?.length) {
      setCinemaPosters([]);
      return;
    }
    
    async function fetchCinemaPosters() {
      try {
        const titles = stats!.cinema!.movieTitles;
        // Déduplication des titres
        const uniqueTitles = Array.from(new Set(titles));
        const posters: string[] = [];
        
        await Promise.all(uniqueTitles.map(async (title) => {
          const res = await fetch(`/api/tmdb-search?q=${encodeURIComponent(title)}&type=movie`);
          const data = await res.json();
          if (data.results && data.results.length > 0) {
            const match = data.results.find((r: any) => r.posterUrl) || data.results[0];
            if (match?.posterUrl) {
                posters.push(match.posterUrl);
            }
          }
        }));
        
        setCinemaPosters(posters);
      } catch (e) {
        console.error('Failed to fetch cinema posters', e);
      }
    }
    
    fetchCinemaPosters();
  }, [isOpen, stats?.cinema]);

  const slides = stats ? [
    'intro',
    stats.topCategory ? 'category' : null,
    stats.topPlace ? 'place' : null,
    stats.cinema && stats.cinema.total > 0 ? 'cinema' : null,
    stats.movies && stats.movies.total > 0 ? 'movies' : null,
    stats.series && stats.series.total > 0 ? 'series' : null,
    stats.featuredMomentyImage ? 'momenty' : null,
    'verdict',
  ].filter(Boolean) as string[] : [];

  useEffect(() => {
    if (isOpen) { setCurrentSlide(0); setProgress(0); setIsPaused(false); }
  }, [isOpen]);

  const slidesLengthRef = useRef(slides.length);
  slidesLengthRef.current = slides.length;

  useEffect(() => {
    if (!isOpen || !stats || isPaused) return;
    const intervalId = setInterval(() => {
      setProgress((old) => {
        if (old >= 100) {
          setCurrentSlide((s) => {
            if (s < slidesLengthRef.current - 1) return s + 1;
            clearInterval(intervalId);
            return s;
          });
          return 0;
        }
        return old + (100 / (SLIDE_DURATION / 50));
      });
    }, 50);
    return () => clearInterval(intervalId);
  }, [isOpen, stats, isPaused]);

  const handleNextSlide = () => { if (currentSlide < slides.length - 1) { setCurrentSlide((s) => s + 1); setProgress(0); } };
  const handlePrevSlide = () => { if (currentSlide > 0) { setCurrentSlide((s) => s - 1); setProgress(0); } };

  const shareStory = async () => {
    if (!storyRef.current) return;
    try {
      const dataUrl = await toPng(storyRef.current, {
        cacheBust: false, // Pas besoin avec le proxy
        pixelRatio: 2,
        skipFonts: true,
      });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'wrapup.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Mon Récapitulatif Kol Youm', text: 'Découvrez mon bilan du mois sur Kol Youm !' });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `kolyoum_wrapup_${stats?.monthName.replace(' ', '_')}.png`;
        a.click();
      }
    } catch (e) { console.error('Share failed', e); }
  };

  if (!stats || slides.length === 0) {
    if (isOpen) setTimeout(onClose, 0);
    return null;
  }

  const catEmoji = stats.topCategory?.name === 'Fast Food' ? '🍔' : stats.topCategory?.name === 'Brunch' ? '🥞' : stats.topCategory?.name === 'Café' ? '☕' : stats.topCategory?.name === 'Restaurant' ? '🍽️' : stats.topCategory?.name === 'Balade' ? '🌿' : '🎯';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="wrapup-modal"
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black sm:bg-black/80 backdrop-blur-sm pointer-events-none"
        >
          <div className="relative w-full h-full sm:max-w-[390px] sm:h-[820px] sm:rounded-[44px] overflow-hidden bg-black text-white flex shadow-[0_32px_80px_rgba(0,0,0,0.8)]" style={{ pointerEvents: isOpen ? 'auto' : 'none' }}>

            {/* ── PROGRESS BARS ── */}
            <div className="absolute top-4 left-0 right-0 z-50 flex gap-1.5 px-4">
              {slides.map((_, index) => (
                <div key={index} className="h-[3px] flex-1 bg-white/20 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white rounded-full"
                    style={{ width: index < currentSlide ? '100%' : index === currentSlide ? `${progress}%` : '0%' }}
                  />
                </div>
              ))}
            </div>

            {/* ── CLOSE BUTTON ── */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className={`absolute top-8 right-4 z-50 p-2 bg-black/30 rounded-full backdrop-blur-md border border-white/10 no-screenshot ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
              onClick={onClose}
            >
              <X className="w-4 h-4 text-white" />
            </motion.button>

            {/* ── SLIDES CONTENT ── */}
            <div ref={storyRef} className="relative w-full h-full overflow-hidden pointer-events-none">
              {/* Bruit de fond global */}
              <div className="absolute inset-0 opacity-[0.04] bg-[url('/noise.png')] mix-blend-overlay z-10 pointer-events-none" />

              <AnimatePresence mode="wait">

                {/* ══ INTRO ══════════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'intro' && (
                  <SlideContainer key="intro" className="bg-gradient-to-br from-violet-950 via-purple-900 to-black">
                    <FloatingOrbs colors={['#7c3aed', '#db2777', '#6366f1']} />
                    <Particles />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col items-center text-center z-10">
                      {/* Icône */}
                      <motion.div variants={iconVariants} className="relative mb-8">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400/20 to-purple-500/20 border border-white/10 backdrop-blur-xl flex items-center justify-center shadow-[0_0_60px_rgba(168,85,247,0.4)]">
                          <Sparkles className="w-14 h-14 text-yellow-300 drop-shadow-lg" />
                        </div>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                          className="absolute inset-0 rounded-full border-2 border-dashed border-yellow-400/20"
                        />
                      </motion.div>
                      {/* Titre mois */}
                      <motion.p variants={itemVariants} className="text-xs font-bold uppercase tracking-[0.3em] text-purple-300 mb-3">
                        Récap du mois
                      </motion.p>
                      <motion.h1 variants={itemVariants} className="text-4xl font-black leading-tight mb-3 bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent">
                        {stats.monthName}
                      </motion.h1>
                      <motion.h2 variants={itemVariants} className="text-lg text-white/70 mb-8">
                        a été intense 🔥
                      </motion.h2>
                      {/* Compteur sorties */}
                      <motion.div variants={itemVariants} className="bg-white/8 backdrop-blur-xl border border-white/10 rounded-3xl px-10 py-5 text-center shadow-inner">
                        <motion.p variants={numberVariants} className="text-6xl font-black text-white leading-none">
                          <CountUp to={stats.totalOutings} />
                        </motion.p>
                        <p className="text-white/50 text-sm mt-1 uppercase tracking-widest font-medium">sorties ce mois</p>
                      </motion.div>
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ CATEGORY ═══════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'category' && (
                  <SlideContainer key="category" className="bg-gradient-to-bl from-rose-950 via-pink-900 to-black">
                    <FloatingOrbs colors={['#e11d48', '#9d174d', '#db2777']} />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col items-center text-center z-10 w-full">
                      <motion.p variants={itemVariants} className="text-xs font-bold uppercase tracking-[0.3em] text-pink-300 mb-6">
                        L'obsession du mois
                      </motion.p>
                      {/* Emoji géant animé */}
                      <motion.div
                        variants={iconVariants}
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                        className="text-8xl mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                      >
                        {catEmoji}
                      </motion.div>
                      {/* Carte */}
                      <motion.div variants={itemVariants} className="bg-white/8 backdrop-blur-xl border border-white/10 rounded-3xl p-6 w-full shadow-[0_0_40px_rgba(219,39,119,0.15)]">
                        <motion.h1 variants={numberVariants} className="text-4xl font-black mb-2 text-white">
                          {stats.topCategory?.name}
                        </motion.h1>
                        {/* Arc de progression */}
                        <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mb-3">
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-gradient-to-r from-pink-500 to-rose-400 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${stats.topCategory?.percentage ?? 0}%` }}
                              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
                            />
                          </div>
                          <span className="text-2xl font-black text-pink-300">{stats.topCategory?.percentage}%</span>
                        </motion.div>
                        <motion.p variants={itemVariants} className="text-sm text-white/50">de tes sorties ce mois</motion.p>
                        {stats.topDay && (
                          <motion.div variants={itemVariants} className="mt-4 inline-flex items-center gap-2 bg-pink-900/40 border border-pink-500/20 text-pink-200 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full">
                            <Flame className="w-3 h-3" />
                            Surtout les {stats.topDay.name}s
                          </motion.div>
                        )}
                      </motion.div>
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ PLACE ══════════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'place' && (
                  <SlideContainer key="place" className="bg-gradient-to-tr from-teal-950 via-emerald-900 to-black">
                    <FloatingOrbs colors={['#059669', '#10b981', '#047857']} />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col items-center text-center z-10 w-full">
                      {/* Icône pin */}
                      <motion.div variants={iconVariants} className="relative mb-6">
                        <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)]">
                          <MapPin className="w-10 h-10 text-emerald-300" />
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full bg-emerald-400/20"
                        />
                      </motion.div>
                      <motion.p variants={itemVariants} className="text-xs uppercase tracking-[0.3em] text-emerald-400 font-bold mb-2">
                        Ton Quartier Général
                      </motion.p>
                      <motion.h1 variants={numberVariants} className="text-4xl font-black text-white leading-tight mb-1 drop-shadow-lg">
                        {stats.topPlace?.name}
                      </motion.h1>
                      {stats.topNeighborhood && (
                        <motion.p variants={itemVariants} className="text-emerald-300 text-sm font-semibold uppercase tracking-wide mb-6">
                          📍 {stats.topNeighborhood.name}
                        </motion.p>
                      )}
                      <motion.div variants={itemVariants} className="bg-white/8 backdrop-blur-xl border border-emerald-500/20 rounded-2xl px-8 py-4 text-center shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                        <p className="text-4xl font-black text-emerald-300">
                          <CountUp to={stats.topPlace?.count ?? 0} />
                        </p>
                        <p className="text-white/50 text-xs uppercase tracking-widest mt-1">visites ce mois</p>
                      </motion.div>
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ CINEMA OUTINGS ═══════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'cinema' && stats.cinema && (
                  <SlideContainer key="cinema">
                    {cinemaPosters.length > 0 ? (
                      <>
                        <CollageBackground posters={cinemaPosters} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 z-[1]" />
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-orange-900 to-black" />
                        <FloatingOrbs colors={['#78350f', '#92400e', '#b45309']} />
                      </>
                    )}
                    
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 flex flex-col items-center text-center w-full">
                      <motion.div variants={iconVariants} className="w-20 h-20 rounded-full bg-orange-500/20 border border-orange-400/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.3)] mb-6">
                        <Clapperboard className="w-10 h-10 text-orange-400" />
                      </motion.div>
                      <motion.p variants={itemVariants} className="text-xs uppercase tracking-[0.3em] text-orange-300 font-bold mb-2">
                        Sortie Grand Écran
                      </motion.p>
                      <motion.div variants={numberVariants} className="text-center mb-8">
                        <p className="text-8xl font-black text-white leading-none"><CountUp to={stats.cinema.total} /></p>
                        <p className="text-white/50 text-lg mt-1">fois au ciné</p>
                      </motion.div>
                      {stats.cinema.topCinema && (
                        <motion.div variants={itemVariants} className="bg-black/40 backdrop-blur-xl border border-orange-500/20 rounded-2xl px-8 py-4 text-center shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                          <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">Ton spot préféré</p>
                          <p className="text-xl font-bold text-white">{stats.cinema.topCinema}</p>
                        </motion.div>
                      )}
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ MOVIES ═════════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'movies' && stats.movies && (
                  <SlideContainer key="movies">
                    <CollageBackground posters={stats.movies.posters} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 z-[1]" />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 flex flex-col items-center w-full">
                      <motion.div variants={iconVariants} className="w-18 h-18 rounded-2xl bg-blue-500/20 border border-blue-400/30 p-3 mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Clapperboard className="w-12 h-12 text-blue-400" />
                      </motion.div>
                      <motion.p variants={itemVariants} className="text-xs uppercase tracking-[0.3em] text-blue-300 font-bold mb-2">L'Instant Ciné</motion.p>
                      <motion.div variants={numberVariants} className="text-center mb-8">
                        <p className="text-8xl font-black text-white leading-none"><CountUp to={stats.movies.total} /></p>
                        <p className="text-white/50 text-lg mt-1">films vus</p>
                      </motion.div>
                      {stats.movies.featured && (
                        <motion.div variants={itemVariants} className="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-blue-500/20 text-center max-w-[85%] shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <p className="text-[10px] text-blue-300 uppercase tracking-widest font-bold">Coup de cœur</p>
                          </div>
                          <h3 className="text-lg font-bold line-clamp-2">{stats.movies.featured.title}</h3>
                        </motion.div>
                      )}
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ SERIES ═════════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'series' && stats.series && (
                  <SlideContainer key="series">
                    <CollageBackground posters={stats.series.posters} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30 z-[1]" />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 flex flex-col items-center w-full">
                      <motion.div variants={iconVariants} className="w-18 h-18 rounded-2xl bg-purple-500/20 border border-purple-400/30 p-3 mb-6 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                        <Film className="w-12 h-12 text-purple-400" />
                      </motion.div>
                      <motion.p variants={itemVariants} className="text-xs uppercase tracking-[0.3em] text-purple-300 font-bold mb-2">L'Instant Séries</motion.p>
                      <motion.div variants={numberVariants} className="text-center mb-8">
                        <p className="text-8xl font-black text-white leading-none"><CountUp to={stats.series.total} /></p>
                        <p className="text-white/50 text-lg mt-1">séries vues</p>
                      </motion.div>
                      {stats.series.featured && (
                        <motion.div variants={itemVariants} className="bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-purple-500/20 text-center max-w-[85%]">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <p className="text-[10px] text-purple-300 uppercase tracking-widest font-bold">Coup de cœur</p>
                          </div>
                          <h3 className="text-lg font-bold line-clamp-2">{stats.series.featured.title}</h3>
                        </motion.div>
                      )}
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ MOMENTY ════════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'momenty' && (
                  <SlideContainer key="momenty" className="bg-neutral-950">
                    <FloatingOrbs colors={['#333', '#111', '#000']} />
                    <motion.div 
                      variants={containerVariants} initial="hidden" animate="show"
                      className="relative z-10 w-full px-6 flex flex-col items-center"
                    >
                      <motion.div 
                        variants={iconVariants}
                        animate={{ rotate: [-0.5, 1, -1, 0.5] }}
                        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                        className="bg-white p-3 pb-16 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-sm transform rotate-[-2deg] w-full max-w-[280px]"
                      >
                        <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 rounded-[1px]">
                          {stats.featuredMomentyImage && (
                            <motion.img
                              src={`/api/image-proxy?url=${encodeURIComponent(stats.featuredMomentyImage)}`}
                              alt="Momenty"
                              className="absolute inset-0 w-full h-full object-cover"
                              initial={{ scale: 1.15 }}
                              animate={{ scale: 1.05 }}
                              transition={{ duration: 7, ease: 'easeOut' }}
                            />
                          )}
                          <div className="absolute inset-0 bg-black/[0.03] pointer-events-none" />
                        </div>
                        
                        <div className="absolute bottom-3 left-4 right-4">
                           <p className="text-[#222] font-serif italic text-base leading-tight truncate">
                             {stats.topDish ? stats.topDish.name : stats.featuredMomentyDish}
                           </p>
                           <div className="flex justify-between items-center mt-1">
                             <p className="text-[#888] text-[8px] uppercase tracking-widest font-sans font-bold">
                               {stats.monthName}
                             </p>
                             <Camera className="w-2.5 h-2.5 text-[#ccc]" />
                           </div>
                        </div>
                      </motion.div>
                      
                      <motion.div variants={itemVariants} className="mt-10 flex flex-col items-center gap-1">
                        <motion.div 
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-1.5 h-1.5 bg-white/20 rounded-full mb-2"
                        />
                        <p className="text-[10px] uppercase tracking-[0.25em] text-white/40 font-bold">
                          {stats.topDish ? 'Votre péché mignon' : 'Moment capturé'}
                        </p>
                      </motion.div>
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ VERDICT ════════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'verdict' && (
                  <SlideContainer key="verdict" className="bg-gradient-to-b from-slate-900 via-indigo-950 to-black">
                    <FloatingOrbs colors={['#4f46e5', '#7c3aed', '#1d4ed8']} />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col items-center w-full z-10">
                      {/* Médaille */}
                      <motion.div
                        variants={iconVariants}
                        animate={{ rotate: [0, -5, 5, -3, 0], y: [0, -4, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
                        className="mb-4"
                      >
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.4)]">
                          <Award className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                      </motion.div>
                      <motion.p variants={itemVariants} className="text-[10px] uppercase tracking-[0.3em] text-indigo-300 font-bold mb-1">Bilan Officiel</motion.p>
                      <motion.h1 variants={itemVariants} className="text-3xl font-black text-center mb-6 leading-tight px-2">{stats.userPersona}</motion.h1>

                      {/* Grille stats */}
                      <motion.div variants={containerVariants} className="grid grid-cols-2 gap-2.5 w-full mb-6">
                        {[
                          { label: 'Sorties', value: stats.totalOutings, isNum: true },
                          { label: 'Tfarrej', value: stats.totalMovies, isNum: true },
                          { label: 'Quartier Top', value: stats.topNeighborhood?.name || '—', isNum: false, truncate: true },
                          { label: 'Jour Favori', value: stats.topDay?.name || '—', isNum: false },
                        ].map((item, i) => (
                          <motion.div
                            key={i}
                            variants={itemVariants}
                            whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.12)' }}
                            className="bg-white/8 rounded-2xl p-3.5 backdrop-blur-sm border border-white/8 transition-colors"
                          >
                            <p className="text-[9px] uppercase text-white/40 tracking-widest mb-1 font-semibold">{item.label}</p>
                            {item.isNum ? (
                              <p className="text-2xl font-black text-white">
                                <CountUp to={item.value as number} duration={0.8} />
                              </p>
                            ) : (
                              <p className={`text-sm font-bold text-white ${item.truncate ? 'truncate' : ''}`}>{item.value}</p>
                            )}
                          </motion.div>
                        ))}

                        {/* Full-width: Côté Assiette + Boisson */}
                        <motion.div variants={itemVariants} className="col-span-2 bg-white/8 rounded-2xl p-3.5 backdrop-blur-sm border border-white/8 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] uppercase text-white/40 tracking-widest mb-1 font-semibold">Côté Assiette</p>
                            <p className="text-sm font-bold text-white truncate max-w-[130px]">{stats.topDish?.name || '—'}</p>
                          </div>
                          <div className="w-px h-8 bg-white/10 mx-2" />
                          <div className="text-right">
                            <p className="text-[9px] uppercase text-white/40 tracking-widest mb-1 font-semibold">Boisson Préférée</p>
                            <p className="text-sm font-bold text-white">{stats.topBeverage?.name || '—'}</p>
                          </div>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  </SlideContainer>
                )}

              </AnimatePresence>
            </div>

            {/* ── SHARE BUTTON OVERLAY ── */}
            <AnimatePresence>
              {slides[currentSlide] === 'verdict' && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-10 left-8 right-8 z-[100] no-screenshot pointer-events-auto"
                >
                  <Button
                    onClick={shareStory}
                    className="w-full bg-white text-black hover:bg-white/90 rounded-2xl h-14 text-base font-bold flex items-center justify-center gap-2 shadow-[0_20px_50px_rgba(255,255,255,0.25)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Share2 className="w-5 h-5" /> Partager mon bilan
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── NAVIGATION ZONES ── */}
            <div className="absolute top-0 left-0 right-0 bottom-32 z-40 flex no-screenshot">
              <div
                className="flex-1 bg-transparent cursor-pointer pointer-events-auto"
                onClick={(e: any) => { e.stopPropagation(); handlePrevSlide(); }}
                onPointerDown={() => setIsPaused(true)}
                onPointerUp={() => setIsPaused(false)}
                onPointerCancel={() => setIsPaused(false)}
                onPointerLeave={() => setIsPaused(false)}
              />
              <div
                className="flex-1 bg-transparent cursor-pointer pointer-events-auto"
                onClick={(e: any) => { e.stopPropagation(); handleNextSlide(); }}
                onPointerDown={() => setIsPaused(true)}
                onPointerUp={() => setIsPaused(false)}
                onPointerCancel={() => setIsPaused(false)}
                onPointerLeave={() => setIsPaused(false)}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
