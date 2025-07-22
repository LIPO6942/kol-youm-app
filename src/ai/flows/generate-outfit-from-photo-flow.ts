'use server';
/**
 * @fileOverview A Genkit flow for generating an outfit description based on a user-provided photo.
 *
 * - generateOutfitFromPhoto - Takes a photo of a base item and other criteria, and returns a complete outfit description for each part.
 */

import {ai} from '@/ai/genkit';
import { GenerateOutfitFromPhotoInputSchema, GenerateOutfitFromPhotoOutputSchema, type GenerateOutfitFromPhotoInput, type GenerateOutfitFromPhotoOutput } from './generate-outfit-from-photo-flow.types';

const prompt = ai.definePrompt({
  name: 'generateOutfitFromPhotoPrompt',
  input: {schema: GenerateOutfitFromPhotoInputSchema},
  output: {schema: GenerateOutfitFromPhotoOutputSchema},
  prompt: `Vous êtes un styliste expert IA. Votre mission est de créer une tenue harmonieuse en complétant une pièce de base fournie par l'utilisateur.

**Contexte de l'utilisateur :**
- L'utilisateur a fourni une photo de la pièce de base : {{media url=baseItemPhotoDataUri}}
- L'utilisateur a spécifié que cette pièce est un(e) : **"{{baseItemType}}"**
- Mots-clés de l'agenda : {{{scheduleKeywords}}}
- Météo : {{{weather}}}
- Occasion : {{{occasion}}}
{{#if gender}}
- Genre : {{{gender}}}
{{/if}}
{{#if preferredColors}}
- Couleurs préférées : {{{preferredColors}}}
{{/if}}

**Instructions impératives :**
1.  **Exclusion stricte :** La pièce de base fournie par l'utilisateur est un(e) **"{{baseItemType}}"**. Vous ne devez **JAMAIS** générer de suggestion pour cette catégorie. Le champ correspondant dans la sortie JSON doit impérativement être 'N/A'.
2.  **Compléter la tenue :** En vous basant sur la pièce de base et les contraintes, générez des descriptions détaillées pour **TOUTES les autres catégories** (haut, bas, chaussures, accessoires) afin de former une tenue complète et cohérente.
3.  **Gérer les pièces uniques :** Si vous suggérez une pièce unique comme une robe (pour remplacer le haut et le bas), générez sa description dans le champ 'haut', et mettez 'N/A' pour la description du 'bas'.
4.  **Respect des contraintes :** Respectez scrupuleusement le genre (jamais de talons pour un homme) et les couleurs préférées si elles sont fournies.

Répondez uniquement en respectant le format de sortie JSON demandé.`,
});

const generateOutfitFromPhotoFlow = ai.defineFlow(
  {
    name: 'generateOutfitFromPhotoFlow',
    inputSchema: GenerateOutfitFromPhotoInputSchema,
    outputSchema: GenerateOutfitFromPhotoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


export async function generateOutfitFromPhoto(input: GenerateOutfitFromPhotoInput): Promise<GenerateOutfitFromPhotoOutput> {
  return generateOutfitFromPhotoFlow(input);
}
