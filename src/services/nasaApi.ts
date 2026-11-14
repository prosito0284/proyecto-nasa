/**
 * BLOQUE B (Asignado a: Antigravity del Compañero - Rama: feat/nasa-data-service)
 * Cliente para la API pública de NASA DONKI (FLR, SEP, CME) y NASA Image Library (images-api.nasa.gov)
 * con caché en localStorage y fallback transparente a datasets reales verificados de la NASA.
 */

import { SpaceWeatherEvent } from '../types/mission';
import {
  NasaGalleryImage,
  VERIFIED_NASA_GALLERY_IMAGES,
  VERIFIED_NASA_WEATHER_EVENTS,
} from '../data/nasa-datasets';

const NASA_API_KEY = 'DEMO_KEY';
const DONKI_CACHE_KEY = 'junior_astronaut_donki_cache_v2';
const IMAGES_CACHE_PREFIX = 'junior_astronaut_nasa_img_v2_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface CacheEnvelope<T> {
  timestamp: number;
  payload: T;
}

interface DonkiFlrItem {
  flrID?: string;
  classType?: string;
  beginTime?: string;
  activeRegionNum?: number;
  link?: string;
}

interface DonkiSepItem {
  sepID?: string;
  eventTime?: string;
  instruments?: Array<{ displayName?: string }>;
  link?: string;
}

interface DonkiCmeAnalysis {
  speed?: number;
  type?: string;
  isMostAccurate?: boolean;
}

interface DonkiCmeItem {
  activityID?: string;
  startTime?: string;
  note?: string;
  link?: string;
  cmeAnalyses?: DonkiCmeAnalysis[];
}

interface NasaImageApiItem {
  data?: Array<{
    nasa_id?: string;
    title?: string;
    center?: string;
    date_created?: string;
    description?: string;
  }>;
  links?: Array<{
    href?: string;
    rel?: string;
    render?: string;
  }>;
}

function readCache<T>(key: string): T | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, payload: T): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const envelope: CacheEnvelope<T> = {
      timestamp: Date.now(),
      payload,
    };
    window.localStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

function mapDonkiFlare(flr: DonkiFlrItem, idx: number): SpaceWeatherEvent {
  const classType = flr.classType || 'M1.0';
  const isXClass = classType.startsWith('X');
  const isMClass = classType.startsWith('M');
  const regionLabel = flr.activeRegionNum ? `AR${flr.activeRegionNum}` : 'Solar Disk';

  return {
    id: flr.flrID || `DONKI-LIVE-FLR-${idx}`,
    type: 'FLR',
    classOrIntensity: `${classType} Solar Flare (${regionLabel})`,
    startTime: flr.beginTime || new Date().toISOString(),
    sourceUrl: flr.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: true,
    severity: isXClass ? 'critical' : isMClass ? 'warning' : 'watch',
    title: {
      es: `📡 DONKI en Vivo: Llamarada Solar Clase ${classType}`,
      en: `📡 Live DONKI: ${classType}-Class Solar Flare`,
    },
    kidFriendlyExplanation: {
      es: `¡Telemetría real recibida de la NASA! El Sol emitió una llamarada clase ${classType} en la región ${regionLabel}. Ajusta el blindaje de tu base para proteger a tus astronautas.`,
      en: `Live telemetry straight from NASA! The Sun emitted a class ${classType} flare from ${regionLabel}. Adjust your outpost shielding to protect your astronauts.`,
    },
    scienceFact: {
      es: `Evento oficial NASA DONKI ID: ${flr.flrID || 'FLR-LIVE'} detectado en rayos X por satélites GOES/SDO.`,
      en: `Official NASA DONKI ID: ${flr.flrID || 'FLR-LIVE'} detected in X-rays by GOES/SDO satellites.`,
    },
    radiationMultiplier: isXClass ? 2.8 : isMClass ? 1.9 : 1.35,
    solarEfficiencyMultiplier: 1.0,
  };
}

function mapDonkiSep(sep: DonkiSepItem, idx: number): SpaceWeatherEvent {
  const instrument =
    sep.instruments?.[0]?.displayName || 'GOES / SOHO Energetic Particle Sensor';
  const id = sep.sepID || `DONKI-LIVE-SEP-${idx}`;

  return {
    id,
    type: 'SEP',
    classOrIntensity: `SEP Proton Shower (${instrument})`,
    startTime: sep.eventTime || new Date().toISOString(),
    sourceUrl: sep.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: true,
    severity: 'warning',
    title: {
      es: `📡 DONKI en Vivo: Tormenta de Protones Solares (SEP)`,
      en: `📡 Live DONKI: Solar Energetic Particle (SEP) Storm`,
    },
    kidFriendlyExplanation: {
      es: `¡Alerta real de partículas solares! El detector ${instrument} captó protones veloces viajando por el sistema solar. Usa paredes de agua para frenar la dosis en mSv.`,
      en: `Live solar particle alert! Detector ${instrument} captured fast protons racing across the solar system. Use water walls to block the mSv radiation dose.`,
    },
    scienceFact: {
      es: `Evento oficial NASA DONKI SEP (${id}). Los protones energéticos pueden atravesar trajes espaciales durante una caminata EVA.`,
      en: `Official NASA DONKI SEP (${id}). Energetic protons can penetrate spacesuits during an outdoor EVA spacewalk.`,
    },
    radiationMultiplier: 2.35,
    solarEfficiencyMultiplier: 0.92,
  };
}

function mapDonkiCme(cme: DonkiCmeItem, idx: number): SpaceWeatherEvent {
  const id = cme.activityID || `DONKI-LIVE-CME-${idx}`;
  const bestAnalysis =
    cme.cmeAnalyses?.find((a) => a.isMostAccurate) || cme.cmeAnalyses?.[0];
  const speed = bestAnalysis?.speed ? Math.round(bestAnalysis.speed) : 780;
  const isFast = speed >= 1000;

  return {
    id,
    type: 'CME',
    classOrIntensity: `CME Plasma Cloud (${speed} km/s)`,
    startTime: cme.startTime || new Date().toISOString(),
    sourceUrl: cme.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: true,
    severity: isFast ? 'critical' : 'warning',
    title: {
      es: `📡 DONKI en Vivo: Eyección de Masa Coronal (${speed} km/s)`,
      en: `📡 Live DONKI: Coronal Mass Ejection (${speed} km/s)`,
    },
    kidFriendlyExplanation: {
      es: `¡Una nube real de plasma solar viaja a ${speed} km por segundo! Puede sobrecargar los sistemas eléctricos de la base y elevar la radiación.`,
      en: `A real cloud of solar plasma is traveling at ${speed} km per second! It can strain outpost power grids and increase radiation.`,
    },
    scienceFact: {
      es: `Evento oficial NASA DONKI CME (${id}) medido por coronógrafos SOHO/STEREO a ${speed} km/s.`,
      en: `Official NASA DONKI CME (${id}) measured by SOHO/STEREO coronagraphs at ${speed} km/s.`,
    },
    radiationMultiplier: isFast ? 2.65 : 1.85,
    solarEfficiencyMultiplier: isFast ? 0.86 : 0.94,
  };
}

/**
 * Consulta en vivo los 3 endpoints de clima espacial de NASA DONKI (FLR, SEP y CME)
 * y combina los resultados con el archivo histórico verificado para garantizar 0 errores.
 */
export async function fetchLiveOrVerifiedSpaceWeather(
  forceRefresh = false
): Promise<SpaceWeatherEvent[]> {
  if (!forceRefresh) {
    const cached = readCache<SpaceWeatherEvent[]>(DONKI_CACHE_KEY);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const baseUrl = 'https://api.nasa.gov/DONKI';
    const queryParams = `startDate=${startStr}&endDate=${endStr}&api_key=${NASA_API_KEY}`;

    const [flrRes, sepRes, cmeRes] = await Promise.allSettled([
      fetch(`${baseUrl}/FLR?${queryParams}`),
      fetch(`${baseUrl}/SEP?${queryParams}`),
      fetch(`${baseUrl}/CME?${queryParams}`),
    ]);

    const liveEvents: SpaceWeatherEvent[] = [];

    if (flrRes.status === 'fulfilled' && flrRes.value.ok) {
      const flrData = await flrRes.value.json();
      if (Array.isArray(flrData) && flrData.length > 0) {
        const latestFlares = (flrData as DonkiFlrItem[]).slice(-2).reverse();
        liveEvents.push(...latestFlares.map(mapDonkiFlare));
      }
    }

    if (sepRes.status === 'fulfilled' && sepRes.value.ok) {
      const sepData = await sepRes.value.json();
      if (Array.isArray(sepData) && sepData.length > 0) {
        const latestSeps = (sepData as DonkiSepItem[]).slice(-2).reverse();
        liveEvents.push(...latestSeps.map(mapDonkiSep));
      }
    }

    if (cmeRes.status === 'fulfilled' && cmeRes.value.ok) {
      const cmeData = await cmeRes.value.json();
      if (Array.isArray(cmeData) && cmeData.length > 0) {
        const latestCmes = (cmeData as DonkiCmeItem[]).slice(-2).reverse();
        liveEvents.push(...latestCmes.map(mapDonkiCme));
      }
    }

    if (liveEvents.length === 0) {
      return VERIFIED_NASA_WEATHER_EVENTS;
    }

    const seenIds = new Set(liveEvents.map((ev) => ev.id));
    const merged = [
      ...liveEvents,
      ...VERIFIED_NASA_WEATHER_EVENTS.filter((ev) => !seenIds.has(ev.id)),
    ];

    writeCache(DONKI_CACHE_KEY, merged);
    return merged;
  } catch {
    return VERIFIED_NASA_WEATHER_EVENTS;
  }
}

/**
 * Consulta en vivo la API oficial NASA Image and Video Library (https://images-api.nasa.gov)
 * sin necesidad de API key, manteniendo fallback instantáneo a fotografías verificadas.
 */
export async function fetchNasaGalleryImages(
  searchQuery = '',
  categoryFilter: NasaGalleryImage['category'] | 'all' = 'all',
  forceRefresh = false
): Promise<NasaGalleryImage[]> {
  const normalizedQuery = searchQuery.trim();
  const cacheKey = `${IMAGES_CACHE_PREFIX}${categoryFilter}_${normalizedQuery.toLowerCase() || 'default'}`;

  if (!forceRefresh) {
    const cached = readCache<NasaGalleryImage[]>(cacheKey);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  const curatedMatches = VERIFIED_NASA_GALLERY_IMAGES.filter((img) => {
    const matchesCategory = categoryFilter === 'all' || img.category === categoryFilter;
    if (!normalizedQuery) return matchesCategory;
    const q = normalizedQuery.toLowerCase();
    return (
      matchesCategory &&
      (img.title.es.toLowerCase().includes(q) ||
        img.title.en.toLowerCase().includes(q) ||
        img.kidCaption.es.toLowerCase().includes(q) ||
        img.kidCaption.en.toLowerCase().includes(q) ||
        img.nasaId.toLowerCase().includes(q))
    );
  });

  const apiSearchTerm =
    normalizedQuery ||
    (categoryFilter === 'moon'
      ? 'Artemis Shackleton Crater Moon'
      : categoryFilter === 'mars'
        ? 'Perseverance Jezero Crater Mars'
        : categoryFilter === 'solar'
          ? 'Solar Dynamics Observatory flare CME'
          : categoryFilter === 'plants'
            ? 'ISS Veggie space lettuce plant'
            : categoryFilter === 'radiation'
              ? 'BioSentinel Orion radiation'
              : '');

  if (!apiSearchTerm) {
    return VERIFIED_NASA_GALLERY_IMAGES;
  }

  try {
    const response = await fetch(
      `https://images-api.nasa.gov/search?q=${encodeURIComponent(apiSearchTerm)}&media_type=image&page_size=4`
    );

    if (!response.ok) {
      return curatedMatches.length > 0 ? curatedMatches : VERIFIED_NASA_GALLERY_IMAGES;
    }

    const json = await response.json();
    const items: NasaImageApiItem[] = json?.collection?.items || [];

    const liveImages: NasaGalleryImage[] = items
      .map((item, idx): NasaGalleryImage | null => {
        const meta = item.data?.[0];
        const previewLink =
          item.links?.find((l) => l.rel === 'preview' || l.render === 'image')?.href ||
          item.links?.[0]?.href;

        if (!meta?.title || !previewLink) return null;

        const nasaId = meta.nasa_id || `NASA-IMG-LIVE-${idx}`;
        const rawDesc = (meta.description || meta.title).replace(/<[^>]+>/g, '');
        const shortDesc =
          rawDesc.length > 180 ? `${rawDesc.slice(0, 177).trim()}...` : rawDesc;

        const inferredCategory: NasaGalleryImage['category'] =
          categoryFilter !== 'all' ? categoryFilter : 'moon';

        return {
          nasaId,
          title: {
            es: meta.title,
            en: meta.title,
          },
          center: meta.center ? `NASA / ${meta.center}` : 'NASA Image Library (Live)',
          dateCreated: (meta.date_created || '').split('T')[0] || 'NASA Archive',
          category: inferredCategory,
          imageUrl: previewLink,
          sourcePageUrl: `https://images.nasa.gov/details/${encodeURIComponent(nasaId)}`,
          kidCaption: {
            es: `Fotografía oficial obtenida en vivo desde images-api.nasa.gov: ${shortDesc}`,
            en: `Official photo fetched live from images-api.nasa.gov: ${shortDesc}`,
          },
          scienceConnection: {
            es: `Archivo Oficial NASA ID: ${nasaId} (${meta.center || 'NASA'})`,
            en: `Official NASA Archive ID: ${nasaId} (${meta.center || 'NASA'})`,
          },
          fallbackEmoji:
            inferredCategory === 'mars'
              ? '🔴'
              : inferredCategory === 'solar'
                ? '☀️'
                : inferredCategory === 'plants'
                  ? '🌱'
                  : inferredCategory === 'radiation'
                    ? '🛡️'
                    : '🛰️',
          isLiveApiResult: true,
        };
      })
      .filter((item): item is NasaGalleryImage => item !== null);

    const seenIds = new Set(curatedMatches.map((img) => img.nasaId));
    const combined = [
      ...curatedMatches,
      ...liveImages.filter((img) => !seenIds.has(img.nasaId)),
    ];

    const finalResult = combined.length > 0 ? combined : VERIFIED_NASA_GALLERY_IMAGES;
    writeCache(cacheKey, finalResult);
    return finalResult;
  } catch {
    return curatedMatches.length > 0 ? curatedMatches : VERIFIED_NASA_GALLERY_IMAGES;
  }
}
