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
});
export type MakeDecisionInput = z.infer<typeof MakeDecisionInputSchema>;

export const MakeDecisionOutputSchema = z.object({
  chosenOption: z
    .string()
    .describe('The chosen category, which should match the input category.'),
  placeName: z
    .string()
    .describe(
      'A specific, creative, and appealing name for a fictional place that fits the chosen option.'
    ),
  description: z
    .string()
    .describe(
      'A short, enticing description of the suggested place, highlighting one or two key features. The tone should be friendly and inspiring.'
    ),
  location: z
    .string()
    .describe(
      'A plausible neighborhood or area within the specified city. e.g., "La Marsa", "Les Berges du Lac 2".'
    ),
});
export type MakeDecisionOutput = z.infer<typeof MakeDecisionOutputSchema>;
