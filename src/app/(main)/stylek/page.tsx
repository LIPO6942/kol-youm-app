import OutfitSuggester from '@/components/stylek/outfit-suggester';
import { WardrobeSheet } from '@/components/stylek/wardrobe-sheet';

export default function StylekPage() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold font-headline tracking-tight">Votre Style, Votre Journée</h2>
            <p className="text-muted-foreground">
              Recevez des suggestions de tenues personnalisées.
            </p>
        </div>
        <WardrobeSheet />
      </div>
      <OutfitSuggester />
    </div>
  );
}
