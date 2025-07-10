
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Trophy, RotateCcw, Loader2, ServerCrash, Timer } from 'lucide-react';
import { generateTalla3Challenges } from '@/ai/flows/generate-talla3-challenge-flow';
import type { Talla3Challenge } from '@/ai/flows/generate-talla3-challenge-flow.types';

const TIMER_DURATION = 15;

export default function Talla3Game() {
  const [challenges, setChallenges] = useState<Talla3Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [remainingItems, setRemainingItems] = useState<string[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'correct' | 'incorrect'>('playing');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const { toast } = useToast();

  const fetchChallenges = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await generateTalla3Challenges({ count: 5 });
      setChallenges(data.challenges);
      setCurrentChallengeIndex(0);
    } catch (e: any) {
      const errorMessage = e.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('quota')) {
          toast({
              variant: 'destructive',
              title: 'L\'IA est très demandée !',
              description: "Nous avons atteint notre limite de requêtes. L'IA se repose un peu, réessayez.",
          });
      } else if (errorMessage.includes('503') || errorMessage.includes('overloaded')) {
           toast({
              variant: 'destructive',
              title: 'L\'IA est en surchauffe !',
              description: "Nos serveurs sont un peu surchargés. Donnez-lui un instant et réessayez.",
          });
      } else {
        setError("Impossible de charger de nouveaux défis. Veuillez réessayer.");
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: "Impossible de charger les défis Talla3.",
        });
      }
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);
  
  const currentChallenge = useMemo(() => {
    if (challenges.length > 0 && currentChallengeIndex < challenges.length) {
      return challenges[currentChallengeIndex];
    }
    return null;
  }, [challenges, currentChallengeIndex]);

  const startChallenge = useCallback((challenge: Talla3Challenge | null) => {
    if (!challenge) return;
    setUserOrder([]);
    setRemainingItems([...challenge.items.map(i => i.item)].sort(() => Math.random() - 0.5));
    setGameState('playing');
    setTimeLeft(TIMER_DURATION);
  }, []);

  useEffect(() => {
    startChallenge(currentChallenge);
  }, [currentChallenge, startChallenge]);


  const handleItemClick = (item: string) => {
    if (gameState !== 'playing') return;
    setUserOrder(prev => [...prev, item]);
    setRemainingItems(prev => prev.filter(i => i !== item));
  };

  const handleUndo = () => {
    if (userOrder.length === 0 || gameState !== 'playing') return;
    const lastItem = userOrder[userOrder.length - 1];
    setUserOrder(prev => prev.slice(0, -1));
    setRemainingItems(prev => [...prev, lastItem]);
  };

  const handleCheckAnswer = useCallback(() => {
    if (!currentChallenge) return;
    const isCorrect = userOrder.length === currentChallenge.items.length && userOrder.every((item, index) => item === currentChallenge.items[index].item);
    setGameState(isCorrect ? 'correct' : 'incorrect');
  }, [currentChallenge, userOrder]);

  useEffect(() => {
    if (gameState !== 'playing' || isLoading || !currentChallenge) {
        return;
    }

    if (timeLeft <= 0) {
        handleCheckAnswer();
        return;
    }

    const timerId = setInterval(() => {
        setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, gameState, isLoading, currentChallenge, handleCheckAnswer]);


  const handleNextChallenge = () => {
    const nextIndex = currentChallengeIndex + 1;
    if (nextIndex >= challenges.length) {
        // fetch new challenges when list is exhausted
        fetchChallenges();
    } else {
        setCurrentChallengeIndex(nextIndex);
    }
  };
  
  const handleRestartThisChallenge = () => {
    startChallenge(currentChallenge);
  }

  if (isLoading) {
    return (
        <Card className="w-full max-w-2xl mx-auto min-h-[400px] flex flex-col justify-center items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Préparation de nouveaux défis...</p>
        </Card>
    );
  }

  if (error || !currentChallenge) {
    return (
        <Card className="w-full max-w-2xl mx-auto min-h-[400px] flex flex-col justify-center items-center text-center p-4">
            <ServerCrash className="h-10 w-10 text-destructive mb-4" />
            <CardTitle className="font-headline text-2xl">Oups, une erreur !</CardTitle>
            <CardDescription className="mb-4">{error || "Impossible de charger le défi."}</CardDescription>
            <Button onClick={fetchChallenges}><RotateCcw className="mr-2 h-4 w-4" /> Réessayer</Button>
        </Card>
    );
  }

  const isGameFinished = currentChallengeIndex >= challenges.length;
   if (isGameFinished) {
    return (
        <Card className="w-full max-w-2xl mx-auto text-center">
            <CardHeader>
                <Trophy className="h-16 w-16 mx-auto text-amber-400" />
                <CardTitle className="font-headline text-3xl">Bravo !</CardTitle>
                <CardDescription>Vous avez terminé tous les défis.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Vous avez un excellent sens de l'ordre !</p>
            </CardContent>
            <CardFooter className="justify-center">
                <Button onClick={fetchChallenges}>Jouer à nouveau</Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-center">Talla3</CardTitle>
        <div className="flex justify-between items-center px-1">
            <CardDescription className="text-center flex-grow">{currentChallenge.title}</CardDescription>
            <div className={cn(
                "flex items-center gap-2 font-mono font-semibold text-lg ml-4 px-2 py-1 rounded-md transition-colors",
                timeLeft <= 5 ? "text-destructive animate-pulse" : "text-muted-foreground"
            )}>
                <Timer className="h-5 w-5" />
                <span>00:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-3">
          <h3 className="font-semibold text-center">Éléments à classer</h3>
          <div className="grid grid-cols-1 gap-2">
            {remainingItems.map(item => (
              <Button
                key={item}
                variant="outline"
                onClick={() => handleItemClick(item)}
                disabled={gameState !== 'playing'}
              >
                {item}
              </Button>
            ))}
             {remainingItems.length === 0 && gameState === 'playing' && <p className="text-sm text-muted-foreground text-center pt-10">Tous les éléments sont placés !</p>}
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-semibold text-center">Votre ordre</h3>
          <div className="p-3 bg-muted rounded-lg min-h-[150px] space-y-2">
            {userOrder.map((item, index) => (
              <div key={index} className="flex items-center justify-between bg-background p-2 rounded shadow-sm">
                <span><span className="font-bold">{index + 1}.</span> {item}</span>
              </div>
            ))}
            {userOrder.length === 0 && <p className="text-sm text-muted-foreground text-center pt-10">Cliquez sur les éléments à gauche pour commencer.</p>}
          </div>
          <Button variant="secondary" size="sm" className="w-full" onClick={handleUndo} disabled={userOrder.length === 0 || gameState !== 'playing'}>
            Annuler le dernier choix
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex-col space-y-4 pt-6">
        {gameState === 'playing' && (
          <Button className="w-full" onClick={handleCheckAnswer} disabled={remainingItems.length > 0}>
            <Check className="mr-2" /> Vérifier ma réponse
          </Button>
        )}
        {gameState === 'correct' && (
          <div className="w-full text-center p-3 rounded-md bg-green-100 text-green-800">
            <p className="font-bold">Excellent ! C'est le bon ordre.</p>
          </div>
        )}
        {gameState === 'incorrect' && (
          <div className="w-full text-left p-4 rounded-lg bg-red-100 text-red-900 border border-red-200 space-y-2">
              <p className="font-bold text-lg text-center">Oups ! Ce n'est pas tout à fait ça.</p>
              <div className="text-sm bg-background/50 p-3 rounded-md">
                  <p className="font-semibold mb-1">Le bon ordre était :</p>
                  <ol className="list-decimal list-inside font-medium space-y-1">
                      {currentChallenge.items.map((item) => (
                        <li key={item.item}>
                            {item.item}
                            {item.detail && <span className="ml-2 font-normal text-muted-foreground">({item.detail})</span>}
                        </li>
                      ))}
                  </ol>
              </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="outline" onClick={handleRestartThisChallenge}>
                <RotateCcw className="mr-2 h-4 w-4" /> Recommencer ce défi
            </Button>
            <Button onClick={handleNextChallenge}>
                Prochain défi <ChevronsUpDown className="ml-2 h-4 w-4" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
