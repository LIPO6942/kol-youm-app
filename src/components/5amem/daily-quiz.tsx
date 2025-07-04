'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Trophy, Film, Shirt, BookOpen, FlaskConical, Palette, Globe, Clapperboard, Music } from 'lucide-react';

const quizzes = {
  'Histoire & Mythologies': {
    title: "Quiz d'Histoire & Mythologies",
    suggestionLinks: [
      { text: 'Explorer un film historique', href: '/tfarrej?genre=Historique', icon: Film },
      { text: 'Adopter un style Classique & Chic', href: '/stylek?occasion=Chic', icon: Shirt }
    ],
    questions: [
      { question: "Quel pharaon a tenté d'instaurer un culte monothéiste à Aton ?", options: ['Toutânkhamon', 'Ramsès II', 'Akhenaton', 'Khéops'], answer: 'Akhenaton' },
      { question: 'Qui était le dieu nordique de la tromperie et de la malice ?', options: ['Thor', 'Odin', 'Loki', 'Heimdall'], answer: 'Loki' },
      { question: 'Quelle bataille de 480 av. J.-C. est célèbre pour la résistance de 300 Spartiates ?', options: ['Bataille de Marathon', 'Bataille de Salamine', 'Bataille des Thermopyles', 'Bataille de Platées'], answer: 'Bataille des Thermopyles' },
      { question: 'Dans la mythologie grecque, qui a volé le feu aux dieux pour le donner aux humains ?', options: ['Héraclès', 'Prométhée', 'Icare', 'Thésée'], answer: 'Prométhée' },
      { question: 'Quel empire a été fondé par Gengis Khan au 13ème siècle ?', options: ['L\'Empire ottoman', 'L\'Empire romain', 'L\'Empire perse', 'L\'Empire mongol'], answer: 'L\'Empire mongol' },
    ],
  },
  'Sciences & Découvertes': {
    title: 'Quiz de Sciences & Découvertes',
    suggestionLinks: [
      { text: 'Voir un film de Science-Fiction', href: '/tfarrej?genre=Sci-Fi', icon: Film },
      { text: 'Une tenue pour une conférence ?', href: '/stylek?occasion=Professionnel', icon: Shirt }
    ],
    questions: [
      { question: "Quelle est la valeur approximative de la constante d'Avogadro ?", options: ['3.14 x 10^23', '6.022 x 10^23', '9.81 x 10^23', '1.602 x 10^-19'], answer: '6.022 x 10^23' },
      { question: "Quel principe stipule qu'on ne peut connaître simultanément la position et la vitesse d'une particule ?", options: ["Principe de relativité", "Loi de la gravitation", "Principe d'incertitude d'Heisenberg", "Théorème de Pythagore"], answer: "Principe d'incertitude d'Heisenberg" },
      { question: "Quel est le nom de la force qui permet à l'eau de monter dans les plantes ?", options: ['Gravité', 'Photosynthèse', 'Poussée d\'Archimède', 'Capillarité'], answer: 'Capillarité' },
      { question: "En programmation, qu'est-ce qu'un algorithme récursif ?", options: ["Un algorithme qui s'appelle lui-même", 'Un algorithme très rapide', 'Un algorithme qui trie des données', 'Un algorithme qui ne termine jamais'], answer: "Un algorithme qui s'appelle lui-même" },
      { question: "Quel est l'élément le plus abondant dans l'univers ?", options: ['Oxygène', 'Carbone', 'Hydrogène', 'Hélium'], answer: 'Hydrogène' },
    ]
  },
  'Art & Littérature': {
    title: "Quiz d'Art & Littérature",
    suggestionLinks: [
      { text: 'Découvrir un drame cinématographique', href: '/tfarrej?genre=Drame', icon: Film },
      { text: 'Essayer un look créatif et chic', href: '/stylek?occasion=Chic', icon: Shirt }
    ],
    questions: [
      { question: 'Quel roman de Fiodor Dostoïevski explore le meurtre et ses conséquences morales ?', options: ['L\'Idiot', 'Les Frères Karamazov', 'Crime et Châtiment', 'Les Démons'], answer: 'Crime et Châtiment' },
      { question: 'Qui est considéré comme le pionnier du cubisme avec Pablo Picasso ?', options: ['Henri Matisse', 'Salvador Dalí', 'Georges Braque', 'Claude Monet'], answer: 'Georges Braque' },
      { question: "L'Enfer est la première partie de quelle œuvre majeure de la littérature italienne ?", options: ['Le Décaméron', 'La Divine Comédie', 'Orlando Furioso', 'Les Fiancés'], answer: 'La Divine Comédie' },
      { question: 'Quelle technique de peinture a été popularisée par Georges Seurat ?', options: ['Le clair-obscur', 'La fresque', 'L\'impressionnisme', 'Le pointillisme'], answer: 'Le pointillisme' },
      { question: 'Quel poète français est l\'auteur du recueil "Les Fleurs du mal" ?', options: ['Victor Hugo', 'Arthur Rimbaud', 'Paul Verlaine', 'Charles Baudelaire'], answer: 'Charles Baudelaire' },
    ]
  },
  'Culture Générale': {
    title: 'Quiz de Culture Générale',
    suggestionLinks: [
      { text: 'Voir un film au hasard', href: '/tfarrej', icon: Film },
      { text: 'Un style pour tous les jours', href: '/stylek?occasion=Décontracté', icon: Shirt }
    ],
    questions: [
      { question: 'Combien de pays sont membres permanents du Conseil de sécurité de l\'ONU ?', options: ['Trois', 'Cinq', 'Dix', 'Quinze'], answer: 'Cinq' },
      { question: "Quelle est la capitale de l'Australie ?", options: ['Sydney', 'Melbourne', 'Canberra', 'Perth'], answer: 'Canberra' },
      { question: 'Quel est le plus long fleuve du monde ?', options: ['Le Nil', 'Le Yangtsé', 'Le Mississippi', 'L\'Amazone'], answer: 'L\'Amazone' },
      { question: "En économie, que signifie l'acronyme 'PIB' ?", options: ['Produit Intérieur Brut', 'Parti Intérieur Brutal', 'Potentiel d\'Investissement Bancaire', 'Programme d\'Intérêt Budgétaire'], answer: 'Produit Intérieur Brut' },
      { question: 'Quel philosophe a dit "Je pense, donc je suis" ?', options: ['Platon', 'Aristote', 'Socrate', 'René Descartes'], answer: 'René Descartes' },
    ],
  },
  'Cinéma & Séries': {
    title: 'Quiz Cinéma & Séries',
    suggestionLinks: [
      { text: 'Explorer les thrillers', href: '/tfarrej?genre=Thriller', icon: Film },
      { text: 'Un style chic pour une avant-première', href: '/stylek?occasion=Chic', icon: Shirt }
    ],
    questions: [
      { question: "Quel film a remporté le premier Oscar du meilleur film en 1929 ?", options: ['Metropolis', 'Le Chanteur de jazz', 'Les Ailes (Wings)', 'L\'Aurore'], answer: 'Les Ailes (Wings)' },
      { question: 'Dans la série "Breaking Bad", quel est le pseudonyme de Walter White ?', options: ['Cap\'n Cook', 'Jesse Pinkman', 'Heisenberg', 'Gus Fring'], answer: 'Heisenberg' },
      { question: 'Qui a réalisé la trilogie "Le Seigneur des Anneaux" ?', options: ['George Lucas', 'James Cameron', 'Steven Spielberg', 'Peter Jackson'], answer: 'Peter Jackson' },
      { question: "Quelle est la réplique culte de Dark Vador à Luke dans 'L'Empire contre-attaque' ?", options: ["'Luke, je suis ton père.'", "'Non, je suis ton père.'", "'La Force est avec toi.'", "'C\'est moi, ton père.'"], answer: "'Non, je suis ton père.'" },
      { question: "Quelle actrice détient le record du plus grand nombre d'Oscars ?", options: ['Meryl Streep', 'Audrey Hepburn', 'Ingrid Bergman', 'Katharine Hepburn'], answer: 'Katharine Hepburn' },
    ]
  },
  'Musique': {
    title: 'Quiz Musical',
    suggestionLinks: [
      { text: 'Voir une comédie musicale', href: '/tfarrej?genre=Comédie', icon: Film },
      { text: 'Un look décontracté pour un festival', href: '/stylek?occasion=Décontracté', icon: Shirt }
    ],
    questions: [
      { question: "Combien de cordes une guitare classique a-t-elle généralement ?", options: ['Quatre', 'Six', 'Sept', 'Douze'], answer: 'Six' },
      { question: "Quel compositeur était surnommé le 'cygne de Pesaro' ?", options: ['Verdi', 'Puccini', 'Rossini', 'Mozart'], answer: 'Rossini' },
      { question: "Quel album des Beatles est souvent considéré comme le premier album-concept ?", options: ['Abbey Road', "Sgt. Pepper's Lonely Hearts Club Band", 'Revolver', 'The White Album'], answer: "Sgt. Pepper's Lonely Hearts Club Band" },
      { question: "Quel est le nom du célèbre festival de musique qui a eu lieu en 1969 ?", options: ['Glastonbury', 'Coachella', 'Woodstock', 'Lollapalooza'], answer: 'Woodstock' },
      { question: "Qui est connu comme le 'Roi de la Pop' ?", options: ['Elvis Presley', 'James Brown', 'Michael Jackson', 'Prince'], answer: 'Michael Jackson' },
    ]
  }
};

const quizCategories = [
    { id: 'Culture Générale', label: 'Culture G.', icon: Globe, description: 'Le grand classique, un mélange de tout.' },
    { id: 'Cinéma & Séries', label: 'Ciné/Séries', icon: Clapperboard, description: 'Acteurs, répliques, réalisateurs...' },
    { id: 'Musique', label: 'Musique', icon: Music, description: 'Du classique au rap, d\'ici et d\'ailleurs.' },
    { id: 'Histoire & Mythologies', label: 'Histoire/Mytho', icon: BookOpen, description: 'Des grandes batailles aux dieux antiques.' },
    { id: 'Sciences & Découvertes', label: 'Sciences', icon: FlaskConical, description: 'Défiez votre esprit logique.' },
    { id: 'Art & Littérature', label: 'Art/Litté', icon: Palette, description: 'Explorez la créativité humaine.' },
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
