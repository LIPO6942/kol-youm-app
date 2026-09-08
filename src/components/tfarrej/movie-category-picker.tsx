'use client';

import React from 'react';
import { MOVIE_CATEGORIES, MovieCategory, MOVIE_CATEGORY_CONFIG } from '@/lib/firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface MovieCategoryPickerProps {
  selectedCategory?: MovieCategory | null;
  onSelectCategory: (category: MovieCategory) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'pills' | 'grid';
}

export function MovieCategoryPicker({
  selectedCategory,
  onSelectCategory,
  className = '',
  size = 'sm',
  variant = 'pills',
}: MovieCategoryPickerProps) {
  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5 ${className}`}>
        {MOVIE_CATEGORIES.map((category) => {
          const config = MOVIE_CATEGORY_CONFIG[category];
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={`flex items-center gap-2.5 rounded-xl font-bold transition-all duration-200 border select-none text-left cursor-pointer ${
                size === 'sm'
                  ? 'px-3 py-2 text-xs'
                  : size === 'lg'
                  ? 'px-4 py-3.5 text-sm'
                  : 'px-3.5 py-2.5 text-xs sm:text-sm'
              } ${
                isSelected
                  ? `${config.badgeBg} ${config.border} border-current ring-2 ring-current/40 shadow-lg scale-[1.02] font-black`
                  : 'bg-white/[0.04] hover:bg-white/[0.09] text-white/75 hover:text-white border-white/10 hover:border-white/25'
              }`}
            >
              <span className="text-lg sm:text-xl shrink-0">{config.emoji}</span>
              <span className="leading-snug font-bold text-white/90">{config.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Présentation par défaut : Pastilles élégantes côte à côte (couleurs thématiques visibles et distinctes)
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {MOVIE_CATEGORIES.map((category) => {
        const config = MOVIE_CATEGORY_CONFIG[category];
        const isSelected = selectedCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
            className={`inline-flex items-center gap-1.5 rounded-full font-extrabold transition-all duration-200 border select-none cursor-pointer backdrop-blur-md ${
              size === 'sm'
                ? 'px-3 py-1.5 text-xs sm:text-[12.5px]'
                : size === 'lg'
                ? 'px-4 py-2.5 text-sm sm:text-base'
                : 'px-3.5 py-2 text-xs sm:text-sm'
            } ${
              isSelected
                ? `${config.badgeBg} ${config.border} border-current ring-2 ring-current/60 shadow-md ${config.glow || ''} scale-105 font-black brightness-125 text-white`
                : `${config.badgeBg} opacity-85 hover:opacity-100 hover:scale-105 hover:brightness-125 shadow-xs`
            }`}
          >
            <span className="text-sm sm:text-[15px] shrink-0 leading-none">{config.emoji}</span>
            <span className="tracking-tight">{config.label}</span>
            {isSelected ? (
              <span className="w-2 h-2 rounded-full bg-current shrink-0 shadow-xs ml-0.5 animate-pulse" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

interface CategoryBadgeProps {
  category?: MovieCategory | string | null;
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  onClick?: (e: React.MouseEvent) => void;
  shortOnMobile?: boolean;
}

export function CategoryBadge({
  category,
  className = '',
  size = 'xs',
  onClick,
  shortOnMobile = true,
}: CategoryBadgeProps) {
  if (!category) return null;

  const isKnown = (MOVIE_CATEGORIES as readonly string[]).includes(category);
  const config = isKnown
    ? MOVIE_CATEGORY_CONFIG[category as MovieCategory]
    : {
        label: category,
        shortLabel: category,
        emoji: '🎬',
        color: 'text-slate-300',
        badgeBg: 'bg-white/10 text-slate-200 border-white/15',
        border: 'border-white/20',
        glow: 'shadow-[0_0_8px_rgba(255,255,255,0.1)]',
        gradient: 'from-white/10 to-white/5',
      };

  const sizeClasses =
    size === 'xs'
      ? 'px-2.5 py-0.5 text-[11px] sm:text-[11.5px] leading-tight font-extrabold'
      : size === 'sm'
      ? 'px-3 py-1 text-xs sm:text-[12.5px] leading-tight font-black tracking-tight shadow-xs'
      : 'px-3.5 py-1.5 text-xs sm:text-sm leading-normal font-black';

  const emojiSize =
    size === 'xs'
      ? 'text-xs leading-none'
      : size === 'sm'
      ? 'text-xs sm:text-sm leading-none'
      : 'text-sm sm:text-base leading-none';

  const isInteractive = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      title={isInteractive ? `Catégorie : ${config.label} (Cliquer pour modifier)` : `Catégorie : ${config.label}`}
      className={`group/cat inline-flex items-center gap-1.5 rounded-full border backdrop-blur-md transition-all duration-200 select-none ${config.badgeBg} ${sizeClasses} ${
        isInteractive
          ? 'cursor-pointer hover:scale-105 active:scale-95 hover:brightness-125 hover:shadow-md hover:border-current/60'
          : ''
      } ${className}`}
    >
      <span className={`shrink-0 leading-none ${emojiSize}`}>{config.emoji}</span>
      {shortOnMobile && config.shortLabel && config.shortLabel !== config.label ? (
        <>
          <span className="hidden sm:inline tracking-tight">{config.label}</span>
          <span className="sm:hidden tracking-tight">{config.shortLabel}</span>
        </>
      ) : (
        <span className="tracking-tight">{config.label}</span>
      )}
      {isInteractive && (
        <span className="text-[9px] opacity-40 group-hover/cat:opacity-100 transition-opacity ml-0.5" title="Modifier">
          ✏️
        </span>
      )}
    </span>
  );
}

interface CategorySelectModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  movieTitle: string;
  currentCategory?: MovieCategory | null;
  onSelect: (category: MovieCategory) => void;
}

export function CategorySelectModal({
  isOpen,
  onOpenChange,
  movieTitle,
  currentCategory,
  onSelect,
}: CategorySelectModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-[#0F1015] border-white/15 text-white p-5 sm:p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg font-black flex items-center gap-2">
            <span>🏷️</span>
            <span>Catégorie du film</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Attribuez ou modifiez le genre pour <span className="font-bold text-white">« {movieTitle} »</span> afin d&apos;ajuster vos classements par catégorie.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <MovieCategoryPicker
            selectedCategory={currentCategory}
            onSelectCategory={(cat) => {
              onSelect(cat);
              onOpenChange(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CategoryTabsProps {
  selectedCategory: MovieCategory | 'all';
  onSelectCategory: (category: MovieCategory | 'all') => void;
  categoryCounts?: Partial<Record<MovieCategory, number>>;
  totalCount?: number;
  availableCategoriesOnly?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function CategoryTabs({
  selectedCategory,
  onSelectCategory,
  categoryCounts = {},
  totalCount,
  availableCategoriesOnly = false,
  className = '',
  size = 'sm',
}: CategoryTabsProps) {
  const displayedCategories = availableCategoriesOnly
    ? MOVIE_CATEGORIES.filter(cat => (categoryCounts[cat] || 0) > 0)
    : MOVIE_CATEGORIES;

  return (
    <div className={`flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1.5 px-0.5 w-full ${className}`}>
      {/* Onglet Général */}
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        className={`flex items-center gap-1.5 rounded-full font-black transition-all duration-200 border whitespace-nowrap shrink-0 select-none ${
          size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-xs sm:text-sm'
        } ${
          selectedCategory === 'all'
            ? 'bg-gradient-to-r from-amber-500/30 via-yellow-500/25 to-amber-500/15 text-yellow-300 border-yellow-400/70 shadow-[0_0_15px_rgba(245,158,11,0.35)] ring-1 ring-yellow-400/50 scale-[1.02]'
            : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border-white/10 hover:border-yellow-400/40'
        }`}
      >
        <span className="text-sm">🏆</span>
        <span>Général</span>
        {typeof totalCount === 'number' && (
          <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold leading-none ${
            selectedCategory === 'all' ? 'bg-yellow-400/30 text-yellow-200' : 'bg-white/10 text-white/60'
          }`}>
            {totalCount}
          </span>
        )}
      </button>

      {/* Onglets par Catégorie */}
      {displayedCategories.map((cat) => {
        const config = MOVIE_CATEGORY_CONFIG[cat];
        const isSelected = selectedCategory === cat;
        const count = categoryCounts[cat];

        return (
          <button
            key={cat}
            type="button"
            onClick={() => onSelectCategory(cat)}
            className={`flex items-center gap-1.5 rounded-full font-bold transition-all duration-200 border whitespace-nowrap shrink-0 select-none ${
              size === 'sm' ? 'px-2.5 sm:px-3 py-1.5 text-xs' : 'px-3.5 sm:px-4 py-2 text-xs sm:text-sm'
            } ${
              isSelected
                ? `${config.badgeBg} ${config.border} border-current ring-1 ring-current/50 shadow-md font-black scale-[1.02]`
                : 'bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border-white/10 hover:border-white/25'
            }`}
          >
            <span className="text-sm">{config.emoji}</span>
            {config.shortLabel && config.shortLabel !== config.label ? (
              <>
                <span className="hidden sm:inline">{config.label}</span>
                <span className="sm:hidden">{config.shortLabel}</span>
              </>
            ) : (
              <span>{config.label}</span>
            )}
            {typeof count === 'number' && count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9.5px] font-mono font-bold leading-none ${
                isSelected ? 'bg-current/25 font-black' : 'bg-white/10 text-white/60'
              }`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
