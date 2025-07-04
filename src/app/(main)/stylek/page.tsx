import OutfitSuggester from '@/components/stylek/outfit-suggester';

export default function StylekPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight">Votre Style, Votre Journée</h2>
        <p className="text-muted-foreground">
          Recevez des suggestions de tenues personnalisées en fonction de votre programme et de la météo.
        </p>
      </div>
      <OutfitSuggester />
    </div>
  );
}
