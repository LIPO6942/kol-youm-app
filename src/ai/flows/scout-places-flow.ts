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
    // Normalisation de la catégorie cible
    const targetCat = input.category ? String(input.category).trim() : 'cafes';
    const serperApiKey = input.serperApiKey?.trim() || process.env.SERPER_API_KEY?.trim();
    const groqApiKey = input.groqApiKey?.trim() || process.env.GROQ_API_KEY?.trim();

    // 1. Priorité 1 : Serper.dev Google Maps Places API (Données réelles Google Maps, 0% hallucination)
    if (serperApiKey) {
      try {
        console.log(`[Scout Places Flow] Querying Serper.dev Google Maps Places for "${input.zone}" (${targetCat})...`);
        const catKeywords: Record<string, string> = {
          cafes: 'cafés salons de thé coffee shop',
          restaurants: 'restaurants',
          fastFoods: 'fast-food burgers pizzerias chapatis',
          brunch: 'brunch pâtisserie petit déjeuner',
          kharjet: 'activités loisirs sorties parcs',
        };
        const catQuery = catKeywords[targetCat] || targetCat;
        const searchQuery = `${catQuery} ${input.zone} Tunis`;

        const serperRes = await fetch('https://google.serper.dev/places', {
          method: 'POST',
          headers: {
            'X-API-KEY': serperApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: searchQuery,
            location: `${input.zone}, Tunis, Tunisia`,
            gl: 'tn',
            hl: 'fr',
          }),
        });

        if (serperRes.ok) {
          const serperData = await serperRes.json();
          const rawPlaces = Array.isArray(serperData?.places) ? serperData.places : [];
          console.log(`[Scout Places Flow] Serper returned ${rawPlaces.length} places from Google Maps`);

          if (rawPlaces.length > 0) {
            const mappedPlaces = rawPlaces
              .filter((p: any) => p && typeof p.title === 'string' && p.title.trim().length > 0)
              .map((p: any) => {
                const parts: string[] = [];
                if (p.category) parts.push(p.category);
                if (p.rating) parts.push(`Note Google: ${p.rating}★ (${p.ratingCount || 0} avis)`);
                const desc = parts.join(' · ') || `Fiche Google Maps dans ${input.zone}`;

                return {
                  name: p.title.trim(),
                  category: targetCat as 'cafes' | 'restaurants' | 'fastFoods' | 'brunch' | 'kharjet',
                  description: desc,
                  address: p.address ? p.address.trim() : `${input.zone}, Tunis`,
                };
              });

            if (mappedPlaces.length > 0) {
              console.log(`[Scout Places Flow] Successfully returning ${mappedPlaces.length} real Google Maps places from Serper.dev!`);
              return { discoveredPlaces: mappedPlaces };
            }
          }
        } else {
          const errText = await serperRes.text();
          console.warn('[Scout Places Flow] Serper API error:', serperRes.status, errText);
        }
      } catch (serperErr) {
        console.warn('[Scout Places Flow] Serper fetch failed, falling back to Groq:', serperErr);
      }
    }

    if (!groqApiKey && !serperApiKey) {
      throw new Error(
        "Clé API manquante. Renseignez votre clé gratuite Serper.dev (2500 requêtes Google Maps gratuites sur https://serper.dev) ou votre clé Groq dans l'espace Admin."
      );
    }
    const categoryInstructions: Record<string, string> = {
      cafes: 'Tu dois identifier UNIQUEMENT des Cafés, Salons de thé, Coffee shops ou Glaciers. N’inclus STRICTEMENT AUCUN restaurant, fast-food, pizzeria ou boulangerie.',
      restaurants: 'Tu dois identifier UNIQUEMENT des Restaurants (traditionnels tunisiens, poissons, italiens, bistros). N’inclus STRICTEMENT AUCUN café simple ni fast-food.',
      fastFoods: 'Tu dois identifier UNIQUEMENT des Fast-foods, pizzerias rapides, chapatis, burgers, street-food. N’inclus STRICTEMENT AUCUN salon de thé ni restaurant classique.',
      brunch: 'Tu dois identifier UNIQUEMENT des spots de Brunch, Pâtisseries, Boulangeries gourmandes, Crêperies, Salons de thé spécialisés petit-déjeuner.',
      kharjet: 'Tu dois identifier UNIQUEMENT des Sorties, Parcs, Loisirs, Balades, Cinémas, Spots culturels.',
    };

    const specificCatInstruction = categoryInstructions[targetCat] || `Tu dois identifier UNIQUEMENT des établissements correspondant à la catégorie "${targetCat}".`;

    const zoneLandmarks: Record<string, string> = {
      'Ain Zaghouan Nord': 'Axes réels : Route de La Marsa (GP9) côté Ain Zaghouan Nord, Avenue Khaled Ibn El Walid, secteur Monoprix Ain Zaghouan, zone résidentielle. Interdiction formelle d\'inclure des lieux situés à L\'Aouina, aux Berges du Lac 2, à La Soukra ou au Kram.',
      'Ain Zaghouan': 'Axes réels : GP9, Avenue Khaled Ibn El Walid, Hôpital Mongi Slim, Monoprix Ain Zaghouan. Ne déborde pas sur Lac 2 ou Aouina.',
      'La Marsa': 'Axes réels : Marsa Ville, Marsa Plage, Marsa Cube, Marsa Nassim, Zéphyr. Ne déborde pas sur Gammarth ou Sidi Bou Saïd.',
      'Ennasr': 'Axes réels : Avenue Hédi Nouira, Ennasr 1, Ennasr 2. Ne déborde pas sur El Menzah ou Ariana.',
      'Les Berges du Lac 1': 'Axes réels : Rue du Lac Léman, Rue du Lac Windermere, Corniche du Lac 1.',
      'Les Berges du Lac 2': 'Axes réels : Rue de la Feuille d\'Érable, Boulevard du Lac, zone Tunisia Mall.',
      'La Soukra': 'Axes réels : Avenue de l\'UMA, Chotrana, Dar Fadhal.',
      'El Aouina': 'Axes réels : Avenue Dar Fadhal, Rue Mongi Slim Aouina.',
      'El Manar': 'Axes réels : Manar 1, Manar 2, Colisée Manar.',
      'Menzah 5': 'Axes réels : Rue El Moez, Menzah 5.',
      'Menzah 6': 'Axes réels : Avenue Othman Ibn Affane, Centre Makni.',
    };

    const topographyHint = zoneLandmarks[input.zone] || `Reste strictement à l'intérieur des limites de "${input.zone}" sans déborder sur les quartiers voisins.`;

    // Combiner les lieux existants et les lieux ignorés pour que l'IA ne les repropose jamais
    const allExcluded = Array.from(new Set([
      ...(input.existingPlaces || []),
      ...(input.ignoredPlaces || []),
    ]));
    const sampleKnown = allExcluded.slice(0, 25).join(', ');

    const systemPrompt = `Tu es un guide local et éclaireur gastronomique expert et intraitable sur la réalité du terrain dans le Grand Tunis (Tunisie).
Ta mission est d'identifier des établissements réels situés STRICTEMENT dans la zone "${input.zone}" (Tunis).

RÈGLE 1 : CIBLAGE STRICT DE LA CATÉGORIE
${specificCatInstruction}

RÈGLE 2 : ZÉRO-HALLUCINATION & VÉRACITÉ ABSOLUE SUR GOOGLE MAPS
- Ne cite QUE des établissements réels, connus et actuellement ouverts qui existent réellement sur Google Maps.
- N'INVENTE AUCUN NOM. Si tu n'es pas certain à 100% de l'existence d'un lieu, NE LE METS PAS.
- Propose entre 2 et 5 établissements MAXIMUM. Si tu n'as que 2 vrais lieux vérifiés dans cette zone, ne renvoie que ces 2 là. Mieux vaut 2 vrais lieux que des noms inventés !

RÈGLE 3 : RESPECT STRICT DU PÉRIMÈTRE
${topographyHint}

RÈGLE 4 : NOM COMMERCIAL EXACT ET REPÈRE
- "name" : Le nom commercial exact tel qu'écrit sur la devanture et sur Google Maps (ex: "Café Journal", "Cosmitto Coffee", "Gourmandise").
- "address" : La rue, l'avenue ou le repère géographique précis dans ${input.zone}.

FORMAT DE RÉPONSE STRICT (JSON UNIQUEMENT) :
{
  "discoveredPlaces": [
    {
      "name": "Nom commercial exact",
      "category": "${targetCat}",
      "description": "Courte spécialité ou ambiance réelle en 1 phrase",
      "address": "Rue ou repère précis dans ${input.zone}"
    }
  ]
}`;

    const userPrompt = `Trouve entre 2 et 5 établissements réels, populaires et vérifiés dans la zone "${input.zone}" pour la catégorie demandée.
Rappel catégorie : ${specificCatInstruction}
Attention : Reste strictement dans les limites de "${input.zone}". N'invente aucun nom.
Établissements déjà connus ou déjà ignorés à ne PAS répéter : ${sampleKnown || 'Aucun'}.`;

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
        let cat = String(p.category || targetCat || 'cafes').trim();
        // Normalisation des synonymes possibles
        if (cat === 'cafe' || cat === 'café' || cat === 'salon_de_the') cat = 'cafes';
        if (cat === 'restaurant' || cat === 'resto') cat = 'restaurants';
        if (cat === 'fast_food' || cat === 'fastfood' || cat === 'fast-food' || cat === 'street_food') cat = 'fastFoods';
        if (cat === 'patisserie' || cat === 'boulangerie' || cat === 'petit_dejeuner') cat = 'brunch';
        if (cat === 'loisir' || cat === 'loisirs' || cat === 'parc' || cat === 'culture') cat = 'kharjet';

        if (!validCategories.includes(cat as any)) {
          cat = targetCat && validCategories.includes(targetCat as any) ? targetCat : 'cafes';
        } else if (targetCat && validCategories.includes(targetCat as any)) {
          cat = targetCat;
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
