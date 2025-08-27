import OutfitSuggester from '@/components/stylek/outfit-suggester';
import { WardrobeSheet } from '@/components/stylek/wardrobe-sheet';
import { Button } from '@/components/ui/button';
import { Hanger } from 'lucide-react';

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
        <WardrobeSheet>
            <Button variant="outline">
                <Hanger className="mr-2 h-4 w-4" />
                Garde-Robe
            </Button>
        </WardrobeSheet>
      </div>
      <OutfitSuggester />
    </div>
  );
}
