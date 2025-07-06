import {z} from 'genkit';

export const MakeDecisionInputSchema = z.object({
  category: z
    .string()
    .describe(
      'The category of outing the user wants, e.g., "Café", "Brunch", "Shopping".'
    ),
  city: z
    .string()
    .describe('The city where the user is, for context. e.g. "Tunis"'),
  seenPlaceNames: z.array(z.string()).optional().describe('A list of place names the user has already seen, to avoid duplicates.'),
});
export type MakeDecisionInput = z.infer<typeof MakeDecisionInputSchema>;

export const MakeDecisionOutputSchema = z.object({
  chosenOption: z
    .string()
    .describe('The chosen category, which should match the input category.'),
  placeName: z
    .string()
    .describe(
      'The name of a real, existing, and well-regarded place that fits the chosen option.'
    ),
  description: z
    .string()
    .describe(
      'A short, enticing description of the suggested place, highlighting its specialty or ambiance. The tone should be friendly and inspiring.'
    ),
  location: z
    .string()
    .describe(
      'The specific neighborhood or area of the suggested place. e.g., "La Marsa", "Les Berges du Lac 2".'
    ),
  googleMapsUrl: z
    .string()
    .describe('A valid Google Maps URL to the suggested place.'),
});
export type MakeDecisionOutput = z.infer<typeof MakeDecisionOutputSchema>;
