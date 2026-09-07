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
}

export function MovieCategoryPicker({
  selectedCategory,
  onSelectCategory,
  className = '',
  size = 'md',
}: MovieCategoryPickerProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 ${className}`}>
      {MOVIE_CATEGORIES.map((category) => {
        const config = MOVIE_CATEGORY_CONFIG[category];
        const isSelected = selectedCategory === category;

        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelectCategory(category)}
            className={`flex items-center gap-2 rounded-xl font-bold transition-all duration-200 border select-none text-left ${
              size === 'sm'
                ? 'px-2.5 py-1.5 text-xs'
                : size === 'lg'
                ? 'px-4 py-3 text-sm'
                : 'px-3 py-2 text-xs sm:text-sm'
            } ${
              isSelected
                ? `${config.badgeBg} border-current ring-2 ring-current/40 shadow-md scale-[1.02] font-black`
                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10 hover:border-white/20'
            }`}
          >
            <span className="text-base sm:text-lg shrink-0">{config.emoji}</span>
            <span className="truncate">{config.label}</span>
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
}

export function CategoryBadge({
  category,
  className = '',
  size = 'xs',
  onClick,
}: CategoryBadgeProps) {
  if (!category) return null;

  const config = (MOVIE_CATEGORIES as readonly string[]).includes(category)
    ? MOVIE_CATEGORY_CONFIG[category as MovieCategory]
    : {
        label: category,
        emoji: '🎬',
        color: 'text-slate-300',
        badgeBg: 'bg-white/10 text-slate-200 border-white/15',
        border: 'border-white/20',
      };

  const sizeClasses =
    size === 'xs'
      ? 'px-1.5 py-0.5 text-[9px]'
      : size === 'sm'
      ? 'px-2 py-0.5 text-[10px]'
      : 'px-2.5 py-1 text-xs';

  return (
    <span
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full font-extrabold border backdrop-blur-md shadow-sm transition-all ${config.badgeBg} ${sizeClasses} ${
        onClick ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
      } ${className}`}
    >
      <span>{config.emoji}</span>
      <span>{config.label}</span>
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
      <DialogContent className="sm:max-w-[420px] bg-[#0F1015] border-white/15 text-white p-5 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-black flex items-center gap-2">
            <span>🏷️</span>
            <span>Catégorie du film</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-white/60">
            Attribuez ou modifiez le genre pour <span className="font-bold text-white">« {movieTitle} »</span> afin de structurer vos classements par catégorie.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
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
    <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 w-full ${className}`}>
      {/* Onglet Général */}
      <button
        type="button"
        onClick={() => onSelectCategory('all')}
        className={`flex items-center gap-1.5 rounded-full font-black transition-all duration-200 border whitespace-nowrap shrink-0 ${
          size === 'sm' ? 'px-3 py-1 text-[11px]' : 'px-4 py-1.5 text-xs'
        } ${
          selectedCategory === 'all'
            ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-yellow-300 border-yellow-400/60 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-yellow-400/40'
            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
        }`}
      >
        <span>🏆</span>
        <span>Général</span>
        {typeof totalCount === 'number' && (
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
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
            className={`flex items-center gap-1.5 rounded-full font-bold transition-all duration-200 border whitespace-nowrap shrink-0 ${
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs'
            } ${
              isSelected
                ? `${config.badgeBg} border-current ring-1 ring-current/50 shadow-md font-black scale-[1.02]`
                : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border-white/10'
            }`}
          >
            <span>{config.emoji}</span>
            <span>{config.label}</span>
            {typeof count === 'number' && count > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                isSelected ? 'bg-current/20' : 'bg-white/10 text-white/60'
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
