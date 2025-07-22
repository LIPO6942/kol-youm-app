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
  prompt: `Vous êtes un styliste expert IA. Votre mission est de créer une tenue harmonieuse en complétant une pièce de base fournie par l'utilisateur via une photo.

**Contexte de l'utilisateur :**
- Photo de la pièce de base : {{media url=baseItemPhotoDataUri}}
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
1.  **Analyser l'image de base :** Identifiez le type de pièce sur la photo (est-ce un 'haut', un 'bas', des 'chaussures' ou des 'accessoires' ?).
2.  **Compléter la tenue :** En vous basant sur la pièce identifiée et les contraintes de l'utilisateur, générez des descriptions détaillées pour TOUTES les autres pièces nécessaires pour former une tenue complète et cohérente.
3.  **Ne pas remplacer la pièce de base :** Si la photo montre un 'haut', vous devez générer des suggestions pour 'bas', 'chaussures', et 'accessoires', mais le champ 'haut' dans la sortie doit impérativement être 'N/A'. Le même principe s'applique si la pièce est un 'bas', des 'chaussures', ou des 'accessoires'.
4.  **Gérer les pièces uniques :** Si vous suggérez une pièce unique comme une robe (pour remplacer le haut et le bas), générez sa description dans le champ 'haut', et mettez 'N/A' pour la description du 'bas'.
5.  **Respect des contraintes :** Respectez scrupuleusement le genre (jamais de talons pour un homme) et les couleurs préférées si elles sont fournies.

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
