'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Trophy, Film, Shirt, Book, FlaskConical, Palette } from 'lucide-react';

const quizzes = {
  'Histoire': {
    title: 'Quiz d\'Histoire Avancé',
    suggestionLinks: [
      { text: 'Explorer un film historique', href: '/tfarrej?genre=Historique', icon: Film },
      { text: 'Adopter un style Classique & Chic', href: '/stylek?occasion=Chic', icon: Shirt }
    ],
    questions: [
      {
        question: 'Quel traité, signé en 843, a partagé l\'Empire carolingien entre les trois petits-fils de Charlemagne ?',
        options: ['Le Traité de Verdun', 'Le Traité de Tordesillas', 'La Paix d\'Augsbourg', 'Le Concordat de Worms'],
        answer: 'Le Traité de Verdun',
      },
      {
        question: 'Quelle dynastie a précédé la dynastie des Tang en Chine ?',
        options: ['Han', 'Qin', 'Sui', 'Song'],
        answer: 'Sui',
      },
      {
        question: 'Qui était le "Roi-Soleil" ?',
        options: ['Louis XIII', 'Louis XIV', 'Louis XV', 'Louis XVI'],
        answer: 'Louis XIV',
      },
       {
        question: 'La guerre de Cent Ans a opposé principalement quelles nations ?',
        options: ['France et Espagne', 'Angleterre et Espagne', 'France et Angleterre', 'Saint-Empire et France'],
        answer: 'France et Angleterre',
      },
      {
        question: 'En quelle année a eu lieu la chute du mur de Berlin, marquant la fin de la Guerre Froide ?',
        options: ['1985', '1989', '1991', '1993'],
        answer: '1989',
      },
    ],
  },
  'Science & Technologie': {
    title: 'Quiz de Science & Tech',
    suggestionLinks: [
      { text: 'Voir un film de Science-Fiction', href: '/tfarrej?genre=Sci-Fi', icon: Film },
      { text: 'Une tenue pour une conférence ?', href: '/stylek?occasion=Professionnel', icon: Shirt }
    ],
    questions: [
      {
        question: 'Quelle est l\'unité de mesure de la résistance électrique ?',
        options: ['Volt', 'Ampère', 'Watt', 'Ohm'],
        answer: 'Ohm',
      },
      {
        question: 'Quelle particule subatomique n\'a pas de charge électrique ?',
        options: ['Proton', 'Électron', 'Neutron', 'Positron'],
        answer: 'Neutron',
      },
      {
        question: 'Quel est le nom du premier satellite artificiel lancé par l\'Union Soviétique en 1957 ?',
        options: ['Explorer 1', 'Spoutnik 1', 'Vostok 1', 'Luna 1'],
        answer: 'Spoutnik 1',
      },
      {
        question: 'En informatique, que signifie l\'acronyme "CPU" ?',
        options: ['Central Processing Unit', 'Computer Personal Unit', 'Central Power Unit', 'Core Processing Unit'],
        answer: 'Central Processing Unit',
      },
      {
        question: 'Quel est le nom du processus par lequel les plantes convertissent la lumière en énergie ?',
        options: ['Respiration', 'Transpiration', 'Photosynthèse', 'Osmose'],
        answer: 'Photosynthèse',
      },
    ]
  },
   'Art & Littérature': {
    title: 'Quiz d\'Art & Littérature',
    suggestionLinks: [
      { text: 'Découvrir un drame cinématographique', href: '/tfarrej?genre=Drame', icon: Film },
      { text: 'Essayer un look créatif et chic', href: '/stylek?occasion=Chic', icon: Shirt }
    ],
    questions: [
      {
        question: 'Qui a peint "La Nuit étoilée" ?',
        options: ['Claude Monet', 'Pablo Picasso', 'Vincent van Gogh', 'Salvador Dalí'],
        answer: 'Vincent van Gogh',
      },
      {
        question: 'Quel auteur a écrit "L\'Étranger" ?',
        options: ['Jean-Paul Sartre', 'Albert Camus', 'Simone de Beauvoir', 'Marcel Proust'],
        answer: 'Albert Camus',
      },
      {
        question: 'Dans quel mouvement artistique s\'inscrit principalement l\'œuvre de Salvador Dalí ?',
        options: ['Cubisme', 'Impressionnisme', 'Surréalisme', 'Expressionnisme'],
        answer: 'Surréalisme',
      },
      {
        question: 'Qui est l\'auteur de la saga "Harry Potter" ?',
        options: ['J.R.R. Tolkien', 'George R.R. Martin', 'J.K. Rowling', 'C.S. Lewis'],
        answer: 'J.K. Rowling',
      },
      {
        question: 'Quel dramaturge a écrit "Roméo et Juliette" ?',
        options: ['Molière', 'William Shakespeare', 'Victor Hugo', 'Corneille'],
        answer: 'William Shakespeare',
      },
    ]
  }
};

const quizCategories = [
    { id: 'Histoire', label: 'Histoire', icon: Book, description: 'Testez vos connaissances sur les événements qui ont façonné le monde.' },
    { id: 'Science & Technologie', label: 'Science & Tech', icon: FlaskConical, description: 'Défiez votre esprit logique face aux mystères de l\'univers.' },
    { id: 'Art & Littérature', label: 'Art & Littérature', icon: Palette, description: 'Explorez le monde fascinant de la créativité humaine.' },
];

export default function DailyQuiz() {
  const [quizCategory, setQuizCategory] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleCategorySelect = (category: string) => {
    setQuizCategory(category);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setIsAnswered(false);
  }

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    const currentQuestion = quizzes[quizCategory as keyof typeof quizzes].questions[currentQuestionIndex];
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
    setQuizCategory(null);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setScore(0);
  }

  if (!quizCategory) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="font-headline text-3xl">Choisissez une Catégorie</CardTitle>
          <CardDescription>Prêt(e) à mettre vos connaissances à l'épreuve ?</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-3">
          {quizCategories.map((cat) => (
            <Card key={cat.id} className="flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <CardHeader className="items-center text-center">
                <div className="p-4 bg-primary/10 rounded-full mb-4">
                  <cat.icon className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-xl font-semibold">{cat.label}</CardTitle>
              </CardHeader>
              <CardContent className="flex-grow text-center">
                <p className="text-sm text-muted-foreground">{cat.description}</p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => handleCategorySelect(cat.id)}>
                  Commencer
                </Button>
              </CardFooter>
            </Card>
          ))}
        </CardContent>
      </Card>
    );
  }

  const quizData = quizzes[quizCategory as keyof typeof quizzes];
  const isQuizFinished = currentQuestionIndex >= quizData.questions.length;
  const currentQuestion = !isQuizFinished ? quizData.questions[currentQuestionIndex] : null;

  const progressValue = (currentQuestionIndex / quizData.questions.length) * 100;

  if (isQuizFinished) {
    return (
        <Card className="max-w-2xl mx-auto text-center">
            <CardHeader>
                <Trophy className="h-16 w-16 mx-auto text-amber-400" />
                <CardTitle className="font-headline text-3xl">Quiz terminé !</CardTitle>
                 <CardDescription>Catégorie : {quizCategory}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <p className="text-lg">Votre score final est de :</p>
                    <p className="text-5xl font-bold text-primary my-4">{score} / {quizData.questions.length}</p>
                </div>
                <div className='space-y-4'>
                    <p className="text-md font-semibold text-muted-foreground">Et maintenant ?</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {quizData.suggestionLinks.map(link => (
                            <Link href={link.href} key={link.href} passHref>
                                <Button variant="outline">
                                    <link.icon className="mr-2 h-4 w-4" />
                                    {link.text}
                                </Button>
                            </Link>
                        ))}
                    </div>
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
