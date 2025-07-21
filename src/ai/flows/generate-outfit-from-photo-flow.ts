'use server';
/**
 * @fileOverview A Genkit flow for generating an outfit, including images, based on a user-provided photo.
 *
 * - generateOutfitFromPhoto - Takes a photo of a base item and other criteria, and returns a complete outfit with images and descriptions for each part.
 */

import {ai} from '@/ai/genkit';
import { GenerateOutfitFromPhotoInputSchema, GenerateOutfitFromPhotoOutputSchema, type GenerateOutfitFromPhotoInput, type GenerateOutfitFromPhotoOutput } from './generate-outfit-from-photo-flow.types';

const prompt = ai.definePrompt({
  name: 'generateOutfitFromPhotoPrompt',
  input: {schema: GenerateOutfitFromPhotoInputSchema},
  output: {schema: GenerateOutfitFromPhotoOutputSchema},
  prompt: `Vous êtes un styliste expert IA. Votre tâche est de créer une tenue complète et harmonieuse à partir d'une photo d'un article de base fournie par l'utilisateur. Vous devez générer à la fois une description et une image pour chaque pièce complémentaire.

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
1.  **Analyser l'image de base :** Identifiez le type, le style et la couleur de la pièce sur la photo.
2.  **Créer une tenue cohérente :** En vous basant sur l'article de base et les contraintes de l'utilisateur, déterminez les pièces complémentaires (haut, bas, chaussures, accessoires). La tenue doit être appropriée pour le genre, l'occasion, et la météo.
3.  **Générer les images et descriptions :** Pour chaque pièce complémentaire (haut, bas, chaussures, accessoires), vous devez fournir :
    - Une **description détaillée** de l'article suggéré.
    - Une **image photoréaliste de l'article seul**, sur un fond neutre et clair (gris clair). Ne montrez pas de personne, juste l'article.
4.  **Gérer les pièces uniques :** Si vous suggérez une pièce unique comme une robe (pour remplacer le haut et le bas), générez sa description et son image dans le champ 'haut', et mettez 'N/A' pour la description et une image vide ('') pour l'imageDataUri du 'bas'.
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
