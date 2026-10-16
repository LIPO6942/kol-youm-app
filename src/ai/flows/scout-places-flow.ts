'use server';

import { ai } from '@/ai/genkit';
import {
  ScoutPlacesInputSchema,
  ScoutPlacesOutputSchema,
  type ScoutPlacesInput,
  type ScoutPlacesOutput,
} from './scout-places-flow.types';

export const scoutPlacesFlow = ai.defineFlow(
  {
    name: 'scoutPlacesFlow',
    inputSchema: ScoutPlacesInputSchema,
    outputSchema: ScoutPlacesOutputSchema,
  },
  async (input) => {
    const existingSample = (input.existingPlaces || []).slice(0, 60).join(', ');

    const prompt = `Tu es un éclaireur gastronomique et guide des sorties pour le Grand Tunis (Tunisie).
Ta mission est d'identifier de NOUVEAUX établissements réels (cafés, salons de thé, restaurants, fast-foods réputés, brunchs, pâtisseries, ou lieux de détente) situés dans la zone "${input.zone}" (Tunis).

LIEUX DÉJÀ PRÉSENTS DANS LA BASE POUR CETTE ZONE (À EXCLURE IMPÉRATIVEMENT) :
${existingSample || 'Aucun pour le moment.'}

RÈGLES STRICTES :
1. RÉALITÉ DU TERRAIN : Ne propose que des établissements RÉELS qui existent physiquement dans la zone "${input.zone}". N'invente aucun nom fictif.
2. PAS DE DOUBLONS : N'inclus aucun lieu déjà cité dans la liste ci-dessus, ni aucune variante (avec ou sans 'Café', 'Restaurant', etc.).
3. CATÉGORIES VALIDES :
   - "cafes" : Cafés, salons de thé, coffee shops, glaciers.
   - "restaurants" : Restaurants traditionnels tunisiens, italiens, asiatiques, bistros, poissons.
   - "fastFoods" : Fast food, burgers, chapatis, sandwiches, pizzerias rapides.
   - "brunch" : Brunch, boulangeries, pâtisseries, crêperies/gaufres.
   - "kharjet" : Balades, parcs, loisirs, cinémas, spots de sortie.
4. QUANTITÉ : Propose entre 3 et 8 établissements de qualité non enregistrés.
5. FORMAT : Remplis strictement le schéma JSON demandé avec name, category, description et address si connue.`;

    try {
      const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt,
        output: {
          schema: ScoutPlacesOutputSchema,
        },
        config: {
          temperature: 0.6,
        },
      });

      if (!output || !output.discoveredPlaces) {
        return { discoveredPlaces: [] };
      }

      return output;
    } catch (error) {
      console.error('[Scout Places Flow] Error:', error);
      return { discoveredPlaces: [] };
    }
  }
);

export async function scoutPlaces(input: ScoutPlacesInput): Promise<ScoutPlacesOutput> {
  return scoutPlacesFlow(input);
}
