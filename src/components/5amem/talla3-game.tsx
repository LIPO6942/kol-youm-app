
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Check, X, ChevronsUpDown, Trophy, RotateCcw } from 'lucide-react';

const challenges = [
  {
    title: "Classez ces inventions de la plus ancienne à la plus récente :",
    items: ['La roue', 'L\'imprimerie', 'Le téléphone', 'Internet'],
  },
  {
    title: "Organisez ces films de Quentin Tarantino par ordre de sortie :",
    items: ['Reservoir Dogs', 'Pulp Fiction', 'Kill Bill: Volume 1', 'Inglourious Basterds', 'Once Upon a Time in Hollywood'],
  },
  {
    title: "Classez les planètes du système solaire par ordre de distance au Soleil :",
    items: ['Mercure', 'Vénus', 'Terre', 'Mars', 'Jupiter', 'Saturne', 'Uranus', 'Neptune'],
  },
  {
    title: "Remettez dans l'ordre les étapes de la vie d'un papillon :",
    items: ['Œuf', 'Larve (chenille)', 'Nymphe (chrysalide)', 'Imago (papillon)'],
  }
];

export default function Talla3Game() {
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [userOrder, setUserOrder] = useState<string[]>([]);
  const [remainingItems, setRemainingItems] = useState<string[]>([]);
  const [gameState, setGameState] = useState<'playing' | 'correct' | 'incorrect'>('playing');
  
  const currentChallenge = useMemo(() => challenges[currentChallengeIndex], [currentChallengeIndex]);

  const startChallenge = (challengeIndex: number) => {
    const challenge = challenges[challengeIndex];
    setUserOrder([]);
    setRemainingItems([...challenge.items].sort(() => Math.random() - 0.5));
    setGameState('playing');
  };

  useEffect(() => {
    startChallenge(currentChallengeIndex);
  }, [currentChallengeIndex]);

  const handleItemClick = (item: string) => {
    setUserOrder(prev => [...prev, item]);
    setRemainingItems(prev => prev.filter(i => i !== item));
  };

  const handleUndo = () => {
    if (userOrder.length === 0) return;
    const lastItem = userOrder[userOrder.length - 1];
    setUserOrder(prev => prev.slice(0, -1));
    setRemainingItems(prev => [...prev, lastItem]);
  };

  const handleCheckAnswer = () => {
    const isCorrect = userOrder.length === currentChallenge.items.length && userOrder.every((item, index) => item === currentChallenge.items[index]);
    setGameState(isCorrect ? 'correct' : 'incorrect');
  };

  const handleNextChallenge = () => {
    if (currentChallengeIndex < challenges.length - 1) {
      setCurrentChallengeIndex(prev => prev + 1);
    } else {
      setCurrentChallengeIndex(0); // Loop back to the start
    }
  };

  const isFinished = currentChallengeIndex >= challenges.length;

  if (isFinished) {
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
                <Button onClick={() => startChallenge(0)}>Recommencer</Button>
            </CardFooter>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-center">Défi de Classement</CardTitle>
        <CardDescription className="text-center">{currentChallenge.title}</CardDescription>
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
        {gameState !== 'playing' && (
            <div className={cn("w-full text-center p-3 rounded-md", gameState === 'correct' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>
                <p className="font-bold">{gameState === 'correct' ? 'Excellent ! C\'est le bon ordre.' : 'Oups ! Ce n\'est pas tout à fait ça.'}</p>
            </div>
        )}
        <div className="grid grid-cols-2 gap-4 w-full">
            <Button variant="outline" onClick={() => startChallenge(currentChallengeIndex)}>
                <RotateCcw className="mr-2" /> Recommencer ce défi
            </Button>
            <Button onClick={handleNextChallenge}>
                Prochain défi <ChevronsUpDown className="ml-2" />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
