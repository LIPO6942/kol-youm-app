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
    // Échantillon léger de 5-6 lieux connus pour guider l'IA sans paralyser sa mémoire
    const sampleKnown = (input.existingPlaces || []).slice(0, 8).join(', ');

    const prompt = `Tu es un guide local et éclaireur gastronomique réputé pour le Grand Tunis (Tunisie).
Ta mission est d'identifier des établissements réels (cafés, salons de thé, restaurants, street-food, brunch, pâtisseries, loisirs) situés spécifiquement dans la zone "${input.zone}" (Tunis).

Recherche activement les pépites, nouveautés, adresses populaires ou incontournables dans "${input.zone}".

EXEMPLES D'ÉTABLISSEMENTS DÉJÀ CONNUS DANS CETTE ZONE (À ÉVITER) :
${sampleKnown || 'Aucun pour le moment.'}

CONSIGNES IMPORTANTES :
1. RÉALITÉ DU TERRAIN : Ne cite que des lieux RÉELS existant physiquement dans "${input.zone}". N'invente aucun nom.
2. DIVERSITÉ : Propose entre 6 et 12 établissements variés.
3. CATÉGORIES VALIDES :
   - "cafes" : Cafés, coffee shops, salons de thé, glaciers.
   - "restaurants" : Restaurants traditionnels tunisiens, italiens, asiatiques, poissons, bistros.
   - "fastFoods" : Fast food, burgers, chapatis, sandwiches, pizzerias rapides.
   - "brunch" : Brunch, boulangeries, pâtisseries, crêperies.
   - "kharjet" : Balades, parcs, loisirs, cinémas, spots culturels.
4. FORMAT JSON : Fournis le résultat selon le schéma avec le nom exact, la catégorie la plus adaptée, une brève description (spécialité) et l'adresse ou repère si connu.`;

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY;

    // 1. Si une clé API directe est disponible, tenter l'appel avec Google Search Grounding natif
    if (apiKey) {
      try {
        console.log(`[Scout Places Flow] Attempting direct Gemini API with Google Search Grounding for "${input.zone}"...`);
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt + '\n\nRéponds UNIQUEMENT par un objet JSON valide avec la clé "discoveredPlaces": [...]' }] }],
            tools: [{ googleSearch: {} }],
            generationConfig: {
              temperature: 0.7,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('');
          if (rawText) {
            // Nettoyer les balises markdown ```json ... ```
            const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            if (parsed && Array.isArray(parsed.discoveredPlaces) && parsed.discoveredPlaces.length > 0) {
              console.log(`[Scout Places Flow] Google Search Grounding found ${parsed.discoveredPlaces.length} places!`);
              return parsed;
            }
          }
        } else {
          const errData = await res.text();
          console.warn('[Scout Places Flow] Direct REST API error, falling back to Genkit:', res.status, errData);
        }
      } catch (directErr) {
        console.warn('[Scout Places Flow] Direct REST API failed, falling back to Genkit:', directErr);
      }
    }

    // 2. Repli sur le client Genkit standard
    try {
      console.log(`[Scout Places Flow] Scouting zone via Genkit: "${input.zone}"`);

      const { output } = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt,
        output: {
          schema: ScoutPlacesOutputSchema,
        },
        config: {
          temperature: 0.7,
        },
      });

      console.log('[Scout Places Flow] AI Output received:', JSON.stringify(output));

      if (!output || !output.discoveredPlaces) {
        console.warn('[Scout Places Flow] Output or output.discoveredPlaces is null/undefined');
        return { discoveredPlaces: [] };
      }

      return output;
    } catch (error: any) {
      console.error('[Scout Places Flow] Error in ai.generate:', error);
      throw new Error(error?.message || String(error));
    }
  }
);

export async function scoutPlaces(input: ScoutPlacesInput): Promise<ScoutPlacesOutput> {
  return scoutPlacesFlow(input);
}
