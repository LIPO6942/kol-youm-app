'use server';
/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes an outing category and returns a list of suggestions.
 */

import {ai} from '@/ai/genkit';
import { MakeDecisionInputSchema, MakeDecisionOutputSchema, type MakeDecisionInput, type MakeDecisionOutput } from './decision-maker-flow.types';


const prompt = ai.definePrompt({
  name: 'makeDecisionPrompt',
  input: {schema: MakeDecisionInputSchema},
  output: {schema: MakeDecisionOutputSchema},
  prompt: `Tu es un expert connaisseur de la vie locale en Tunisie. Tes connaissances couvrent spécifiquement les zones suivantes : **La Marsa, Gammarth, El Aouina, Les Berges du Lac (1 et 2), Boumhal, Ezzahra, Hammamet, Nabeul, Mégrine, La Soukra, Le Bardo, Menzah 1, Menzah 5, Menzah 6, Ennasr 1, Ennasr 2, Cité Ennasr, et le centre-ville de Tunis**. Ton but est de donner aux utilisateurs une liste de suggestions de sorties **nouvelles**, uniques et pertinentes parmi les meilleurs endroits **réels et existants** dans ces zones uniquement.

L'utilisateur a choisi la catégorie de sortie suivante : "{{category}}".

Ta tâche est de :
1.  Générer une liste de **4 suggestions de lieux réels, connus et très bien notés (4 étoiles ou plus sur Google Maps)** qui correspondent parfaitement à la catégorie "{{category}}" et se trouvent **exclusivement** dans les zones listées ci-dessus.
2.  **Diversifier les lieux :** Chaque suggestion doit être dans un **quartier ou une ville différente** de la liste pour surprendre l'utilisateur.
3.  Pour chaque suggestion, fournir :
    - Le **nom exact** du lieu.
    - Une **description courte et engageante** (une ou deux phrases), en mettant en avant sa spécialité ou son ambiance unique.
    - Son **quartier ou sa ville** précise (par exemple : "La Marsa", "Hammamet Nord", "Ennasr 2").
    - Une **URL Google Maps valide et fonctionnelle** qui pointe vers ce lieu. L'URL doit être correctement formée, par exemple : "https://www.google.com/maps/search/?api=1&query=Nom+Du+Lieu,Ville".

**Instructions importantes :**
- **Pertinence géographique :** Ne propose **AUCUN** lieu en dehors des zones spécifiées.
- **Variété des lieux :** Varie les quartiers dans tes suggestions. Ne te limite pas à une seule zone.
{{#if seenPlaceNames}}
- **Éviter les répétitions :** Exclus impérativement les lieux suivants de tes suggestions, car l'utilisateur les a déjà vus :
{{#each seenPlaceNames}}
  - {{this}}
{{/each}}
{{/if}}

Assure-toi que toutes les informations sont exactes, vérifiables et que les lieux ont bien une note de 4 étoiles ou plus. Les suggestions doivent être de haute qualité et **différentes les unes des autres**. Réponds uniquement en respectant le format de sortie JSON demandé.`,
});

const makeDecisionFlow = ai.defineFlow(
  {
    name: 'makeDecisionFlow',
    inputSchema: MakeDecisionInputSchema,
    outputSchema: MakeDecisionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}
