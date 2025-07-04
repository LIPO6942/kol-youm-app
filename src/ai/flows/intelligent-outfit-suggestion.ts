'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating intelligent outfit suggestions based on user inputs.
 *
 * - suggestOutfit - A function that takes schedule keywords, weather, and occasion as input and returns an outfit suggestion.
 * - SuggestOutfitInput - The input type for the suggestOutfit function.
 * - SuggestOutfitOutput - The return type for the suggestOutfit function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestOutfitInputSchema = z.object({
  scheduleKeywords: z
    .string()
    .describe(
      'Keywords from the user schedule, like Meeting, Dinner, or Sports.'
    ),
  weather: z.string().describe('The local weather conditions.'),
  occasion: z
    .string()
    .describe(
      'The occasion for which the outfit is needed, e.g., Professional, Casual, Chic.'
    ),
  preferredColors: z
    .string()
    .describe(
      'A comma separated list of preferred colors. If the user has no preferred colors, pass the string "".'
    )
    .optional(),
    baseItem: z.string().describe('A specific clothing item the user wants to build an outfit around.').optional(),
});
export type SuggestOutfitInput = z.infer<typeof SuggestOutfitInputSchema>;

const SuggestOutfitOutputSchema = z.object({
  outfitSuggestion: z.string().describe('An outfit suggestion based on the inputs.'),
});
export type SuggestOutfitOutput = z.infer<typeof SuggestOutfitOutputSchema>;

export async function suggestOutfit(input: SuggestOutfitInput): Promise<SuggestOutfitOutput> {
  return suggestOutfitFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestOutfitPrompt',
  input: {schema: SuggestOutfitInputSchema},
  output: {schema: SuggestOutfitOutputSchema},
  prompt: `You are a personal stylist AI assistant.

{{#if baseItem}}
Based on the user's base item, their schedule keywords, the weather, and the occasion, suggest a complete outfit that complements the base item.
Base Item: {{{baseItem}}}
{{else}}
Based on the user's schedule keywords, the weather, and the occasion, suggest an appropriate outfit.
{{/if}}

Schedule Keywords: {{{scheduleKeywords}}}
Weather: {{{weather}}}
Occasion: {{{occasion}}}
Preferred Colors: {{#if preferredColors}}{{{preferredColors}}}{{else}}No preferred colors{{/if}}

Suggest a complete outfit, including top, bottom, shoes, and accessories. Provide details, such as color, material, and style.
If the user has specified preferred colors, then follow their instructions closely. If they have not specified preferred colors, then suggest outfits with colors that are generally appropriate and fashionable.
{{#if baseItem}}
The suggested outfit must incorporate and match the base item provided. For example if the base item is a top, suggest a bottom, shoes and accessories. If the base item is a unique piece like a dress, suggest shoes and accessories.
{{/if}}

Output:
`,
});

const suggestOutfitFlow = ai.defineFlow(
  {
    name: 'suggestOutfitFlow',
    inputSchema: SuggestOutfitInputSchema,
    outputSchema: SuggestOutfitOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
