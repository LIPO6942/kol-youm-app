# 🎨 Configuration Hugging Face pour Stylek

## 🚀 Génération d'Images IA

Le module **Stylek** utilise maintenant **Hugging Face API** avec **Stable Diffusion** pour générer des images de vêtements réalistes.

### ✨ Fonctionnalités

- ✅ **Compléter depuis ma garde-robe** - Génération d'images à partir de photos
- ✅ **Compléter ma tenue** - Images de vêtements suggérés
- ✅ **Images haute qualité** - Stable Diffusion optimisé pour la mode
- ✅ **30,000 requêtes/mois gratuites** - Limite généreuse

### 🔧 Configuration

#### 1. Créer un compte Hugging Face
1. Allez sur [huggingface.co](https://huggingface.co)
2. Cliquez sur "Sign Up" 
3. Créez un compte gratuit

#### 2. Générer une clé API
1. Connectez-vous à votre compte
2. Cliquez sur votre avatar → "Settings"
3. Allez dans "Access Tokens"
4. Cliquez sur "New token"
5. Donnez un nom (ex: "stylek-app")
6. Sélectionnez "read" permissions
7. Cliquez "Generate token"
8. **Copiez le token** (il ne s'affiche qu'une fois !)

#### 3. Configurer dans votre application
Créez un fichier `.env.local` à la racine de votre projet :

```bash
# Hugging Face API Key pour la génération d'images
HUGGINGFACE_API_KEY=hf_votre_token_ici
```

### 🎯 Utilisation

Une fois configuré, le module Stylek fonctionnera automatiquement :

1. **Suggestions de tenues** - Fonctionne sans clé API
2. **Génération d'images** - Nécessite la clé API Hugging Face
3. **Fallback intelligent** - Images placeholder si l'API échoue

### 🔍 Modèles Utilisés

L'application essaie automatiquement ces modèles dans l'ordre :

1. `runwayml/stable-diffusion-v1-5` (priorité)
2. `stabilityai/stable-diffusion-2-1` (fallback)
3. `CompVis/stable-diffusion-v1-4` (dernier recours)

### ⚙️ Configuration Avancée

#### Paramètres de génération
- **Résolution** : 512x512 pixels
- **Qualité** : 20 steps d'inférence
- **Guidance** : 7.5 (équilibre créativité/précision)
- **Style** : Optimisé pour la mode et les produits

#### Prompts optimisés
Les descriptions sont automatiquement améliorées :
- Ajout de mots-clés de mode
- Fond blanc propre
- Focus sur l'article de vêtement
- Exclusion des personnes

### 🚨 Dépannage

#### Erreur "Clé API manquante"
- Vérifiez que `.env.local` existe
- Vérifiez que `HUGGINGFACE_API_KEY` est défini
- Redémarrez le serveur de développement

#### Erreur "Modèle en cours de chargement"
- Attendez 1-2 minutes (première utilisation)
- Le modèle se charge automatiquement

#### Images de mauvaise qualité
- Vérifiez votre connexion internet
- L'API peut être temporairement surchargée
- Les images placeholder sont utilisées en fallback

### 💡 Conseils

1. **Première utilisation** : Le premier appel peut prendre 1-2 minutes
2. **Qualité des descriptions** : Plus la description est précise, meilleure est l'image
3. **Limite gratuite** : 30,000 requêtes/mois (largement suffisant)
4. **Fallback automatique** : L'app fonctionne même sans clé API

### 🎉 Résultat

Avec cette configuration, vous obtenez :
- **Images réalistes** de vêtements
- **Génération rapide** (5-10 secondes)
- **Qualité professionnelle** 
- **Aucun coût** (dans la limite gratuite)

**Votre module Stylek est maintenant prêt pour la génération d'images IA !**
