/**
 * Service de génération d'images avec Hugging Face API
 * Utilise Stable Diffusion pour générer des images de mode
 */

interface HuggingFaceImageResponse {
  image: string; // Base64 encoded image
}

interface HuggingFaceImageRequest {
  inputs: string;
  parameters?: {
    num_inference_steps?: number;
    guidance_scale?: number;
    width?: number;
    height?: number;
  };
}

export class HuggingFaceImageGenerator {
  private apiKey: string | null = null;
  private baseUrl = 'https://api-inference.huggingface.co/models';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.HUGGINGFACE_API_KEY || null;
  }

  /**
   * Génère une image de vêtement basée sur la description
   */
  async generateClothingImage(description: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Clé API Hugging Face manquante. Veuillez configurer HUGGINGFACE_API_KEY.');
    }

    // Modèles disponibles pour la génération d'images
    const models = [
      'runwayml/stable-diffusion-v1-5',
      'stabilityai/stable-diffusion-2-1',
      'CompVis/stable-diffusion-v1-4'
    ];

    // Essayer chaque modèle jusqu'à ce qu'un fonctionne
    for (const model of models) {
      try {
        const imageUrl = await this.generateWithModel(model, description);
        return imageUrl;
      } catch (error) {
        console.warn(`Modèle ${model} échoué, essai du suivant:`, error);
        continue;
      }
    }

    throw new Error('Tous les modèles de génération d\'images ont échoué');
  }

  private async generateWithModel(model: string, description: string): Promise<string> {
    const url = `${this.baseUrl}/${model}`;
    
    // Améliorer le prompt pour la mode
    const enhancedPrompt = this.enhancePromptForFashion(description);
    
    const requestBody: HuggingFaceImageRequest = {
      inputs: enhancedPrompt,
      parameters: {
        num_inference_steps: 20,
        guidance_scale: 7.5,
        width: 512,
        height: 512
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 503) {
        // Modèle en cours de chargement
        throw new Error('MODEL_LOADING');
      }
      throw new Error(`Erreur API Hugging Face: ${response.status}`);
    }

    const imageBlob = await response.blob();
    
    // Convertir en data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(imageBlob);
    });
  }

  /**
   * Améliore le prompt pour obtenir de meilleures images de mode
   */
  private enhancePromptForFashion(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    // Ajouter des mots-clés selon le type de vêtement
    let enhancedPrompt = description;
    
    if (lowerDesc.includes('t-shirt') || lowerDesc.includes('chemise')) {
      enhancedPrompt = `fashion photography, ${description}, clean white background, product shot, high quality, detailed`;
    } else if (lowerDesc.includes('pantalon') || lowerDesc.includes('jean')) {
      enhancedPrompt = `fashion photography, ${description}, clean white background, product shot, high quality, detailed`;
    } else if (lowerDesc.includes('chaussure') || lowerDesc.includes('basket')) {
      enhancedPrompt = `fashion photography, ${description}, clean white background, product shot, high quality, detailed`;
    } else if (lowerDesc.includes('robe')) {
      enhancedPrompt = `fashion photography, ${description}, clean white background, product shot, high quality, detailed`;
    } else if (lowerDesc.includes('sac') || lowerDesc.includes('accessoire')) {
      enhancedPrompt = `fashion photography, ${description}, clean white background, product shot, high quality, detailed`;
    } else {
      enhancedPrompt = `fashion photography, ${description}, clean white background, product shot, high quality, detailed`;
    }

    // Ajouter des termes négatifs pour éviter les personnes
    enhancedPrompt += ', no person, no model, no human, clothing item only';
    
    return enhancedPrompt;
  }

  /**
   * Vérifie si l'API est disponible
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Génère une image de fallback si l'API échoue
   */
  generateFallbackImage(description: string): string {
    const keywords = this.extractKeywords(description);
    const color = this.getColorFromDescription(description);
    
    // Utiliser un service de placeholder plus sophistiqué
    const encodedDescription = encodeURIComponent(keywords);
    return `https://via.placeholder.com/512x512/${color}/ffffff?text=${encodedDescription}`;
  }

  private extractKeywords(description: string): string {
    const words = description.toLowerCase().split(' ');
    const fashionKeywords = words.filter(word => 
      ['t-shirt', 'chemise', 'pantalon', 'jean', 'chaussure', 'basket', 'robe', 'pull', 'veste', 'sac'].includes(word)
    );
    
    return fashionKeywords[0] || 'Mode';
  }

  private getColorFromDescription(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('noir') || lowerDesc.includes('black')) return '000000';
    if (lowerDesc.includes('blanc') || lowerDesc.includes('white')) return 'ffffff';
    if (lowerDesc.includes('rouge') || lowerDesc.includes('red')) return 'ff0000';
    if (lowerDesc.includes('bleu') || lowerDesc.includes('blue')) return '0000ff';
    if (lowerDesc.includes('vert') || lowerDesc.includes('green')) return '00ff00';
    if (lowerDesc.includes('jaune') || lowerDesc.includes('yellow')) return 'ffff00';
    if (lowerDesc.includes('rose') || lowerDesc.includes('pink')) return 'ff69b4';
    if (lowerDesc.includes('gris') || lowerDesc.includes('gray')) return '808080';
    
    return 'f3f4f6'; // Gris clair par défaut
  }
}

// Instance globale
export const huggingFaceImageGenerator = new HuggingFaceImageGenerator();
