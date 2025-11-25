# 🔧 Résolution du problème de génération d'images  

## Problème

Les boutons **"Compléter ma tenue"** et **"Compléter depuis ma garde-robe"** ne génèrent pas d'images.

## Solution

### Étape 1 : Créer un fichier `.env.local`

1. À la racine du projet (`kol-youm-app`), créez un fichier nommé `.env.local`
2. Ajoutez y le contenu suivant :

```bash
# Configuration Hugging Face pour la génération d'images
HUGGINGFACE_API_KEY=votre_token_huggingface_ici
```

### Étape 2 : Obtenir une clé API Hugging Face

1. **Créer un compte Hugging Face** :
   - Allez sur [huggingface.co](https://huggingface.co)
   - Cliquez sur "Sign Up" et créez un compte gratuit

2. **Générer une clé API** :
   - Connectez-vous à votre compte
   - Cliquez sur votre avatar → "Settings"
   - Allez dans "Access Tokens"
   - Cliquez sur "New token"
   - Donnez uncannée (ex: "kol-youm-app")
   - Sélectionnez "read" permissions
   - Cliquez "Generate token"
   - **Copiez le token** (il ne s'affiche qu'une fois !)

3. **Ajouter le token dans `.env.local`** :
   - Remplacez `votre_token_huggingface_ici` par votre token
   - Exemple : `HUGGINGFACE_API_KEY=hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ`

### Étape 3 : Redémarrer le serveur de développement

1. Arrêtez le serveur (Ctrl+C dans le terminal)
2. Relancez-le avec `npm run dev`
3. Les changements devraient être pris en compte

## Vérification

Pour vérifier que la clé API est correctement configurée :

1. Ouvrez votre navigateur et allez sur la page `/stylek`
2. Essayez l'un des deux boutons :
   - **"Compléter ma tenue"** : Importez ou prenez une photo
   - **"Compléter depuis ma garde-robe"** : Sélectionnez une pièce existante
3. La génération d'images devrait maintenant fonctionner !

## Messages d'erreur courants

### "HUGGINGFACE_API_KEY is not set"
- La variable d'environnement n'est pas définie
- Vérifiez que le fichier `.env.local` existe à la racine
- Vérifiez que vous avez redémarré le serveur après avoir créé le fichier

### "429" ou "quota exceeded"
- Vous avez atteint la limite gratuite (30,000 requêtes/mois)
- Attendez le mois prochain ou passez à un plan payant

### "503" ou "Model is loading"
- Le modèle Stable Diffusion est en cours de chargement (première utilisation)
- Attendez 1-2 minutes et réessayez

## Limites gratuites

- **30,000 requêtes/mois** avec Hugging Face gratuit
- Largement suffisant pour un usage personnel
- Chaque génération de tenue utilise 3-4 requetes (une par pièce de vêtement)

## Support

Pour plus de détails techniques, consultez :
- `HUGGINGFACE_SETUP.md` - Configuration complète
- `AI_ALTERNATIVES_README.md` - Alternatives d'IA gratuites
