'use server';

import { ai } from '@/ai/genkit';
import {
  ScoutPlacesInputSchema,
  ScoutPlacesOutputSchema,
  type ScoutPlacesInput,
  type ScoutPlacesOutput,
} from './scout-places-flow.types';

export const scoutPlacesFlow = ai.defineFlow(
  {
    name: 'scoutPlacesFlow',
    inputSchema: ScoutPlacesInputSchema,
    outputSchema: ScoutPlacesOutputSchema,
  },
  async (input) => {
    // Clé Groq depuis l'input (saisie Admin) ou depuis l'environnement .env.local
    const groqApiKey = input.groqApiKey?.trim() || process.env.GROQ_API_KEY?.trim();

    if (!groqApiKey) {
      throw new Error(
        "Clé API Groq manquante. Renseignez votre clé gratuite (commençant par 'gsk_') dans l'espace Admin ou dans votre fichier .env.local (GROQ_API_KEY=gsk_...). Obtenez une clé en 30s sur https://console.groq.com sans carte bancaire."
      );
    }

    // Combiner les lieux existants et les lieux ignorés pour que l'IA ne les repropose jamais
    const allExcluded = Array.from(new Set([
      ...(input.existingPlaces || []),
      ...(input.ignoredPlaces || []),
    ]));
    const sampleKnown = allExcluded.slice(0, 20).join(', ');

    const systemPrompt = `Tu es un guide local et éclaireur gastronomique expert du Grand Tunis (Tunisie).
Ta mission est d'identifier des établissements réels (cafés, salons de thé, restaurants, street-food, brunch, pâtisseries, loisirs) situés STRICTEMENT dans la zone "${input.zone}" (Tunis).

RÈGLES IMPÉRATIVES DE PRÉCISION GÉOGRAPHIQUE :
1. VÉRACITÉ & DÉLIMITATION STRICTE :
   - Ne cite que des lieux RÉELS qui existent physiquement à l'intérieur du périmètre STRICT de "${input.zone}". N'invente aucun nom.
   - NE DÉBORDE JAMAIS sur les quartiers voisins :
     * Si la zone est "Ain Zaghouan" ou "Ain Zaghouan Nord", n'inclus SURTOUT PAS de lieux situés aux Berges du Lac 2, à L'Aouina, à La Soukra ou au Kram. Reste strictement dans Ain Zaghouan (ex: le long de la GP9 côté Ain Zaghouan, près de l'Hôpital Mongi Slim, Résidence Essalem, etc.).
     * Si la zone est "La Marsa", n'inclus pas de lieux situés à Gammarth ou Sidi Bou Saïd.
     * Si la zone est "Ennasr", n'inclus pas de lieux situés à El Menzah ou Ariana.
     * Si la zone est "Les Berges du Lac 1", n'inclus pas Lac 2 ou Les Berges du Lac 0.
2. NOM EXACT POUR GOOGLE MAPS :
   - Indique le nom commercial exact tel qu'il apparaît sur Google Maps et sur l'enseigne de l'établissement (sans superlatifs ni slogans ajoutés).
3. REPÈRE OU ADRESSE OBLIGATOIRE :
   - Dans le champ "address", donne obligatoirement le repère exact, la rue ou la résidence dans "${input.zone}" (ex: "Route GP9, Ain Zaghouan", "Avenue Hédi Nouira", "Face Hôpital Mongi Slim", etc.).
4. DIVERSITÉ : Propose entre 6 et 10 établissements variés.
5. CATÉGORIES VALIDES UNIQUEMENT :
   - "cafes" : Cafés, coffee shops, salons de thé, glaciers.
   - "restaurants" : Restaurants traditionnels tunisiens, italiens, asiatiques, poissons, bistros.
   - "fastFoods" : Fast food, burgers, chapatis, sandwiches, pizzerias rapides.
   - "brunch" : Brunch, boulangeries, pâtisseries, crêperies.
   - "kharjet" : Balades, parcs, loisirs, cinémas, spots culturels.
6. FORMAT : Réponds STRICTEMENT avec un objet JSON valide contenant la clé "discoveredPlaces":
{
  "discoveredPlaces": [
    {
      "name": "Nom commercial exact",
      "category": "cafes" | "restaurants" | "fastFoods" | "brunch" | "kharjet",
      "description": "Courte spécialité ou ambiance en 1 phrase",
      "address": "Rue ou repère précis dans ${input.zone}"
    }
  ]
}
Ne rajoute aucun texte hors JSON.`;

    const userPrompt = `Trouve entre 6 et 10 établissements réels, populaires et récents STRICTEMENT situés dans la zone "${input.zone}" à Tunis.
Attention à bien respecter les limites de "${input.zone}" sans déborder sur les quartiers voisins.
Voici des établissements déjà connus ou déjà ignorés dans cette zone à ne JAMAIS répéter : ${sampleKnown || 'Aucun'}.`;

    const primaryModel = 'qwen/qwen3.8-27b';
    const fallbackModel = 'llama-3.3-70b-versatile';

    console.log(`[Scout Places Flow] Querying Groq (${primaryModel}) for "${input.zone}"...`);

    const callGroq = async (model: string) => {
      return fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
          response_format: { type: 'json_object' },
        }),
      });
    };

    let groqRes = await callGroq(primaryModel);

    // Si Qwen renvoie une erreur (hors 401 mauvaise clé), tenter le fallback transparent sur Llama 3.3
    if (!groqRes.ok && groqRes.status !== 401) {
      const primaryErr = await groqRes.text();
      console.warn(`[Scout Places Flow] Primary model ${primaryModel} failed (${groqRes.status}): ${primaryErr}. Falling back to ${fallbackModel}...`);
      groqRes = await callGroq(fallbackModel);
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error('[Scout Places Flow] Groq API returned error:', groqRes.status, errText);
      if (groqRes.status === 401) {
        throw new Error("Clé API Groq invalide ou expirée (401). Vérifiez votre clé sur https://console.groq.com.");
      }
      throw new Error(`Erreur API Groq (${groqRes.status}): ${errText}`);
    }

    const groqData = await groqRes.json();
    const contentText = groqData.choices?.[0]?.message?.content;

    if (!contentText) {
      throw new Error("Réponse vide reçue de l'IA Groq.");
    }

    let parsed: any;
    try {
      parsed = JSON.parse(contentText);
    } catch (parseErr) {
      // Nettoyage si balises de raisonnement <think>...</think> ou Markdown entourant le JSON
      const cleanJson = contentText
        .replace(/<think>[\s\S]*?<\/think>/gi, '')
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleanJson);
    }

    // Récupération de la liste (tolérance format)
    const rawList = parsed?.discoveredPlaces || parsed?.places || (Array.isArray(parsed) ? parsed : []);

    const validCategories = ['cafes', 'restaurants', 'fastFoods', 'brunch', 'kharjet'] as const;

    const normalizedPlaces = rawList
      .filter((p: any) => p && typeof p.name === 'string' && p.name.trim().length > 0)
      .map((p: any) => {
        let cat = String(p.category || 'cafes').trim();
        // Normalisation des synonymes possibles
        if (cat === 'cafe' || cat === 'café' || cat === 'salon_de_the') cat = 'cafes';
        if (cat === 'restaurant' || cat === 'resto') cat = 'restaurants';
        if (cat === 'fast_food' || cat === 'fastfood' || cat === 'fast-food' || cat === 'street_food') cat = 'fastFoods';
        if (cat === 'patisserie' || cat === 'boulangerie' || cat === 'petit_dejeuner') cat = 'brunch';
        if (cat === 'loisir' || cat === 'loisirs' || cat === 'parc' || cat === 'culture') cat = 'kharjet';

        if (!validCategories.includes(cat as any)) {
          cat = 'cafes';
        }

        return {
          name: p.name.trim(),
          category: cat as 'cafes' | 'restaurants' | 'fastFoods' | 'brunch' | 'kharjet',
          description: typeof p.description === 'string' ? p.description.trim() : '',
          address: typeof p.address === 'string' ? p.address.trim() : undefined,
        };
      });

    console.log(`[Scout Places Flow] Groq successfully returned ${normalizedPlaces.length} places for "${input.zone}"!`);

    return { discoveredPlaces: normalizedPlaces };
  }
);

export async function scoutPlaces(input: ScoutPlacesInput): Promise<ScoutPlacesOutput> {
  return scoutPlacesFlow(input);
}
