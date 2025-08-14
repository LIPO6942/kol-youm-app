
'use server';
/**
 * @fileOverview A Genkit flow for making a decision on where to go out.
 *
 * - makeDecision - A function that takes an outing category and returns a list of suggestions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { MakeDecisionInputSchema, MakeDecisionOutputSchema, type MakeDecisionInput, type MakeDecisionOutput } from './decision-maker-flow.types';


const prompt = ai.definePrompt({
  name: 'makeDecisionPrompt',
  input: {schema: MakeDecisionInputSchema.extend({ isCafeCategory: z.boolean().optional(), isFastFoodCategory: z.boolean().optional(), isRestaurantCategory: z.boolean().optional(), isBrunchCategory: z.boolean().optional() })},
  output: {schema: MakeDecisionOutputSchema},
  prompt: `Tu es un expert connaisseur de la vie locale en Tunisie. Tes connaissances couvrent spécifiquement les zones suivantes : **La Marsa, Gammarth, El Aouina, Ain Zaghouan Nord, Les Berges du Lac (1 et 2), Jardins de Carthage, Carthage, La Goulette, Le Kram, Boumhal, Ezzahra, Hammamet, Nabeul, Mégrine, La Soukra, Le Bardo, Menzah 1, Menzah 5, Menzah 6, Menzah 8, Menzah 9, Ennasr, Cité Ennasr, le centre-ville de Tunis, Mutuelleville, Alain Savary, El Manar**. Ton but est de donner aux utilisateurs une liste de suggestions de sorties **nouvelles**, uniques et pertinentes parmi les meilleurs endroits **réels et existants** dans ces zones uniquement.

L'utilisateur a choisi la catégorie de sortie suivante : "{{category}}".

Ta tâche est de :
1.  Générer une liste de **2 suggestions de lieux réels, connus et très bien notés (4 étoiles ou plus sur Google Maps)** qui correspondent parfaitement à la catégorie "{{category}}" et se trouvent **exclusivement** dans les zones listées ci-dessus.
2.  **Diversifier les lieux :** Chaque suggestion doit être dans un **quartier ou une ville différente** de la liste pour surprendre l'utilisateur.
3.  Pour chaque suggestion, fournir :
    - Le **nom exact** du lieu.
    - Une **description courte et engageante** (une ou deux phrases), en mettant en avant sa spécialité ou son ambiance unique.
    - Son **quartier ou sa ville** précise (par exemple : "La Marsa", "Hammamet Nord", "Ennasr 2").
    - Une **URL Google Maps valide et fonctionnelle** qui pointe vers ce lieu. L'URL doit être correctement formée, par exemple : "https://www.google.com/maps/search/?api=1&query=Nom+Du+Lieu,Ville".

**Instructions importantes :**
{{#if zones.length}}
- **Filtre de zone :** L'utilisateur a demandé à voir des suggestions spécifiquement dans les zones suivantes : **{{#each zones}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}**. Toutes tes suggestions doivent impérativement se trouver dans cette ou ces zones.
{{else}}
- **Pertinence géographique :** Ne propose **AUCUN** lieu en dehors des zones spécifiées.
- **Variété des lieux :** Varie les quartiers dans tes suggestions. Ne te limite pas à une seule zone.
{{/if}}

{{#if seenPlaceNames}}
- **Éviter les répétitions :** Exclus impérativement les lieux suivants de tes suggestions, car l'utilisateur les a déjà vus :
{{#each seenPlaceNames}}
  - {{this}}
{{/each}}
{{/if}}

{{#if isCafeCategory}}
- **Priorité aux cafés :** Pour la catégorie "Café", puise tes suggestions en priorité dans la liste suivante, en t'assurant qu'ils sont bien notés et qu'ils se trouvent dans les zones géographiques autorisées :
  - **Zone La Soukra :** Lotus Café, Brown and Sugar Coffee, First café, Caféte du Golf.
  - **Zone El Aouina :** Minuto di STARTELA, BEANS & CO COFFEE HOUSE, Sam's Café, Bleuet, Ali's Coffee, Café Patchwork, Infinity Aouina, SOHO Coffee, Ô Palet, Dell'Angelo Cafè, Café Sun-Side, Café Slow X, Green Coffee, Padova, Beans&Co, Downtown, Barista's, Pep’s coffee, The One Coffee Lounge, InSider L’Aouina, idea lounge, Epic Coffee Shop, GATSBY, Balkon, MYKONOS MEMORIES COFFE, Café Forever Lounge, Pivoine coffee & more, Palet Royal, Salon De Thé New Day, Le Wagram ,BELLUCCI coffee & more.
  - **Zone Ain Zaghouan Nord :** Barista's, Way cup, Il fiore del caffe, CAFE ROSE COTTAGE, La Duchesse, Carré Gourmand, The W's Coffee, PlayPresso, Coffe shop Copa vida.
  - **Zone Lac 2 :** Hookah Coffee Lounge, Côté Jardin, Frédéric CASSEL, U-TOO Coffee & Grill, Kube, George V, SO BRITISH LAC 2, Zanzibar Café, Billionaire Café, OMEGA Coffee, Barista's Lac 2, The Big Dip.
  - **Zone La Marsa :** Gourmandise Marsa Corniche, A mi chemins, North Shore Coffee and Snacks, Ivy Coffee Shop & Restaurant, Grignotine, Saint Tropez, La Marsa, Le Gourmet, Barista’s, Café Victor Hugo H, SABATO COFFEE SHOP & RESTAURANT, Patchwork, Café Calimero, Eric Kayser, PAUL, Blues House and food, Café Journal.
  - **Zone Jardins de Carthage :** TCHOICE CAFE, The closet Coffee shop, Bestoff coffee, The Address, Coin d'alma - Jardins de Carthage, La vida, boho, The Bistrot B&D, Metropolitan Coffee Shop, The Glory Coffee, Athiniôs Coffee, Saint Germain JDC, 3M coffee, Mille Mercis, The Garrison 06, Galerie Café, The Mayfair Lounge.
  - **Zone Carthage :** Uranium Café d'art, Barista's Carthage Dermech, Punic'Art, Café Yam's, Next One, Avra Carthage, The Hills, Matcha Club | Carthage.
  - **Zone La Goulette/Kram :** El Aalia, Café Restaurant La Plage, Wet Flamingo(Bar).
  - **Zone Mégrine/ Sidi Rzig :** Fugazi coffee&snack, Double Dose, Javayou, Salon de thé white lounge, La Dolce Vita, SHOW OFF, Wood&ROPES, Gourmandise Megrine.
  - **Zone El Manar :** Hillside Resto-Lounge, Brooklyn Café, Wolf And Rabbit, Pantree, Vero Gusto, Q'Mug, Story coffee, Môme Lounge.
  - **Zone Menzah 9 :** La Verrière - Café Resto, LA DOREE, Casa De Papel.
  - **Zone Menzah 6 :** 3al Kif, café 23, Le Trait d'union, A casa mia, Le Montmartre, Sacré Cœur, La Seine, The 716 Menzah 6, Tartes et haricots.
  - **Zone Menzah 5 :** Gourmandise M5, Eric Kayser, Lv Club, Seven S M5, Kälo café, Nüma coffee & kitchen, The Paradise, Myplace, El Chapo, ABUELA'S CAFE.
  - **Zone Menzah 8 :** Yalova café restaurant & lounge, Affogato coffee shop, Quick Café.
  - **Zone Ennasr :** JAGGER, 4 Ever, FIVE O' CLOCK Tea House & Snack, Le Baron Café, Café Blanc, Versailles, The COFFEE 777, The 616 coffee PLUS, Cafe Royal, tornados coffee, Queen, Chesterfield, MM Café, PROST Coffee, Via Vai, HERMES CAFE, Minions coffee, Piacere, Vagary tunis, Paty coffee lounge, Barcelone Coffee.
{{/if}}

{{#if isFastFoodCategory}}
- **Priorité aux Fast Foods :** Pour la catégorie "Fast Food", puise tes suggestions en priorité dans la liste suivante, en t'assurant qu'ils sont bien notés et qu'ils se trouvent dans les zones géographiques autorisées :
  - **Zone La Soukra :** Tredici, Italiano Vero, BiBi.
  - **Zone El Aouina :** Om burger, El Ostedh, Compozz, Crispy Naan, Wok Time, Pimento's, Icheese, Hot Dot, Chaneb Tacos, Dma9, The Corner Italian Food, KFC, Echemi Aouina, Shrimp Burger, Benkay Sushi, Taco and co, My Potato, Tsunami Sushi, Restaurant l'artiste, Bonfire, Bombay, Oueld el bey, Taquería, Sanburg, Friends Pasta Bar aouina, Restaurant The Hood, Machewi Tchiko Fruits de mer, Pizzeria Speed’za, Fahita.
  - **Zone Ain Zaghouan Nord :** Cozy corner, Pizzeria Thapsus 5090, BBQ, BB Food, Restaurant Pasta'Up.
  - **Zone Lac 1 :** Friends Pasta Bar, The Food Court, Gino Pizza e Panino, Pizza LAGO, Pastel Food&Drinks, PIÚ Pasta, Via mercato, Soryana.
  - **Zone Lac 2 :** Sushibox, Happy’s, Indonesian Restaurant, IT Pizza & Co, Pasta Cosi, Massazi.
  - **Zone Jardins de Carthage :** POPOLARE TRATTORIA, Pizzeria & Fast Food Bombay, MAC & JO'S, Kayu Sushi, Restaurant La Cuillère, Le 45 / Supreme Burger, PORTA NIGRA, RustiK Burger, Route 66, Goomba's Pizza, Regalo Italiano, Masaniello Cucina, ch'men di fir.
  - **Zone Carthage :** too much, Baguette Et Baguette.
  - **Zone La Goulette/Kram :** Ciao!, LOS TRADOS, Fuego, Buon Gusto, Food 'n' mood, Vagabondo, Pizza Pronto, Klitch, Big burger 🍔, The NINETY-NINE, L'antica pizzeria, After.
  - **Zone Menzah 1 :** Mokito, Le Zink.
  - **Zone Menzah 5 :** Mustache, El Koocha, Prego, Le Réservoir, Pythagor.
  - **Zone Menzah 6 :** Ô Four !, Bout de pain, Pizza Tiburtina, Rustica Menzah 6, Jam Jem, Pizza al métro, Restaurant Chef Zhang, The Sunny Beans.
  - **Zone Ennasr :** Echemi, Baguette&Baguette, Cool tacos, HEY BRO, POPOLARE TRATTORIA, GUSTO PIZZA, Ya hala shawarma-يا هلا شاورما, FaceFood, THE SQUARE, Set el cham, Le Bambou, Lab station (Burger), Greens Trattoria au feu de bois, Restaurant Insomnia, Ibn chem, Tacos Chaneb, Señor tacos, Olympique TACOSAIS, Malibu Ennasr.
  - **Zone La Marsa :** Doodle Burger Bar, Lapero Tapas & Pintxos, Smash’d, Pizza Pesto, Kenkō food bar, Chez Joseph, CORNICELLO NAPOLITAIN, appello, La Pause Fast food, Le Fumoir, Pizzagram, BIG MO - Burger Shack, Pizzeria COME Prima La Marsa, Andiamo, O’Potatos, Panzerotti, Bambino, BFRIES, Uno, Sanfour, Maakoulet Echem, Triade, Piccolo Marsa pizzeria, Wok Thaï La Marsa, Plan B La Marsa, SAKURA PASTA, GOA INDIANA FOOD, D'lich, Benkay Sushi, Sushiwan, La Bruschetta, Machawina, Mamma Time.
  - **Zone Mégrine :** Benkay sushi Megrine, Papa Johns Pizza, May Food's, Malibu Food, Lilliano, Tacos chaneb megrine, Class'croute, Juste En Face Megrine, Baguette & Baguette Megrine.
  - **Zone El Manar :** Restaurant 6019, Fringale.
{{/if}}

{{#if isRestaurantCategory}}
- **Priorité aux Restaurants :** Pour la catégorie "Restaurant", puise tes suggestions en priorité dans la liste suivante, en t'assurant qu'ils sont bien notés et qu'ils se trouvent dans les zones géographiques autorisées :
  - **Zone La Soukra :** Lorenzia, Brown and Sugar Coffee, Tredici, Italiano Vero.
  - **Zone El Aouina :** Del Capo Restaurant, Restaurant Italien Terrazzino, Restaurant Broche'zza, Restaurant Grillade Zine El Chem, Restaurant Emesa, RED Castle aouina, WOK Time.
  - **Zone Ain Zaghouan Nord :** Restaurant Thaïlandais House, The Nine - Lifestyle Experience.
  - **Zone Lac 2 :** Soryana, Via Mercato Lac 2, Al Seniour, Chef Ayhan Turkich grill rustik, K-ZIP, La Margherita, Bocca Felice, Chef Eyad, Restaurant L'Érable.
  - **Zone La Marsa :** CULT, bistro, Kimchi, Le Golfe, Pi, La focaccia marsa, La Mescla, Restaurant La Maison, La Piadina, La Dokkana House, Karam Lobnan, DIVERSSO, AL SÉNIOUR, RESTAURANT L'ENDROIT, Ô Moules, The Kitchen Restaurant la Marsa.
  - **Zone Gammarth :** Restaurante Vicolo, L’italien Gammarth da Davide, Restaurant Les Ombrelles, Restaurant Les Dunes, Restaurant Borago gammarth, Le Ritsi, Ocean Club, Le Grand Bleu, Olivia, LiBai, Restaurant Grec Efimero.
  - **Zone Jardins de Carthage :** Isapori italiani, Langostino, Hasdrubal de Carthage, Peri Peri Restaurant, Qian house chinese.
  - **Zone Carthage :** Rue de Siam Carthage, BIRDS, Pizza Phone, Restaurant Best Friend, Tchevap, Les Indécis, restaurant valentino, Restaurant Le Punique.
  - **Zone La Goulette/Kram :** La Topaze, La Mer, La Spigola, La GALITE, Le Café Vert, restaurant la paella, Resto HEKAYA, Le Chalet Goulettois, Restaurant The House - الحوش, Les 3 Marins, Restaurant Flouka, Restaurant Waywa, La maison de la grillade, L'Aquarius, YORK Restaurant & Café, Platinium Restaurant.
  - **Zone Mutuelleville / Alain Savary :** L'ardoise, L'astragale, Alle scale, Le Baroque-Restaurant.
  - **Zone Mégrine :** Tavolino, Via mercato Megrine, La Bottega restaurant.
  - **Zone El Manar :** Mashawi Halab, Chili's American's Grill, Sultan Ahmet, Go! Sushi, Pang's asian restaurant & sushi bar, Route 66.
  - **Zone Menzah 9 :** Damascino Menzah 9, Mamma Time.
  - **Zone Ennasr :** Thaïfood, Farm Ranch Pizza Ennasr, INSIDE Turkish Restaurant Lounge, Café Blackstreet, Le safran, Restaurant Le Sfaxien- Abou Lezz, Momenti Italiani, meatopia, Wokthaï Ennaser.
{{/if}}

{{#if isBrunchCategory}}
- **Priorité aux Brunchs :** Pour la catégorie "Brunch", puise tes suggestions en priorité dans la liste suivante, en t'assurant qu'ils sont bien notés et qu'ils se trouvent dans les zones géographiques autorisées :
  - **Zone El Aouina :** Kalanea&co, Ali's, coffeelicious Lounge, Infinity Aouina, Downtown Lounge, Restaurant Italien Terrazzino, Pâtisserie Mio, Rozalia coffee&brunch, The One Coffee Lounge,Moonrise juices and crêpes.
  - **Zone Lac 2 :** Côté Jardin, PATCHWORK Café & Restaurant, Twiggy, Café Lounge The Gate, The Big Dip, Pinoli Restaurant, Kube, PALAZZO Café Restaurant, George V, 3OO Three Hundred, SO BRITISH.
  - **Zone La Marsa :** Saint Tropez, Breizh Bistrot, Coin Margoum, Yardbirds, Gourmandise, North Shore Coffee and Snacks, Ivy Coffee Shop & Restaurant, Blues House and food, Café Journal, Bonsaï café & restaurant, Bistek, SABATO COFFEE SHOP & RESTAURANT, La Roquette - Salad Bar & Co.
  - **Zone Menzah 6 :** The 716 Menzah 6, A casa mia, Tartes et haricots, Le Montmartre.
  - **Zone Ennasr :** JAGGER, Café Blanc, tornados coffee, Café Blackstreet, Vagary tunis, Paty coffee lounge.
{{/if}}

Assure-toi que toutes les informations sont exactes, vérifiables et que les lieux ont bien une note de 4 étoiles ou plus. Les suggestions doivent être de haute qualité et **différentes les unes des autres**. Réponds uniquement en respectant le format de sortie JSON demandé.`,
});

const makeDecisionFlow = ai.defineFlow(
  {
    name: 'makeDecisionFlow',
    inputSchema: MakeDecisionInputSchema,
    outputSchema: MakeDecisionOutputSchema,
  },
  async input => {
    const isCafeCategory = input.category.toLowerCase().includes('café');
    const isFastFoodCategory = input.category.toLowerCase().includes('fast food');
    const isRestaurantCategory = input.category.toLowerCase().includes('restaurant');
    const isBrunchCategory = input.category.toLowerCase().includes('brunch');
    
    const {output} = await prompt({
        ...input,
        isCafeCategory: isCafeCategory,
        isFastFoodCategory: isFastFoodCategory,
        isRestaurantCategory: isRestaurantCategory,
        isBrunchCategory: isBrunchCategory,
    });
    return output!;
  }
);


export async function makeDecision(input: MakeDecisionInput): Promise<MakeDecisionOutput> {
  return makeDecisionFlow(input);
}
