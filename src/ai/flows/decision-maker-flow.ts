
'use server';
/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes an outing category and returns a list of suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MakeDecisionInputSchema, MakeDecisionOutputSchema, type MakeDecisionInput, type MakeDecisionOutput } from './decision-maker-flow.types';


const prompt = ai.definePrompt({
  name: 'makeDecisionPrompt',
  input: {schema: MakeDecisionInputSchema.extend({ isCafeCategory: z.boolean().optional(), isFastFoodCategory: z.boolean().optional(), isRestaurantCategory: z.boolean().optional(), isBrunchCategory: z.boolean().optional() })},
  output: {schema: MakeDecisionOutputSchema},
  prompt: `Tu es un expert connaisseur de la vie locale en Tunisie, agissant comme un filtre de base de données. Ta seule source de connaissances est la liste de lieux fournie ci-dessous. Tu ne dois **JAMAIS** suggérer un lieu qui n'est pas dans ces listes.

L'utilisateur a choisi la catégorie de sortie suivante : "{{category}}".

Ta tâche est de :
1.  Générer une liste de **2 suggestions de lieux** qui correspondent parfaitement à la catégorie "{{category}}" en te basant **uniquement** sur les listes fournies plus bas.
2.  **Si aucun lieu dans les listes ne correspond à la catégorie et aux zones demandées par l'utilisateur, tu dois retourner une liste de suggestions vide.**
3.  **Diversifier les lieux :** Chaque suggestion doit être dans un **quartier ou une ville différente** pour surprendre l'utilisateur.
4.  Pour chaque suggestion, fournir :
    - Le **nom exact** du lieu.
    - Une **description courte et engageante** (une ou deux phrases), en mettant en avant sa spécialité ou son ambiance unique.
    - Son **quartier ou sa ville** précise (par exemple : "La Marsa", "Ennasr 2").
    - Une **URL Google Maps valide et fonctionnelle** qui pointe vers ce lieu.

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

{{#if isCafeCategory}}
- **Source exclusive pour "Café" :** Tes suggestions pour la catégorie "Café" doivent provenir **EXCLUSIVEMENT** de la liste suivante. Si aucun lieu ne correspond au filtre de zone de l'utilisateur, ne suggère rien.
  - **Zone Mutuelleville / Alain Savary :** Eric Kayser, Café culturel Jaziya, La place café & gourmandises.
{{/if}}

Assure-toi que toutes les informations sont exactes et que les lieux sont bien notés. Les suggestions doivent être de haute qualité et **différentes les unes des autres**. Réponds uniquement en respectant le format de sortie JSON demandé. Si aucune suggestion n'est possible, retourne un tableau 'suggestions' vide.`,
});

const makeDecisionFlow = ai.defineFlow(
  {
    name: 'makeDecisionFlow',
    inputSchema: MakeDecisionInputSchema,
    outputSchema: MakeDecisionOutputSchema,
  },
  async input => {
    const isCafeCategory = input.category.toLowerCase().includes('café');
    
    const {output} = await prompt({
        ...input,
        isCafeCategory: isCafeCategory,
    });
    return output!;
  }
);


export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}
