'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import DailyQuiz from "@/components/5amem/daily-quiz";
import Talla3Game from "@/components/5amem/talla3-game";
import ScoresDashboard from "@/components/5amem/scores-dashboard";
import TriviaTab from "@/components/5amem/trivia-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from 'lucide-react';

function AmemTabsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('quiz');

  // Sync active tab with search parameter '?tab='
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['quiz', 'talla3', 'trivia', 'scores'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="quiz" className="text-xs sm:text-sm">Quiz</TabsTrigger>
        <TabsTrigger value="talla3" className="text-xs sm:text-sm">Talla3</TabsTrigger>
        <TabsTrigger value="trivia" className="text-xs sm:text-sm">Dormir moins bête 💡</TabsTrigger>
        <TabsTrigger value="scores" className="text-xs sm:text-sm">Scores</TabsTrigger>
      </TabsList>
      <TabsContent value="quiz" className="mt-4">
        <DailyQuiz />
      </TabsContent>
      <TabsContent value="talla3" className="mt-4">
        <Talla3Game />
      </TabsContent>
      <TabsContent value="trivia" className="mt-4">
        <TriviaTab />
      </TabsContent>
      <TabsContent value="scores" className="mt-4">
        <ScoresDashboard />
      </TabsContent>
    </Tabs>
  );
}

export default function AmemPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight">Entraînement Cérébral</h2>
        <p className="text-muted-foreground text-sm">
          Stimulez votre esprit avec nos quiz quotidiens, jeux d'ordre et anecdotes de culture générale.
        </p>
      </div>
      <Suspense fallback={
        <div className="w-full min-h-[300px] flex flex-col justify-center items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-muted-foreground">Chargement de l'entraînement...</p>
        </div>
      }>
        <AmemTabsContent />
      </Suspense>
    </div>
  );
}
