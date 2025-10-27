 

/**
 * Flow de génération d'images avec Hugging Face API
 * Utilise Stable Diffusion pour générer des images de vêtements réalistes
 */

import { huggingFaceImageGenerator } from '@/lib/ai/huggingface-image-generator';
import { GenerateOutfitImageInputSchema, GenerateOutfitImageOutputSchema, type GenerateOutfitImageInput, type GenerateOutfitImageOutput } from './generate-outfit-image.types';

export async function generateOutfitImage(input: GenerateOutfitImageInput): Promise<GenerateOutfitImageOutput> {
  try {
    // Vérifier si l'API Hugging Face est disponible
    if (!huggingFaceImageGenerator.isAvailable()) {
      console.warn('Clé API Hugging Face manquante, utilisation du fallback');
      return {
        imageDataUri: huggingFaceImageGenerator.generateFallbackImage(input.itemDescription)
      };
    }

    // Générer l'image avec Hugging Face
    const imageDataUri = await huggingFaceImageGenerator.generateClothingImage(input.itemDescription);
    
    return {
      imageDataUri
    };
  } catch (error) {
    console.error('Erreur lors de la génération d\'image:', error);
    
    // Fallback vers une image placeholder améliorée
    return {
      imageDataUri: huggingFaceImageGenerator.generateFallbackImage(input.itemDescription)
    };
  }
}
