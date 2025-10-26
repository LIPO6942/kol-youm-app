import DecisionMaker from '@/components/khrouj/decision-maker';
import { AIStatusCard } from '@/components/ui/ai-status-card';

export default function KhroujPage() {
  return (
    <div className="space-y-4">
      <AIStatusCard />
      <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight">Décide pour moi !</h2>
        <p className="text-muted-foreground">
          Tu hésites ? Laisse-nous choisir ta prochaine sortie à Tunis.
        </p>
      </div>
      <DecisionMaker />
    </div>
  );
}
