'use server';

/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes an outing category and returns a list of suggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MakeDecisionInputSchema, MakeDecisionOutputSchema, type MakeDecisionInput, type MakeDecisionOutput, type Suggestion } from './decision-maker-flow.types';

// By defining the prompt inside the flow and caching it, we avoid making the Next.js server action bundle too large,
// which can cause deployment failures on platforms like Vercel.
let makeDecisionPrompt: any = null;

const makeDecisionFlow = ai.defineFlow(
  {
    name: 'makeDecisionFlow',
    inputSchema: MakeDecisionInputSchema,
    outputSchema: MakeDecisionOutputSchema,
  },
  async input => {

    // Dynamic Fetching Logic
    async function getPlacesContext(category: string): Promise<string> {
      console.log(`[AI Flow] Fetching places for category: ${category}`);
      try {
        // Use the shared client to ensure same DB instance/config as the frontend
        const { db } = await import('@/lib/firebase/client');
        const { collection, getDocs } = await import('firebase/firestore');

        const zonesSnapshot = await getDocs(collection(db, 'zones'));

        const lowerCat = category.toLowerCase();
        let primaryKey = '';
        let fallbackKey = '';

        if (lowerCat.includes('café') || lowerCat.includes('cafe')) { primaryKey = 'cafes'; }
        else if (lowerCat.includes('restaurant')) { primaryKey = 'restaurants'; }
        else if (lowerCat.includes('fast') || lowerCat.includes('food')) { primaryKey = 'fastFoods'; fallbackKey = 'fastfoods'; }
        else if (lowerCat.includes('brunch')) { primaryKey = 'brunch'; }
        else if (lowerCat.includes('balade')) { primaryKey = 'balade'; }
        else if (lowerCat.includes('shopping')) { primaryKey = 'shopping'; }
        else { primaryKey = lowerCat; }

        if (!primaryKey) return "Aucune liste de lieux disponible pour cette catégorie.";

        // Begin context with a summary header for debugging
        let context = `LISTE DES LIEUX DISPONIBLES (Classés par zone) :\n`;
        let hasPlaces = false;
        let totalPlacesFound = 0;
        let debugZoneCount = 0;

        zonesSnapshot.forEach(doc => {
          const data = doc.data();
          // Merge primary and fallback keys if they exist
          let places = data[primaryKey] || [];
          if (fallbackKey && data[fallbackKey]) {
            places = [...places, ...data[fallbackKey]];
          }
          // Deduplicate
          places = Array.from(new Set(places));

          if (Array.isArray(places) && places.length > 0) {
            const zoneName = data.zone || doc.id;
            // Simplified format for better AI parsing, used by fallback too
            context += `ZONE: ${zoneName}\nLIEUX: ${places.join(', ')}\n---\n`;
            hasPlaces = true;
            totalPlacesFound += places.length;
            debugZoneCount++;
          }
        });

        if (!hasPlaces) {
          return `Aucun lieu trouvé pour la catégorie "${category}".`;
        }

        return context;

      } catch (error) {
        console.error(`Error fetching places context for category ${category}:`, error);
        return "";
      }
    }

    const placesContext = await getPlacesContext(input.category);


    if (!makeDecisionPrompt) {
      makeDecisionPrompt = ai.definePrompt(
        {
          name: 'makeDecisionPrompt',
          inputSchema: z.object({
            category: z.string(),
            city: z.string(),
            zones: z.array(z.string()).optional(),
            seenPlaceNames: z.array(z.string()).optional(),
            placesContext: z.string(),
            randomNumber: z.number().optional(),
          }),
          outputSchema: MakeDecisionOutputSchema,
        },
        `Tu es un expert local de Tunis. Ta mission est de suggérer 2 lieux pour une sortie "{{category}}".
        
DONNÉES DE RÉFÉRENCE (Utilise UNIQUEMENT ces lieux) :
{{placesContext}}

CONTRAINTES UTILISATEUR :
- Catégorie : "{{category}}"
- Zones souhaitées : {{#if zones.length}}{{#each zones}}{{this}}, {{/each}}{{else}}Toutes zones acceptées{{/if}}
- À éviter (déjà vus) : {{#if seenPlaceNames}}{{#each seenPlaceNames}}{{this}}, {{/each}}{{else}}Aucun{{/if}}

TES INSTRUCTIONS :
1. ANALYSE : Trouve tous les lieux listés sous les zones demandées. Si une zone demandée n'est pas écrite exactement pareil (ex: "Ain Zaghouan" vs "Ain Zaghouan Nord"), accepte la correspondance si c'est pertinent.
2. SÉLECTION : Choisis 2 lieux au hasard parmi les correspondances. Utilise le nombre {{randomNumber}} pour varier ton choix.
3. RETOUR : Retourne UNIQUEMENT le JSON avec les 2 suggestions.

Règles d'or :
- Si tu trouves des lieux dans la zone demandée, tu DOIS en suggérer (ne renvoie pas vide).
- Si tu ne trouves RIEN dans la zone demandée, cherche dans les zones voisines ou retourne une liste vide.
- Invente une description courte pour chaque lieu si tu n'en as pas, mais le nom du lieu et la zone doivent être exacts.
`
      );
    }

    // Pass context to prompt
    // If we have a debug error, skip the AI generation to avoid waste/confusion
    if (placesContext.startsWith('DEBUG_ERROR:') || placesContext.startsWith('Aucun lieu')) {
      return { suggestions: [] };
    }

    let combinedSuggestions: Suggestion[] = [];

    try {
      const result = await makeDecisionPrompt({
        ...input,
        placesContext: placesContext,
        randomNumber: Math.random(),
      });
      combinedSuggestions = result.output?.suggestions || [];
    } catch (e) {
      console.error("AI Prompt Error", e);
    }

    // --- MANUAL FALLBACK MECHANISM ---
    // If AI returns nothing but we have data, picking manually.
    if (combinedSuggestions.length === 0) {
      console.log("[AI Flow] AI returned 0 suggestions. Attempting manual fallback.");

      function fallbackSelection(context: string, zones?: string[]): Suggestion[] {
        const zoneBlocks = context.split('---');
        let allPlaces: { name: string, zone: string }[] = [];

        for (const block of zoneBlocks) {
          const zoneMatch = block.match(/ZONE: (.*)\n/);
          const placesMatch = block.match(/LIEUX: (.*)\n/);
          if (zoneMatch && placesMatch) {
            const zone = zoneMatch[1].trim();
            const places = placesMatch[1].split(',').map(p => p.trim()).filter(p => p);

            // Filter by requested zones (fuzzy)
            let isMatch = true;
            if (zones && zones.length > 0) {
              isMatch = zones.some(z => {
                const z1 = z.toLowerCase().replace(/nord|sud|est|ouest/g, '').trim();
                const z2 = zone.toLowerCase().replace(/nord|sud|est|ouest/g, '').trim();
                return zone.toLowerCase().includes(z.toLowerCase()) || z.toLowerCase().includes(zone.toLowerCase()) || z1.includes(z2) || z2.includes(z1);
              });
            }

            if (isMatch) {
              places.forEach(p => allPlaces.push({ name: p, zone: zone }));
            }
          }
        }

        // Filter seen places
        if (input.seenPlaceNames && input.seenPlaceNames.length > 0) {
          allPlaces = allPlaces.filter(p => !input.seenPlaceNames!.includes(p.name));
        }

        if (allPlaces.length === 0) return [];

        // Randomly select 2
        const shuffled = allPlaces.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 2);

        return selected.map(p => ({
          placeName: p.name,
          description: `Un super endroit à découvrir à ${p.zone} ! (Suggestion Automatique)`,
          location: p.zone,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.zone + ' Tunis')}`
        }));
      }

      combinedSuggestions = fallbackSelection(placesContext, input.zones);
    }

    return { suggestions: combinedSuggestions };
  }
);


export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}
