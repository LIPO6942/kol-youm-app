/**
 * Service CarCare pour l'intégration du kilométrage mensuel dans Kol Youm
 */

export type CarCareMileageAssessment = {
  label: string;
  note: string;
  emoji: string;
  colorClass: string;
};

export type CarCareMonthlyStats = {
  month: string;
  mileage: number;
  totalCost?: number;
  vehicleName?: string;
  assessment: CarCareMileageAssessment;
};

/**
 * Attribue une appréciation et une note personnalisée selon le kilométrage parcouru dans le mois.
 */
export function getCarCareMileageAssessment(mileage: number): CarCareMileageAssessment {
  if (mileage <= 0) {
    return {
      label: "Mode Repos",
      note: "Véhicule au garage ou données kilométriques non renseignées ce mois-ci.",
      emoji: "⏸️",
      colorClass: "from-slate-500/20 to-slate-600/10 text-slate-300 border-slate-500/30",
    };
  }

  if (mileage < 300) {
    return {
      label: "Petit Rouleur",
      note: "La voiture s'est bien reposée ce mois-ci ! Tu as privilégié les trajets courts et la marche.",
      emoji: "🚲",
      colorClass: "from-emerald-500/20 to-teal-500/10 text-emerald-300 border-emerald-500/30",
    };
  }

  if (mileage < 800) {
    return {
      label: "Navetteur Urbain",
      note: "Trajets urbains et quotidien modéré ! Un usage maîtrisé et équilibré de ton véhicule.",
      emoji: "🏙️",
      colorClass: "from-blue-500/20 to-indigo-500/10 text-blue-300 border-blue-500/30",
    };
  }

  if (mileage < 1500) {
    return {
      label: "Explorateur Actif",
      note: "Tu as bien sillonné les routes ! De belles escapades et sorties au compteur ce mois-ci.",
      emoji: "🚗",
      colorClass: "from-amber-500/20 to-orange-500/10 text-amber-300 border-amber-500/30",
    };
  }

  if (mileage < 2500) {
    return {
      label: "Grand Voyageur",
      note: "Un vrai pilote au long cours ! Les kilomètres ont défilé à toute allure sur l'asphalte.",
      emoji: "🛣️",
      colorClass: "from-purple-500/20 to-indigo-500/10 text-purple-300 border-purple-500/30",
    };
  }

  return {
    label: "Road Warrior",
    note: "Un véritable marathon routier ! Ton bolide et toi avez avalé le bitume sans compter ce mois-ci.",
    emoji: "🚀",
    colorClass: "from-rose-500/20 to-amber-500/10 text-rose-300 border-rose-500/30",
  };
}

/**
 * Récupère les statistiques de kilométrage mensuel depuis l'API interne de Kol Youm.
 * @param monthKey Format "YYYY-MM" (ex: "2026-08")
 * @param userEmail Email de l'utilisateur pour cibler ses données
 */
export async function fetchCarCareMonthlyMileage(monthKey: string, userEmail?: string): Promise<CarCareMonthlyStats> {
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

    return {
      month: monthKey,
      mileage,
      totalCost: data.totalCost,
      vehicleName: data.vehicleName || 'Mon Véhicule',
      assessment: getCarCareMileageAssessment(mileage),
    };
  } catch (error) {
    console.warn('[CarCare Service] Impossible de récupérer le kilométrage:', error);
    return {
      month: monthKey,
      mileage: 0,
      assessment: getCarCareMileageAssessment(0),
    };
  }
}
