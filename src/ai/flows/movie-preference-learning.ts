'use server';

/**
 * @fileOverview Learns user movie preferences from swipe data.
 *
 * - recordMovieSwipe - Records a user's swipe on a movie suggestion.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MovieSwipeInputSchema, type MovieSwipeInput } from './movie-preference-learning.types';

/**
 * Records a user's swipe on a movie suggestion to learn their preferences.
 * @param input - The input containing user ID, movie ID, and swipe direction.
 */
export async function recordMovieSwipe(input: MovieSwipeInput): Promise<void> {
  return moviePreferenceLearningFlow(input);
}

const moviePreferenceLearningFlow = ai.defineFlow(
  {
    name: 'moviePreferenceLearningFlow',
    inputSchema: MovieSwipeInputSchema,
    outputSchema: z.void(),
  },
  async input => {
    // This is a placeholder for actual preference learning logic.
    // In a real application, this would likely involve updating a user profile
    // in a database or calling a machine learning model to update its parameters.
    // For now, we simply log the swipe data.

    console.log(
      `User ${input.userId} swiped ${input.swipeDirection} on movie ${input.movieId}.`
    );
  }
);
