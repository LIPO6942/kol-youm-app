import MovieSwiper from '@/components/tfarrej/movie-swiper';

export default function TfarrejPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold font-headline tracking-tight">Le Tinder du Cinéma</h2>
        <p className="text-muted-foreground mt-2">
          "Swipez" pour découvrir votre prochain film ou série coup de cœur.
        </p>
      </div>
      <MovieSwiper />
    </div>
  );
}
