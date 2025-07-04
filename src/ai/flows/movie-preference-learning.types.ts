import {z} from 'genkit';

export const MovieSwipeInputSchema = z.object({
  userId: z.string().describe('The ID of the user swiping on the movie.'),
  movieId: z.string().describe('The ID of the movie being swiped on.'),
  swipeDirection: z
    .enum(['right', 'left'])
    .describe("The direction of the swipe. 'right' indicates the user liked the movie, 'left' indicates they disliked it."),
});
export type MovieSwipeInput = z.infer<typeof MovieSwipeInputSchema>;
