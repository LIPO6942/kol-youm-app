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

export interface ColorSwatch {
  name: string;
  hex: string;
}

export interface PackshotItem {
  type: 'haut' | 'bas' | 'chaussures' | 'accessoires';
  label: string;
  query: string;
}

export interface StylistRecommendationResult {
  outfit: SuggestOutfitOutput;
  alternativeOutfit: SuggestOutfitOutput;
  packshots: PackshotItem[];
  colorPalette: ColorSwatch[];
  alternativeLabel: string;
  signatureQuote: string;
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
          haut: 'Manteau en laine structuré camel sur pull col roulé en mérinos écru',
          bas: 'Pantalon en flanelle gris anthracite bien coupé',
          chaussures: 'Bottines chelsea en cuir lisse noir ciré',
          accessoires: 'Écharpe douce en cachemire marine',
          pitch: 'Une élégance statutaire pour braver le froid avec prestance.',
        },
        {
          haut: 'Caban en laine marine sur chemise oxford bleu clair et cardigan boutonné en maille',
          bas: 'Pantalon chino épais beige foncé ajusté',
          chaussures: 'Derbies en cuir marron foncé semelle commando',
          accessoires: 'Gants en cuir souple marron doublés',
          pitch: 'L’accord parfait entre chaleur enveloppante et distinction professionnelle.',
        },
        {
          haut: 'Manteau droit anthracite sur pull fin col rond bordeaux et col chemise',
          bas: 'Pantalon tailleur chaud marine en drap de laine',
          chaussures: 'Bottines chelsea en cuir marron ciré',
          accessoires: 'Montre sobre en cuir noir avec cadran épuré',
          pitch: 'Contraste raffiné et silhouette structurée taillée pour l\'hiver actif.',
        },
        {
          haut: 'Parka de ville ceinturée marine sur blazer en laine et pull col cheminée',
          bas: 'Pantalon chino gris perle en flanelle douce',
          chaussures: 'Derbies habillées en cuir lisse bordeaux',
          accessoires: 'Sacoche en cuir soigné ou porte-documents',
          pitch: 'Confort thermique moderne et allure d\'affaires impeccable.',
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
        {
          haut: 'Blouson aviateur doublé sherpa sur pull en maille torsadée',
          bas: 'Jean brut délavé coupe droite',
          chaussures: 'Boots montantes en cuir nubuck',
          accessoires: 'Écharpe en laine côtelée',
          pitch: 'Esprit baroudeur urbain chaleureux pour le plein air.',
        },
      ],
    },
    Frais: {
      'Posé Chic': [
        {
          haut: 'Trench-coat mi-saison beige sur pull col rond fin en mérinos marine',
          bas: 'Pantalon chino ajusté beige sable',
          chaussures: 'Mocassins en daim noisette',
          accessoires: 'Écharpe légère en gaze de coton marine',
          pitch: 'Le parfait équilibre du layering pour la mi-saison : facile à adapter entre matin et après-midi.',
        },
        {
          haut: 'Blazer droit structuré en maille sur chemise habillée col boutonné bleu clair',
          bas: 'Pantalon en toile gabardine bleu marine',
          chaussures: 'Derbies en cuir ciré marron',
          accessoires: 'Ceinture en cuir surpiqué assortie aux souliers',
          pitch: 'Une allure travaillée et soignée, pensée pour les rendez-vous professionnels.',
        },
        {
          haut: 'Surchemise texturée en flanelle fine olive sur t-shirt col rond écru en coton épais',
          bas: 'Pantalon chino ajusté gris anthracite',
          chaussures: 'Mocassins penny loafers en daim chocolat',
          accessoires: 'Sacoche bandoulière en cuir souple',
          pitch: 'Nuances automnales subtiles et confort posé pour les journées dynamiques.',
        },
        {
          haut: 'Veste légère mi-saison marine sur pull col V fin en coton-cachemire gris',
          bas: 'Pantalon chino beige mastic ou écru',
          chaussures: 'Derbies habillées en cuir cognac',
          accessoires: 'Montre sobre en cuir avec boîtier fin',
          pitch: 'Équilibre classique intemporel et clarté des tons pour une présence nette.',
        },
        {
          haut: 'Cardigan boutonné en maille milano sur chemise blanche en popeline',
          bas: 'Pantalon tailleur souple à pinces marine',
          chaussures: 'Mocassins en cuir lisse chocolat',
          accessoires: 'Ceinture en cuir tressé soignée',
          pitch: 'Sophistication discrète et souplesse de mouvement tout au long de la journée.',
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
        {
          haut: 'Veste de travail en denim brut sur pull marin à rayures',
          bas: 'Pantalon chino décontracté camel',
          chaussures: 'Baskets basses rétro en cuir',
          accessoires: 'Bonnet fin en coton doux',
          pitch: 'Allure casual authentique et décontractée pour le weekend.',
        },
      ],
    },
    Doux: {
      'Posé Chic': [
        {
          haut: 'Chemise blanche en popeline col italien soigné manches légèrement retroussées',
          bas: 'Pantalon chino ajusté bleu marine',
          chaussures: 'Mocassins en cuir souple marron cognac',
          accessoires: 'Montre sobre en cuir avec détails soignés',
          pitch: 'L’élégance méditerranéenne intemporelle : netteté du blanc, chino marine et souliers en cuir.',
        },
        {
          haut: 'Polo ajusté bleu marine en piqué de coton mercerisé col boutonné',
          bas: 'Pantalon chino beige sable bien coupé',
          chaussures: 'Mocassins penny loafers en daim noisette',
          accessoires: 'Ceinture en cuir surpiqué marron assortie',
          pitch: 'Allure posée et moderne : polo marine structuré, chino sable et mocassins en daim.',
        },
        {
          haut: 'Surchemise casual chic texturée écru ou olive sur t-shirt clair respirant',
          bas: 'Pantalon chino ajusté gris anthracite',
          chaussures: 'Derbies en cuir ciré marron foncé',
          accessoires: 'Sacoche en cuir soigné ou besace urbaine',
          pitch: 'Une allure posée contemporaine qui mixe textures fluides et souliers de caractère.',
        },
        {
          haut: 'Chemise bleu ciel en lin et coton col ouvert',
          bas: 'Pantalon chino ajusté beige clair ou écru',
          chaussures: 'Mocassins en cuir marron glacé',
          accessoires: 'Lunettes solaires au design soigné',
          pitch: 'Luminosité naturelle et distinction décontractée par temps doux et clair.',
        },
        {
          haut: 'Pull fin col rond en fil d\'Écosse terracotta ou marine sur col chemise',
          bas: 'Pantalon chino bleu nuit coupe droite ajustée',
          chaussures: 'Derbies habillées en cuir bordeaux ou cognac',
          accessoires: 'Ceinture en cuir tressé de belle facture',
          pitch: 'Richesse des nuances chaudes et prestance assurée du matin au soir.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'Polo bleu marine ou chemise en lin blanc décontractée',
          bas: 'Pantalon chino beige sable ou jean clair coupe droite',
          chaussures: 'Baskets blanches en cuir ou toile soignée',
          accessoires: 'Casquette sobre et lunettes de soleil',
          pitch: 'Légèreté et fraîcheur casual pour une journée détendue.',
        },
        {
          haut: 'Polo en piqué de coton ou t-shirt col rond avec chemise ouverte en lin',
          bas: 'Bermuda chic en toile ou jean léger en denim clair',
          chaussures: 'Baskets basses en toile ou espadrilles modernisées',
          accessoires: 'Casquette et lunettes de soleil',
          pitch: 'La décontraction absolue sous un temps agréable et ensoleillé.',
        },
        {
          haut: 'T-shirt rayé marin en coton lourd avec surchemise légère en chambray',
          bas: 'Pantalon chino beige décontracté',
          chaussures: 'Sneakers blanches minimalistes',
          accessoires: 'Lunettes solaires sport chic',
          pitch: 'Allure fraîche et intemporelle pour profiter du grand air.',
        },
      ],
    },
    Chaud: {
      'Posé Chic': [
        {
          haut: 'Chemise en lin blanc respirant col ouvert manches retroussées',
          bas: 'Pantalon chino bleu marine en toile ultra-légère',
          chaussures: 'Mocassins légers en cuir souple marron',
          accessoires: 'Montre estivale en cuir fin',
          pitch: 'L’accord parfait entre fraîcheur estivale et distinction naturelle posée.',
        },
        {
          haut: 'Polo respirant crème ou sable en maille piquée aérée',
          bas: 'Pantalon chino beige clair en toile fine',
          chaussures: 'Mocassins penny loafers en daim noisette',
          accessoires: 'Ceinture en cuir tressé estivale',
          pitch: 'L’élégance sobre ton sur ton : légèreté du lin et souliers en daim aérés.',
        },
        {
          haut: 'Chemise en chambray bleu azur col mao ou boutonné fluide',
          bas: 'Pantalon chino blanc cassé en coton léger',
          chaussures: 'Mocassins légers en cuir perforé respirant',
          accessoires: 'Lunettes solaires avec verres polarisés',
          pitch: 'Clarté estivale éclatante et coupe claire pour affronter la chaleur avec panache.',
        },
        {
          haut: 'Polo marine respirant col classique fin',
          bas: 'Pantalon chino fluide gris perle ultra-léger',
          chaussures: 'Derbies légères en cuir souple déstructuré',
          accessoires: 'Sacoche légère en cuir naturel',
          pitch: 'Sobriété élégante et confort thermique sans compromis sur l\'allure posée.',
        },
      ],
      'Décontracté / Sport': [
        {
          haut: 'Polo léger ou t-shirt en coton aéré de belle facture',
          bas: 'Bermuda chino soigné beige ou short en toile marine',
          chaussures: 'Baskets blanches en toile respirante ou sandales en cuir',
          accessoires: 'Lunettes UV400 et casquette respirante',
          pitch: 'Confort thermique et silhouette soignée pour affronter la chaleur.',
        },
        {
          haut: 'T-shirt respirant en coton bio léger ou débardeur structuré',
          bas: 'Bermuda en lin décontracté ou short de bain urbain',
          chaussures: 'Sandales en cuir ou sneakers ultra-légères perforées',
          accessoires: 'Lunettes UV400 et casquette respirante',
          pitch: 'Fraîcheur, légèreté et style pour profiter du grand soleil.',
        },
        {
          haut: 'Chemise en lin délavée manches courtes col cubain',
          bas: 'Bermuda chino fluide vert sauge',
          chaussures: 'Espadrilles traditionnelles soignées',
          accessoires: 'Lunettes solaires et chapeau panama',
          pitch: 'Esprit riviera ensoleillé et décontraction estivale chic.',
        },
      ],
    },
  },
  Femme: {
    Froid: {
      'Posé Chic': [
        {
          haut: 'Manteau long ceinturé en laine mélangée camel sur pull col roulé doux en cachemire écru',
          bas: 'Pantalon tailleur à pinces en drap de laine anthracite',
          chaussures: 'Bottines à talon bloc en cuir lisse noir',
          accessoires: 'Écharpe plaid moelleuse en maille cachemire',
          pitch: 'Silhouette longiligne et chaleureuse pour un look impeccable par temps froid.',
        },
        {
          haut: 'Veste blazer oversize en tweed sur blouse en soie et sous-pull fin',
          bas: 'Pantalon palazzo chaud en velours côtelé marine',
          chaussures: 'Bottines chelsea en cuir lisse soigné',
          accessoires: 'Sac en cuir structuré porté main',
          pitch: 'Le raffinement du velours et du tweed adapté aux journées les plus fraîches.',
        },
        {
          haut: 'Manteau droit en drap de laine marine sur pull col montant terracotta',
          bas: 'Pantalon tailleur droit ceinturé beige foncé',
          chaussures: 'Bottines habillées en cuir bordeaux',
          accessoires: 'Gants en cuir souple doublés soie',
          pitch: 'Harmonie des tons d\'hiver et coupe tailleur d\'une élégance impeccable.',
        },
        {
          haut: 'Caban long en laine écru sur pull en mérinos fin gris chiné',
          bas: 'Pantalon droit en drap de laine noir',
          chaussures: 'Bottines chelsea en cuir noir ciré',
          accessoires: 'Sac bandoulière en cuir grainé',
          pitch: 'Épure graphique et confort isolant pour traverser la journée avec assurance.',
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
        {
          haut: 'Parka doublée sherpa sur pull col camionneur en maille épaisse',
          bas: 'Jean droit confortable brut',
          chaussures: 'Boots montantes casual à lacets',
          accessoires: 'Écharpe enveloppante en laine',
          pitch: 'Protection et décontraction pour les promenades vivifiantes.',
        },
      ],
    },
    Frais: {
      'Posé Chic': [
        {
          haut: 'Trench-coat fluide mi-long sur chemisier en crêpe blanc et gilet fin',
          bas: 'Pantalon carotte ceinturé beige ou jupe midi fluide',
          chaussures: 'Mocassins vernis à mors doré',
          accessoires: 'Foulard soyeux autour du cou',
          pitch: 'L’archétype de la parisienne chic : superposition fluide adaptée aux 15°C.',
        },
        {
          haut: 'Blazer droit moderne sur pull col bateau en coton soyeux marine',
          bas: 'Pantalon droit fluide habillé 7/8ème',
          chaussures: 'Babies à talon modéré en cuir',
          accessoires: 'Sac à main structuré en cuir',
          pitch: 'Une élégance posée et moderne, parfaite du bureau au café.',
        },
        {
          haut: 'Veste ceinturée en maille milano sur chemisier col lavallière',
          bas: 'Pantalon palazzo souple gris chiné',
          chaussures: 'Mocassins élégants en daim chocolat',
          accessoires: 'Montre sobre en cuir avec boîtier doré',
          pitch: 'Lignes fluides et maintien parfait pour une présence raffinée.',
        },
        {
          haut: 'Surchemise habillée ceinturée en laine fine sur top écru',
          bas: 'Pantalon cigarette bleu marine',
          chaussures: 'Derbies habillées en cuir verni',
          accessoires: 'Ceinture en cuir fine assortie',
          pitch: 'Allure architecturée et masculine-féminine parfaitement dosée.',
        },
        {
          haut: 'Pull col cheminée fin en cachemire noisette sur veste de tailleur souple',
          bas: 'Pantalon droit blanc cassé en toile dense',
          chaussures: 'Bottines mi-saison en cuir souple',
          accessoires: 'Sac bandoulière en cuir camel',
          pitch: 'Douceur des teintes naturelles et chic intemporel pour la mi-saison.',
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
        {
          haut: 'Cardigan oversize en maille moelleuse sur débardeur blanc',
          bas: 'Jean flare décontracté',
          chaussures: 'Baskets rétro basses en suède',
          accessoires: 'Sac besace souple',
          pitch: 'Confort bohème chic et décontraction souple pour le weekend.',
        },
      ],
    },
    Doux: {
      'Posé Chic': [
        {
          haut: 'Chemisier blanc fluide en popeline de coton col V soigné',
          bas: 'Pantalon chino ajusté marine avec ceinture fine',
          chaussures: 'Mocassins souples en cuir cognac',
          accessoires: 'Montre fine en cuir avec cadran sobre',
          pitch: 'Élégance méditerranéenne lumineuse : la netteté du chemisier blanc et le raffinement des mocassins.',
        },
        {
          haut: 'Blouse fluide terracotta ou beige sable avec col délicat',
          bas: 'Pantalon carotte blanc cassé ou pantalon habillé fluide',
          chaussures: 'Mocassins élégants en daim noisette',
          accessoires: 'Sac en cuir élégant porté épaule',
          pitch: 'Allure douce, posée et soignée : teintes chaleureuses et souliers en cuir.',
        },
        {
          haut: 'Blazer léger en lin mélangé bleu pastel sur top en soie écru',
          bas: 'Pantalon tailleur fluide 7/8ème marine',
          chaussures: 'Derbies habillées en cuir ciré',
          accessoires: 'Ceinture en cuir fine à boucle dorée',
          pitch: 'Contraste subtil pastel et marine pour une allure de travail éclatante.',
        },
        {
          haut: 'Chemisier en crêpe de soie vert sauge col classique',
          bas: 'Pantalon fluide beige sable bien coupé',
          chaussures: 'Mocassins souples en cuir bordeaux',
          accessoires: 'Lunettes solaires élégantes',
          pitch: 'Fraîcheur des nuances végétales et confort souverain sous une météo clémente.',
        },
        {
          haut: 'Top en maille milano fine marine avec col bijou discret',
          bas: 'Pantalon droit à pinces écru ou camel clair',
          chaussures: 'Babies en cuir lisse à petit talon carré',
          accessoires: 'Sac cabas en cuir souple',
          pitch: 'Chic minimaliste et silhouette élancée parée pour les beaux jours.',
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
        {
          haut: 'Blouse légère en lin et gilet fin',
          bas: 'Pantalon chino beige ou short fluide ceinturé',
          chaussures: 'Sneakers blanches ou espadrilles',
          accessoires: 'Lunettes de soleil et tote bag',
          pitch: 'Style décontracté et naturel sous une météo agréable.',
        },
        {
          haut: 'Top marinière col bateau en coton doux',
          bas: 'Pantalon chino blanc décontracté',
          chaussures: 'Tennis rétro en toile',
          accessoires: 'Sac en toile et lunettes solaires',
          pitch: 'Esprit balnéaire et simplicité élégante sous le soleil.',
        },
      ],
    },
    Chaud: {
      'Posé Chic': [
        {
          haut: 'Robe chemise ceinturée en lin blanc ou top sans manches en soie sur pantalon palazzo',
          bas: 'Pantalon large palazzo fluide ultra-léger en lin écru',
          chaussures: 'Mocassins légers en cuir perforé ou sandales habillées en cuir',
          accessoires: 'Chapeau de paille stylisé et sac structuré en cuir',
          pitch: 'Fraîcheur royale et féminité affirmée pour résister à la chaleur tout en restant posée.',
        },
        {
          haut: 'Top fluide en satin beige ou blouse sans manches marine',
          bas: 'Jupe midi portefeuille fluide ou pantalon en gaze de coton',
          chaussures: 'Sandales habillées en cuir ou babies légères en cuir',
          accessoires: 'Sac en cuir naturel et montre fine',
          pitch: 'Alternative estivale légère et raffinée, idéale pour les journées très ensoleillées.',
        },
        {
          haut: 'Chemisier sans manches en lin bleu ciel avec boutons nacrés',
          bas: 'Pantalon chino léger blanc pur',
          chaussures: 'Mocassins souples en cuir perforé respirant',
          accessoires: 'Lunettes solaires oversize',
          pitch: 'Pureté immaculée et respirabilité totale pour braver les températures élevées.',
        },
        {
          haut: 'Blouse en voile de coton terracotta sur pantalon fluide',
          bas: 'Pantalon palazzo ultra-fluide sable',
          chaussures: 'Sandales habillées en cuir cognac',
          accessoires: 'Sac en cuir naturel tressé',
          pitch: 'Élégance solaire et légèreté aérienne au cœur de l\'été.',
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
        {
          haut: 'Débardeur col carré en coton côtelé',
          bas: 'Bermuda chic en lin ou jupe boutonnée',
          chaussures: 'Sandales ouvertes en cuir ou sneakers en toile respirante',
          accessoires: 'Casquette en toile et lunettes solaires',
          pitch: 'Décontraction fraîche et dynamique pour profiter du grand air.',
        },
        {
          haut: 'Robe fluide à fines bretelles motif floral discret',
          bas: 'Robe complète fluide légère',
          chaussures: 'Sandales plates en cuir naturel',
          accessoires: 'Sac panier en osier et solaires',
          pitch: 'Légèreté absolue et féminité estivale pour les journées de forte chaleur.',
        },
      ],
    },
  },
};

function extractPackshot(itemDesc: string, type: 'haut' | 'bas' | 'chaussures' | 'accessoires'): PackshotItem {
  const lower = itemDesc.toLowerCase();
  if (type === 'haut') {
    if (lower.includes('chemise') && (lower.includes('blanc') || lower.includes('blanche'))) {
      return { type: 'haut', label: 'Chemise blanche', query: 'white crisp button-down dress shirt folded' };
    }
    if (lower.includes('chemise') && (lower.includes('bleu') || lower.includes('ciel') || lower.includes('chambray') || lower.includes('azur'))) {
      return { type: 'haut', label: 'Chemise bleu ciel', query: 'light blue button-down shirt folded' };
    }
    if (lower.includes('chemise') && (lower.includes('lin') || lower.includes('fluide'))) {
      return { type: 'haut', label: 'Chemise en lin', query: 'linen button-down shirt folded' };
    }
    if (lower.includes('chemise')) {
      return { type: 'haut', label: 'Chemise habillée', query: 'tailored button-down dress shirt folded' };
    }
    if (lower.includes('polo') && (lower.includes('marine') || lower.includes('bleu'))) {
      return { type: 'haut', label: 'Polo bleu marine', query: 'navy blue polo shirt folded' };
    }
    if (lower.includes('polo') && (lower.includes('crème') || lower.includes('blanc') || lower.includes('sable') || lower.includes('écru'))) {
      return { type: 'haut', label: 'Polo crème sable', query: 'cream white polo shirt folded' };
    }
    if (lower.includes('polo')) {
      return { type: 'haut', label: 'Polo en piqué', query: 'classic polo shirt folded' };
    }
    if (lower.includes('surchemise')) {
      return { type: 'haut', label: 'Surchemise texturée', query: 'structured overshirt jacket folded' };
    }
    if (lower.includes('blazer') || lower.includes('veste')) {
      return { type: 'haut', label: 'Blazer tailleur', query: 'tailored blazer jacket flat lay' };
    }
    if (lower.includes('pull') && (lower.includes('roulé') || lower.includes('cheminée') || lower.includes('montant'))) {
      return { type: 'haut', label: 'Pull col montant', query: 'merino turtleneck sweater folded' };
    }
    if (lower.includes('pull') || lower.includes('maille') || lower.includes('cardigan')) {
      return { type: 'haut', label: 'Pull en maille fine', query: 'fine knit crewneck sweater folded' };
    }
    if (lower.includes('blouse') || lower.includes('chemisier')) {
      return { type: 'haut', label: 'Blouse soyeuse', query: 'silk blouse folded' };
    }
    if (lower.includes('trench')) {
      return { type: 'haut', label: 'Trench-coat', query: 'classic trench coat flat lay' };
    }
    if (lower.includes('manteau') || lower.includes('caban')) {
      return { type: 'haut', label: 'Manteau structuré', query: 'wool coat flat lay' };
    }
    if (lower.includes('doudoune') || lower.includes('parka')) {
      return { type: 'haut', label: 'Parka de ville', query: 'warm winter parka flat lay' };
    }
    return { type: 'haut', label: 'Haut de saison', query: `${itemDesc.split(',')[0].slice(0, 30)} flat lay` };
  }

  if (type === 'bas') {
    if (lower.includes('marine') || lower.includes('bleu marine') || lower.includes('bleu nuit')) {
      return { type: 'bas', label: 'Chino bleu marine', query: 'navy blue tailored chino trousers folded' };
    }
    if (lower.includes('beige') || lower.includes('sable') || lower.includes('mastic')) {
      return { type: 'bas', label: 'Chino beige sable', query: 'sand beige chino trousers folded' };
    }
    if (lower.includes('gris') || lower.includes('anthracite') || lower.includes('flanelle')) {
      return { type: 'bas', label: 'Pantalon gris', query: 'charcoal grey trousers folded' };
    }
    if (lower.includes('olive') || lower.includes('kaki')) {
      return { type: 'bas', label: 'Chino olive', query: 'olive green tailored chino trousers folded' };
    }
    if (lower.includes('blanc') || lower.includes('écru') || lower.includes('cassé')) {
      return { type: 'bas', label: 'Pantalon écru', query: 'off-white tailored trousers folded' };
    }
    if (lower.includes('palazzo') || lower.includes('large')) {
      return { type: 'bas', label: 'Pantalon fluide', query: 'fluid wide leg trousers folded' };
    }
    if (lower.includes('jupe')) {
      return { type: 'bas', label: 'Jupe fluide', query: 'elegant midi skirt folded' };
    }
    if (lower.includes('jean') || lower.includes('denim')) {
      return { type: 'bas', label: 'Jean brut soigné', query: 'dark blue denim jeans folded' };
    }
    return { type: 'bas', label: 'Pantalon chino', query: 'tailored chino pants folded' };
  }

  if (type === 'chaussures') {
    if (lower.includes('mocassin') && (lower.includes('daim') || lower.includes('suède') || lower.includes('noisette') || lower.includes('chocolat'))) {
      return { type: 'chaussures', label: 'Mocassins en daim', query: 'classic suede loafer shoes side view studio' };
    }
    if (lower.includes('mocassin')) {
      return { type: 'chaussures', label: 'Mocassins en cuir', query: 'classic brown leather loafer shoes side view studio' };
    }
    if (lower.includes('derbie') || lower.includes('derby') || lower.includes('soulier') || lower.includes('richelieu')) {
      return { type: 'chaussures', label: 'Derbies habillées', query: 'classic leather derby shoes side view studio' };
    }
    if (lower.includes('bottine') || lower.includes('chelsea') || lower.includes('botte')) {
      return { type: 'chaussures', label: 'Bottines chelsea', query: 'leather chelsea boots side view studio' };
    }
    if (lower.includes('babies') || lower.includes('talon')) {
      return { type: 'chaussures', label: 'Souliers habillés', query: 'classic leather dress shoes side view studio' };
    }
    if (lower.includes('mule')) {
      return { type: 'chaussures', label: 'Mules en cuir', query: 'leather mules dress shoes side view studio' };
    }
    if (lower.includes('sandale')) {
      return { type: 'chaussures', label: 'Sandales en cuir', query: 'elegant leather sandals side view studio' };
    }
    if (lower.includes('blanc') || lower.includes('blanche') || lower.includes('basket') || lower.includes('sneaker') || lower.includes('tennis')) {
      return { type: 'chaussures', label: 'Baskets blanches', query: 'clean minimalist white leather sneakers side view' };
    }
    return { type: 'chaussures', label: 'Souliers en cuir', query: 'classic leather dress shoes side view studio' };
  }

  // Accessoires : détection par priorité sémantique claire
  if (lower.includes('sac') || lower.includes('porte-document') || lower.includes('pochette') || lower.includes('cabas') || lower.includes('besace') || lower.includes('sacoche')) {
    return { type: 'accessoires', label: 'Sac en cuir soigné', query: 'stylish structured leather bag isolated white background studio' };
  }
  if (lower.includes('ceinture')) {
    return { type: 'accessoires', label: 'Ceinture en cuir', query: 'classic brown leather belt isolated white background studio' };
  }
  if (lower.includes('écharpe') || lower.includes('foulard') || lower.includes('cachemire')) {
    return { type: 'accessoires', label: 'Écharpe élégante', query: 'fine folded cashmere scarf isolated white background studio' };
  }
  if (lower.includes('lunette') || lower.includes('solaire')) {
    return { type: 'accessoires', label: 'Lunettes solaires', query: 'stylish designer sunglasses isolated white background studio' };
  }
  if (lower.includes('gant')) {
    return { type: 'accessoires', label: 'Gants en cuir', query: 'pair of elegant leather gloves isolated white background studio' };
  }
  if (lower.includes('montre')) {
    return { type: 'accessoires', label: 'Montre sobre en cuir', query: 'minimalist leather watch isolated white background studio' };
  }
  return { type: 'accessoires', label: 'Ceinture en cuir', query: 'classic brown leather belt isolated white background studio' };
}

function getHarmoniousPalette(hautDesc: string, basDesc: string): ColorSwatch[] {
  const text = `${hautDesc} ${basDesc}`.toLowerCase();
  if (text.includes('marine') || text.includes('bleu')) {
    return [
      { name: 'Blanc pur', hex: '#FFFFFF' },
      { name: 'Sable clair', hex: '#D6C3A5' },
      { name: 'Bleu marine', hex: '#1C2942' },
      { name: 'Gris charbon', hex: '#3E424B' },
    ];
  }
  if (text.includes('camel') || text.includes('marron') || text.includes('beige')) {
    return [
      { name: 'Écru crème', hex: '#FDFBF7' },
      { name: 'Beige camel', hex: '#C29B6B' },
      { name: 'Gris perle', hex: '#9CA3AF' },
      { name: 'Noir profond', hex: '#1F2937' },
    ];
  }
  return [
    { name: 'Blanc lin', hex: '#FAFAF9' },
    { name: 'Beige naturel', hex: '#E2D9CC' },
    { name: 'Bleu nuit', hex: '#1E293B' },
    { name: 'Anthracite', hex: '#475569' },
  ];
}

function getAlternativeLabel(altHaut: string, altBas: string): string {
  const h = altHaut.toLowerCase();
  const b = altBas.toLowerCase();
  let hautLabel = 'Haut alternatif';
  let basLabel = 'chino beige';

  if (h.includes('polo') && (h.includes('marine') || h.includes('bleu'))) hautLabel = 'Polo bleu marine';
  else if (h.includes('polo') && (h.includes('charbon') || h.includes('gris') || h.includes('noir'))) hautLabel = 'Polo charbon';
  else if (h.includes('polo') && (h.includes('crème') || h.includes('blanc') || h.includes('beige'))) hautLabel = 'Polo crème';
  else if (h.includes('polo')) hautLabel = 'Polo en piqué';
  else if (h.includes('chemise') && (h.includes('bleu') || h.includes('ciel'))) hautLabel = 'Chemise bleu clair';
  else if (h.includes('chemise')) hautLabel = 'Chemise soignée';
  else if (h.includes('blazer') || h.includes('veste')) hautLabel = 'Blazer moderne';
  else if (h.includes('pull')) hautLabel = 'Pull fin';
  else if (h.includes('top')) hautLabel = 'Top soyeux';

  if (b.includes('beige') || b.includes('sable')) basLabel = 'chino beige';
  else if (b.includes('marine') || b.includes('bleu')) basLabel = 'chino marine';
  else if (b.includes('gris') || b.includes('anthracite')) basLabel = 'chino gris';
  else if (b.includes('jean') || b.includes('denim')) basLabel = 'jean foncé';
  else basLabel = 'pantalon ajusté';

  return `${hautLabel} + ${basLabel}`;
}

/**
 * Deterministic seed for calendar date to rotate outfits day-to-day
 */
export function getDateDaySeed(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 1;
  const day = parts[2] || 1;
  return year * 372 + month * 31 + day;
}

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
  const daySeed = getDateDaySeed(params.weather.date);
  const vOffset = Math.abs(params.variationIndex || 0);
  const index = (daySeed + vOffset) % options.length;
  const selectedTemplate = options[index];

  // Alternative template: next distinct index in the array
  const altIndex = (index + 1) % options.length;
  const alternativeTemplate = options[altIndex] || selectedTemplate;

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

  // Alternative look adaptations
  let altHaut = alternativeTemplate.haut;
  let altBas = alternativeTemplate.bas;
  let altChaussures = alternativeTemplate.chaussures;
  let altAccessoires = alternativeTemplate.accessoires;
  if (hasRain) {
    altAccessoires = `${altAccessoires} + Parapluie compact`;
    if (!altHaut.toLowerCase().includes('imperméable') && !altHaut.toLowerCase().includes('trench')) {
      altHaut = `${altHaut} (veste imperméable légère)`;
    }
  }

  const alternativeOutfit: SuggestOutfitOutput = {
    haut: altHaut,
    bas: altBas,
    chaussures: altChaussures,
    accessoires: altAccessoires,
    suggestionText: `Alternative ${defaultOccasion} : ${alternativeTemplate.pitch}`,
  };

  const packshots: PackshotItem[] = [
    extractPackshot(haut, 'haut'),
    extractPackshot(bas, 'bas'),
    extractPackshot(chaussures, 'chaussures'),
    extractPackshot(accessoires, 'accessoires'),
  ];

  const colorPalette = getHarmoniousPalette(haut, bas);
  const alternativeLabel = getAlternativeLabel(altHaut, altBas);
  const signatureQuote = "Simple, élégant, efficace.";

  return {
    outfit: {
      haut,
      bas,
      chaussures,
      accessoires,
      suggestionText,
    },
    alternativeOutfit,
    packshots,
    colorPalette,
    alternativeLabel,
    signatureQuote,
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
