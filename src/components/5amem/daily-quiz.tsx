'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Trophy, Globe, Clapperboard, Music, BookOpen, FlaskConical, Palette, Loader2 } from 'lucide-react';
import { generateQuiz } from '@/ai/flows/generate-quiz-flow';
import type { GenerateQuizOutput } from '@/ai/flows/generate-quiz-flow.types';
import { useToast } from '@/hooks/use-toast';

type QuizData = GenerateQuizOutput;

const quizCategories = [
    { id: 'Culture Générale', label: 'Culture G.', icon: Globe, description: 'Le grand classique, un mélange de tout.' },
    { id: 'Cinéma & Séries', label: 'Ciné/Séries', icon: Clapperboard, description: 'Acteurs, répliques, réalisateurs...' },
    { id: 'Musique', label: 'Musique', icon: Music, description: 'Du classique au rap, d\'ici et d\'ailleurs.' },
    { id: 'Histoire & Mythologies', label: 'Histoire/Mytho', icon: BookOpen, description: 'Des grandes batailles aux dieux antiques.' },
    { id: 'Sciences & Découvertes', label: 'Sciences', icon: FlaskConical, description: 'Défiez votre esprit logique.' },
    { id: 'Art & Littérature', label: 'Art/Litté', icon: Palette, description: 'Explorez la créativité humaine.' },
];

export default function DailyQuiz() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const { toast } = useToast();

  const handleCategorySelect = async (category: string) => {
    setSelectedCategory(category);
    setIsLoading(true);
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setIsAnswered(false);
    
    try {
      const data = await generateQuiz({ category });
      setQuizData(data);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Impossible de générer le quiz. Veuillez réessayer.",
      });
      setSelectedCategory(null); // Go back to category selection
    } finally {
      setIsLoading(false);
    }
  }

  const handleAnswer = (answer: string) => {
    if (isAnswered || !quizData) return;
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
  };
  
  const handleReset = () => {
    setSelectedCategory(null);
    setQuizData(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
  }

  if (!selectedCategory) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-2xl">Choisissez une Catégorie</CardTitle>
          <CardDescription>Prêt(e) à mettre vos connaissances à l'épreuve ?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-2 md:grid-cols-3">
          {quizCategories.map((cat) => (
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

  const isQuizFinished = currentQuestionIndex >= quizData.questions.length;
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
        <CardDescription className="text-center">Question {currentQuestionIndex + 1} sur {quizData.questions.length}</CardDescription>
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
            <div className="mt-6 text-center">
                <Button onClick={handleNext}>
                    {currentQuestionIndex === quizData.questions.length - 1 ? "Voir les résultats" : "Question suivante"}
                </Button>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
