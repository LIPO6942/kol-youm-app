'use server';

/**
 * Flow de fallback pour la génération d'images de tenues
 * Retourne des URLs d'images placeholder au lieu de générer des images
 */

import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  try {
    // Générer une URL d'image placeholder basée sur la description
    const description = input.itemDescription.toLowerCase();
    
    let imageUrl = 'https://via.placeholder.com/300x400/f3f4f6/6b7280?text=';
    
    if (description.includes('t-shirt') || description.includes('chemise')) {
      imageUrl += 'T-shirt';
    } else if (description.includes('pantalon') || description.includes('jean')) {
      imageUrl += 'Pantalon';
    } else if (description.includes('chaussure') || description.includes('basket')) {
      imageUrl += 'Chaussures';
    } else if (description.includes('sac') || description.includes('accessoire')) {
      imageUrl += 'Accessoire';
    } else if (description.includes('robe')) {
      imageUrl += 'Robe';
    } else if (description.includes('pull') || description.includes('cardigan')) {
      imageUrl += 'Pull';
    } else if (description.includes('veste') || description.includes('blazer')) {
      imageUrl += 'Veste';
    } else {
      imageUrl += 'Mode';
    }
    
    // Encoder l'URL pour éviter les problèmes de caractères spéciaux
    const encodedUrl = encodeURIComponent(imageUrl);
    
    return { 
      imageDataUri: `https://via.placeholder.com/300x400/f3f4f6/6b7280?text=${encodedUrl}` 
    };
  } catch (error) {
    console.error('Error in generateOutfitImage:', error);
    
    // Fallback avec une image générique
    return { 
      imageDataUri: 'https://via.placeholder.com/300x400/f3f4f6/6b7280?text=Mode' 
    };
  }
}
