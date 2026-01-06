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
    async function getPlacesContext(category: string, query?: string): Promise<string> {
      console.log(`[AI Flow] Fetching places for category: ${category}, query: ${query}`);
      try {
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

        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[aeiouy]/g, "_").trim();
        const normalizedQuery = query ? normalize(query) : "";

        let context = `LISTE DES LIEUX DISPONIBLES (Classés par zone) :\n`;
        let exactMatchesContext = `CORRESPONDANCES EXACTES DANS LA BASE (Priorité #1) :\n`;
        let hasExactMatches = false;
        let hasPlaces = false;

        zonesSnapshot.forEach(doc => {
          const data = doc.data();
          let places: string[] = data[primaryKey] || [];
          if (fallbackKey && data[fallbackKey]) {
            places = [...places, ...data[fallbackKey]];
          }
          places = Array.from(new Set(places));

          const specialtiesMap = data.specialties || {};
          const zoneName = data.zone || doc.id;

          if (Array.isArray(places) && places.length > 0) {
            const placesWithSpecialties = places.map(p => {
              const sList: string[] = specialtiesMap[p] || [];

              // Check for fuzzy match if query exists
              let isExactDishMatch = false;
              if (normalizedQuery) {
                isExactDishMatch = sList.some(s => normalize(s) === normalizedQuery || normalize(s).includes(normalizedQuery) || normalizedQuery.includes(normalize(s)));
              }

              const dishInfo = sList.length > 0 ? ` (DISHES: ${sList.join(', ')})` : '';
              const placeEntry = `${p}${dishInfo}`;

              if (isExactDishMatch) {
                exactMatchesContext += `- ${p} (Zone: ${zoneName}, Plats: ${sList.join(', ')})\n`;
                hasExactMatches = true;
              }

              return placeEntry;
            });

            context += `ZONE: ${zoneName}\nLIEUX: ${placesWithSpecialties.join(', ')}\n---\n`;
            hasPlaces = true;
          }
        });

        if (!hasPlaces) {
          return `Aucun lieu trouvé pour la catégorie "${category}".`;
        }

        return (hasExactMatches ? exactMatchesContext + "\n" : "") + context;

      } catch (error) {
        console.error(`Error fetching places context:`, error);
        return "";
      }
    }

    const placesContext = await getPlacesContext(input.category, input.query);


    if (!makeDecisionPrompt) {
      makeDecisionPrompt = ai.definePrompt(
        {
          name: 'makeDecisionPrompt',
          inputSchema: z.object({
            category: z.string(),
            city: z.string(),
            zones: z.array(z.string()).optional(),
            placesContext: z.string(),
            randomNumber: z.number().optional(),
            query: z.string().optional(),
          }),
          outputSchema: MakeDecisionOutputSchema,
        },
        `Tu es un expert local de Tunis. Ta mission est de suggérer 2 lieux pour une sortie "{{category}}".
        
DONNÉES DE RÉFÉRENCE (Utilise UNIQUEMENT ces lieux) :
{{placesContext}}

CONTRAINTES UTILISATEUR :
- Catégorie : "{{category}}"
- Recherche spécifique / Plat : "{{#if query}}{{query}}{{else}}Aucun{{/if}}"
- Zones souhaitées : {{#if zones.length}}{{#each zones}}{{this}}, {{/each}}{{else}}Toutes zones acceptées{{/if}}

TES INSTRUCTIONS CRITIQUES :
1. PRIORITÉ ABSOLUE : Si la section "CORRESPONDANCES EXACTES DANS LA BASE" est présente dans placesContext, tu DOIS choisir tes suggestions PARMI CES LIEUX en priorité.
2. RECHERCHE PAR PLAT : Si l'utilisateur cherche "{{query}}" :
   - Ignore le nom des enseignes (ex: ne suggère pas une Pizzeria juste parce qu'il y a "Pizza" dans le nom si elle n'a pas "Pizza" dans ses DISHES).
   - FIE-TOI UNIQUEMENT aux plats listés dans "DISHES" ou dans la section "CORRESPONDANCES EXACTES".
   - Si aucune correspondance n'est trouvée dans les données fournies, refuse de suggérer un lieu au hasard pour ce plat spécifique.
3. JUSTIFICATION : Dans la description de chaque suggestion, tu DOIS mentionner explicitement le plat trouvé (ex: "J'ai choisi cet endroit car il propose d'excellents {{query}} selon notre base").
4. SÉLECTION : Propose 2 lieux.

Règle d'or : N'invente pas de plats pour un lieu s'ils ne sont pas dans les données fournies.
`
      );
    }

    if (placesContext.startsWith('Aucun lieu')) {
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
    if (combinedSuggestions.length === 0) {
      console.log("[AI Flow] AI returned 0 suggestions. Attempting manual fallback.");

      function fallbackSelection(context: string, zones?: string[], query?: string): Suggestion[] {
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[aeiouy]/g, "_").trim();
        const normalizedQuery = query ? normalize(query) : "";

        const zoneBlocks = context.split('---');
        let allPlaces: { name: string, zone: string, isMatch: boolean }[] = [];

        for (const block of zoneBlocks) {
          const zoneMatch = block.match(/ZONE: (.*)\n/);
          const placesMatch = block.match(/LIEUX: (.*)\n/);
          if (zoneMatch && placesMatch) {
            const zone = zoneMatch[1].trim();
            const placesRaw = placesMatch[1].split(',').map(p => p.trim()).filter(p => p);

            let isZoneMatch = true;
            if (zones && zones.length > 0) {
              isZoneMatch = zones.some(z => zone.toLowerCase().includes(z.toLowerCase()) || z.toLowerCase().includes(zone.toLowerCase()));
            }

            if (isZoneMatch) {
              placesRaw.forEach(p => {
                const isDishMatch = normalizedQuery ? normalize(p).includes(normalizedQuery) : false;
                allPlaces.push({ name: p.split(' (DISHES:')[0], zone: zone, isMatch: isDishMatch });
              });
            }
          }
        }

        if (allPlaces.length === 0) return [];
        let candidates = allPlaces.filter(p => p.isMatch);
        if (candidates.length === 0) {
          if (query) return []; // If searching for a specific dish and found nothing, better to return nothing
          candidates = allPlaces;
        }

        const selected = candidates.sort(() => 0.5 - Math.random()).slice(0, 2);
        return selected.map(p => ({
          placeName: p.name,
          description: p.isMatch
            ? `Recommandé pour ses ${query} ! (Sélection validée)`
            : `Un super endroit à découvrir à ${p.zone} !`,
          location: p.zone,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.zone + ' Tunis')}`
        }));
      }

      combinedSuggestions = fallbackSelection(placesContext, input.zones, input.query);
    }

    return { suggestions: combinedSuggestions };
  }
);


export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}
