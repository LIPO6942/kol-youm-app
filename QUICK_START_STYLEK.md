# 🚀 Guide de Démarrage Rapide - Stylek

## Problème : Les boutons de génération d'images ne fonctionnent pas

Si les boutons **"Compléter ma tenue"** et **"Compléter depuis ma garde-robe"** ne génèrent pas d'images, c'est probablement parce que la clé API Hugging Face n'est pas configurée.

## Solution Rapide (5 minutes)

### 1. Créer un compte Hugging Face (gratuit)
- Allez sur https://huggingface.co/join
- Créez un compte gratuit

### 2. Générer une clé API
- Une fois connecté, allez sur https://huggingface.co/settings/tokens
- Cliquez sur "New token"
- Donnez un nom (ex : "kol-youm")
- Sélectionnez "read" permissions
- Cliquez sur "Generate"
- **COPIEZ le token** (commençant par `hf_...`)

### 3. Configurer l'application

Créez un fichier `.env.local` à la racine du projet avec ce contenu :

```bash
HUGGINGFACE_API_KEY=hf_votre_token_ici
```

Remplacez `hf_votre_token_ici` par le token que vous venez de copier.

### 4. Redémarrer l'application

```bash
# Arrêtez le serveur (Ctrl+C)
# Puis relancez-le :
npm run dev
```

## ✅ C'est prêt !

Allez à la page **Stylek** et essayez de générer une tenue. Les images devraient maintenant se générer correctement !

## Limites gratuites

- **30,000 requêtes/mois** gratuit
- Chaque tenue nécessite ~3-4 requêtes
- Largement suffisant pour un usage personnel

## Besoin d'aide ?

Consultez `docs/STYLEK_IMAGE_GENERATION_FIX.md` pour un guide détaillé.
