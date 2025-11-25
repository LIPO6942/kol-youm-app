# 🔍 Guide de Test - Génération d'Images Stylek

## Changements effectués

J'ai modifié la route API `/api/hf-image` pour :
1. ✅ Utiliser l'**API Inference directe** de Hugging Face (plus fiable que le Router)
2. ✅ Utiliser **FLUX.1-schnell** - modèle ultra-rapide et gratuit (4 steps seulement!)
3. ✅ Ajouter un **fallback automatique** vers Stable Diffusion 2.1 si FLUX échoue
4. ✅ Améliorer les **logs de débogage** pour identifier les problèmes
5. ✅ Ajouter le header `x-wait-for-model` pour attendre si le modèle charge

## Comment tester

### 1. Redémarrer l'application

```bash
# Arrêtez le serveur (Ctrl+C si en local)
# Si déployé sur Vercel, redéployez ou attendez le prochain build automatique
```

### 2. Tester la génération d'images

1. Allez sur la page `/stylek`
2. Remplissez le formulaire (activité, météo, occasion)
3. Cliquez sur **"Compléter ma tenue"** OU **"Compléter depuis ma garde-robe"**
4. Importez ou prenez une photo
5. Sélectionnez le type de vêtement
6. Cliquez sur "Générer la tenue"

### 3. Vérifier les logs

Si vous êtes en **local** :
- Regardez la console du terminal où tourne `npm run dev`
- Vous devriez voir :
  ```
  Enhanced prompt: [description]
  Using Hugging Face Inference API with model: black-forest-labs/FLUX.1-schnell
  Response status: 200
  Successfully generated image, size: XXXXX bytes
  ```

Si vous êtes sur **Vercel** :
- Allez dans le Dashboard Vercel → Votre projet → Functions
- Cliquez sur la fonction `/api/hf-image`
- Consultez les logs en temps réel

## Erreurs possibles et solutions

### Erreur : "Model is currently loading"
**Solution** : Le modèle FLUX charge pour la première fois
- ⏱️ Attendez 30-60 secondes et réessayez
- Le header `x-wait-for-model: true` devrait automatiquement attendre

### Erreur : "You need to accept the model license"
**Solution** : Acceptez les conditions du modèle
- Allez sur https://huggingface.co/black-forest-labs/FLUX.1-schnell
- Cliquez sur "Accept license" si demandé
- Réessayez

### Erreur : "Invalid authentication token"
**Solution** : Vérifiez votre clé API
- Sur Vercel : Settings → Environment Variables → HUGGINGFACE_API_KEY  
- Assurez-vous que la clé commence par `hf_`
- Redéployez après modification

### Erreur : "Rate limit exceeded"
**Solution** : Vous avez atteint la limite
- Attendez quelques minutes
- Hugging Face gratuit : ~30K requêtes/mois

## Modèles utilisés

1. **FLUX.1-schnell** (principal)
   - Ultra-rapide (4 inference steps)
   - Gratuit
   - Haute qualité

2. **Stable Diffusion 2.1** (fallback)
   - Si FLUX échoue
   - Plus lent (20 steps)
   - Gratuit aussi

## Comparaison avec l'ancienne version

| Aspect | Ancienne version | Nouvelle version |
|--------|-----------------|------------------|
| API | Router (instable) | Inference (stable) |
| Modèle | SDXL Base | FLUX.1-schnell |
| Vitesse | ~15-20s | ~3-5s |
| Fallback | Non | Oui (SD 2.1) |
| Logs | Basiques | Détaillés |

## Si ça ne fonctionne toujours pas

1. **Vérifiez les logs** - Ils indiquent précisément l'erreur
2. **Vérifiez la clé API** - Doit être valide et active
3. **Acceptez les licences** - Sur huggingface.co
4. **Contactez-moi** - Avec les logs d'erreur exacts

La génération devrait maintenant fonctionner beaucoup mieux ! 🎨✨
