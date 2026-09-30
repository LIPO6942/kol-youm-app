import type { DayWeather } from '@/lib/weather/open-meteo';
import type { SuggestOutfitOutput } from '@/ai/flows/intelligent-outfit-suggestion.types';
import type { WardrobeItem } from '@/lib/firebase/firestore';

export type ThermalBracket = 'Froid' | 'Frais' | 'Doux' | 'Chaud';
export type DayPace = 'Semaine' | 'Weekend';
export type DefaultOccasion = 'Posé Chic' | 'Décontracté / Sport';

export interface LifestyleReflexes {
  umbrella: { needed: boolean; text: string };
  layering: string;
  shoesAlert: string;
  fragranceNotes: string;
}

export interface StylistRecommendationResult {
  outfit: SuggestOutfitOutput;
  thermalBracket: ThermalBracket;
  dayPace: DayPace;
  occasion: DefaultOccasion;
  stylistAdvice: string;
  weatherSummary: string;
  hasRain: boolean;
  hasWind: boolean;
  lifestyleReflexes: LifestyleReflexes;
}

/**
 * Determine thermal category from average/max temperature
 */
export function getThermalBracket(tempMax: number, tempMin: number): ThermalBracket {
  const avg = (tempMax + tempMin) / 2;
  if (tempMax < 12 || avg < 11) return 'Froid';
  if (tempMax <= 18 || avg <= 17) return 'Frais';
  if (tempMax <= 24) return 'Doux';
  return 'Chaud';
}

/**
 * Determine day pace (Semaine vs Weekend) based on ISO date (YYYY-MM-DD)
 */
export function getDayPace(dateStr: string): { dayPace: DayPace; defaultOccasion: DefaultOccasion } {
  // Parse date safely
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, (month || 1) - 1, day || 1);
  const dayOfWeek = dateObj.getDay(); // 0 = Dimanche, 6 = Samedi

  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return { dayPace: 'Weekend', defaultOccasion: 'Décontracté / Sport' };
  }
  return { dayPace: 'Semaine', defaultOccasion: 'Posé Chic' };
}

/**
 * Outfits Database by Gender, Thermal Bracket, and Occasion
 * Offers multiple variations so users can regenerate on demand.
 */
const OUTFIT_MATRIX: Record<
  'Homme' | 'Femme',
  Record<
    ThermalBracket,
    Record<
      DefaultOccasion,
      Array<{
        haut: string;
        bas: string;
        chaussures: string;
        accessoires: string;
        pitch: string;
      }>
    >
  >
> = {
  Homme: {
    Froid: {
      'Posé Chic': [
        {
          haut: 'Manteau en laine structuré camel ou anthracite sur pull col roulé en mérinos écru',
          bas: 'Pantalon en flanelle ou chino épais gris anthracite',
          chaussures: 'Bottines chelsea en cuir lisse noir ou marron ciré',
          accessoires: 'Écharpe douce en cachemire marine et montre sobre en cuir',
          pitch: 'Une élégance statutaire pour braver le froid avec prestance.',
        },
        {
          haut: 'Caban en laine marine sur chemise oxford bleu clair et cardigan boutonné en maille',
          bas: 'Pantalon chino ajusté beige foncé ou pantalon tailleur chaud',
          chaussures: 'Derbies en cuir marron foncé semelle commando',
          accessoires: 'Gants en cuir fin et écharpe à motifs discrets',
          pitch: 'L’accord parfait entre chaleur enveloppante et distinction professionnelle.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'Doudoune épaisse matelassée à capuche sur hoodie épais en molleton',
          bas: 'Pantalon jogger cargo en coton épais ou jean brut renforcé',
          chaussures: 'Baskets montantes ou sneakers running thermiques',
          accessoires: 'Bonnet côtelé en laine et tour de cou confortable',
          pitch: 'Confort thermique maximal et silhouette streetwear assumée pour le weekend.',
        },
        {
          haut: 'Parka chaude imperméable sur pull zippé col camionneur en polaire structurée',
          bas: 'Jean straight selvedge confortable',
          chaussures: 'Bottines casual à lacets ou sneakers en cuir nubuck',
          accessoires: 'Sac à dos technique et gants tactiles',
          pitch: 'Une tenue robuste et isolante pour profiter de ses sorties sans frissonner.',
        },
      ],
    },
    Frais: {
      'Posé Chic': [
        {
          haut: 'Trench-coat mi-saison ou veste surchemise en laine sur pull col rond fin en mérinos',
          bas: 'Pantalon chino ajusté beige ou pantalon à pinces souple gris chiné',
          chaussures: 'Sneakers épurées en cuir blanc lisse ou mocassins en daim noisette',
          accessoires: 'Écharpe légère en gaze de coton et montre fine',
          pitch: 'Le parfait équilibre du layering pour la mi-saison : facile à adapter entre matin et après-midi.',
        },
        {
          haut: 'Blazer en maille ou veste en velours côtelé sur chemise habillée col boutonné',
          bas: 'Pantalon en toile gabardine marine ou jean brut soigné',
          chaussures: 'Derbies ouvertes ou mocassins penny loafers',
          accessoires: 'Ceinture en cuir assortie et pochette sobre',
          pitch: 'Une allure travaillée et soignée, pensée pour les journées actives et les rendez-vous.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'Surchemise épaisse en flanelle ou veste bomber légère sur t-shirt col rond en coton épais',
          bas: 'Jean délavé coupe droite ou pantalon chino décontracté olive',
          chaussures: 'Sneakers lifestyle tendance (type New Balance ou Gazelle)',
          accessoires: 'Casquette sobre et lunettes de soleil si éclaircies',
          pitch: 'Détente urbaine et liberté de mouvement idéale pour un samedi ou dimanche de mi-saison.',
        },
        {
          haut: 'Sweat col rond premium sur t-shirt blanc dépassant légèrement avec veste sans manches matelassée',
          bas: 'Pantalon cargo souple beige ou jogger chic',
          chaussures: 'Baskets rétro en cuir et suède',
          accessoires: 'Sac bandoulière minimaliste',
          pitch: 'Un look dynamique et pratique pour bouger tout le weekend.',
        },
      ],
    },
    Doux: {
      'Posé Chic': [
        {
          haut: 'Surchemise texturée en coton ou veste casual souple sur t-shirt uni de qualité ou polo en maille',
          bas: 'Pantalon chino léger beige ou jean brut bien coupé',
          chaussures: 'Tennis épurées en cuir blanc ou mocassins souples en daim',
          accessoires: 'Montre sobre en cuir et lunettes de soleil',
          pitch: 'Une allure fraîche, moderne et soignée pour la vie de tous les jours.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'Polo en piqué de coton ou t-shirt col rond avec chemise ouverte en lin',
          bas: 'Bermuda chic en toile ou jean léger en denim clair',
          chaussures: 'Baskets basses en toile ou espadrilles modernisées',
          accessoires: 'Casquette et lunettes de soleil',
          pitch: 'La décontraction absolue sous un temps agréable et ensoleillé.',
        },
      ],
    },
    Chaud: {
      'Posé Chic': [
        {
          haut: 'Chemise en lin respirant manches retroussées ou polo col ouvert soyeux',
          bas: 'Pantalon en lin mélangé fluide écru ou beige clair',
          chaussures: 'Mocassins légers sans chaussettes visibles ou derbies perforées',
          accessoires: 'Lunettes de soleil solaires et montre estivale',
          pitch: 'Rester impeccable et distingué même sous les fortes chaleurs.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'T-shirt respirant en coton bio léger ou débardeur structuré',
          bas: 'Bermuda en lin décontracté ou short de bain urbain',
          chaussures: 'Sandales en cuir ou sneakers ultra-légères perforées',
          accessoires: 'Lunettes UV400 et casquette respirante',
          pitch: 'Fraîcheur, légèreté et style pour profiter du grand soleil.',
        },
      ],
    },
  },
  Femme: {
    Froid: {
      'Posé Chic': [
        {
          haut: 'Manteau long ceinturé en laine mélangée sur pull col roulé doux en cachemire',
          bas: 'Pantalon tailleur à pinces en drap de laine ou jupe midi avec collants thermiques',
          chaussures: 'Bottines à talon bloc en cuir lisse ou bottes cavalières montantes',
          accessoires: 'Écharpe plaid moelleuse en maille et sac à main structuré',
          pitch: 'Silhouette longiligne et chaleureuse pour un look impeccable par temps froid.',
        },
        {
          haut: 'Veste blazer oversize en tweed sur blouse en soie et sous-pull fin',
          bas: 'Pantalon palazzo en velours ou pantalon fluide chaud',
          chaussures: 'Bottines chelsea à semelle crantée élégante',
          accessoires: 'Gants en cuir souple et foulard enveloppant',
          pitch: 'Le raffinement du velours et du tweed adapté aux journées les plus fraîches.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'Doudoune cocooning mi-longue matelassée sur sweat oversize à capuche',
          bas: 'Legging thermique épais ou jean mom fit en denim dense',
          chaussures: 'Baskets montantes fourrées ou boots casual en suède',
          accessoires: 'Bonnet en maille torsadée et grand sac cabas souple',
          pitch: 'Confort doudoune et style décontracté pour un weekend cosy.',
        },
      ],
    },
    Frais: {
      'Posé Chic': [
        {
          haut: 'Trench-coat fluide mi-long sur chemisier en crêpe et gilet en maille fine',
          bas: 'Pantalon carotte ceinturé ou jupe trapèze midi en simili-cuir',
          chaussures: 'Mocassins vernis à mors doré ou bottines mi-saison en daim',
          accessoires: 'Foulard soyeux autour du cou et sac bandoulière élégant',
          pitch: 'L’archétype de la parisienne chic : superposition fluide adaptée aux 15°C.',
        },
        {
          haut: 'Blazer droit moderne sur pull col bateau en coton soyeux',
          bas: 'Jean flare brut élégant ou pantalon droit fluide 7/8ème',
          chaussures: 'Babies à talon modéré ou sneakers blanches en cuir épurées',
          accessoires: 'Bijoux dorés discrets et lunettes de soleil légères',
          pitch: 'Une élégance naturelle et moderne, parfaite du bureau au café.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'Veste surchemise en velours côtelé ou veste en jean doublée sur pull col montant léger',
          bas: 'Jean droit confortable ou pantalon wide-leg fluide',
          chaussures: 'Baskets rétro tendance (Samba, New Balance ou Gazelle)',
          accessoires: 'Tote bag en toile épaisse et casquette brodée',
          pitch: 'Le style street-chic décontracté idéal pour flâner et profiter du weekend.',
        },
        {
          haut: 'Sweat col rond brodé avec petit t-shirt blanc contrastant et veste bomber légère',
          bas: 'Pantalon jogger structuré en molleton fin ou pantalon cargo doux',
          chaussures: 'Sneakers running lifestyle',
          accessoires: 'Mini sac banane porté en travers et lunettes de soleil',
          pitch: 'Allure athleisure tendance pour un weekend dynamique et détendu.',
        },
      ],
    },
    Doux: {
      'Posé Chic': [
        {
          haut: 'Chemisier fluide en popeline ou blouse satinée avec blazer fluide sans doublure',
          bas: 'Pantalon fluide en lin mélangé ou jupe plissée soleil',
          chaussures: 'Mules élégantes en cuir ou slingbacks à petit talon',
          accessoires: 'Sac cabas en cuir tressé et lunettes de soleil tendance',
          pitch: 'Légèreté, mouvements fluides et distinction sous la douceur printanière.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'T-shirt blanc en coton mercerisé avec veste en jean légère posée sur les épaules',
          bas: 'Jupe midi en jean fendu ou pantalon fluide en gaze de coton',
          chaussures: 'Baskets blanches en toile ou sandales plates minimalistes',
          accessoires: 'Panier en osier moderne et lunettes de soleil',
          pitch: 'Douceur et insouciance pour une belle journée ensoleillée.',
        },
      ],
    },
    Chaud: {
      'Posé Chic': [
        {
          haut: 'Robe chemise ceinturée en lin fluide ou top sans manches en soie sur pantalon palazzo',
          bas: 'Pantalon large palazzo fluide ultra-léger (si ensemble) ou robe longue',
          chaussures: 'Sandales compensées en cuir ou mules fines dorées',
          accessoires: 'Chapeau de paille stylisé et solaires oversize',
          pitch: 'Fraîcheur royale et féminité affirmée pour résister à la chaleur.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'Robe trapèze légère à bretelles ou t-shirt en lin aéré',
          bas: 'Short fluide en gaze de coton ou jupe fleurie légère',
          chaussures: 'Espadrilles traditionnelles ou sandales plates nouées',
          accessoires: 'Lunettes de soleil cat-eye et sac bandoulière en raphia',
          pitch: 'L’été au naturel : respirant, éclatant et agréable à porter.',
        },
      ],
    },
  },
};

/**
 * Generate intelligent recommendation based on weather, day of week, gender and wardrobe
 */
export function buildStylistRecommendation(params: {
  weather: DayWeather;
  gender?: 'Homme' | 'Femme';
  wardrobe?: WardrobeItem[];
  variationIndex?: number;
}): StylistRecommendationResult {
  const genderKey = params.gender === 'Femme' ? 'Femme' : 'Homme';
  const thermalBracket = getThermalBracket(params.weather.tempMax, params.weather.tempMin);
  const { dayPace, defaultOccasion } = getDayPace(params.weather.date);

  const options = OUTFIT_MATRIX[genderKey][thermalBracket][defaultOccasion];
  const index = Math.abs(params.variationIndex || 0) % options.length;
  const selectedTemplate = options[index];

  const hasRain = params.weather.precipitationProbMax >= 40 || params.weather.weatherCode >= 50;
  const hasWind = params.weather.windSpeedMax >= 30;

  // Rain and wind adaptations
  let accessoires = selectedTemplate.accessoires;
  let haut = selectedTemplate.haut;
  let bas = selectedTemplate.bas;
  let chaussures = selectedTemplate.chaussures;

  if (hasRain) {
    accessoires = `${accessoires} + Parapluie compact déperlant`;
    if (!haut.toLowerCase().includes('imperméable') && !haut.toLowerCase().includes('trench')) {
      haut = `${haut} (prévoyez une veste imperméable ou trench déperlant)`;
    }
    if (chaussures.toLowerCase().includes('toile') || chaussures.toLowerCase().includes('daim')) {
      chaussures = 'Chaussures fermées étanches en cuir lisse (protection contre la pluie)';
    }
  }

  if (hasWind && !accessoires.toLowerCase().includes('écharpe')) {
    accessoires = `${accessoires} (écharpe légère coupe-vent conseillée)`;
  }

  // Cross-reference with user wardrobe if available
  const wardrobe = params.wardrobe || [];
  if (wardrobe.length > 0) {
    const matchingTop = wardrobe.find(w => w.type === 'haut');
    const matchingBottom = wardrobe.find(w => w.type === 'bas');
    if (matchingTop) {
      haut = `[Pièce de votre dressing] ${matchingTop.style} assorti à la météo (${params.weather.tempMax}°C)`;
    }
    if (matchingBottom) {
      bas = `[Pièce de votre dressing] ${matchingBottom.style} confortable`;
    }
  }

  // -------------------------------------------------------------
  // ULTRA-PERSONALIZED STYLIST ENGINE
  // Dynamic factors: Temps, thermal amplitude, rain, wind, sky,
  // day of week, gender, wardrobe and variation index
  // -------------------------------------------------------------
  const tempDiff = params.weather.tempMax - params.weather.tempMin;
  const isHighAmplitude = tempDiff >= 7;
  const isSunny = params.weather.weatherIconType === 'sun';
  const isOvercast = params.weather.weatherIconType === 'cloud' || params.weather.weatherIconType === 'cloud-sun';
  const hasRainRisk = params.weather.precipitationProbMax >= 30 || params.weather.weatherCode >= 50;
  const isVeryWindy = params.weather.windSpeedMax >= 30;
  const isHot = params.weather.tempMax >= 26;
  const isCold = params.weather.tempMax < 13 || params.weather.tempMin < 9;
  const vIdx = Math.abs(params.variationIndex || 0);
  const isWoman = params.gender === 'Femme';

  // 1. Dynamic, multi-angle stylistAdvice paragraph
  let stylistAdvice = '';
  if (isHighAmplitude) {
    stylistAdvice = `Grande amplitude thermique aujourd'hui (${tempDiff}°C d'écart entre ${params.weather.tempMin}°C ce matin et ${params.weather.tempMax}°C cet après-midi). Misez impérativement sur la superposition : une veste ou un gilet facile à retirer dès que le soleil s'installe.`;
  } else if (hasRainRisk) {
    stylistAdvice = `Météo humide avec un risque de pluie à ${params.weather.precipitationProbMax}%. Privilégiez des matières déperlantes et une palette sobre rehaussée d'une touche lumineuse pour braver le ciel maussade avec panache.`;
  } else if (isVeryWindy) {
    stylistAdvice = `Vent soutenu annoncé à ${params.weather.windSpeedMax} km/h. Choisissez des coupes bien structurées et fermées, et évitez les tissus trop volants pour rester impeccable en extérieur.`;
  } else if (isHot) {
    stylistAdvice = `Chaleur marquée (${params.weather.tempMax}°C, ressenti ${params.weather.tempApparentMax}°C). La règle d'or : matières 100% naturelles (lin, coton respirant) et coupes légèrement amples pour laisser l'air circuler sans coller.`;
  } else if (isCold) {
    stylistAdvice = `Températures fraîches (${params.weather.tempMin}°C au lever, ${params.weather.tempMax}°C au plus doux). Protégez les extrémités et misez sur des fibres isolantes (laine fine, mérinos) pour garder une silhouette élégante sans grelotter.`;
  } else {
    stylistAdvice = `Conditions particulièrement agréables à ${params.weather.tempMax}°C (${(params.weather.weatherLabel || '').toLowerCase()}). C'est le moment idéal pour mixer textures légères et pièces intemporelles avec une allure soignée.`;
  }

  // Complementary styling note (alternates with variationIndex, gender and day pace)
  const additionalNotes = isWoman
    ? [
        dayPace === 'Semaine'
          ? " En milieu professionnel, la fluidité des coupes alliée à une belle structure de veste donne une présence assurée."
          : " Pour vos sorties détente, l'équilibre entre confort souple et finitions soignées garantit une allure naturelle sans effort.",
        " Jouez sur les proportions : équilibrez un haut décontracté avec un bas plus fuselé pour allonger la silhouette.",
        " Une touche lumineuse sur les accessoires ou les bijoux réveille instantanément la carnation sous cette luminosité.",
      ]
    : [
        dayPace === 'Semaine'
          ? " Pour la journée active, l'accord des matières et une pièce maîtresse bien ajustée posent immédiatement l'élégance."
          : " Le weekend, la liberté de mouvement reste prioritaire : privilégiez des cotons texturés et des coupes confortables.",
        " Soignez les transitions : laissez dépasser un col ou un t-shirt clair pour structurer le port de tête.",
        " Rappelez la teinte de votre ceinture ou de votre montre avec vos souliers pour signer un look maîtrisé.",
      ];
  stylistAdvice += additionalNotes[vIdx % additionalNotes.length];

  // -------------------------------------------------------------
  // INTELLIGENT OUTFIT & CONTEXT ANALYSIS
  // Connect reflexes directly to the outfit pieces (haut, bas, chaussures)
  // -------------------------------------------------------------
  const hautLower = haut.toLowerCase();
  const basLower = bas.toLowerCase();
  const chaussuresLower = chaussures.toLowerCase();
  const isChicOutfit = defaultOccasion === 'Posé Chic' || 
    hautLower.includes('costume') || 
    hautLower.includes('blazer') || 
    hautLower.includes('tailleur') ||
    basLower.includes('tailleur') ||
    basLower.includes('flanelle');

  // 1. REFLEXE CHAUSSURES (100% adapté aux chaussures recommandées et au sol)
  const isDressedLeather = chaussuresLower.includes('derbie') || 
    chaussuresLower.includes('derby') || 
    chaussuresLower.includes('richelieu') || 
    chaussuresLower.includes('chelsea') || 
    chaussuresLower.includes('babies') || 
    chaussuresLower.includes('talon') || 
    chaussuresLower.includes('botte') || 
    (chaussuresLower.includes('mocassin') && isChicOutfit);

  const isSneakers = chaussuresLower.includes('basket') || 
    chaussuresLower.includes('sneaker') || 
    chaussuresLower.includes('tennis') || 
    chaussuresLower.includes('running');

  const isMocassins = chaussuresLower.includes('mocassin') || chaussuresLower.includes('loafer');

  const isBoots = chaussuresLower.includes('bottine') || 
    chaussuresLower.includes('botte') || 
    chaussuresLower.includes('boots');

  const isSummerOpen = chaussuresLower.includes('sandale') || 
    chaussuresLower.includes('espadrille') || 
    chaussuresLower.includes('mule');

  let shoesAlert = '';
  if (isDressedLeather) {
    if (hasRainRisk) {
      shoesAlert = 'Tenue habillée : cuir lisse ciré étanche (éviter daim délicat et semelles glissantes)';
    } else if (isCold) {
      shoesAlert = 'Accord chic : souliers en cuir avec chaussettes chaudes en laine fine sur sol sec';
    } else if (isHot) {
      shoesAlert = 'Élégance habillée : derbies légères ou souliers perforés avec socquettes invisibles';
    } else {
      shoesAlert = 'Accord chic : souliers en cuir ciré impeccables, parfaits sur sol sec';
    }
  } else if (isMocassins) {
    if (hasRainRisk) {
      shoesAlert = '⚠️ Sol humide : cuir lisse imperméabilisé conseillé (remplacez le daim délicat)';
    } else if (isHot) {
      shoesAlert = 'Mocassins souples respirants portés sans chaussettes visibles sur sol sec';
    } else {
      shoesAlert = 'Accord élégant : mocassins en cuir ou daim souple, parfaits sur sol sec';
    }
  } else if (isSneakers) {
    if (hasRainRisk) {
      shoesAlert = 'Sol détrempé : baskets en cuir fermées étanches (éviter toile claire et suède)';
    } else if (isHot) {
      shoesAlert = 'Baskets légères respirantes ou tennis épurées sur sol sec';
    } else {
      shoesAlert = 'Allure décontractée : sneakers soignées et propres, idéales sur sol sec';
    }
  } else if (isSummerOpen) {
    if (hasRainRisk) {
      shoesAlert = '⚠️ Risque d’averses : remplacez les espadrilles ou sandales par des chaussures fermées';
    } else {
      shoesAlert = 'Sol sec & chaleur : sandales en cuir aérées ou espadrilles légères et respirantes';
    }
  } else if (isBoots) {
    if (hasRainRisk) {
      shoesAlert = 'Bottines étanches à semelle crantée : isolation maximale contre les flaques';
    } else if (isCold) {
      shoesAlert = 'Bottines isolantes : protègent parfaitement de la fraîcheur du sol';
    } else {
      shoesAlert = 'Bottines casual en cuir : belle tenue et confort de marche sur sol sec';
    }
  } else {
    // Fallback based on occasion
    if (isChicOutfit) {
      shoesAlert = hasRainRisk
        ? 'Tenue habillée : cuir lisse imperméabilisé (éviter daim)'
        : 'Tenue habillée : souliers en cuir soigné sur sol sec';
    } else {
      shoesAlert = hasRainRisk
        ? 'Sol humide : chaussures fermées imperméables'
        : 'Sol sec : baskets ou chaussures souples adaptées';
    }
  }

  // 2. REFLEXE VESTE & COUCHES (100% coordonné avec la pièce du haut)
  const isCoat = hautLower.includes('manteau') || hautLower.includes('caban') || hautLower.includes('doudoune') || hautLower.includes('parka');
  const isJacket = hautLower.includes('blazer') || hautLower.includes('veste') || hautLower.includes('trench');
  const isOvershirtOrKnit = hautLower.includes('surchemise') || hautLower.includes('cardigan') || hautLower.includes('sweat') || hautLower.includes('hoodie');

  let layering = '';
  if (isCoat) {
    if (tempDiff >= 7) {
      layering = `Manteau + couche amovible : pièce légère dessous pour s’aérer l’après-midi (${params.weather.tempMax}°C)`;
    } else if (isCold) {
      layering = `Manteau fermé le matin (${params.weather.tempMin}°C) pour préserver la chaleur`;
    } else {
      layering = `Manteau porté ouvert : structure la silhouette sans surchauffer (${params.weather.tempMax}°C)`;
    }
  } else if (isJacket) {
    if (tempDiff >= 6) {
      layering = `Veste modulable : chemise ou top léger dessous, facile à tomber à ${params.weather.tempMax}°C`;
    } else if (hasRainRisk) {
      layering = `Veste & pluie : matière déperlante ou trench imperméable conseillé`;
    } else {
      layering = `Veste ou blazer : structure parfaite pour la journée (${params.weather.tempMax}°C)`;
    }
  } else if (isOvershirtOrKnit) {
    if (tempDiff >= 5) {
      layering = `Surchemise amovible sur t-shirt : combo idéal (matin ${params.weather.tempMin}°C ➔ après-midi ${params.weather.tempMax}°C)`;
    } else {
      layering = `Maille ou surchemise : confortable et simple à réguler selon la température`;
    }
  } else {
    // Light top (chemise, polo, t-shirt, robe)
    if (params.weather.tempMin < 17) {
      layering = `Matin frais (${params.weather.tempMin}°C) : prévoyez un gilet ou petite veste d’appoint`;
    } else {
      layering = `Couvrance légère : votre haut aéré suffit amplement (${params.weather.tempMax}°C)`;
    }
  }

  // 3. REFLEXE PARAPLUIE (coordonné avec la fragilité des matières de la tenue)
  const isDelicateFabric = hautLower.includes('laine') || 
    hautLower.includes('cachemire') || 
    hautLower.includes('soie') || 
    hautLower.includes('tweed') || 
    hautLower.includes('costume') || 
    hautLower.includes('velours') ||
    basLower.includes('tailleur') ||
    basLower.includes('flanelle');

  const needsUmbrella = hasRainRisk || (isDelicateFabric && params.weather.precipitationProbMax >= 25);
  let umbrellaText = '';
  if (isDelicateFabric) {
    if (params.weather.precipitationProbMax >= 40 || hasRainRisk) {
      umbrellaText = `Matières délicates (laine/soie) : grand parapluie indispensable (${params.weather.precipitationProbMax}% pluie)`;
    } else if (params.weather.precipitationProbMax >= 20) {
      umbrellaText = `Tenue soignée : parapluie de précaution conseillé (${params.weather.precipitationProbMax}% pluie)`;
    } else {
      umbrellaText = `Ciel sécurisé (${params.weather.precipitationProbMax}% pluie) : pas de parapluie`;
    }
  } else {
    if (params.weather.precipitationProbMax >= 60) {
      umbrellaText = `Averses certaines (${params.weather.precipitationProbMax}%) : parapluie indispensable`;
    } else if (hasRainRisk) {
      umbrellaText = `Risque d'ondées (${params.weather.precipitationProbMax}%) : parapluie conseillé`;
    } else {
      umbrellaText = `Non nécessaire (${params.weather.precipitationProbMax}% pluie) : temps sec`;
    }
  }

  // 4. REFLEXE PARFUM (harmonisé avec l'esprit de la tenue et la température)
  let fragranceNotes = '';
  if (isChicOutfit) {
    if (isCold) {
      fragranceNotes = 'Tenue habillée : notes boisées nobles (cèdre, vétiver) et vanille discrète';
    } else if (isHot) {
      fragranceNotes = 'Élégance sobre : néroli raffiné, bergamote et thé blanc';
    } else {
      fragranceNotes = 'Allure soignée : cardamome douce, iris poudré et bois clair';
    }
  } else {
    if (isCold) {
      fragranceNotes = 'Ambiance cosy : fève tonka, bois blond et épices douces';
    } else if (isHot) {
      fragranceNotes = 'Fraîcheur vive : agrumes pétillants, thé vert glacé et accents marins';
    } else {
      fragranceNotes = 'Détente moderne : lavande fraîche, cédrat et musc propre';
    }
  }

  const lifestyleReflexes: LifestyleReflexes = {
    umbrella: { needed: needsUmbrella, text: umbrellaText },
    layering,
    shoesAlert,
    fragranceNotes,
  };

  const suggestionText = `Look ${defaultOccasion} pensé pour ${(params.weather.dayName || '').toLowerCase()} (${params.weather.tempMax}°C, ${(params.weather.weatherLabel || '').toLowerCase()}) : ${selectedTemplate.pitch}`;

  return {
    outfit: {
      haut,
      bas,
      chaussures,
      accessoires,
      suggestionText,
    },
    thermalBracket,
    dayPace,
    occasion: defaultOccasion,
    stylistAdvice,
    weatherSummary: `${params.weather.tempMax}°C · ${params.weather.weatherLabel}`,
    hasRain,
    hasWind,
    lifestyleReflexes,
  };
}
