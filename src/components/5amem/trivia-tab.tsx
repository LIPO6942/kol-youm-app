'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { addTriviaFeedback, type TriviaFeedback } from '@/lib/firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown, Meh, Sparkles, Lightbulb, RotateCcw, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type TriviaItem = {
  id: string;
  category: 'Histoire' | 'Gastronomie' | 'Culture' | 'Géographie' | 'Art';
  title: string;
  content: string;
};

const TRIVIA_DATABASE: TriviaItem[] = [
  {
    id: 'kafteji-origin',
    category: 'Gastronomie',
    title: 'Le secret du Kafteji',
    content: "Le terme 'Kafteji' vient du mot turc 'Köfteci', qui désigne un vendeur de boulettes (Köfte). Pourtant, le Kafteji tunisien ne contient pas de viande ! C'est un mélange savoureux de piments, tomates, citrouille et œufs, frits puis coupés finement à l'aide de deux couteaux."
  },
  {
    id: 'el-jem-amphitheatre',
    category: 'Histoire',
    title: "L'Amphithéâtre d'El Jem",
    content: "Plus grand que le Colisée de Rome dans certaines de ses dimensions, l'Amphithéâtre d'El Jem pouvait accueillir jusqu'à 35 000 spectateurs. Il a été construit par l'empereur Gordien au IIIe siècle et est l'un des monuments romains les mieux conservés au monde."
  },
  {
    id: 'sidi-bou-said-colors',
    category: 'Culture',
    title: 'Le bleu et blanc de Sidi Bou Saïd',
    content: "Le village pittoresque de Sidi Bou Saïd doit ses fameuses couleurs bleu et blanc au baron Rodolphe d'Erlanger. En 1915, il a réussi à faire promulguer un décret protégeant le village et imposant ces couleurs emblématiques pour préserver son charme unique."
  },
  {
    id: 'didon-carthage',
    category: 'Histoire',
    title: 'La reine Didon et la fondation de Carthage',
    content: "Pour fonder Carthage, la reine Didon (Elyssa) a négocié avec un chef local la surface qu'elle pourrait couvrir avec la peau d'un bœuf. Rusée, elle découpa la peau en lanières extrêmement fines pour encercler toute la colline de Byrsa !"
  },
  {
    id: 'harissa-unesco',
    category: 'Gastronomie',
    title: "L'or rouge tunisien : La Harissa",
    content: "En 2022, le savoir-faire traditionnel de la Harissa tunisienne a été inscrit au patrimoine culturel immatériel de l'UNESCO. Plus qu'un simple condiment, elle fait partie intégrante de l'identité culinaire tunisienne."
  },
  {
    id: 'chott-jerid-mirages',
    category: 'Géographie',
    title: 'Le Chott el-Jérid et ses mirages',
    content: "Le Chott el-Jérid est le plus grand lac salé d'Afrique du Nord. En été, sous l'effet du soleil de plomb, l'évaporation du sel crée de spectaculaires mirages où l'on croit apercevoir des oasis ou des caravanes de chameaux au loin."
  },
  {
    id: 'zitouna-university',
    category: 'Histoire',
    title: 'La Mosquée Zitouna, phare universitaire',
    content: "Fondée en 732, la Mosquée Zitouna de Tunis abrite l'une des plus anciennes universités du monde islamique. Elle a formé d'immenses savants, dont l'historien et sociologue Ibn Khaldoun."
  },
  {
    id: 'kerkennah-charfia',
    category: 'Culture',
    title: "Les îles Kerkennah et la pêche à la 'Charfia'",
    content: "Les pêcheurs de Kerkennah utilisent la 'Charfia', une méthode de pêche fixe et écologique unique au monde. Faite de palmes de dattiers plantées dans la mer, elle guide les poissons vers des nasses sans épuiser les ressources marines."
  },
  {
    id: 'bardo-mosaics',
    category: 'Art',
    title: 'Le Bardo et sa collection mondiale de mosaïques',
    content: "Le Musée national du Bardo possède la plus grande et la plus riche collection de mosaïques romaines au monde, retraçant des siècles d'histoire d'Afrique du Nord avec une précision artistique et une conservation époustouflante."
  },
  {
    id: 'tunisia-name-origin',
    category: 'Histoire',
    title: "L'origine du nom 'Tunisie'",
    content: "Le nom de la Tunisie provient de celui de sa capitale, Tunis. Ce terme dérive lui-même de la racine berbère 'ENS' ou 'TNS', qui signifie 'se coucher' ou 'passer la nuit', désignant à l'origine un lieu d'étape."
  },
  {
    id: 'chambi-summit',
    category: 'Géographie',
    title: 'Le Jebel Chambi, toit de la Tunisie',
    content: "Le Jebel Chambi est le point culminant de la Tunisie, s'élevant à 1 544 mètres d'altitude. Il fait partie de la chaîne de l'Atlas et abrite un parc national protégeant une faune rare comme le mouflon à manchettes."
  },
  {
    id: 'guellala-pottery',
    category: 'Culture',
    title: 'La poterie de Guellala à Djerba',
    content: "Le village de Guellala, sur l'île de Djerba, est célèbre pour sa poterie artisanale depuis l'Antiquité. Les potiers utilisent l'argile locale pour fabriquer la fameuse gargoulette servant à conserver l'eau fraîche."
  },
  {
    id: 'gabes-maritime-oasis',
    category: 'Géographie',
    title: 'Les oasis maritimes uniques de Gabès',
    content: "Gabès abrite les uniques oasis maritimes au monde. Les palmiers poussent littéralement au bord de la mer Méditerranée, créant un microclimat exceptionnel associant cultures maraîchères et paysages marins."
  },
  {
    id: 'douz-sahara-festival',
    category: 'Culture',
    title: 'Le festival de Douz, porte du désert',
    content: "Chaque année, la ville de Douz accueille le Festival international du Sahara. C'est la plus ancienne manifestation célébrant la culture nomade saharienne à travers des courses de dromadaires et des spectacles traditionnels."
  },
  {
    id: 'dougga-romian-ruins',
    category: 'Histoire',
    title: 'Le site archéologique de Dougga',
    content: "Dougga est considérée comme la ville romaine la mieux conservée d'Afrique du Nord. Classé à l'UNESCO, ce site exceptionnel présente un capitole magnifique, des thermes et un théâtre offrant une vue panoramique sur la vallée."
  }
];

export default function TriviaTab() {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [currentTrivia, setCurrentTrivia] = useState<TriviaItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userRating, setUserRating] = useState<TriviaFeedback['rating'] | null>(null);

  const feedbackMap = useMemo(() => {
    const map = new Map<string, TriviaFeedback['rating']>();
    if (userProfile?.triviaFeedback) {
      userProfile.triviaFeedback.forEach(f => {
        map.set(f.triviaId, f.rating);
      });
    }
    return map;
  }, [userProfile?.triviaFeedback]);

  // Recommendation engine: selects the next trivia card
  const selectNextTrivia = () => {
    const ratedIds = Array.from(feedbackMap.keys());
    const unratedTrivia = TRIVIA_DATABASE.filter(item => !ratedIds.includes(item.id));

    if (unratedTrivia.length === 0) {
      // Fallback: If all are rated, just show a random one from the database
      const randomItem = TRIVIA_DATABASE[Math.floor(Math.random() * TRIVIA_DATABASE.length)];
      setCurrentTrivia(randomItem);
      setUserRating(feedbackMap.get(randomItem.id) || null);
      return;
    }

    // Calculate affinity for categories based on "interessant" ratings
    const categoryAffinity: Record<string, number> = {};
    if (userProfile?.triviaFeedback) {
      userProfile.triviaFeedback.forEach(fb => {
        if (fb.rating === 'interessant') {
          const item = TRIVIA_DATABASE.find(t => t.id === fb.triviaId);
          if (item) {
            categoryAffinity[item.category] = (categoryAffinity[item.category] || 0) + 1;
          }
        }
      });
    }

    // Sort unrated trivia by category affinity (descending)
    const sortedUnrated = [...unratedTrivia].sort((a, b) => {
      const affinityA = categoryAffinity[a.category] || 0;
      const affinityB = categoryAffinity[b.category] || 0;
      return affinityB - affinityA;
    });

    // Pick the best match (highest category affinity), or random if tied
    const topAffinity = categoryAffinity[sortedUnrated[0].category] || 0;
    const candidates = sortedUnrated.filter(
      item => (categoryAffinity[item.category] || 0) === topAffinity
    );
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];

    setCurrentTrivia(chosen);
    setUserRating(null);
  };

  // Initialize first trivia
  useEffect(() => {
    if (TRIVIA_DATABASE.length > 0 && !currentTrivia) {
      selectNextTrivia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedbackMap, currentTrivia]);

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

      // Brief delay to allow feedback animation before loading next
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

  const getCategoryColor = (category: TriviaItem['category']) => {
    switch (category) {
      case 'Histoire': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'Gastronomie': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'Culture': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Géographie': return 'bg-sky-500/10 text-sky-500 border-sky-500/20';
      case 'Art': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  const ratedCount = feedbackMap.size;
  const progressPercent = Math.min(100, Math.round((ratedCount / TRIVIA_DATABASE.length) * 100));

  if (!currentTrivia) {
    return (
      <Card className="max-w-2xl mx-auto min-h-[400px] flex flex-col justify-center items-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Préparation de l'anecdote...</p>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      {/* Progression Bar */}
      <div className="bg-card/50 backdrop-blur-md border rounded-xl p-3 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-medium">
            Anecdotes lues : {ratedCount} / {TRIVIA_DATABASE.length}
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

      {/* Main Glassmorphic Card */}
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
          {/* Custom Illustration */}
          <div className="relative w-full h-44 sm:h-52 rounded-xl overflow-hidden border bg-black/40 flex items-center justify-center">
            <Image
              src="/images/5amem/trivia.png"
              alt="Trivia Illustration"
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

          {/* Skip / Next button when already rated */}
          {ratedCount === TRIVIA_DATABASE.length && (
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
    </div>
  );
}
