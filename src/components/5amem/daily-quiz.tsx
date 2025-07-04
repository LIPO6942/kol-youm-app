'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Trophy } from 'lucide-react';

const quizData = {
  title: 'Le Quiz Quotidien',
  questions: [
    {
      question: 'Quelle est la capitale de la Tunisie ?',
      options: ['Sfax', 'Tunis', 'Sousse', 'Tozeur'],
      answer: 'Tunis',
    },
    {
      question: 'Qui a peint la Joconde ?',
      options: ['Vincent van Gogh', 'Pablo Picasso', 'Léonard de Vinci', 'Claude Monet'],
      answer: 'Léonard de Vinci',
    },
    {
      question: 'En quelle année a eu lieu la révolution tunisienne ?',
      options: ['2009', '2010', '2011', '2012'],
      answer: '2011',
    },
    {
        question: 'Quel est le plus grand désert du monde ?',
        options: ['Le Sahara', 'Le désert d\'Arabie', 'Le désert de Gobi', 'L\'Antarctique'],
        answer: 'L\'Antarctique',
    },
    {
        question: 'De quel film provient la phrase "Je suis ton père" ?',
        options: ['Star Wars: Un nouvel espoir', 'Star Wars: L\'Empire contre-attaque', 'Star Wars: Le Retour du Jedi', 'La Menace fantôme'],
        answer: 'Star Wars: L\'Empire contre-attaque',
    }
  ],
};

export default function DailyQuiz() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);

  const isQuizFinished = currentQuestionIndex >= quizData.questions.length;
  const currentQuestion = !isQuizFinished ? quizData.questions[currentQuestionIndex] : null;

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;

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
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
  }

  const progressValue = (currentQuestionIndex / quizData.questions.length) * 100;

  if (isQuizFinished) {
    return (
        <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
                <Trophy className="h-16 w-16 mx-auto text-amber-400" />
                <CardTitle className="font-headline text-3xl">Quiz terminé !</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-lg">Votre score final est de :</p>
                <p className="text-5xl font-bold text-primary my-4">{score} / {quizData.questions.length}</p>
                <Button onClick={handleReset}>Rejouer le quiz</Button>
            </CardContent>
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
