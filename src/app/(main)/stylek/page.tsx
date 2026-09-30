import OutfitSuggester from '@/components/stylek/outfit-suggester';
import { ApiKeyAlert } from '@/components/stylek/api-key-alert';

export default function StylekPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between pb-1">
        <h1 className="text-xl sm:text-2xl font-bold font-headline tracking-tight text-foreground">
          Stylek <span className="text-xs font-normal text-muted-foreground ml-2 font-body hidden sm:inline">Votre garde-robe connectée à la météo</span>
        </h1>
      </div>
      <ApiKeyAlert />
      <OutfitSuggester />
    </div>
  );
}
