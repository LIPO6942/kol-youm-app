import OutfitSuggester from '@/components/stylek/outfit-suggester';
import { ApiKeyAlert } from '@/components/stylek/api-key-alert';

export default function StylekPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between pb-1">
        <h1 className="text-xl sm:text-2xl font-bold font-headline tracking-tight text-foreground">
          Le Vestiaire Météo
        </h1>
        <span className="text-xs text-muted-foreground font-body hidden sm:inline">
          Votre silhouette quotidienne accordée au climat
        </span>
      </div>
      <ApiKeyAlert />
      <OutfitSuggester />
    </div>
  );
}
