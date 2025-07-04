import DailyQuiz from "@/components/5amem/daily-quiz";

export default function AmemPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-headline tracking-tight">Entraînement Cérébral</h2>
        <p className="text-muted-foreground mt-2">
          Stimulez votre esprit avec nos quiz et jeux quotidiens.
        </p>
      </div>
      <DailyQuiz />
    </div>
  );
}
