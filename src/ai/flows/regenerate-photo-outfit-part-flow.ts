'use server';
/**
 * @fileOverview A Genkit flow for regenerating a specific part of an outfit that was originally generated from a base photo.
 *
 * - regeneratePhotoOutfitPart - A function that takes an existing outfit, the part to change, and original constraints, and returns a new item description.
 */

import {ai} from '@/ai/genkit';
import { RegeneratePhotoOutfitPartInputSchema, RegeneratePhotoOutfitPartOutputSchema, type RegeneratePhotoOutfitPartInput, type RegeneratePhotoOutfitPartOutput } from './regenerate-photo-outfit-part-flow.types';

const prompt = ai.definePrompt({
  name: 'regeneratePhotoOutfitPartPrompt',
  input: {schema: RegeneratePhotoOutfitPartInputSchema},
  output: {schema: RegeneratePhotoOutfitPartOutputSchema},
  prompt: `Vous êtes un styliste expert IA. La mission est de trouver une alternative pour une pièce spécifique d'une tenue existante.

**Contexte :**
L'utilisateur a initialement fourni une photo d'une pièce de base (un(e) **"{{originalInput.baseItemType}}"**) et a obtenu les suggestions suivantes pour compléter sa tenue.

**Contraintes initiales :**
- Occasion : {{{originalInput.occasion}}}
- Météo : {{{originalInput.weather}}}
- Mots-clés d'agenda : {{{originalInput.scheduleKeywords}}}
- Genre : {{{originalInput.gender}}}
{{#if originalInput.preferredColors}}
- Couleurs préférées : {{{originalInput.preferredColors}}}
{{/if}}

**Tenue actuellement suggérée :**
- Haut: {{currentOutfitDescriptions.haut}}
- Bas: {{currentOutfitDescriptions.bas}}
- Chaussures: {{currentOutfitDescriptions.chaussures}}
- Accessoires: {{currentOutfitDescriptions.accessoires}}

**Votre Tâche :**
L'utilisateur n'est pas satisfait de la suggestion pour la catégorie **"{{partToChange}}"**.

1.  Analysez l'ensemble de la tenue (y compris la pièce de base implicite) et les contraintes.
2.  Proposez une **nouvelle suggestion** UNIQUEMENT pour la catégorie **"{{partToChange}}"**.
3.  Cette nouvelle suggestion doit être **significativement différente** de la suggestion actuelle (actuellement : "{{currentPartDescription}}").
4.  La nouvelle pièce doit s'harmoniser parfaitement avec les autres pièces de la tenue et respecter toutes les contraintes initiales.

Répondez uniquement avec une nouvelle description détaillée pour la pièce demandée.`,
});

const regeneratePhotoOutfitPartFlow = ai.defineFlow(
  {
    name: 'regeneratePhotoOutfitPartFlow',
    inputSchema: RegeneratePhotoOutfitPartInputSchema,
    outputSchema: RegeneratePhotoOutfitPartOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);


export async function regeneratePhotoOutfitPart(input: RegeneratePhotoOutfitPartInput): Promise<RegeneratePhotoOutfitPartOutput> {
  return regeneratePhotoOutfitPartFlow(input);
}
