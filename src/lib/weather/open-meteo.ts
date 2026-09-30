/**
 * Open-Meteo Weather Service for Kol Youm
 * Free, no API key required, reliable worldwide forecasts.
 */

export interface DayWeather {
  date: string; // YYYY-MM-DD
  dayName: string; // "Aujourd'hui", "Demain", "Mercredi", etc.
  formattedDate: string; // "Jeudi 1 Octobre"
  isTomorrow: boolean;
  isToday: boolean;
  tempMax: number;
  tempMin: number;
  tempAvg: number;
  tempApparentMax: number;
  tempApparentMin: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIconType: 'sun' | 'cloud-sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'wind';
  precipitationProbMax: number;
  windSpeedMax: number;
  cityName: string;
}

export interface WeatherForecastResult {
  today: DayWeather;
  tomorrow: DayWeather;
  cityName: string;
  fetchedAt: number;
}

// Default fallback coordinates: Tunis, Tunisia
const DEFAULT_LAT = 36.8065;
const DEFAULT_LON = 10.1815;
const DEFAULT_CITY = 'Tunis';

const CACHE_KEY = 'kolyoum_open_meteo_cache_v1';
const CACHE_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Maps WMO Weather interpretation codes to human-readable French labels and icon keys
 * WMO Weather interpretation codes (WW)
 */
export function getWmoWeatherInfo(code: number): { label: string; iconType: DayWeather['weatherIconType'] } {
  switch (code) {
    case 0:
      return { label: 'Ensoleillé', iconType: 'sun' };
    case 1:
      return { label: 'Généralement dégagé', iconType: 'sun' };
    case 2:
      return { label: 'Partiellement nuageux', iconType: 'cloud-sun' };
    case 3:
      return { label: 'Nuageux / Couvert', iconType: 'cloud' };
    case 45:
    case 48:
      return { label: 'Brume / Brouillard', iconType: 'cloud' };
    case 51:
    case 53:
    case 55:
      return { label: 'Bruine légère', iconType: 'rain' };
    case 61:
    case 63:
    case 65:
      return { label: 'Pluvieux', iconType: 'rain' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { label: 'Neige', iconType: 'snow' };
    case 80:
    case 81:
    case 82:
      return { label: 'Averses de pluie', iconType: 'rain' };
    case 95:
    case 96:
    case 99:
      return { label: 'Orageux', iconType: 'storm' };
    default:
      return { label: 'Temps variable', iconType: 'cloud-sun' };
  }
}

/**
 * Format a date in French: "Jeudi 1 Octobre"
 */
function formatDateToFrench(dateObj: Date): string {
  try {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const dayName = days[dateObj.getDay()];
    const dayNum = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    return `${dayName} ${dayNum} ${monthName}`;
  } catch {
    return dateObj.toLocaleDateString('fr-FR');
  }
}

/**
 * Fetches 2-day weather forecast (today & tomorrow) from Open-Meteo
 */
export async function getOpenMeteoForecast(
  coords?: { lat: number; lon: number; cityName?: string }
): Promise<WeatherForecastResult> {
  const lat = coords?.lat ?? DEFAULT_LAT;
  const lon = coords?.lon ?? DEFAULT_LON;
  const cityName = coords?.cityName ?? DEFAULT_CITY;

  // Check LocalStorage cache first
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: WeatherForecastResult = JSON.parse(cached);
        const age = Date.now() - parsed.fetchedAt;
        if (age < CACHE_DURATION_MS && parsed.cityName === cityName) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not read weather from cache:', e);
    }
  }

  // Open-Meteo free API call
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&forecast_days=3`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur Open-Meteo (${response.status})`);
  }

  const data = await response.json();
  const daily = data.daily;

  if (!daily || !daily.time || daily.time.length < 2) {
    throw new Error('Données météo incomplètes reçues de Open-Meteo');
  }

  const now = new Date();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(now.getDate() + 1);

  // Day 0: Today
  const todayCode = daily.weather_code[0] ?? 0;
  const todayWmo = getWmoWeatherInfo(todayCode);
  const todayMax = Math.round(daily.temperature_2m_max[0] ?? 20);
  const todayMin = Math.round(daily.temperature_2m_min[0] ?? 14);

  const todayWeather: DayWeather = {
    date: daily.time[0],
    dayName: "Aujourd'hui",
    formattedDate: formatDateToFrench(now),
    isToday: true,
    isTomorrow: false,
    tempMax: todayMax,
    tempMin: todayMin,
    tempAvg: Math.round((todayMax + todayMin) / 2),
    tempApparentMax: Math.round(daily.apparent_temperature_max[0] ?? todayMax),
    tempApparentMin: Math.round(daily.apparent_temperature_min[0] ?? todayMin),
    weatherCode: todayCode,
    weatherLabel: todayWmo.label,
    weatherIconType: todayWmo.iconType,
    precipitationProbMax: Math.round(daily.precipitation_probability_max?.[0] ?? 0),
    windSpeedMax: Math.round(daily.wind_speed_10m_max?.[0] ?? 15),
    cityName,
  };

  // Day 1: Tomorrow
  const tomorrowCode = daily.weather_code[1] ?? 0;
  const tomorrowWmo = getWmoWeatherInfo(tomorrowCode);
  const tomorrowMax = Math.round(daily.temperature_2m_max[1] ?? 18);
  const tomorrowMin = Math.round(daily.temperature_2m_min[1] ?? 12);

  const tomorrowWeather: DayWeather = {
    date: daily.time[1],
    dayName: 'Demain',
    formattedDate: formatDateToFrench(tomorrowDate),
    isToday: false,
    isTomorrow: true,
    tempMax: tomorrowMax,
    tempMin: tomorrowMin,
    tempAvg: Math.round((tomorrowMax + tomorrowMin) / 2),
    tempApparentMax: Math.round(daily.apparent_temperature_max[1] ?? tomorrowMax),
    tempApparentMin: Math.round(daily.apparent_temperature_min[1] ?? tomorrowMin),
    weatherCode: tomorrowCode,
    weatherLabel: tomorrowWmo.label,
    weatherIconType: tomorrowWmo.iconType,
    precipitationProbMax: Math.round(daily.precipitation_probability_max?.[1] ?? 0),
    windSpeedMax: Math.round(daily.wind_speed_10m_max?.[1] ?? 15),
    cityName,
  };

  const result: WeatherForecastResult = {
    today: todayWeather,
    tomorrow: tomorrowWeather,
    cityName,
    fetchedAt: Date.now(),
  };

  // Save to cache
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch (e) {
      console.warn('Could not cache weather forecast:', e);
    }
  }

  return result;
}
