import DecisionMaker from '@/components/khrouj/decision-maker';

export default function KhroujPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-headline tracking-tight">Décide pour moi !</h2>
        <p className="text-muted-foreground mt-2">
          Tu hésites ? Laisse-nous choisir ta prochaine sortie à Tunis.
        </p>
      </div>
      <DecisionMaker />
    </div>
  );
}
