# 🔍 Guide de Diagnostic - Étapes à suivre

## Étape 1 : Vérifier les logs dans le navigateur

1. Ouvrez votre application sur la page `/stylek`
2. Ouvrez la **Console de développement** :
   - **Chrome/Edge** : F12 ou Ctrl+Shift+J
   - **Firefox** : F12 ou Ctrl+Shift+K
3. Allez dans l'onglet **Console**
4. Essayez de générer une tenue avec un des deux boutons
5. **COPIEZ TOUS LES MESSAGES D'ERREUR** qui apparaissent en rouge

## Étape 2 : Vérifier les logs réseau

Restez dans les outils de développement :
1. Allez dans l'onglet **Network** (Réseau)
2. Essayez à nouveau de générer une tenue
3. Cherchez la requête vers `/api/hf-image`
4. Cliquez dessus
5. Regardez :
   - **Status** : Quel code HTTP ? (200, 500, 403, etc.)
   - **Response** : Quel message d'erreur exact ?
   - **Headers** : La requête est-elle bien partie ?

## Étape 3 : Logs Vercel (si déployé)

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Functions**
4. Cliquez sur `/api/hf-image`
5. Lancez une génération d'image
6. Les logs devraient apparaître en temps réel
7. **COPIEZ l'erreur exacte**

## Étape 4 : Logs en local (si test local)

Si vous testez en local :
```bash
npm run dev
```

Puis dans le terminal, quand vous essayez de générer :
- **COPIEZ tout ce qui s'affiche** après la tentative de génération

## Ce que je recherche

**Erreurs possibles** :

### "Invalid API token"
```
Cause : La clé API n'est pas valide ou mal configurée
Solution : Vérifier sur Vercel Environment Variables
```

### "You need to agree to share your contact information"
```
Cause : Licence du modèle non acceptée
Solution : Aller sur https://huggingface.co/black-forest-labs/FLUX.1-schnell et accepter
```

### "Model ... is currently loading"
```
Cause : Le modèle charge (première utilisation)
Solution : Attendre 1-2 minutes et réessayer
```

### "Rate limit exceeded"
```
Cause : Quota HuggingFace dépassé
Solution : Attendre ou utiliser une autre clé
```

### "Authorization header is correct, but the token seems invalid"
```
Cause : Token révoqué ou expiré
Solution : Générer une nouvelle clé API sur HuggingFace
```

## Questions à répondre

Pour que je puisse vous aider efficacement, j'ai besoin de :

1. **Quel est le message d'erreur exact** que vous voyez ?
2. **Où testez-vous** : Vercel (production) ou local (`npm run dev`) ?
3. **Quel code HTTP** retourne `/api/hf-image` ? (visible dans Network tab)
4. **Que disent les logs** côté serveur (Vercel Functions ou terminal) ?

---

**Envoyez-moi ces informations et je pourrai diagnostiquer le problème précis !** 🔍
