import { TeskertiEvents } from "@/components/teskerti-events";
import { Ticket } from "lucide-react";

export default function AmemPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Ticket className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold font-headline tracking-tight">Teskerti Events</h2>
        </div>
        <p className="text-muted-foreground">
          Découvrez et réservez les meilleures sorties en Tunisie en temps réel.
        </p>
      </div>

      <TeskertiEvents />
    </div>
  );
}
