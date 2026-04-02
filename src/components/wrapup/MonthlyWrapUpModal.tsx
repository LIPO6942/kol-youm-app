"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2, Download, ArrowRight, Camera, Clapperboard, Award, Sparkles, MapPin, Film } from 'lucide-react';
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

// Durée de chaque slide en ms
const SLIDE_DURATION = 6000;

// Composant pour l'arrière-plan en collage
function CollageBackground({ posters }: { posters: string[] }) {
  if (!posters || posters.length === 0) return null;
  
  // Limiter à 9 pour un collage 3x3 propre
  const displayPosters = posters.slice(0, 9);
  const count = displayPosters.length;
  
  let gridClass = "grid-cols-1";
  if (count === 2) gridClass = "grid-cols-2";
  else if (count >= 3 && count <= 4) gridClass = "grid-cols-2 grid-rows-2";
  else if (count >= 5) gridClass = "grid-cols-3 grid-rows-3 text-xs"; // Petit texte si besoin

  return (
    <div className={`absolute inset-0 z-0 grid ${gridClass} gap-0.5 opacity-60 blur-[1px] scale-105`}>
      {displayPosters.map((url, i) => (
        <div key={i} className="relative w-full h-full overflow-hidden">
           <img 
             src={url.startsWith('http') ? url : `https://image.tmdb.org/t/p/w500${url}`} 
             alt="Poster"
             className="w-full h-full object-cover"
           />
        </div>
      ))}
    </div>
  );
}

export function MonthlyWrapUpModal({ user, isOpen, onClose, targetDate = new Date() }: Props) {
  // Le wrap-up concerne toujours le mois précédent par rapport à la date cible
  const previousMonthDate = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);
  const stats = useMonthlyWrapUp(user, previousMonthDate);

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const storyRef = useRef<HTMLDivElement>(null);

  const slides = stats ? [
    'intro',
    stats.topCategory ? 'category' : null,
    stats.topPlace ? 'place' : null,
    stats.movies && stats.movies.total > 0 ? 'movies' : null,
    stats.series && stats.series.total > 0 ? 'series' : null,
    stats.featuredMomentyImage ? 'momenty' : null,
    'verdict'
  ].filter(Boolean) as string[] : [];

  // ... (rest of the logic stays similar)
  
  // (Moving to the return part to update slides rendering)

  // Only reset when the modal opens/closes — NOT when stats ref changes
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0);
      setProgress(0);
      setIsPaused(false);
    }
  }, [isOpen]);

  // Keep slides.length in a ref to avoid stale closures in the timer
  const slidesLengthRef = useRef(slides.length);
  slidesLengthRef.current = slides.length;

  useEffect(() => {
    if (!isOpen || !stats || isPaused) return;

    const intervalId = setInterval(() => {
      setProgress((oldProgress) => {
        if (oldProgress >= 100) {
          setCurrentSlide((s) => {
            if (s < slidesLengthRef.current - 1) {
              return s + 1;
            }
            clearInterval(intervalId); // End of stories
            return s;
          });
          return 0; // Reset progress for next slide
        }
        // Increment progress smoothly (assumes 50ms interval)
        return oldProgress + (100 / (SLIDE_DURATION / 50));
      });
    }, 50);

    return () => clearInterval(intervalId);
  }, [isOpen, stats, isPaused]);

  const handleNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((s) => s + 1);
      setProgress(0);
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((s) => s - 1);
      setProgress(0);
    }
  };

  const shareStory = async () => {
    if (!storyRef.current) return;
    try {
      const dataUrl = await toPng(storyRef.current, { cacheBust: true, filter: (img) => !img.classList?.contains('no-screenshot') });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'wrapup.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Mon Récapitulatif Kol Youm',
          text: 'Découvrez mon bilan du mois sur Kol Youm !'
        });
      } else {
        // Fallback for desktop: download
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `kolyoum_wrapup_${stats?.monthName.replace(' ', '_')}.png`;
        a.click();
      }
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  if (!stats || slides.length === 0) {
    if (isOpen) {
       // Auto-close if completely invalid
       setTimeout(onClose, 0);
    }
    return null;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black sm:bg-black/90"
        >
          <div className="relative w-full h-full sm:max-w-md sm:h-[85vh] sm:rounded-[40px] overflow-hidden bg-black text-white flex shadow-2xl">
        
        {/* PROGRESS BARS */}
        <div className="absolute top-4 left-0 right-0 z-50 flex gap-1 px-4">
          {slides.map((_, index) => (
            <div key={index} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-75"
                style={{ 
                  width: index < currentSlide ? '100%' : index === currentSlide ? `${progress}%` : '0%' 
                }}
              />
            </div>
          ))}
        </div>

        {/* CONTROLS */}
        <button className="absolute top-8 right-4 z-50 p-2 bg-black/20 rounded-full backdrop-blur-md no-screenshot" onClick={onClose}>
          <X className="w-5 h-5 text-white" />
        </button>

        {/* SLIDES CONTENT */}
        <div ref={storyRef} className="relative w-full h-full flex items-center justify-center p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-black overflow-hidden pointer-events-none">
          {/* Optional Noise Texture Overlay */}
          <div className="absolute inset-0 opacity-20 mix-blend-overlay bg-[url('/noise.png')]"></div>

          <AnimatePresence mode="wait">
            {slides[currentSlide] === 'intro' && (
              <SlideContainer key="intro">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-8 backdrop-blur-md"
                >
                  <Sparkles className="w-12 h-12 text-yellow-300" />
                </motion.div>
                <h2 className="text-3xl font-black font-headline text-center leading-tight mb-4">
                  {stats.monthName} a été intense.
                </h2>
                <p className="text-xl text-center text-white/80">
                  Tu as effectué <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">{stats.totalOutings} sorties</span> ce mois-ci.
                </p>
              </SlideContainer>
            )}

            {slides[currentSlide] === 'category' && (
              <SlideContainer key="category" className="bg-gradient-to-bl from-pink-700 via-purple-800 to-black">
                <h2 className="text-2xl font-bold mb-8 text-white/50">L'obsession du mois</h2>
                <motion.div 
                  initial={{ rotate: -10, y: 50 }}
                  animate={{ rotate: 0, y: 0 }}
                  className="bg-white/10 p-8 rounded-3xl border border-white/20 backdrop-blur-md text-center"
                >
                  <div className="text-7xl mb-4">
                    {stats.topCategory?.name === 'Fast Food' ? '🍔' : 
                     stats.topCategory?.name === 'Brunch' ? '🥞' : 
                     stats.topCategory?.name === 'Café' ? '☕' : '🍽️'}
                  </div>
                  <h1 className="text-4xl font-black mb-2">{stats.topCategory?.name}</h1>
                  <p className="text-lg text-white/70 mb-4">
                    Cela représente <span className="font-bold text-white">{stats.topCategory?.percentage}%</span> de tes sorties globales !
                  </p>
                  {stats.topDay && (
                    <div className="text-sm font-medium uppercase tracking-widest text-pink-300">
                      Survient surtout les <span className="text-white underline decoration-pink-500 underline-offset-4">{stats.topDay.name}s</span>
                    </div>
                  )}
                </motion.div>
              </SlideContainer>
            )}

            {slides[currentSlide] === 'place' && (
              <SlideContainer key="place" className="bg-gradient-to-tr from-emerald-900 via-teal-900 to-black">
                <MapPin className="w-16 h-16 text-emerald-400 mb-6" />
                <h2 className="text-2xl font-bold mb-2 text-white/70">Ton Quartier Général</h2>
                <div className="text-center mb-6">
                  <h1 className="text-5xl font-black text-white drop-shadow-lg leading-tight">
                    {stats.topPlace?.name}
                  </h1>
                  {stats.topNeighborhood && (
                    <p className="text-emerald-300 font-medium uppercase tracking-tighter mt-1">
                      Dans le quartier de {stats.topNeighborhood.name}
                    </p>
                  )}
                </div>
                <p className="text-xl text-emerald-200 bg-emerald-950/50 px-6 py-2 rounded-full border border-emerald-800">
                  Visité {stats.topPlace?.count} fois
                </p>
              </SlideContainer>
            )}

            {slides[currentSlide] === 'movies' && stats.movies && (
              <SlideContainer key="movies">
                <CollageBackground posters={stats.movies.posters} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-0" />
                <div className="relative z-10 flex flex-col items-center">
                  <Clapperboard className="w-16 h-16 text-blue-500 mb-6" />
                  <h2 className="text-2xl font-bold mb-4 text-white/80">L'Instant Ciné</h2>
                  <div className="text-center mb-8">
                    <span className="text-6xl font-black text-white">{stats.movies.total}</span>
                    <span className="block text-xl text-white/60">films vus</span>
                  </div>
                  {stats.movies.featured && (
                    <div className="bg-black/60 p-4 rounded-xl border border-white/10 text-center backdrop-blur-md max-w-[80%]">
                      <p className="text-sm text-blue-400 uppercase tracking-widest font-bold mb-1">Coup de cœur récent</p>
                      <h3 className="text-xl font-bold line-clamp-2">{stats.movies.featured.title}</h3>
                    </div>
                  )}
                </div>
              </SlideContainer>
            )}

            {slides[currentSlide] === 'series' && stats.series && (
              <SlideContainer key="series">
                <CollageBackground posters={stats.series.posters} />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent z-0" />
                <div className="relative z-10 flex flex-col items-center">
                  <Film className="w-16 h-16 text-purple-500 mb-6" />
                  <h2 className="text-2xl font-bold mb-4 text-white/80">L'Instant Séries</h2>
                  <div className="text-center mb-8">
                    <span className="text-6xl font-black text-white">{stats.series.total}</span>
                    <span className="block text-xl text-white/60">séries vues</span>
                  </div>
                  {stats.series.featured && (
                    <div className="bg-black/60 p-4 rounded-xl border border-white/10 text-center backdrop-blur-md max-w-[80%]">
                      <p className="text-sm text-purple-400 uppercase tracking-widest font-bold mb-1">Coup de cœur récent</p>
                      <h3 className="text-xl font-bold line-clamp-2">{stats.series.featured.title}</h3>
                    </div>
                  )}
                </div>
              </SlideContainer>
            )}

            {slides[currentSlide] === 'momenty' && (
              <SlideContainer key="momenty" className="p-0">
                {stats.featuredMomentyImage && (
                  <div 
                    className="absolute inset-0 w-full h-full"
                    style={{ backgroundImage: `url(${stats.featuredMomentyImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                
                <div className="absolute inset-0 p-8 flex flex-col justify-end">
                  <Camera className="w-10 h-10 text-white/80 mb-4" />
                  <p className="text-lg text-white/80 font-semibold uppercase tracking-wider mb-2">
                    {stats.topDish ? 'Votre péché mignon du mois' : 'Momenty du mois'}
                  </p>
                  <h2 className="text-4xl font-black leading-tight drop-shadow-xl">
                    {stats.topDish ? stats.topDish.name : stats.featuredMomentyDish}
                  </h2>
                </div>
              </SlideContainer>
            )}

            {slides[currentSlide] === 'verdict' && (
              <SlideContainer key="verdict" className="bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900">
                <Award className="w-20 h-20 text-yellow-400 mb-6 drop-shadow-lg" />
                <h2 className="text-xl font-bold mb-4 text-center text-white/70">Bilan Officiel</h2>
                <h1 className="text-4xl font-black text-center mb-10 leading-tight">
                  {stats.userPersona}
                </h1>

                <div className="grid grid-cols-2 gap-3 w-full mb-8">
                   <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                     <p className="text-[10px] uppercase text-white/50 mb-1">Sorties</p>
                     <p className="text-xl font-bold">{stats.totalOutings}</p>
                   </div>
                   <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                     <p className="text-[10px] uppercase text-white/50 mb-1">Tfarrej</p>
                     <p className="text-xl font-bold">{stats.totalMovies}</p>
                   </div>
                   
                   <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5 overflow-hidden">
                     <p className="text-[10px] uppercase text-white/50 mb-1">Quartier Top</p>
                     <p className="text-sm font-bold truncate">{stats.topNeighborhood?.name || "—"}</p>
                   </div>
                   <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5">
                     <p className="text-[10px] uppercase text-white/50 mb-1">Jour Favori</p>
                     <p className="text-sm font-bold">{stats.topDay?.name || "—"}</p>
                   </div>

                   <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/5 col-span-2 flex items-center justify-between">
                     <div>
                       <p className="text-[10px] uppercase text-white/50 mb-1">Côté Assiette</p>
                       <p className="text-sm font-bold truncate max-w-[150px]">{stats.topDish?.name || "—"}</p>
                     </div>
                     <div className="text-right">
                       <p className="text-[10px] uppercase text-white/50 mb-1">Boisson Préférée</p>
                       <p className="text-sm font-bold">{stats.topBeverage?.name || "—"}</p>
                     </div>
                   </div>
                </div>
                
                <div className="pointer-events-auto no-screenshot z-[60] relative">
                  <Button onClick={shareStory} className="w-full bg-white text-black hover:bg-white/90 rounded-full h-14 text-lg font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    <Share2 className="w-5 h-5" /> Partager mon profil
                  </Button>
                </div>
              </SlideContainer>
            )}
          </AnimatePresence>
        </div>

        {/* CLICKABLE AREAS FOR NAVIGATION - MOVED AFTER CONTENT TO ENSURE TOP PRIORITY */}
        <div className="absolute inset-0 z-40 flex no-screenshot pointer-events-auto">
          <div 
            className="flex-1 bg-transparent cursor-pointer"
            onClick={(e) => { e.stopPropagation(); handlePrevSlide(); }}
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerCancel={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
          />
          <div 
            className="flex-1 bg-transparent cursor-pointer"
            onClick={(e) => { e.stopPropagation(); handleNextSlide(); }}
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

// Wrapper pour chaque slide avec animation standardisée
function SlideContainer({ children, className = "", style }: { children: React.ReactNode; className?: string; style?: any }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className={`absolute inset-0 w-full h-full flex flex-col items-center justify-center p-8 ${className}`}
      style={style}
    >
      {children}
    </motion.div>
  );
}
