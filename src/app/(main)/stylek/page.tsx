import OutfitSuggester from '@/components/stylek/outfit-suggester';
import { HuggingFaceSetupCard } from '@/components/ui/huggingface-setup-card';

export default function StylekPage() {
  return (
    <div className="space-y-4">
      <HuggingFaceSetupCard />
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight">Votre Style, Votre Journée</h2>
            <p className="text-muted-foreground">
              Recevez des suggestions de tenues personnalisées avec génération d'images IA.
            </p>
        </div>
      </div>
      <OutfitSuggester />
    </div>
  );
}
