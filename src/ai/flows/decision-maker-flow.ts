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

        // Improved normalization for phonetic variations in Tunisian dialect
        const normalize = (s: string) => s.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
          .replace(/[ei]/g, "1") // Merge common phonetic variations
          .replace(/[aoe]/g, "2")
          .replace(/y/g, "1")
          .replace(/u/g, "3")
          .replace(/\W/g, "") // Remove special chars
          .trim();

        const normalizedQuery = query ? normalize(query) : "";

        let context = `--- LISTE GLOBALE DES LIEUX (Format: Nom [Plats]) ---\n`;
        let exactMatchesContext = `--- CORRESPONDANCES DÉTECTÉES DANS LA BASE (Priorité Maximale) ---\n`;
        let hasExactMatches = false;
        let hasPlaces = false;

        zonesSnapshot.forEach(doc => {
          const data = doc.data();
          let places: string[] = data[primaryKey] || [];
          if (fallbackKey && data[fallbackKey]) {
            places = [...places, ...data[fallbackKey]];
          }
          places = Array.from(new Set(places)).filter(p => p && p.trim() !== "");

          const specialtiesMap = data.specialties || {};
          const zoneName = data.zone || doc.id;

          if (places.length > 0) {
            const placesWithSpecialties = places.map(p => {
              const sList: string[] = specialtiesMap[p] || [];

              let isExactDishMatch = false;
              if (normalizedQuery) {
                isExactDishMatch = sList.some(s => {
                  const ns = normalize(s);
                  return ns === normalizedQuery || ns.includes(normalizedQuery) || normalizedQuery.includes(ns);
                });
              }

              if (isExactDishMatch) {
                exactMatchesContext += `LIEU: ${p}\nZONE: ${zoneName}\nPLATS_CONFIRMÉS: ${sList.join(', ')}\n\n`;
                hasExactMatches = true;
              }

              return `${p} [${sList.join(', ')}]`;
            });

            context += `ZONE: ${zoneName}\nLIEUX: ${placesWithSpecialties.join(' | ')}\n\n`;
            hasPlaces = true;
          }
        });

        if (!hasPlaces) {
          return `Aucun établissement trouvé pour la catégorie "${category}".`;
        }

        const finalContext = (hasExactMatches ? exactMatchesContext + "\n" : "") + context;
        return finalContext;

      } catch (error) {
        console.error(`Error fetching places context:`, error);
        return "Erreur technique lors de la récupération des lieux.";
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
- Recherche spécifique (Plat) : "{{#if query}}{{query}}{{else}}Aucune{{/if}}"
- Zones souhaitées : {{#if zones.length}}{{#each zones}}{{this}}, {{/each}}{{else}}Toutes{{/if}}

TES INSTRUCTIONS CRITIQUES (ZÉRO HALLUCINATION) :
1. VÉRIFICATION STRICTE : Tu DOIS suggérer uniquement des établissements présents dans les DONNÉES DE RÉFÉRENCE. Il est formellement interdit d'inventer un lieu.
2. PRIORITÉ AUX MATCHS : Si la section "CORRESPONDANCES DÉTECTÉES" est présente, choisis tes suggestions EXCLUSIVEMENT dans cette section.
3. NOM vs PLAT : Ne confonds pas le nom du plat avec le nom de l'établissement. Si tu ne trouves pas de lieu proposant "{{query}}" dans la liste, ne suggère rien.
4. CAS D'ABSENCE : Si "{{query}}" est spécifié et que tu ne trouves aucune correspondance réelle dans les "PLATS_CONFIRMÉS" ou les listes fournies, retourne un JSON vide : {"suggestions": []}. Ne propose jamais un lieu au hasard pour un plat spécifique.
5. DESCRIPTION : Justifie ton choix en citant le plat trouvé dans la base (ex: "Sélectionné car il propose des {{query}} confirmés dans notre base").
`
      );
    }

    if (placesContext.includes('Aucun établissement')) {
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
        const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[ei]/g, "1").replace(/[aoe]/g, "2").trim();
        const normalizedQuery = query ? normalize(query) : "";

        const zoneBlocks = context.split('ZONE: ').slice(1);
        let allPlaces: { name: string, zone: string, isMatch: boolean }[] = [];

        for (const block of zoneBlocks) {
          const lines = block.split('\n');
          const zone = lines[0].trim();
          const lieuxLine = lines.find(l => l.startsWith('LIEUX: '));

          if (lieuxLine) {
            const placesRaw = lieuxLine.replace('LIEUX: ', '').split(' | ').map(p => p.trim());

            let isZoneMatch = true;
            if (zones && zones.length > 0) {
              isZoneMatch = zones.some(z => zone.toLowerCase().includes(z.toLowerCase()) || z.toLowerCase().includes(zone.toLowerCase()));
            }

            if (isZoneMatch) {
              placesRaw.forEach(p => {
                const name = p.split(' [')[0];
                const isDishMatch = normalizedQuery ? normalize(p).includes(normalizedQuery) : false;
                allPlaces.push({ name, zone, isMatch: isDishMatch });
              });
            }
          }
        }

        if (allPlaces.length === 0) return [];
        let candidates = allPlaces.filter(p => p.isMatch);
        if (candidates.length === 0) {
          if (query) return []; // If searching for a specific dish and found nothing, return nothing to be strict
          candidates = allPlaces;
        }

        const selected = candidates.sort(() => 0.5 - Math.random()).slice(0, 2);
        return selected.map(p => ({
          placeName: p.name,
          description: p.isMatch
            ? `Recommandé pour ses ${query} ! (Sélection validée par base de données)`
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
