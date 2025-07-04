import MovieSwiper from '@/components/tfarrej/movie-swiper';

export default function TfarrejPage() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold font-headline tracking-tight">Le Tinder du Cinéma</h2>
        <p className="text-muted-foreground">
          "Swipez" pour découvrir votre prochain film ou série coup de cœur.
        </p>
      </div>
      <MovieSwiper />
    </div>
  );
}
