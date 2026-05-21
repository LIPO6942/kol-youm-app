import DailyQuiz from "@/components/5amem/daily-quiz";
import Talla3Game from "@/components/5amem/talla3-game";
import ScoresDashboard from "@/components/5amem/scores-dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AmemPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight">Entraînement Cérébral</h2>
        <p className="text-muted-foreground">
          Stimulez votre esprit avec nos quiz et jeux quotidiens.
        </p>
      </div>
      <Tabs defaultValue="quiz" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quiz">Quiz Quotidien</TabsTrigger>
          <TabsTrigger value="talla3">Talla3</TabsTrigger>
          <TabsTrigger value="scores">Mes Scores</TabsTrigger>
        </TabsList>
        <TabsContent value="quiz">
            <DailyQuiz />
        </TabsContent>
        <TabsContent value="talla3">
            <Talla3Game />
        </TabsContent>
        <TabsContent value="scores">
            <ScoresDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
