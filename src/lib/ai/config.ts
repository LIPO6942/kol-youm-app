/**
 * Configuration pour les alternatives IA gratuites
 * Pas besoin de clé API pour la plupart des fonctionnalités
 */

export const AI_CONFIG = {
  // Hugging Face API (optionnel - gratuit jusqu'à 30k requêtes/mois)
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY || null,
  
  // Configuration des modèles
  MODELS: {
    // Modèle principal pour les suggestions
    PRIMARY_MODEL: 'microsoft/DialoGPT-medium',
    
    // Modèles de fallback
    FALLBACK_MODELS: [
      'microsoft/DialoGPT-small',
      'gpt2'
    ]
  },
  
  // Limites et timeouts
  LIMITS: {
    MAX_TOKENS: 300,
    TIMEOUT_MS: 10000,
    RETRY_ATTEMPTS: 2
  },
  
  // Configuration de la base de données locale
  LOCAL_DB: {
    ENABLED: true,
    FALLBACK_ENABLED: true
  }
};

/**
 * Fonction utilitaire pour vérifier si Hugging Face API est disponible
 */
export function isHuggingFaceAvailable(): boolean {
  return !!AI_CONFIG.HUGGINGFACE_API_KEY;
}

/**
 * Fonction utilitaire pour obtenir l'URL de l'API Hugging Face
 */
export function getHuggingFaceUrl(model: string = AI_CONFIG.MODELS.PRIMARY_MODEL): string {
  return `https://api-inference.huggingface.co/models/${model}`;
}
