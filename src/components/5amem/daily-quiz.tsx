
'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Trophy, Globe, Clapperboard, Music, BookOpen, FlaskConical, Palette, Loader2, Timer, Lightbulb, Link as LinkIcon } from 'lucide-react';
import { generateQuiz } from '@/ai/flows/generate-quiz-flow-fixed';
import type { GenerateQuizOutput } from '@/ai/flows/generate-quiz-flow.types';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { addBrainAttempt } from '@/lib/firebase/firestore';

type QuizData = GenerateQuizOutput;

const quizCategories = [
    { id: 'Culture Générale', label: 'Culture G.', icon: Globe, description: 'Le grand classique, un mélange de tout.' },
    { id: 'Cinéma & Séries', label: 'Ciné/Séries', icon: Clapperboard, description: 'Acteurs, répliques, réalisateurs...' },
    { id: 'Musique', label: 'Musique', icon: Music, description: 'Du classique au rap, d\'ici et d\'ailleurs.' },
    { id: 'Histoire & Mythologies', label: 'Histoire/Mytho', icon: BookOpen, description: 'Des grandes batailles aux dieux antiques.' },
    { id: 'Sciences & Découvertes', label: 'Sciences', icon: FlaskConical, description: 'Défiez votre esprit logique.' },
    { id: 'Art & Littérature', label: 'Art/Litté', icon: Palette, description: 'Explorez la créativité humaine.' },
];

const TIMER_DURATION = 10;

const handleAiError = (error: any, toast: any) => {
    const errorMessage = String(error.message || '');
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        toast({
            variant: 'destructive',
            title: 'L\'IA est très demandée !',
            description: "Nous avons atteint notre limite de requêtes. L'IA se repose un peu, réessayez dans quelques minutes.",
        });
    } else if (errorMessage.includes('503') || errorMessage.includes('overloaded') || errorMessage.includes('unavailable')) {
         toast({
            variant: 'destructive',
            title: 'L\'IA est en surchauffe !',
            description: "Nos serveurs sont un peu surchargés. Donnez-lui un instant pour reprendre son souffle et réessayez.",
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Erreur Inattendue',
            description: "Impossible de générer le quiz. Veuillez réessayer.",
        });
    }
    console.error(error);
};


const QUIZ_TO_TRIVIA_CATEGORY_MAP: Record<string, string[]> = {
  'Culture Générale': ['Culture'],
  'Cinéma & Séries': ['Art', 'Culture'],
  'Musique': ['Art', 'Culture'],
  'Histoire & Mythologies': ['Histoire', 'Géographie'],
  'Sciences & Découvertes': ['Science', 'Espace'],
  'Art & Littérature': ['Art']
};

const getQuizCategoryAffinity = (quizCatId: string, triviaFeedback?: any[]) => {
  let score = 0;
  const mappedTriviaCats = QUIZ_TO_TRIVIA_CATEGORY_MAP[quizCatId] || [];
  if (triviaFeedback) {
    triviaFeedback.forEach(fb => {
      if (fb.category && mappedTriviaCats.includes(fb.category)) {
        if (fb.rating === 'interessant') score += 5;
        else if (fb.rating === 'pas_interessant') score -= 5;
      }
    });
  }
  return score;
};

export default function DailyQuiz() {
  const { user, userProfile, updateUserProfile } = useAuth();

  const sortedCategories = useMemo(() => {
    const sorted = quizCategories
      .map(cat => ({ ...cat, score: getQuizCategoryAffinity(cat.id, userProfile?.triviaFeedback) }))
      .filter(cat => cat.score > -10)
      .sort((a, b) => b.score - a.score);

    return sorted.length > 0 ? sorted : quizCategories;
  }, [userProfile?.triviaFeedback]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const { toast } = useToast();

  const isQuizFinished = quizData ? currentQuestionIndex >= quizData.questions.length : false;

  // Save score and seen questions when quiz is finished
  useEffect(() => {
    if (isQuizFinished && user && quizData && !hasSavedScore) {
      setHasSavedScore(true);
      addBrainAttempt(user.uid, {
        type: 'quiz',
        category: selectedCategory || 'Culture Générale',
        score: score,
        totalQuestions: quizData.questions.length
      }).catch(err => console.error("Error saving quiz score", err));

      const newSeen = quizData.questions.map(q => q.question);
      updateUserProfile({
        seenQuestions: newSeen
      }).catch(err => console.error("Error saving seen questions", err));
    }
  }, [isQuizFinished, user, quizData, selectedCategory, score, hasSavedScore, updateUserProfile]);

  useEffect(() => {
    if (isAnswered || isQuizFinished || isLoading || !quizData) {
        return;
    }

    if (timeLeft <= 0) {
        setIsAnswered(true); // Times up, show the answer
        setIsTimeUp(true);
        return;
    }

    const timerId = setInterval(() => {
        setTimeLeft(t => t - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft, isAnswered, isQuizFinished, isLoading, quizData]);


  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    setIsLoading(true);
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setIsAnswered(false);
    setIsTimeUp(false);
    setTimeLeft(TIMER_DURATION);
    setHasSavedScore(false);
    
    try {
      const seenQuestions = userProfile?.seenQuestions || [];
      const data = await generateQuiz({ category, seenQuestions });
      setQuizData(data);
    } catch (error: any) {
      handleAiError(error, toast);
      setSelectedCategory(null); // Go back to category selection
    } finally {
      setIsLoading(false);
    }
  }

  const handleAnswer = (answer: string) => {
    if (isAnswered || !quizData) return;
    setIsTimeUp(false);
    const currentQuestion = quizData.questions[currentQuestionIndex];
    setSelectedAnswer(answer);
    setIsAnswered(true);
    if (answer === currentQuestion?.answer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    setCurrentQuestionIndex(i => i + 1);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsTimeUp(false);
    setTimeLeft(TIMER_DURATION);
  };
  
  const handleReset = () => {
    setSelectedCategory(null);
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsTimeUp(false);
    setScore(0);
    setTimeLeft(TIMER_DURATION);
    setHasSavedScore(false);
  }

  if (!selectedCategory) {
    return (
      <Card className="w-full max-w-4xl mx-auto overflow-hidden border bg-card/60 backdrop-blur-xl shadow-xl">
        <div className="relative w-full h-44 sm:h-52 bg-black/40">
          <Image
            src="/images/5amem/daily_quiz.png"
            alt="Quiz Quotidien Banner"
            fill
            className="object-cover opacity-90"
            priority
            sizes="(max-width: 1024px) 100vw, 896px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl sm:text-3xl font-bold font-headline text-white drop-shadow-md">Quiz Quotidien</h2>
            <p className="text-xs sm:text-sm text-gray-200 drop-shadow-md">Défiez vos connaissances à travers 6 thématiques passionnantes !</p>
          </div>
        </div>
        <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-3 pt-6">
          {sortedCategories.map((cat) => (
            <div key={cat.id} className="flex flex-col rounded-lg border bg-card text-card-foreground shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => handleCategorySelect(cat.id)}>
              <CardHeader className="items-center text-center p-4">
                <div className="p-3 bg-primary/10 rounded-full mb-2">
                  <cat.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-md font-semibold">{cat.label}</CardTitle>
              </CardHeader>
              <CardContent className="text-center px-4 pb-4">
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </CardContent>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
        <Card className="max-w-2xl mx-auto min-h-[400px] flex flex-col justify-center items-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-lg text-muted-foreground">Génération du quiz en cours...</p>
        </Card>
    )
  }

  if (!quizData) {
     return (
        <Card className="max-w-2xl mx-auto text-center">
             <CardHeader>
                <CardTitle className="font-headline text-2xl">Erreur</CardTitle>
                <CardDescription>Impossible de charger le quiz.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleReset}>Réessayer</Button>
            </CardContent>
        </Card>
     )
  }

  const currentQuestion = !isQuizFinished ? quizData.questions[currentQuestionIndex] : null;
  const progressValue = (currentQuestionIndex / quizData.questions.length) * 100;

  if (isQuizFinished) {
    return (
        <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
                <Trophy className="h-16 w-16 mx-auto text-amber-400" />
                <CardTitle className="font-headline text-3xl">Quiz terminé !</CardTitle>
                 <CardDescription>Catégorie : {selectedCategory}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <p className="text-lg">Votre score final est de :</p>
                    <p className="text-5xl font-bold text-primary my-4">{score} / {quizData.questions.length}</p>
                </div>
                {quizData.funFact && (
                    <>
                        <Separator />
                        <div className="text-left space-y-3 p-4 bg-accent/10 rounded-lg border border-accent/20">
                            <h4 className="flex items-center font-headline text-lg text-accent-foreground">
                                <Lightbulb className="mr-2 h-5 w-5 text-accent" />
                                Le saviez-vous ?
                            </h4>
                            <p className="text-sm text-muted-foreground">{quizData.funFact.replace("Le saviez-vous ? ", "")}</p>
                            {quizData.funFactUrl && (
                                <Link href={quizData.funFactUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="link" className="p-0 h-auto text-xs text-accent-foreground/80">
                                        <LinkIcon className="mr-1.5 h-3 w-3" />
                                        En savoir plus
                                    </Button>
                                </Link>
                            )}
                        </div>
                    </>
                )}
            </CardContent>
            <CardFooter className="justify-center">
                 <Button onClick={handleReset}>Changer de catégorie</Button>
            </CardFooter>
        </Card>
    )
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-center">{quizData.title}</CardTitle>
        <div className="flex justify-between items-center text-sm text-muted-foreground px-1 py-2">
            <span>Question {currentQuestionIndex + 1} sur {quizData.questions.length}</span>
            <div className="flex items-center gap-2 font-mono font-semibold">
                <Timer className="h-4 w-4" />
                <span>00:{timeLeft.toString().padStart(2, '0')}</span>
            </div>
        </div>
        <Progress value={progressValue} className="mt-2" />
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold text-center mb-6">{currentQuestion?.question}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion?.options.map(option => {
            const isCorrect = option === currentQuestion.answer;
            const isSelected = option === selectedAnswer;

            return (
              <Button
                key={option}
                variant="outline"
                className={cn(
                  'h-auto py-4 whitespace-normal justify-start text-left',
                  isAnswered && isCorrect && 'bg-green-100 border-green-500 text-green-800 hover:bg-green-200',
                  isAnswered && isSelected && !isCorrect && 'bg-red-100 border-red-500 text-red-800 hover:bg-red-200'
                )}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
              >
                {isAnswered && isCorrect && <CheckCircle2 className="mr-2 h-5 w-5 flex-shrink-0" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="mr-2 h-5 w-5 flex-shrink-0" />}
                {option}
              </Button>
            );
          })}
        </div>
        {isAnswered && (
            <div className="mt-6 text-center space-y-4">
                {isTimeUp && (
                    <div className="p-3 rounded-md bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-sm">
                        Temps écoulé ! Voici la bonne réponse.
                    </div>
                )}
                <Button onClick={handleNext}>
                    {currentQuestionIndex === quizData.questions.length - 1 ? "Voir les résultats" : "Question suivante"}
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
