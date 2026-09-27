/**
 * Utilitaires pour le formatage et la conversion des pays sous forme de code ISO à 2 lettres (ex: US, FR, TN, etc.)
 * Utilisé notamment dans Tfarrej pour un affichage compact adapté aux petits écrans mobiles.
 */

// Instance Intl pour la résolution automatique en français des codes ISO 3166-1 alpha-2
let intlRegionNames: Intl.DisplayNames | null = null;
try {
  if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
    intlRegionNames = new Intl.DisplayNames(['fr'], { type: 'region' });
  }
} catch {
  intlRegionNames = null;
}

// Table de correspondance étendue des noms de pays (français et anglais, normalisés sans accents) vers codes ISO
const COUNTRY_NAME_TO_ISO: Record<string, string> = {
  // États-Unis
  'etats-unis': 'US',
  'etats unis': 'US',
  'etats-unis d\'amerique': 'US',
  'etats unis d\'amerique': 'US',
  'united states': 'US',
  'united states of america': 'US',
  'usa': 'US',
  'u.s.': 'US',
  'u.s.a.': 'US',
  'amerique': 'US',

  // France
  'france': 'FR',
  'republique francaise': 'FR',

  // Royaume-Uni / Angleterre
  'royaume-uni': 'GB',
  'royaume uni': 'GB',
  'united kingdom': 'GB',
  'uk': 'GB',
  'grande-bretagne': 'GB',
  'grande bretagne': 'GB',
  'great britain': 'GB',
  'angleterre': 'GB',
  'england': 'GB',
  'ecosse': 'GB',
  'scotland': 'GB',
  'pays de galles': 'GB',
  'wales': 'GB',

  // Canada
  'canada': 'CA',

  // Tunisie
  'tunisie': 'TN',
  'tunisia': 'TN',

  // Algérie
  'algerie': 'DZ',
  'algeria': 'DZ',

  // Maroc
  'maroc': 'MA',
  'morocco': 'MA',

  // Égypte
  'egypte': 'EG',
  'egypt': 'EG',

  // Italie
  'italie': 'IT',
  'italy': 'IT',
  'italia': 'IT',

  // Espagne
  'espagne': 'ES',
  'spain': 'ES',
  'espana': 'ES',

  // Allemagne
  'allemagne': 'DE',
  'germany': 'DE',
  'deutschland': 'DE',

  // Japon
  'japon': 'JP',
  'japan': 'JP',
  'nippon': 'JP',

  // Corée du Sud
  'coree du sud': 'KR',
  'coree-du-sud': 'KR',
  'south korea': 'KR',
  'korea': 'KR',
  'coree': 'KR',
  'republic of korea': 'KR',

  // Corée du Nord
  'coree du nord': 'KP',
  'north korea': 'KP',

  // Chine
  'chine': 'CN',
  'china': 'CN',

  // Hong Kong
  'hong kong': 'HK',
  'hong-kong': 'HK',

  // Taïwan
  'taiwan': 'TW',

  // Inde
  'inde': 'IN',
  'india': 'IN',

  // Australie
  'australie': 'AU',
  'australia': 'AU',

  // Nouvelle-Zélande
  'nouvelle-zelande': 'NZ',
  'nouvelle zelande': 'NZ',
  'new zealand': 'NZ',

  // Brésil
  'bresil': 'BR',
  'brazil': 'BR',

  // Mexique
  'mexique': 'MX',
  'mexico': 'MX',

  // Argentine
  'argentine': 'AR',
  'argentina': 'AR',

  // Chili
  'chili': 'CL',
  'chile': 'CL',

  // Colombie
  'colombie': 'CO',
  'colombia': 'CO',

  // Pérou
  'perou': 'PE',
  'peru': 'PE',

  // Belgique
  'belgique': 'BE',
  'belgium': 'BE',

  // Suisse
  'suisse': 'CH',
  'switzerland': 'CH',

  // Pays-Bas
  'pays-bas': 'NL',
  'pays bas': 'NL',
  'netherlands': 'NL',
  'hollande': 'NL',
  'holland': 'NL',

  // Suède
  'suede': 'SE',
  'sweden': 'SE',

  // Norvège
  'norvege': 'NO',
  'norway': 'NO',

  // Danemark
  'danemark': 'DK',
  'denmark': 'DK',

  // Finlande
  'finlande': 'FI',
  'finland': 'FI',

  // Islande
  'islande': 'IS',
  'iceland': 'IS',

  // Irlande
  'irlande': 'IE',
  'ireland': 'IE',

  // Pologne
  'pologne': 'PL',
  'poland': 'PL',

  // Portugal
  'portugal': 'PT',

  // Grèce
  'grece': 'GR',
  'greece': 'GR',

  // Turquie
  'turquie': 'TR',
  'turkey': 'TR',
  'turkiye': 'TR',

  // Russie
  'russie': 'RU',
  'russia': 'RU',
  'federation de russie': 'RU',

  // Ukraine
  'ukraine': 'UA',

  // Autriche
  'autriche': 'AT',
  'austria': 'AT',

  // République Tchèque
  'republique tcheque': 'CZ',
  'tchequie': 'CZ',
  'czech republic': 'CZ',
  'czechia': 'CZ',

  // Hongrie
  'hongrie': 'HU',
  'hungary': 'HU',

  // Roumanie
  'roumanie': 'RO',
  'romania': 'RO',

  // Bulgarie
  'bulgarie': 'BG',
  'bulgaria': 'BG',

  // Croatie
  'croatie': 'HR',
  'croatia': 'HR',

  // Serbie
  'serbie': 'RS',
  'serbia': 'RS',

  // Slovaquie
  'slovaquie': 'SK',
  'slovakia': 'SK',

  // Slovénie
  'slovenie': 'SI',
  'slovenia': 'SI',

  // Afrique du Sud
  'afrique du sud': 'ZA',
  'south africa': 'ZA',

  // Arabie Saoudite
  'arabie saoudite': 'SA',
  'saudi arabia': 'SA',

  // Émirats Arabes Unis
  'emirats arabes unis': 'AE',
  'united arab emirates': 'AE',
  'uae': 'AE',

  // Qatar
  'qatar': 'QA',

  // Koweït
  'koweit': 'KW',
  'kuwait': 'KW',

  // Liban
  'liban': 'LB',
  'lebanon': 'LB',

  // Jordanie
  'jordanie': 'JO',
  'jordan': 'JO',

  // Palestine
  'palestine': 'PS',

  // Syrie
  'syrie': 'SY',
  'syria': 'SY',

  // Irak
  'irak': 'IQ',
  'iraq': 'IQ',

  // Iran
  'iran': 'IR',

  // Israël
  'israel': 'IL',

  // Thaïlande
  'thailande': 'TH',
  'thailand': 'TH',

  // Indonésie
  'indonesie': 'ID',
  'indonesia': 'ID',

  // Philippines
  'philippines': 'PH',

  // Vietnam
  'vietnam': 'VN',
  'viet nam': 'VN',

  // Malaisie
  'malaisie': 'MY',
  'malaysia': 'MY',

  // Singapour
  'singapour': 'SG',
  'singapore': 'SG',

  // Nigéria
  'nigeria': 'NG',

  // Sénégal
  'senegal': 'SN',

  // Côte d'Ivoire
  'cote d\'ivoire': 'CI',
  'ivory coast': 'CI',

  // Cameroun
  'cameroun': 'CM',
  'cameroon': 'CM',

  // Ghana
  'ghana': 'GH',

  // Kenya
  'kenya': 'KE',

  // Luxembourg
  'luxembourg': 'LU',

  // Monaco
  'monaco': 'MC',

  // Uruguay
  'uruguay': 'UY',

  // Venezuela
  'venezuela': 'VE',

  // Cuba
  'cuba': 'CU',

  // Pakistan
  'pakistan': 'PK',

  // Bangladesh
  'bangladesh': 'BD',
};

// Fallback de noms en français pour les codes les plus courants si Intl indisponible
const ISO_TO_FRENCH_FALLBACK: Record<string, string> = {
  US: 'États-Unis',
  FR: 'France',
  GB: 'Royaume-Uni',
  CA: 'Canada',
  TN: 'Tunisie',
  DZ: 'Algérie',
  MA: 'Maroc',
  EG: 'Égypte',
  IT: 'Italie',
  ES: 'Espagne',
  DE: 'Allemagne',
  JP: 'Japon',
  KR: 'Corée du Sud',
  CN: 'Chine',
  HK: 'Hong Kong',
  TW: 'Taïwan',
  IN: 'Inde',
  AU: 'Australie',
  NZ: 'Nouvelle-Zélande',
  BR: 'Brésil',
  MX: 'Mexique',
  AR: 'Argentine',
  CL: 'Chili',
  CO: 'Colombie',
  BE: 'Belgique',
  CH: 'Suisse',
  NL: 'Pays-Bas',
  SE: 'Suède',
  NO: 'Norvège',
  DK: 'Danemark',
  FI: 'Finlande',
  IE: 'Irlande',
  PL: 'Pologne',
  PT: 'Portugal',
  GR: 'Grèce',
  TR: 'Turquie',
  RU: 'Russie',
  UA: 'Ukraine',
  AT: 'Autriche',
  CZ: 'République Tchèque',
  ZA: 'Afrique du Sud',
  SA: 'Arabie Saoudite',
  AE: 'Émirats Arabes Unis',
  LB: 'Liban',
  TH: 'Thaïlande',
  ID: 'Indonésie',
  VN: 'Vietnam',
  NG: 'Nigéria',
  SN: 'Sénégal',
};

/**
 * Normalise une chaîne de caractères en supprimant les accents et la ponctuation superflue.
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Convertit un libellé de pays ou un nom complet en code ISO 3166-1 alpha-2 à 2 lettres majuscules (ex: US, FR, TN, etc.)
 * Retourne une chaîne vide si le pays est inconnu ou non renseigné.
 */
export function formatCountryCode(country?: string | null): string {
  if (!country || typeof country !== 'string') return '';

  const raw = country.trim();
  if (!raw) return '';

  // Filtrer les valeurs signifiant "Inconnu"
  const rawLower = raw.toLowerCase();
  if (
    rawLower === 'inconnu' ||
    rawLower === 'unknown' ||
    rawLower === 'n/a' ||
    rawLower === 'none' ||
    rawLower === 'null' ||
    rawLower === 'undefined'
  ) {
    return '';
  }

  // Si plusieurs pays sont spécifiés (ex: "United States, United Kingdom" ou "US / FR"), on prend le pays principal (le premier)
  const primaryCountry = raw.split(/[,/|]/)[0].trim();

  // 1. Déjà un code ISO à 2 lettres (ex: "US", "FR", "tn")
  if (/^[a-zA-Z]{2}$/.test(primaryCountry)) {
    return primaryCountry.toUpperCase();
  }

  // 2. Acronyme connu à 3 lettres
  const upper = primaryCountry.toUpperCase();
  if (upper === 'USA') return 'US';
  if (upper === 'UAE') return 'AE';
  if (upper === 'UK') return 'GB';

  // 3. Recherche dans le dictionnaire normalisé (sans accents)
  const normalized = normalizeString(primaryCountry);
  if (COUNTRY_NAME_TO_ISO[normalized]) {
    return COUNTRY_NAME_TO_ISO[normalized];
  }

  // 4. Recherche par inclusion si le nom complet contient un nom connu (ex: "United States of America")
  for (const [key, code] of Object.entries(COUNTRY_NAME_TO_ISO)) {
    if (normalized.includes(key)) {
      return code;
    }
  }

  // 5. Si 2 ou 3 lettres majuscules non reconnues, conserver les 2 premières en majuscule
  if (primaryCountry.length <= 3 && /^[a-zA-Z]+$/.test(primaryCountry)) {
    return primaryCountry.substring(0, 2).toUpperCase();
  }

  // Aucun code trouvé
  return '';
}

/**
 * Renvoie le nom complet en français du pays pour une info-bulle (tooltip)
 * à partir de son code ISO ou de son nom original.
 */
export function getCountryFullName(codeOrName?: string | null): string {
  if (!codeOrName || typeof codeOrName !== 'string') return '';
  const trimmed = codeOrName.trim();
  if (!trimmed) return '';

  const code = formatCountryCode(trimmed);
  if (!code) {
    return trimmed;
  }

  // Essayer avec Intl.DisplayNames en français
  if (intlRegionNames) {
    try {
      const displayName = intlRegionNames.of(code);
      if (displayName) return displayName;
    } catch {
      // ignore
    }
  }

  // Fallback sur le dictionnaire
  if (ISO_TO_FRENCH_FALLBACK[code]) {
    return ISO_TO_FRENCH_FALLBACK[code];
  }

  // Si l'entrée d'origine avait plus de 2 lettres et n'était pas 'Inconnu', la retourner
  if (trimmed.length > 2 && trimmed.toLowerCase() !== 'inconnu') {
    return trimmed;
  }

  return code;
}
