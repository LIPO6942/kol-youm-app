import { z } from 'genkit';

export const ScoutPlacesInputSchema = z.object({
  zone: z.string().describe('The zone in Greater Tunis to scout, e.g. "La Marsa", "Ennasr", "Carthage".'),
  existingPlaces: z.array(z.string()).describe('List of places already registered in this zone to exclude.'),
  groqApiKey: z.string().optional().describe('Optional Groq API key provided by admin.'),
});
export type ScoutPlacesInput = z.infer<typeof ScoutPlacesInputSchema>;

export const DiscoveredPlaceSchema = z.object({
  name: z.string().describe('Clean official name of the establishment.'),
  category: z.enum(['cafes', 'restaurants', 'fastFoods', 'brunch', 'kharjet']).describe('Best matching category in Kol Youm.'),
  description: z.string().describe('Short 1-sentence description or specialty of the place.'),
  address: z.string().optional().describe('Street name, landmark, or specific location in this zone.'),
});
export type DiscoveredPlace = z.infer<typeof DiscoveredPlaceSchema>;

export const ScoutPlacesOutputSchema = z.object({
  discoveredPlaces: z.array(DiscoveredPlaceSchema).describe('List of discovered places not in the existing list.'),
});
export type ScoutPlacesOutput = z.infer<typeof ScoutPlacesOutputSchema>;
