/**
 * Service CarCare pour l'intégration du kilométrage mensuel dans Kol Youm
 * avec contextualisation dynamique liée aux sorties réelles de Kol Youm.
 */

export type KolYoumContext = {
  topPlace?: string | null;
  topNeighborhood?: string | null;
  topCategory?: string | null;
  totalOutings?: number;
  kharjetZone?: string | null;
  vehicleName?: string | null;
};

export type CarCareMileageAssessment = {
  label: string;
  sublabel: string;
  note: string;
  emoji: string;
  progressPercent: number;
  colorClass: string;
  badgeBorder: string;
  gradientBg: string;
};

export type CarCareMonthlyStats = {
  month: string;
  mileage: number;
  totalCost?: number;
  vehicleName?: string;
  assessment: CarCareMileageAssessment;
};

/**
 * Attribue une appréciation et une note personnalisée selon le kilométrage parcouru dans le mois
 * EN CONNEXION DIRECTE avec les lieux visités et le nombre de sorties dans Kol Youm.
 */
export function getCarCareMileageAssessment(
  mileage: number,
  context?: KolYoumContext
): CarCareMileageAssessment {
  const topPlace = context?.topPlace || null;
  const topZone = context?.kharjetZone || context?.topNeighborhood || null;
  const outings = context?.totalOutings || 0;
  const vehicle = context?.vehicleName && context.vehicleName !== 'Aucun véhicule' && context.vehicleName !== 'CarCare' 
    ? context.vehicleName 
    : 'ton bolide';

  // --- PALIER 1 : 0 KM (Mode Repos) ---
  if (mileage <= 0) {
    let note = "La mécanique s'est accordée une vraie cure de repos ce mois-ci ! Aucun kilomètre relevé au compteur.";
    if (outings > 0 && topPlace) {
      note = `Mois 100% piéton ou covoiturage ! Malgré tes ${outings} sorties vers ${topPlace}, ${vehicle} est resté sagement au garage.`;
    } else if (outings > 0) {
      note = `Mode piéton activé ! Tes ${outings} virées ce mois se sont faites sans faire tourner la clé de contact.`;
    }

    return {
      label: "Mode Repos",
      sublabel: "Garage & Sérénité",
      note,
      emoji: "⏸️",
      progressPercent: 5,
      colorClass: "from-slate-500/20 to-slate-700/20 text-slate-300",
      badgeBorder: "border-slate-500/40",
      gradientBg: "from-slate-900/90 via-slate-950/90 to-slate-900/90",
    };
  }

  // --- PALIER 2 : 1 – 299 KM (Petit Rouleur) ---
  if (mileage < 300) {
    let note = "Des trajets de proximité bien dosés, parfaits pour tes sorties sans faire flamber la jauge !";
    if (topPlace && topZone) {
      note = `Trajets courts et ciblés ! Tes ${mileage} km ont surtout servi à rallier tes spots à ${topZone} comme ${topPlace}. Un rayon d'action maîtrisé !`;
    } else if (topPlace) {
      note = `Sorties locales bien calibrées ! L'essentiel de tes ${mileage} km t'a conduit vers ${topPlace}. ${vehicle} a bien soufflé ce mois-ci.`;
    } else if (outings > 0) {
      note = `Petite foulée pour ${vehicle} ! ${outings} sorties au compteur et un kilométrage sage pour préserver la mécanique.`;
    }

    return {
      label: "Petit Rouleur",
      sublabel: "Rayonnement Local",
      note,
      emoji: "🚲",
      progressPercent: Math.max(15, Math.round((mileage / 300) * 25)),
      colorClass: "from-emerald-500/20 to-teal-500/20 text-emerald-300",
      badgeBorder: "border-emerald-400/50",
      gradientBg: "from-emerald-950/40 via-slate-900/95 to-indigo-950/70",
    };
  }

  // --- PALIER 3 : 300 – 799 KM (Navetteur Actif) ---
  if (mileage < 800) {
    let note = `Un usage urbain équilibré et maîtrisé : tes ${mileage} km ont parfaitement connecté toutes tes destinations du mois !`;
    if (topPlace && outings > 0) {
      note = `La cadence parfaite pour tes ${outings} virées ! ${vehicle} a assuré le rythme entre ton quotidien, tes arrêts à ${topPlace} et tes vadrouilles à ${topZone || 'la ville'}.`;
    } else if (topZone) {
      note = `Belle régularité urbaine ! ${mileage} km pour sillonner ${topZone} et tes adresses favorites sans excès.`;
    }

    return {
      label: "Navetteur Actif",
      sublabel: "Rythme du Quotidien",
      note,
      emoji: "🏙️",
      progressPercent: Math.round(25 + ((mileage - 300) / 500) * 25),
      colorClass: "from-blue-500/20 to-indigo-500/20 text-blue-300",
      badgeBorder: "border-blue-400/50",
      gradientBg: "from-blue-950/40 via-slate-900/95 to-indigo-950/80",
    };
  }

  // --- PALIER 4 : 800 – 1 499 KM (Explorateur d'Escapades) ---
  if (mileage < 1500) {
    let note = `${mileage} km au compteur : un beau ratio route/découverte pour explorer la région et faire vivre tes moments mémorables !`;
    if (topZone && topPlace) {
      note = `Le compteur a bien chauffé ! Entre tes passages à ${topPlace} et tes virées vers ${topZone}, ${vehicle} a bien sillonné les routes ce mois-ci !`;
    } else if (outings > 0) {
      note = `Conducteur très actif ! Avec ${outings} sorties ce mois et ${mileage} km au compteur, les virées et les découvertes se sont enchaînées.`;
    }

    return {
      label: "Explorateur d'Escapades",
      sublabel: "Asphalte & Découvertes",
      note,
      emoji: "🚗",
      progressPercent: Math.round(50 + ((mileage - 800) / 700) * 25),
      colorClass: "from-amber-500/20 to-orange-500/20 text-amber-300",
      badgeBorder: "border-amber-400/50",
      gradientBg: "from-amber-950/40 via-slate-900/95 to-indigo-950/80",
    };
  }

  // --- PALIER 5 : 1 500 – 2 499 KM (Grand Voyageur) ---
  if (mileage < 2500) {
    let note = `Les kilomètres ont défilé à toute allure ! Rien n'a arrêté ${vehicle} pour t'emmener à toutes tes destinations lointaines.`;
    if (topPlace && topZone) {
      note = `Un vrai pilote au long cours ! Avec ${mileage} km avalés, tu as écumé le bitume bien au-delà de ${topZone}, sans oublier tes haltes gourmandes à ${topPlace}.`;
    } else if (topPlace) {
      note = `Un sacré périple ! ${mileage} km avalés ce mois-ci pour relier toutes tes destinations et tes passages remarqués à ${topPlace}.`;
    }

    return {
      label: "Grand Voyageur",
      sublabel: "Périple au Long Cours",
      note,
      emoji: "🛣️",
      progressPercent: Math.round(75 + ((mileage - 1500) / 1000) * 20),
      colorClass: "from-purple-500/20 to-indigo-500/20 text-purple-300",
      badgeBorder: "border-purple-400/50",
      gradientBg: "from-purple-950/45 via-slate-900/95 to-indigo-950/85",
    };
  }

  // --- PALIER 6 : ≥ 2 500 KM (Road Warrior) ---
  let rwNote = `Véritable baroudeur des grands axes ! Ton compteur a explosé les plafonds avec ${mileage} km de pur bitume et d'escapades.`;
  if (outings > 0) {
    rwNote = `Marathon d'asphalte spectaculaire ! ${mileage} km avalés sans sourciller : ${vehicle} a été le fidèle complice de tes ${outings} aventures ce mois-ci !`;
  }

  return {
    label: "Road Warrior",
    sublabel: "Marathon Routier",
    note: rwNote,
    emoji: "🚀",
    progressPercent: 100,
    colorClass: "from-rose-500/20 to-amber-500/20 text-rose-300",
    badgeBorder: "border-rose-400/50",
    gradientBg: "from-rose-950/45 via-slate-900/95 to-amber-950/80",
  };
}

/**
 * Récupère les statistiques de kilométrage mensuel depuis l'API interne de Kol Youm.
 * @param monthKey Format "YYYY-MM" (ex: "2026-08")
 * @param userEmail Email de l'utilisateur pour cibler ses données
 * @param context Contexte Kol Youm (lieux visités, quartier, nombre de sorties)
 */
export async function fetchCarCareMonthlyMileage(
  monthKey: string,
  userEmail?: string,
  context?: KolYoumContext
): Promise<CarCareMonthlyStats> {
  try {
    const params = new URLSearchParams({ month: monthKey });
    if (userEmail) {
      params.append('userEmail', userEmail);
    }

    const res = await fetch(`/api/carcare/monthly-mileage?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Erreur API: ${res.status}`);
    }

    const data = await res.json();
    const mileage = typeof data.monthlyMileage === 'number' ? data.monthlyMileage : 0;
    const vehicleName = data.vehicleName && data.vehicleName !== 'Aucun véhicule' && data.vehicleName !== 'CarCare' 
      ? data.vehicleName 
      : undefined;

    const fullContext: KolYoumContext = {
      ...context,
      vehicleName: vehicleName || context?.vehicleName,
    };

    return {
      month: data.month || monthKey,
      mileage,
      totalCost: data.totalCost,
      vehicleName,
      assessment: getCarCareMileageAssessment(mileage, fullContext),
    };
  } catch (error) {
    console.warn('[CarCare Service] Impossible de récupérer le kilométrage:', error);
    return {
      month: monthKey,
      mileage: 0,
      assessment: getCarCareMileageAssessment(0, context),
    };
  }
}
