"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import { 
  X, Share2, Camera, Clapperboard, Award, Sparkles, MapPin, Film, Star, 
  Flame, Compass, Volume2, VolumeX, ChevronLeft, ChevronRight, Tv, Car
} from 'lucide-react';
import { useMonthlyWrapUp, WrapUpStats, KharjetOuting, MomentyMoment } from '@/hooks/use-monthly-wrapup';
import type { UserProfile } from '@/lib/firebase/firestore';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { wrapUpAudio } from '@/lib/wrapup-audio';
import { fetchCarCareMonthlyMileage, CarCareMonthlyStats } from '@/lib/carcare-service';
import { useAuth } from '@/hooks/use-auth';

type Props = {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  targetDate?: Date;
};

const SLIDE_DURATION = 7500;

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
export function MonthlyWrapUpModal({ user, isOpen, onClose, targetDate: passedTargetDate }: Props) {
  const [targetDate] = useState(() => passedTargetDate || new Date());
  const [placesWithZones, setPlacesWithZones] = useState<{ name: string; zone: string }[]>([]);
  const [isMuted, setIsMuted] = useState(false);

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

  const wrapUpDate = React.useMemo(() => new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1), [targetDate]);
  const monthKey = React.useMemo(() => `${wrapUpDate.getFullYear()}-${String(wrapUpDate.getMonth() + 1).padStart(2, '0')}`, [wrapUpDate]);
  const stats = useMonthlyWrapUp(user, wrapUpDate, placesWithZones);
  const { user: authUser } = useAuth();
  const effectiveEmail = React.useMemo(() => (user?.email || authUser?.email || '').trim().toLowerCase(), [user?.email, authUser?.email]);
  const [carCareStats, setCarCareStats] = useState<CarCareMonthlyStats | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    async function loadCarCare() {
      try {
        const context = {
          topPlace: stats?.topPlace?.name,
          topNeighborhood: stats?.topNeighborhood,
          topCategory: stats?.topCategory?.name,
          totalOutings: stats?.totalOutings,
          kharjetZone: stats?.kharjet?.topZone,
        };
        const data = await fetchCarCareMonthlyMileage(monthKey, effectiveEmail || undefined, context);
        if (isMounted) {
          setCarCareStats(data);
        }
      } catch (err) {
        console.warn('[MonthlyWrapUp] Erreur chargement CarCare:', err);
      }
    }

    loadCarCare();

    return () => {
      isMounted = false;
    };
  }, [isOpen, monthKey, effectiveEmail, stats?.topPlace?.name, stats?.topNeighborhood, stats?.totalOutings, stats?.kharjet?.topZone]);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const storyRef = useRef<HTMLDivElement>(null);

  // Sub-indices for multi-item slides
  const [activeKharjetIdx, setActiveKharjetIdx] = useState(0);
  const [activeMomentyIdx, setActiveMomentyIdx] = useState(0);

  // Sound management
  useEffect(() => {
    if (isOpen && stats) {
      wrapUpAudio.start(stats.monthIndex);
    } else {
      wrapUpAudio.stop();
    }
    return () => {
      wrapUpAudio.stop();
    };
  }, [isOpen, stats?.monthIndex]);

  useEffect(() => {
    if (isPaused) {
      wrapUpAudio.pause();
    } else {
      wrapUpAudio.resume();
    }
  }, [isPaused]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = wrapUpAudio.toggleMute();
    setIsMuted(muted);
  };

  const [cinemaPosters, setCinemaPosters] = useState<string[]>([]);
  useEffect(() => {
    if (!isOpen || !stats?.cinema?.movieTitles?.length) {
      setCinemaPosters(prev => prev.length === 0 ? prev : []);
      return;
    }
    
    async function fetchCinemaPosters() {
      try {
        const titles = stats!.cinema!.movieTitles;
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
    stats.kharjet && stats.kharjet.total > 0 ? 'kharjet' : null,
    stats.movies && stats.movies.total > 0 ? 'movies' : null,
    stats.series && stats.series.total > 0 ? 'series' : null,
    (stats.momentyMoments && stats.momentyMoments.length > 0) || stats.featuredMomentyImage || (carCareStats && carCareStats.mileage > 0) ? 'momenty' : null,
    'verdict',
  ].filter(Boolean) as string[] : [];

  useEffect(() => {
    if (isOpen) { 
      setCurrentSlide(0); 
      setProgress(0); 
      setIsPaused(false); 
      setActiveKharjetIdx(0);
      setActiveMomentyIdx(0);
    }
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
        cacheBust: false,
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

  const catEmoji = stats.topCategory?.name === 'Fast Food' ? '🍔' : stats.topCategory?.name === 'Brunch' ? '🥞' : stats.topCategory?.name === 'Café' ? '☕' : stats.topCategory?.name === 'Restaurant' ? '🍽️' : (stats.topCategory?.name === 'Kharjet' || stats.topCategory?.name === 'Balade') ? '✨' : '🎯';

  // Kharjet outings (all outings from Kol Youm & Momenty)
  const allKharjetOutings = stats.kharjet?.outings || [];
  const currentKharjet = allKharjetOutings[activeKharjetIdx] || allKharjetOutings[0];

  // Momenty moments
  const momentyMomentsList = stats.momentyMoments || [];
  const currentMomenty = momentyMomentsList[activeMomentyIdx] || (stats.featuredMomentyImage ? {
    id: 'feat',
    placeName: stats.topPlace?.name || 'Découverte',
    category: stats.topCategory?.name || 'Moment',
    imageUrl: stats.featuredMomentyImage,
    description: stats.featuredMomentyDish || 'Moment capturé',
    date: Date.now()
  } : null);

  const isInteractiveSlide = slides[currentSlide] === 'momenty' || slides[currentSlide] === 'kharjet';

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

            {/* ── HEADER CONTROLS (MUTE & CLOSE) ── */}
            <div className="absolute top-8 right-4 z-50 flex items-center gap-2 no-screenshot pointer-events-auto">
              {/* Sound toggle button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-md border border-white/20 text-white transition-transform active:scale-90 flex items-center gap-1.5 px-3 shadow-lg"
                onClick={toggleSound}
                title={isMuted ? "Activer la musique" : "Couper la musique"}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-white/60" />
                ) : (
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    {/* Dynamic Equalizer Waves */}
                    <span className="flex items-end gap-0.5 h-3.5">
                      <span className="w-0.5 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_100ms] h-2.5" />
                      <span className="w-0.5 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_300ms] h-3.5" />
                      <span className="w-0.5 bg-amber-400 rounded-full animate-[bounce_0.6s_infinite_200ms] h-1.5" />
                    </span>
                  </div>
                )}
              </motion.button>

              {/* Close button */}
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="p-2 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-md border border-white/20 text-white transition-transform active:scale-90 shadow-lg"
                onClick={onClose}
              >
                <X className="w-4 h-4 text-white" />
              </motion.button>
            </div>

            {/* ── SLIDES CONTENT ── */}
            <div ref={storyRef} className="relative w-full h-full overflow-hidden">
              {/* Global background noise */}
              <div className="absolute inset-0 opacity-[0.04] bg-[url('/noise.png')] mix-blend-overlay z-10 pointer-events-none" />

              <AnimatePresence mode="wait">

                {/* ══ INTRO ══════════════════════════════════════════════════════ */}
                {slides[currentSlide] === 'intro' && (
                  <SlideContainer key="intro" className="bg-gradient-to-br from-violet-950 via-purple-900 to-black">
                    <FloatingOrbs colors={['#7c3aed', '#db2777', '#6366f1']} />
                    <Particles />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col items-center text-center z-10">
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
                      <motion.p variants={itemVariants} className="text-xs font-bold uppercase tracking-[0.3em] text-purple-300 mb-3">
                        Récap du mois
                      </motion.p>
                      <motion.h1 variants={itemVariants} className="text-4xl font-black leading-tight mb-3 bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent">
                        {stats.monthName}
                      </motion.h1>
                      <motion.h2 variants={itemVariants} className="text-lg text-white/70 mb-8">
                        a été intense 🔥
                      </motion.h2>
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
                      <motion.div
                        variants={iconVariants}
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                        className="text-8xl mb-6 drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                      >
                        {catEmoji}
                      </motion.div>
                      <motion.div variants={itemVariants} className="bg-white/8 backdrop-blur-xl border border-white/10 rounded-3xl p-6 w-full shadow-[0_0_40px_rgba(219,39,119,0.15)]">
                        <motion.h1 variants={numberVariants} className="text-4xl font-black mb-2 text-white">
                          {stats.topCategory?.name}
                        </motion.h1>
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

                {/* ══ CINEMA OUTINGS (FILMS + SALLES) ═══════════════════════════ */}
                {slides[currentSlide] === 'cinema' && stats.cinema && (
                  <SlideContainer key="cinema">
                    {cinemaPosters.length > 0 ? (
                      <>
                        <CollageBackground posters={cinemaPosters} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/40 z-[1]" />
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-orange-900 to-black" />
                        <FloatingOrbs colors={['#78350f', '#92400e', '#b45309']} />
                      </>
                    )}
                    
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 flex flex-col items-center text-center w-full px-2">
                      <motion.div variants={iconVariants} className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-400/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_40px_rgba(249,115,22,0.3)] mb-3">
                        <Clapperboard className="w-8 h-8 text-orange-400" />
                      </motion.div>
                      
                      <motion.p variants={itemVariants} className="text-[11px] uppercase tracking-[0.3em] text-orange-300 font-bold mb-1">
                        Sortie Grand Écran
                      </motion.p>
                      
                      <motion.div variants={numberVariants} className="text-center mb-4">
                        <p className="text-5xl font-black text-white leading-none">
                          <CountUp to={stats.cinema.total} />
                        </p>
                        <p className="text-white/60 text-xs mt-1 uppercase tracking-wider font-semibold">
                          {stats.cinema.total > 1 ? 'séances au ciné' : 'séance au ciné'}
                        </p>
                      </motion.div>

                      {/* Display movie names and cinema venues */}
                      <motion.div variants={itemVariants} className="w-full max-h-[290px] overflow-y-auto space-y-2.5 px-1 py-1 no-screenshot">
                        {stats.cinema.sessions && stats.cinema.sessions.length > 0 ? (
                          stats.cinema.sessions.map((session, idx) => (
                            <motion.div
                              key={idx}
                              variants={itemVariants}
                              className="bg-black/60 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-3 text-left shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/30 mt-0.5 flex-shrink-0">
                                  <Film className="w-4 h-4 text-orange-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-black text-sm leading-snug line-clamp-2">
                                    {session.title}
                                  </p>
                                  {session.cinemaPlace && (
                                    <div className="flex items-center gap-1 mt-1 text-orange-200/90 text-xs">
                                      <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0" />
                                      <span className="font-semibold truncate">{session.cinemaPlace}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <>
                            {stats.cinema.movieTitles.map((title, idx) => (
                              <motion.div
                                key={idx}
                                variants={itemVariants}
                                className="bg-black/60 backdrop-blur-xl border border-orange-500/30 rounded-2xl p-3 text-left flex items-center gap-2.5"
                              >
                                <Film className="w-4 h-4 text-orange-400 flex-shrink-0" />
                                <p className="text-white font-bold text-sm truncate">{title}</p>
                              </motion.div>
                            ))}
                            {stats.cinema.topCinema && (
                              <motion.div variants={itemVariants} className="bg-black/50 backdrop-blur-xl border border-orange-500/20 rounded-2xl px-4 py-2.5 text-center">
                                <p className="text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Salle / Cinéma</p>
                                <p className="text-sm font-bold text-white">{stats.cinema.topCinema}</p>
                              </motion.div>
                            )}
                          </>
                        )}
                      </motion.div>
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ KHARJET & ESCAPADES (AVEC PHOTOS & DESCRIPTIONS KOL YOUM / MOMENTY) ══ */}
                {slides[currentSlide] === 'kharjet' && stats.kharjet && (
                  <SlideContainer key="kharjet" className="bg-gradient-to-tr from-emerald-950 via-teal-900 to-black">
                    <FloatingOrbs colors={['#059669', '#0d9488', '#0284c7']} />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 flex flex-col items-center w-full px-2">
                      
                      <motion.div variants={iconVariants} className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] mb-2">
                        <Compass className="w-7 h-7 text-emerald-300" />
                      </motion.div>
                      
                      <motion.p variants={itemVariants} className="text-[11px] uppercase tracking-[0.3em] text-emerald-300 font-bold mb-1">
                        Kharjet & Escapades
                      </motion.p>
                      
                      <motion.div variants={numberVariants} className="text-center mb-2">
                        <p className="text-4xl font-black text-white leading-none">
                          <CountUp to={stats.kharjet.total} />
                        </p>
                        <p className="text-white/60 text-xs mt-0.5 uppercase tracking-wider font-semibold">
                          {stats.kharjet.total > 1 ? 'escapades ce mois' : 'escapade ce mois'}
                        </p>
                      </motion.div>

                      {/* Interactive Card for All Kharjet Outings */}
                      {allKharjetOutings.length > 0 && (
                        <motion.div variants={itemVariants} className="w-full flex flex-col items-center relative">
                          <div className="bg-white p-3 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform rotate-[-1deg] w-full max-w-[280px] pointer-events-auto flex flex-col">
                            
                            {/* Photo (Momenty photo or Thematic photo) */}
                            {currentKharjet?.imageUrl ? (
                              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 rounded-lg group">
                                <motion.img
                                  key={currentKharjet.imageUrl}
                                  src={currentKharjet.imageUrl.startsWith('/') ? currentKharjet.imageUrl : `/api/image-proxy?url=${encodeURIComponent(currentKharjet.imageUrl)}`}
                                  alt={currentKharjet.placeName}
                                  className="w-full h-full object-cover"
                                  initial={{ scale: 1.08 }}
                                  animate={{ scale: 1 }}
                                  transition={{ duration: 0.4 }}
                                />
                                {allKharjetOutings.length > 1 && (
                                  <div className="absolute inset-0 flex items-center justify-between px-1.5 no-screenshot">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveKharjetIdx((prev) => (prev - 1 + allKharjetOutings.length) % allKharjetOutings.length);
                                      }}
                                      className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm border border-white/20 transition-transform active:scale-90 shadow-md"
                                      title="Sortie précédente"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveKharjetIdx((prev) => (prev + 1) % allKharjetOutings.length);
                                      }}
                                      className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm border border-white/20 transition-transform active:scale-90 shadow-md"
                                      title="Sortie suivante"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="relative aspect-[4/2.5] overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 rounded-lg flex flex-col items-center justify-center p-3 text-center">
                                <Compass className="w-8 h-8 text-emerald-200 mb-1 opacity-90 animate-pulse" />
                                <p className="text-white font-bold text-xs">Escapade Plein Air</p>
                                {allKharjetOutings.length > 1 && (
                                  <div className="absolute inset-0 flex items-center justify-between px-1.5 no-screenshot">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveKharjetIdx((prev) => (prev - 1 + allKharjetOutings.length) % allKharjetOutings.length);
                                      }}
                                      className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm border border-white/20 transition-transform active:scale-90 shadow-md"
                                      title="Sortie précédente"
                                    >
                                      <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveKharjetIdx((prev) => (prev + 1) % allKharjetOutings.length);
                                      }}
                                      className="p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm border border-white/20 transition-transform active:scale-90 shadow-md"
                                      title="Sortie suivante"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Card Details & Description */}
                            <div className="pt-2.5 pb-0.5 flex flex-col gap-1 text-left">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-[#111] font-black text-sm leading-snug truncate">
                                  {currentKharjet?.placeName}
                                </p>
                                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                  <Compass className="w-2.5 h-2.5 text-emerald-600" />
                                  {allKharjetOutings.length > 1 ? `${activeKharjetIdx + 1}/${allKharjetOutings.length}` : 'Kharja'}
                                </span>
                              </div>

                              {currentKharjet?.zone && (
                                <p className="text-emerald-700 text-xs font-semibold">
                                  📍 {currentKharjet.zone}
                                </p>
                              )}

                              {/* Description from Kol Youm or Momenty */}
                              {currentKharjet?.description ? (
                                <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-200/90 my-0.5 max-h-[80px] overflow-y-auto">
                                  <p className="text-neutral-800 font-sans text-xs leading-relaxed font-medium">
                                    💬 {currentKharjet.description}
                                  </p>
                                </div>
                              ) : null}

                              <div className="flex justify-between items-center text-[9px] text-neutral-400 font-medium mt-0.5">
                                <span>{currentKharjet ? new Date(currentKharjet.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : stats.monthName}</span>
                                <span className="font-bold text-neutral-600">
                                  {currentKharjet?.source === 'momenty' ? '📸 Momenty' : '✨ Kol Youm'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Navigation Dots */}
                          {allKharjetOutings.length > 1 && (
                            <div className="flex items-center gap-1.5 mt-2.5 no-screenshot pointer-events-auto">
                              {allKharjetOutings.map((_, i) => (
                                <button
                                  key={i}
                                  onClick={(e) => { e.stopPropagation(); setActiveKharjetIdx(i); }}
                                  className={`h-2 rounded-full transition-all ${i === activeKharjetIdx ? 'w-6 bg-emerald-400' : 'w-2 bg-white/30 hover:bg-white/50'}`}
                                />
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}

                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ MOVIES (TFARREJ) - AVEC NOMS DES FILMS ══════════════════ */}
                {slides[currentSlide] === 'movies' && stats.movies && (
                  <SlideContainer key="movies">
                    <CollageBackground posters={stats.movies.posters} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35 z-[1]" />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 flex flex-col items-center w-full px-2">
                      <motion.div variants={iconVariants} className="w-16 h-16 rounded-2xl bg-blue-500/20 border border-blue-400/30 p-3 mb-3 backdrop-blur-md shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Clapperboard className="w-10 h-10 text-blue-400" />
                      </motion.div>
                      <motion.p variants={itemVariants} className="text-xs uppercase tracking-[0.3em] text-blue-300 font-bold mb-1">L'Instant Ciné</motion.p>
                      <motion.div variants={numberVariants} className="text-center mb-3">
                        <p className="text-6xl font-black text-white leading-none"><CountUp to={stats.movies.total} /></p>
                        <p className="text-white/60 text-xs uppercase tracking-wider font-semibold mt-0.5">films vus ce mois</p>
                      </motion.div>

                      {/* Small list of watched film titles */}
                      {stats.movies.titles && stats.movies.titles.length > 0 && (
                        <motion.div variants={itemVariants} className="w-full max-h-[140px] overflow-y-auto mb-3 px-1 py-1 no-screenshot">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {stats.movies.titles.map((title, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] font-medium bg-black/60 backdrop-blur-md border border-blue-400/25 text-blue-100 px-2.5 py-1 rounded-xl shadow-xs"
                              >
                                🎬 {title}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {stats.movies.featured && (
                        <motion.div variants={itemVariants} className="bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-blue-500/20 text-center w-full max-w-[85%] shadow-[0_0_30px_rgba(59,130,246,0.15)]">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <p className="text-[9px] text-blue-300 uppercase tracking-widest font-bold">Coup de cœur</p>
                          </div>
                          <h3 className="text-sm font-bold line-clamp-1">{stats.movies.featured.title}</h3>
                        </motion.div>
                      )}
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ SERIES (TFARREJ) - AVEC NOMS DES SÉRIES ═════════════════ */}
                {slides[currentSlide] === 'series' && stats.series && (
                  <SlideContainer key="series">
                    <CollageBackground posters={stats.series.posters} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35 z-[1]" />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="relative z-10 flex flex-col items-center w-full px-2">
                      <motion.div variants={iconVariants} className="w-16 h-16 rounded-2xl bg-purple-500/20 border border-purple-400/30 p-3 mb-3 backdrop-blur-md shadow-[0_0_30px_rgba(168,85,247,0.3)]">
                        <Tv className="w-10 h-10 text-purple-400" />
                      </motion.div>
                      <motion.p variants={itemVariants} className="text-xs uppercase tracking-[0.3em] text-purple-300 font-bold mb-1">L'Instant Séries</motion.p>
                      <motion.div variants={numberVariants} className="text-center mb-3">
                        <p className="text-6xl font-black text-white leading-none"><CountUp to={stats.series.total} /></p>
                        <p className="text-white/60 text-xs uppercase tracking-wider font-semibold mt-0.5">séries vues ce mois</p>
                      </motion.div>

                      {/* Small list of watched series titles */}
                      {stats.series.titles && stats.series.titles.length > 0 && (
                        <motion.div variants={itemVariants} className="w-full max-h-[140px] overflow-y-auto mb-3 px-1 py-1 no-screenshot">
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {stats.series.titles.map((title, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] font-medium bg-black/60 backdrop-blur-md border border-purple-400/25 text-purple-100 px-2.5 py-1 rounded-xl shadow-xs"
                              >
                                📺 {title}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {stats.series.featured && (
                        <motion.div variants={itemVariants} className="bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-purple-500/20 text-center w-full max-w-[85%] shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <p className="text-[9px] text-purple-300 uppercase tracking-widest font-bold">Coup de cœur</p>
                          </div>
                          <h3 className="text-sm font-bold line-clamp-1">{stats.series.featured.title}</h3>
                        </motion.div>
                      )}
                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ MOMENTY & ESCAPADES CARCARE ═══════════════════════════ */}
                {slides[currentSlide] === 'momenty' && (
                  <SlideContainer key="momenty" className="bg-neutral-950">
                    <FloatingOrbs colors={['#333', '#1e1b4b', '#0f172a']} />
                    <motion.div 
                      variants={containerVariants} initial="hidden" animate="show"
                      className="relative z-10 w-full px-4 flex flex-col items-center"
                    >
                      {/* Interactive Card for Momenty (si photos disponibles) */}
                      {currentMomenty ? (
                        <motion.div 
                          variants={iconVariants}
                          animate={{ rotate: [-0.5, 1, -1, 0.5] }}
                          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                          className="bg-white p-3 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform rotate-[-1.5deg] w-full max-w-[280px] pointer-events-auto flex flex-col"
                        >
                          <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 rounded-lg group">
                            {currentMomenty.imageUrl && (
                              <motion.img
                                key={currentMomenty.imageUrl}
                                src={currentMomenty.imageUrl.startsWith('/') ? currentMomenty.imageUrl : `/api/image-proxy?url=${encodeURIComponent(currentMomenty.imageUrl)}`}
                                alt="Momenty"
                                className="absolute inset-0 w-full h-full object-cover"
                                initial={{ scale: 1.1 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.4 }}
                              />
                            )}

                            {/* Navigation buttons directly on the photo */}
                            {momentyMomentsList.length > 1 && (
                              <div className="absolute inset-0 flex items-center justify-between px-1.5 no-screenshot">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMomentyIdx((prev) => (prev - 1 + momentyMomentsList.length) % momentyMomentsList.length);
                                  }}
                                  className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm border border-white/20 transition-transform active:scale-90 shadow-md"
                                  title="Moment précédent"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMomentyIdx((prev) => (prev + 1) % momentyMomentsList.length);
                                  }}
                                  className="p-2 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-sm border border-white/20 transition-transform active:scale-90 shadow-md"
                                  title="Moment suivant"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className="pt-2 pb-0.5 flex flex-col gap-1 text-left">
                            <div className="flex items-center justify-between gap-1">
                              <p className="text-[#111] font-black text-sm leading-snug truncate">
                                {currentMomenty.placeName}
                              </p>
                              <span className="inline-flex items-center gap-1 text-[9px] text-pink-600 font-bold bg-pink-50 px-2 py-0.5 rounded-full flex-shrink-0">
                                <Camera className="w-2.5 h-2.5 text-pink-500" />
                                {momentyMomentsList.length > 1 ? `${activeMomentyIdx + 1}/${momentyMomentsList.length}` : 'Momenty'}
                              </span>
                            </div>

                            {/* Prominent Momenty description */}
                            {currentMomenty.description ? (
                              <div className="bg-neutral-50 rounded-lg p-2 border border-neutral-200/90 my-0.5 max-h-[65px] overflow-y-auto">
                                <p className="text-neutral-800 font-serif italic text-xs leading-relaxed font-medium">
                                  « {currentMomenty.description} »
                                </p>
                              </div>
                            ) : null}

                            <div className="flex justify-between items-center text-[9px] text-neutral-400 font-medium mt-0.5">
                              <span>{new Date(currentMomenty.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
                              <span className="uppercase tracking-widest font-bold text-neutral-500">{currentMomenty.category}</span>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        /* Carte d'en-tête si pas de photo Momenty ce mois mais présence de stats route */
                        <motion.div 
                          variants={iconVariants}
                          className="bg-gradient-to-br from-indigo-950 via-slate-900 to-black p-5 rounded-2xl border border-indigo-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.6)] w-full max-w-[280px] text-center flex flex-col items-center mb-1"
                        >
                          <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_30px_rgba(99,102,241,0.3)] mb-2.5">
                            <Car className="w-7 h-7 text-indigo-400" />
                          </div>
                          <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-300 font-bold mb-0.5">
                            Sur la Route
                          </p>
                          <h3 className="text-lg font-black text-white">Bilan Kilométrique</h3>
                        </motion.div>
                      )}
                      
                      {/* Pagination if multiple Momenty moments */}
                      {momentyMomentsList.length > 1 && (
                        <div className="flex items-center gap-1.5 mt-2.5 no-screenshot pointer-events-auto">
                          {momentyMomentsList.map((_, i) => (
                            <button
                              key={i}
                              onClick={(e) => { e.stopPropagation(); setActiveMomentyIdx(i); }}
                              className={`h-1.5 rounded-full transition-all ${i === activeMomentyIdx ? 'w-5 bg-pink-500' : 'w-1.5 bg-white/30 hover:bg-white/50'}`}
                            />
                          ))}
                        </div>
                      )}

                      {/* ══ CARCARE × KOL YOUM : CARTE EMBELLIE & CONNECTÉE ══ */}
                      {carCareStats && (
                        <motion.div
                          variants={itemVariants}
                          className="w-full max-w-[290px] mt-2.5 relative overflow-hidden rounded-2xl p-3 border border-indigo-400/35 bg-gradient-to-br from-slate-900/95 via-indigo-950/90 to-purple-950/90 shadow-[0_12px_36px_rgba(79,70,229,0.35)] backdrop-blur-2xl pointer-events-auto"
                        >
                          {/* Halos de lumière ambiants */}
                          <div className="absolute -top-8 -right-8 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl pointer-events-none" />
                          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />

                          {/* En-tête de la carte */}
                          <div className="relative z-10 flex items-center justify-between pb-2 border-b border-white/10">
                            <div className="flex items-center gap-1.5">
                              <div className="p-1 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-400/40 text-indigo-300 shadow-sm flex items-center justify-center">
                                <Car className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[9.5px] uppercase tracking-[0.22em] font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
                                Car Care × Kol Youm
                              </span>
                            </div>
                            {carCareStats.vehicleName && carCareStats.vehicleName !== 'Aucun véhicule' && carCareStats.vehicleName !== 'CarCare' && (
                              <span className="text-[9.5px] font-bold text-white/90 bg-white/10 px-2 py-0.5 rounded-full border border-white/15 truncate max-w-[105px]" title={carCareStats.vehicleName}>
                                {carCareStats.vehicleName}
                              </span>
                            )}
                          </div>

                          {/* Section Métrique Principale */}
                          <div className="relative z-10 flex items-baseline justify-between pt-2.5 pb-1">
                            <div>
                              <p className="text-2xl font-black text-white leading-none tracking-tight flex items-baseline gap-1">
                                <CountUp to={carCareStats.mileage} />
                                <span className="text-xs font-black text-indigo-300 tracking-normal">KM</span>
                              </p>
                              <p className="text-[9px] uppercase tracking-wider text-white/50 mt-0.5 font-semibold">
                                au compteur ce mois
                              </p>
                            </div>
                            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gradient-to-r ${carCareStats.assessment.colorClass} border ${carCareStats.assessment.badgeBorder} flex items-center gap-1.5 shadow-sm`}>
                              <span>{carCareStats.assessment.emoji}</span>
                              <span>{carCareStats.assessment.label}</span>
                            </span>
                          </div>

                          {/* Barre de jauge / progression kilométrique */}
                          <div className="relative z-10 w-full h-1 bg-white/10 rounded-full overflow-hidden my-1.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${carCareStats.assessment.progressPercent}%` }}
                              transition={{ duration: 1.2, ease: "easeOut" }}
                              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full"
                            />
                          </div>

                          {/* Puces de connexion Kol Youm (Lieux et Sorties réels) */}
                          {(stats?.topPlace || stats?.topNeighborhood || (stats?.totalOutings && stats.totalOutings > 0)) && (
                            <div className="relative z-10 flex items-center gap-1 flex-wrap my-1.5">
                              {stats?.topPlace && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-pink-300 bg-pink-500/15 border border-pink-500/30 px-1.5 py-0.5 rounded-md truncate max-w-[130px]" title={stats.topPlace.name}>
                                  <MapPin className="w-2.5 h-2.5 text-pink-400 flex-shrink-0" />
                                  <span className="truncate">{stats.topPlace.name}</span>
                                </span>
                              )}
                              {stats?.topNeighborhood && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 rounded-md truncate max-w-[110px]" title={stats.topNeighborhood}>
                                  <Compass className="w-2.5 h-2.5 text-indigo-400 flex-shrink-0" />
                                  <span className="truncate">{stats.topNeighborhood}</span>
                                </span>
                              )}
                              {stats?.totalOutings && stats.totalOutings > 0 && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md">
                                  <Flame className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                                  <span>{stats.totalOutings} sorties</span>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Note adaptée et contextualisée */}
                          <div className="relative z-10 mt-1 bg-black/55 rounded-xl p-2 border border-indigo-500/25 shadow-inner">
                            <p className="text-[10.5px] text-indigo-100/95 leading-relaxed font-medium italic">
                              « {carCareStats.assessment.note} »
                            </p>
                          </div>
                        </motion.div>
                      )}

                      <motion.div variants={itemVariants} className="mt-2.5 flex flex-col items-center gap-0.5">
                        <p className="text-[9px] uppercase tracking-[0.2em] text-white/40 font-bold">
                          Momenty & Car Care • Bilan Mensuel
                        </p>
                      </motion.div>

                    </motion.div>
                  </SlideContainer>
                )}

                {/* ══ VERDICT (BILAN OFFICIEL) ══════════════════════════════════ */}
                {slides[currentSlide] === 'verdict' && (
                  <SlideContainer key="verdict" className="bg-gradient-to-b from-slate-900 via-indigo-950 to-black">
                    <FloatingOrbs colors={['#4f46e5', '#7c3aed', '#1d4ed8']} />
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="flex flex-col items-center w-full z-10">
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

                        {/* Full-width: Côté Assiette + Boisson (Clean food only!) */}
                        <motion.div variants={itemVariants} className="col-span-2 bg-white/8 rounded-2xl p-3.5 backdrop-blur-sm border border-white/8 flex items-center justify-between">
                          <div>
                            <p className="text-[9px] uppercase text-white/40 tracking-widest mb-1 font-semibold">Côté Assiette</p>
                            <p className="text-sm font-bold text-white truncate max-w-[130px]">
                              {stats.topDish?.name || '—'}
                            </p>
                          </div>
                          <div className="w-px h-8 bg-white/10 mx-2" />
                          <div className="text-right">
                            <p className="text-[9px] uppercase text-white/40 tracking-widest mb-1 font-semibold">Boisson Préférée</p>
                            <p className="text-sm font-bold text-white">
                              {stats.topBeverage?.name || '—'}
                            </p>
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

            {/* ── NAVIGATION ZONES (Only active on non-interactive slides or outside interactive cards) ── */}
            {!isInteractiveSlide && (
              <div className="absolute top-0 left-0 right-0 bottom-32 z-30 flex no-screenshot">
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
            )}

            {/* On interactive slides, top and bottom zones remain available for story navigation */}
            {isInteractiveSlide && (
              <>
                <div 
                  className="absolute top-0 left-0 right-0 h-24 z-30 pointer-events-auto cursor-pointer"
                  onClick={(e: any) => { e.stopPropagation(); handlePrevSlide(); }}
                />
                <div 
                  className="absolute bottom-0 left-0 right-0 h-24 z-30 pointer-events-auto cursor-pointer"
                  onClick={(e: any) => { e.stopPropagation(); handleNextSlide(); }}
                />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
