/**
 * Configuration pour Hugging Face API
 * Instructions pour configurer la clé API
 */

export const HUGGINGFACE_CONFIG = {
  // Instructions pour obtenir une clé API gratuite
  INSTRUCTIONS: `
Pour activer la génération d'images dans Stylek :

1. Allez sur https://huggingface.co
2. Créez un compte gratuit
3. Allez dans Settings > Access Tokens
4. Créez un nouveau token avec les permissions "read"
5. Ajoutez le token dans votre fichier .env.local :
   HUGGINGFACE_API_KEY=votre_token_ici

Limite gratuite : 30,000 requêtes/mois
  `,
  
  // Modèles disponibles pour la génération d'images
  IMAGE_MODELS: [
    'runwayml/stable-diffusion-v1-5',
    'stabilityai/stable-diffusion-2-1', 
    'CompVis/stable-diffusion-v1-4'
  ],
  
  // Configuration par défaut
  DEFAULT_CONFIG: {
    num_inference_steps: 20,
    guidance_scale: 7.5,
    width: 512,
    height: 512
  }
};

/**
 * Vérifie si la clé API est configurée
 */
export function isHuggingFaceConfigured(): boolean {
  return !!process.env.HUGGINGFACE_API_KEY;
}

/**
 * Obtient l'URL de l'API Hugging Face
 */
export function getHuggingFaceApiUrl(model: string): string {
  return `https://api-inference.huggingface.co/models/${model}`;
}
