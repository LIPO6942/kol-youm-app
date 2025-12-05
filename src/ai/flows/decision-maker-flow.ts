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

    const placesContext = await getPlacesContext(input.category);

    if(!makeDecisionPrompt) {
      makeDecisionPrompt = ai.definePrompt({
        name: 'makeDecisionPrompt',
        input: { schema: MakeDecisionInputSchema.extend({ placesContext: z.string(), randomNumber: z.number().optional() }) },
        output: { schema: MakeDecisionOutputSchema },
        prompt: `Tu es un générateur de suggestions purement aléatoires. Ta seule source de connaissances est la liste de lieux fournie ci-dessous. Tu ne dois JAMAIS suggérer un lieu qui n'est pas dans ces listes.

L'utilisateur a choisi la catégorie de sortie : "{{category}}".

Pour garantir que tes suggestions sont uniques et imprévisibles, utilise ce nombre aléatoire comme source d'inspiration pour ta sélection : {{randomNumber}}.

Ta tâche est la suivante :

1.  **Filtrer la liste :** D'abord, identifie la bonne liste de lieux en fonction de la catégorie "{{category}}". Si l'utilisateur a spécifié des zones ({{zones}}), filtre cette liste pour ne garder que les lieux qui se trouvent dans ces zones.
2.  **Sélection Aléatoire :** Dans la liste filtrée, choisis **DEUX** lieux de manière **COMPLÈTEMENT ALÉATOIRE**. La sélection doit être différente à chaque fois.
3.  **Éviter les répétitions :** Si l'utilisateur a déjà vu certains lieux ({{seenPlaceNames}}), exclus-les de ta sélection.
4.  **Formatage de la sortie :** Pour les deux lieux que tu as choisis au hasard, retourne les informations suivantes :
    - Le **nom exact** du lieu.
    - Une **description courte et engageante** (une ou deux phrases).
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
    const { output } = await makeDecisionPrompt({
      ...input,
      placesContext: placesContext,
      randomNumber: Math.random(),
    });
    return output!;
  }
);


export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}
