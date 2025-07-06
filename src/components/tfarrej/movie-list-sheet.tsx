'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Film } from "lucide-react";

interface MovieListSheetProps {
  trigger: React.ReactNode;
  title: string;
  description: string;
  movieTitles: string[] | undefined;
}

export function MovieListSheet({ trigger, title, description, movieTitles }: MovieListSheetProps) {
  const sortedMovieTitles = movieTitles ? [...movieTitles].reverse() : [];
  
  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] pr-4">
          <div className="py-4 space-y-2">
            {sortedMovieTitles && sortedMovieTitles.length > 0 ? (
              sortedMovieTitles.map((movieTitle, index) => (
                <div key={`${movieTitle}-${index}`} className="flex items-center p-3 rounded-lg bg-muted/50">
                  <Film className="h-5 w-5 mr-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{movieTitle}</span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center text-center text-muted-foreground pt-10">
                  <Film className="h-10 w-10 mb-4" />
                  <p>Votre liste est vide pour le moment.</p>
                  <p className="text-xs">Commencez à swiper pour la remplir !</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
