'use server';

/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes an outing category and returns a list of suggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MakeDecisionInputSchema, MakeDecisionOutputSchema, type MakeDecisionInput, type MakeDecisionOutput } from './decision-maker-flow.types';

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
        let context = `- **Source exclusive pour "${category}" :** Tes suggestions pour la catégorie "${category}" doivent provenir **EXCLUSIVEMENT** de la liste suivante. Si aucun lieu ne correspond au filtre de zone de l'utilisateur, ne suggère rien.\n`;
        let hasPlaces = false;
        let totalPlacesFound = 0;
        let debugZoneCount = 0;
        let debugInfo = "";

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
            context += `  - **Zone ${zoneName} :** ${places.join(', ')}.\n`;
            hasPlaces = true;
            totalPlacesFound += places.length;
            debugZoneCount++;
          }
          prompt: `Tu es un générateur de suggestions purement aléatoires. Ta seule source de connaissances est la liste de lieux fournie ci-dessous. Tu ne dois JAMAIS suggérer un lieu qui n'est pas dans ces listes.

L'utilisateur a choisi la catégorie de sortie : "{{category}}".

Pour garantir que tes suggestions sont uniques et imprévisibles, utilise ce nombre aléatoire comme source d'inspiration pour ta sélection : {{randomNumber}}.

Ta tâche est la suivante :

1.  **Filtrer la liste :** D'abord, identifie la bonne liste de lieux en fonction de la catégorie "{{category}}". Si l'utilisateur a spécifié des zones ({{zones}}), filtre cette liste pour ne garder que les lieux qui se trouvent dans ces zones.
2.  **Sélection Aléatoire :** Dans la liste filtrée, choisis **DEUX** lieux de manière **COMPLÈTEMENT ALÉATOIRE**. La sélection doit être différente à chaque fois.
3.  **Éviter les répétitions :** Si l'utilisateur a déjà vu certains lieux ({{seenPlaceNames}}), exclus-les de ta sélection.
4.  **Formatage de la sortie :** Pour les deux lieux que tu as choisis au hasard, retourne les informations suivantes :
    - Le **nom exact** du lieu.
    - Une **description courte et engageante** (une ou deux phrases). Ajoute à la fin de la première description le texte suivant entre parenthèses : "({{placesContext}})" mais tronqué pour ne garder que le nombre de lieux trouvés, par exemple "(Debug: 12 lieux trouvés)".
    - Son **quartier ou sa ville**.
    - Une **URL Google Maps valide**.

**Instructions Cruciales :**
- L'aspect le plus important est que la sélection soit **purement aléatoire**. Ne choisis pas les premiers de la liste ou les plus populaires.
- Si, après filtrage, il y a moins de deux lieux disponibles, n'en retourne qu'un seul, ou retourne une liste vide si aucun ne correspond.
- Si l'utilisateur clique sur "Actualiser", tes nouvelles suggestions DOIVENT être différentes des précédentes. L'utilisation du 'randomNumber' doit garantir cela.

**Instructions importantes :**
{{#if zones.length}}
- **Filtre de zone :** L'utilisateur a demandé à voir des suggestions spécifiquement dans les zones suivantes : **{{#each zones}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}**. Toutes tes suggestions doivent impérativement se trouver dans cette ou ces zones ET dans les listes ci-dessous.
{{/if}}

{{#if seenPlaceNames}}
- **Éviter les répétitions :** Exclus impérativement les lieux suivants de tes suggestions, car l'utilisateur les a déjà vus :
{{#each seenPlaceNames}}
  - {{this}}
{{/each}}
{{/if}}

{{placesContext}}
'use server';

/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes an outing category and returns a list of suggestions.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { MakeDecisionInputSchema, MakeDecisionOutputSchema, type MakeDecisionInput, type MakeDecisionOutput } from './decision-maker-flow.types';

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
      console.log(`[AI Flow] Fetching places for category: ${ category } `);
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
        let context = `- ** Source exclusive pour "${category}" :** Tes suggestions pour la catégorie "${category}" doivent provenir ** EXCLUSIVEMENT ** de la liste suivante.Si aucun lieu ne correspond au filtre de zone de l'utilisateur, ne suggère rien.\n`;
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
              context += `  - **Zone ${zoneName} :** ${places.join(', ')}.\n`;
              hasPlaces = true;
              totalPlacesFound += places.length;
              debugZoneCount++;
            }
          });

          if (!hasPlaces) {
            return `Aucun lieu trouvé pour la catégorie "${category}" dans les zones disponibles.`;
          }

          return context;

        } catch (error) {
          console.error(`Error fetching places context for category ${category}:`, error);
          return `Erreur lors de la récupération des lieux pour la catégorie "${category}".`;
        }
      }

    const placesContext = await getPlacesContext(input.category);

      // Prepare debug info for the system suggestion
      const debugInfo = `(Debug: ${placesContext.split('\n').filter(line => line.includes('Zone')).length} zones, ${placesContext.split(', ').length - 1} lieux trouvés)`;


      if (!makeDecisionPrompt) {
        makeDecisionPrompt = ai.definePrompt(
          {
            name: 'makeDecisionPrompt',
            inputSchema: z.object({
              category: z.string(),
              zones: z.array(z.string()).default([]),
              seenPlaceNames: z.array(z.string()).default([]),
              placesContext: z.string(),
              randomNumber: z.number(),
            }),
            outputSchema: MakeDecisionOutputSchema,
          },
          `Tu es un générateur de suggestions purement aléatoires. Ta seule source de connaissances est la liste de lieux fournie ci-dessous. Tu ne dois JAMAIS suggérer un lieu qui n'est pas dans ces listes.

L'utilisateur a choisi la catégorie de sortie : "{{category}}".

Pour garantir que tes suggestions sont uniques et imprévisibles, utilise ce nombre aléatoire comme source d'inspiration pour ta sélection : {{randomNumber}}.

Ta tâche est la suivante :

1.  **Filtrer la liste :** D'abord, identifie la bonne liste de lieux en fonction de la catégorie "{{category}}". Si l'utilisateur a spécifié des zones ({{zones}}), filtre cette liste pour ne garder que les lieux qui se trouvent dans ces zones.
2.  **Sélection Aléatoire :** Dans la liste filtrée, choisis **DEUX** lieux de manière **COMPLÈTEMENT ALÉATOIRE**. La sélection doit être différente à chaque fois.
3.  **Éviter les répétitions :** Si l'utilisateur a déjà vu certains lieux ({{seenPlaceNames}}), exclus-les de ta sélection.
4.  **Formatage de la sortie :** Pour les deux lieux que tu as choisis au hasard, retourne les informations suivantes :
    - Le **nom exact** du lieu.
    - Une **description courte et engageante** (une ou deux phrases). Ajoute à la fin de la première description le texte suivant entre parenthèses : "({{placesContext}})" mais tronqué pour ne garder que le nombre de lieux trouvés, par exemple "(Debug: 12 lieux trouvés)".
    - Son **quartier ou sa ville**.
    - Une **URL Google Maps valide**.

**Instructions Cruciales :**
- L'aspect le plus important est que la sélection soit **purement aléatoire**. Ne choisis pas les premiers de la liste ou les plus populaires.
- Si, après filtrage, il y a moins de deux lieux disponibles, n'en retourne qu'un seul, ou retourne une liste vide si aucun ne correspond.
- Si l'utilisateur clique sur "Actualiser", tes nouvelles suggestions DOIVENT être différentes des précédentes. L'utilisation du 'randomNumber' doit garantir cela.

**Instructions importantes :**
{{#if zones.length}}
- **Filtre de zone :** L'utilisateur a demandé à voir des suggestions spécifiquement dans les zones suivantes : **{{#each zones}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}**. Toutes tes suggestions doivent impérativement se trouver dans cette ou ces zones ET dans les listes ci-dessous.
{{/if}}

{{#if seenPlaceNames}}
- **Éviter les répétitions :** Exclus impérativement les lieux suivants de tes suggestions, car l'utilisateur les a déjà vus :
{{#each seenPlaceNames}}
  - {{this}}
{{/each}}
{{/if}}

{{placesContext}}

Assure-toi que toutes les informations sont exactes. Les suggestions doivent être **différentes les unes des autres**. Réponds uniquement en respectant le format de sortie JSON demandé. Si aucune suggestion n'est possible, retourne un tableau 'suggestions' vide.`,
      });
      }

// We pass the fetched context to the prompt
let aiOutput;
try {
  const result = await makeDecisionPrompt({
    ...input,
    placesContext: placesContext,
    randomNumber: Math.random(),
  });
  aiOutput = result.output;
} catch (e) {
  console.error("AI Prompt Error", e);
  // Fallback if AI fails completely
  aiOutput = { suggestions: [] };
}

// Force inject debug suggestion
const debugSuggestion = {
  placeName: "🔧 Info Système (Debug)",
  description: debugInfo || "Aucune info debug",
  location: "Système",
  googleMapsUrl: "https://google.com"
};

return {
  suggestions: [debugSuggestion, ...(aiOutput?.suggestions || [])]
};
  }
);


export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}
