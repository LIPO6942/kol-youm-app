'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { addTriviaFeedback, type TriviaFeedback } from '@/lib/firebase/firestore';
import { generateAndSaveTrivia } from '@/app/actions/generate-trivia';
import { getCommunityTriviaAction } from '@/app/actions/get-community-trivia';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, Meh, Sparkles, Lightbulb, RotateCcw, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TriviaItem = {
  id: string;
  category: string;
  title: string;
  content: string;
  imageUrl?: string;
  sourceUrl?: string;
};

const STATIC_TRIVIA_DATABASE: TriviaItem[] = [];

export default function TriviaTab() {
  const searchParams = useSearchParams();
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [currentTrivia, setCurrentTrivia] = useState<TriviaItem | null>(null);
  const [communityTrivia, setCommunityTrivia] = useState<TriviaItem[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<TriviaFeedback['rating'] | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Map<string, TriviaFeedback['rating']>>(new Map());

  const combinedDatabase = useMemo(() => [...STATIC_TRIVIA_DATABASE, ...communityTrivia], [communityTrivia]);

  useEffect(() => {
    const fetchCommunityTrivia = async () => {
      try {
        const dbTrivia = await getCommunityTriviaAction();
        setCommunityTrivia(dbTrivia);
      } finally {
        setIsLoadingDb(false);
      }
    };
    fetchCommunityTrivia();
  }, []);

  useEffect(() => {
    if (userProfile?.triviaFeedback) {
      const map = new Map();
      userProfile.triviaFeedback.forEach(fb => map.set(fb.triviaId, fb.rating));
      setFeedbackMap(map);
    }
  }, [userProfile]);

  const selectNextTrivia = useCallback(() => {
    const ratedIds = Array.from(feedbackMap.keys());
    let seenIds: string[] = [];
    try {
      const stored = localStorage.getItem('kolyoum_trivia_seen');
      if (stored) seenIds = JSON.parse(stored);
    } catch(e) {}

    const excludedIds = Array.from(new Set([...ratedIds, ...seenIds]));
    let unratedTrivia = combinedDatabase.filter(item => !excludedIds.includes(item.id));

    if (unratedTrivia.length === 0) {
      seenIds = [];
      localStorage.setItem('kolyoum_trivia_seen', '[]');
      unratedTrivia = combinedDatabase.filter(item => !ratedIds.includes(item.id));

      if (unratedTrivia.length === 0) {
        if (combinedDatabase.length === 0) {
          setCurrentTrivia(null);
          return;
        }
        const randomItem = combinedDatabase[Math.floor(Math.random() * combinedDatabase.length)];
        setCurrentTrivia(randomItem);
        setUserRating(feedbackMap.get(randomItem.id) || null);
        return;
      }
    }

    const categoryAffinity: Record<string, number> = {};
    if (userProfile?.triviaFeedback) {
      userProfile.triviaFeedback.forEach(fb => {
        const item = combinedDatabase.find(t => t.id === fb.triviaId);
        if (item) {
          let score = 0;
          if (fb.rating === 'interessant') score = 2;
          else if (fb.rating === 'pas_interessant') score = -2;
          categoryAffinity[item.category] = (categoryAffinity[item.category] || 0) + score;
        }
      });
    }

    let chosen: TriviaItem;
    const isSerendipity = Math.random() < 0.3;
    if (isSerendipity) {
      chosen = unratedTrivia[Math.floor(Math.random() * unratedTrivia.length)];
    } else {
      const sortedUnrated = [...unratedTrivia].sort((a, b) => {
        const affinityA = categoryAffinity[a.category] || 0;
        const affinityB = categoryAffinity[b.category] || 0;
        return affinityB - affinityA;
      });
      const topAffinity = categoryAffinity[sortedUnrated[0].category] || 0;
      const candidates = sortedUnrated.filter(item => (categoryAffinity[item.category] || 0) === topAffinity);
      chosen = candidates[Math.floor(Math.random() * candidates.length)];
    }

    setCurrentTrivia(chosen);
    setUserRating(null);

    seenIds.push(chosen.id);
    try {
      localStorage.setItem('kolyoum_trivia_seen', JSON.stringify(seenIds));
    } catch(e) {}
  }, [feedbackMap, combinedDatabase, userProfile?.triviaFeedback]);

  useEffect(() => {
    const linkedId = searchParams.get('id');
    if (linkedId) {
      const linkedItem = combinedDatabase.find(t => t.id === linkedId);
      if (linkedItem) {
        setCurrentTrivia(linkedItem);
        return;
      }
    }
    if (!currentTrivia && combinedDatabase.length > 0) {
      selectNextTrivia();
    }
  }, [searchParams, selectNextTrivia, currentTrivia, combinedDatabase]);

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const result = await generateAndSaveTrivia();
      if (result.success && result.trivia) {
        setCommunityTrivia(prev => [result.trivia!, ...prev]);
        setCurrentTrivia(result.trivia);
        setUserRating(null);
        try {
          const stored = localStorage.getItem('kolyoum_trivia_seen');
          let seenIds: string[] = stored ? JSON.parse(stored) : [];
          seenIds.push(result.trivia.id);
          localStorage.setItem('kolyoum_trivia_seen', JSON.stringify(seenIds));
        } catch(e) {}
      } else {
        setGenerationError(result.error || "Une erreur est survenue");
      }
    } catch(err) {
      setGenerationError("Impossible de contacter l'IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedback = async (rating: TriviaFeedback['rating']) => {
    if (!user || !currentTrivia || isSubmitting) return;

    setIsSubmitting(true);
    setUserRating(rating);

    try {
      await addTriviaFeedback(user.uid, {
        triviaId: currentTrivia.id,
        rating,
        timestamp: Date.now()
      });

      toast({
        title: rating === 'interessant' ? 'Super ! 💡' : 'Merci pour votre retour !',
        description: rating === 'interessant' 
          ? "Nous vous proposerons plus d'anecdotes de ce type."
          : "Vos préférences nous aident à améliorer vos recommandations.",
      });

      setTimeout(() => {
        selectNextTrivia();
        setIsSubmitting(false);
      }, 800);

    } catch (err) {
      console.error("Error saving trivia feedback", err);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible d'enregistrer votre évaluation.",
      });
      setIsSubmitting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Histoire': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Gastronomie': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'Culture': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Géographie': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'Art': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'Science': return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
      case 'Espace': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const ratedCount = feedbackMap.size;
  const progressPercent = combinedDatabase.length > 0 ? Math.min(100, Math.round((ratedCount / combinedDatabase.length) * 100)) : 0;

  if (isLoadingDb) {
    return (
      <Card className="max-w-2xl mx-auto min-h-[400px] flex flex-col justify-center items-center bg-card/60 backdrop-blur-xl border-dashed">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Chargement des anecdotes...</p>
      </Card>
    );
  }

  if (!currentTrivia) {
    return (
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <Card className="min-h-[300px] flex flex-col justify-center items-center text-center p-6 bg-card/60 backdrop-blur-xl border border-dashed border-indigo-200">
          <Sparkles className="h-12 w-12 text-indigo-400 mb-4 opacity-50" />
          <h3 className="text-xl font-headline font-semibold mb-2">Aucune anecdote trouvée</h3>
          <p className="text-muted-foreground mb-6 max-w-sm">
            La base de données est encore vide. Soyez le premier à générer une anecdote pour la communauté !
          </p>
          
          <Button 
            onClick={handleGenerateAI} 
            disabled={isGenerating}
            className="rounded-full shadow-lg bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Générer la première anecdote ✨
              </>
            )}
          </Button>

          {generationError && (
            <p className="text-sm text-red-500 mt-4">{generationError}</p>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-medium">
            Anecdotes lues : {ratedCount} / {combinedDatabase.length}
          </span>
        </div>
        <div className="w-32 bg-secondary rounded-full h-2 overflow-hidden hidden sm:block">
          <div 
            className="bg-primary h-full transition-all duration-500 ease-out" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-muted-foreground text-xs">{progressPercent}% complété</span>
      </div>

      <div className="flex justify-center mb-6">
        <Button 
          onClick={handleGenerateAI} 
          disabled={isGenerating}
          variant="outline"
          className="rounded-full shadow-md bg-white hover:bg-slate-50 text-indigo-600 border-indigo-200"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Génération en cours...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Générer une anecdote inédite avec l'IA
            </>
          )}
        </Button>
      </div>

      {generationError && (
        <div className="flex items-center text-sm text-red-500 mb-4 justify-center bg-red-50 p-2 rounded-lg">
          <AlertCircle className="w-4 h-4 mr-2" />
          {generationError}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={currentTrivia.id}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
        >
          <Card className="relative overflow-hidden border bg-card/60 backdrop-blur-xl shadow-xl transition-all duration-300 hover:shadow-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Lightbulb className="h-48 w-48 text-primary" />
            </div>

            <CardHeader className="space-y-3 pb-4">
              <div className="flex items-center justify-between">
                <span className={cn(
                  "text-xs px-2.5 py-1 rounded-full border font-semibold tracking-wider uppercase",
                  getCategoryColor(currentTrivia.category)
                )}>
                  {currentTrivia.category}
                </span>
                <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                  <Sparkles className="h-3.5 w-3.5 fill-amber-500 animate-pulse" />
                  <span>Dormir Moins Bête</span>
                </div>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-headline tracking-tight leading-tight">
                {currentTrivia.title}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pb-6">
              <div className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border bg-black/40 flex items-center justify-center">
                <Image
                  src={currentTrivia.imageUrl || 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=600&auto=format&fit=crop'}
                  alt={currentTrivia.title}
                  fill
                  className="object-cover opacity-90 transition-transform duration-700 hover:scale-105"
                  priority
                  sizes="(max-width: 768px) 100vw, 650px"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 bg-black/50 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1 flex items-center gap-1.5">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span className="text-[10px] text-white font-medium">Le Saviez-vous ?</span>
                </div>
              </div>

              <p className="text-card-foreground/90 text-sm sm:text-base leading-relaxed font-normal">
                {currentTrivia.content}
              </p>

              {currentTrivia.sourceUrl && (
                <div className="pt-2">
                  <a 
                    href={currentTrivia.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium underline-offset-4 hover:underline transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Lire davantage sur Wikipedia
                  </a>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-4 border-t pt-4 bg-muted/10">
              <div className="w-full text-center text-xs text-muted-foreground">
                Que pensez-vous de cette information ?
              </div>

              <div className="grid grid-cols-3 gap-2 w-full">
                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleFeedback('pas_interessant')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-5 border-rose-500/20 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-200",
                    userRating === 'pas_interessant' && "bg-rose-500/25 border-rose-500 text-rose-500 font-semibold"
                  )}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">Pas top 👎</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleFeedback('mi_interessant')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-5 border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-500 transition-all duration-200",
                    userRating === 'mi_interessant' && "bg-amber-500/25 border-amber-500 text-amber-500 font-semibold"
                  )}
                >
                  <Meh className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">Moyen 😐</span>
                </Button>

                <Button
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleFeedback('interessant')}
                  className={cn(
                    "flex items-center justify-center gap-1.5 py-5 border-emerald-500/20 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all duration-200",
                    userRating === 'interessant' && "bg-emerald-500/25 border-emerald-500 text-emerald-500 font-semibold"
                  )}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span className="text-xs sm:text-sm">Super ! 👍</span>
                </Button>
              </div>

              {ratedCount === combinedDatabase.length && combinedDatabase.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={selectNextTrivia}
                  className="mt-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3 w-3" />
                  Continuer la lecture (toutes lues)
                </Button>
              )}
            </CardFooter>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
