/**
 * BLOQUE B (Asignado a: Antigravity del Compañero - Rama: feat/nasa-data-service)
 * Cliente para la API pública de NASA DONKI (FLR, SEP, CME) y NASA Image Library (images-api.nasa.gov)
 * con clave configurable por VITE_NASA_API_KEY (fallback DEMO_KEY), timeout de 6 s con AbortController,
 * caché en localStorage y fallback transparente a datasets reales verificados de la NASA.
 */

import { SpaceWeatherEvent } from '../types/mission';
import {
  NasaGalleryImage,
  VERIFIED_NASA_GALLERY_IMAGES,
  VERIFIED_NASA_WEATHER_EVENTS,
} from '../data/nasa-datasets';

const DEFAULT_NASA_API_KEY = 'DEMO_KEY';
export const NASA_FETCH_TIMEOUT_MS = 6000;
const DONKI_CACHE_KEY = 'junior_astronaut_donki_cache_v2';
const IMAGES_CACHE_PREFIX = 'junior_astronaut_nasa_img_v2_';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutos

interface CacheEnvelope<T> {
  timestamp: number;
  payload: T;
}

export interface WeatherPoolStatus {
  live: boolean;
  fetchedAt: string;
  count: number;
}

let lastWeatherPoolStatus: WeatherPoolStatus = {
  live: false,
  fetchedAt: new Date().toISOString(),
  count: VERIFIED_NASA_WEATHER_EVENTS.length,
};

export interface DonkiFlrItem {
  flrID?: string;
  classType?: string;
  beginTime?: string;
  peakTime?: string;
  activeRegionNum?: number;
  link?: string;
}

export interface DonkiSepItem {
  sepID?: string;
  eventTime?: string;
  instruments?: Array<{ displayName?: string }>;
  link?: string;
}

export interface DonkiCmeAnalysis {
  speed?: number;
  type?: string;
  isMostAccurate?: boolean;
}

export interface DonkiCmeItem {
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

/**
 * Obtiene la clave de API de NASA desde `import.meta.env.VITE_NASA_API_KEY`
 * con fallback seguro a `DEMO_KEY`.
 */
export function getNasaApiKey(overrideKey?: string): string {
  const raw =
    overrideKey !== undefined
      ? overrideKey
      : (import.meta as unknown as { env?: Record<string, string | undefined> })?.env
          ?.VITE_NASA_API_KEY;
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  return trimmed.length > 0 ? trimmed : DEFAULT_NASA_API_KEY;
}

/**
 * Realiza un fetch con timeout estricto (por defecto 6000 ms) usando AbortController.
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs = NASA_FETCH_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function readCacheEnvelope<T>(key: string): CacheEnvelope<T> | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function readCache<T>(key: string): T | null {
  const env = readCacheEnvelope<T>(key);
  return env ? env.payload : null;
}

function writeCache<T>(key: string, payload: T): number {
  const timestamp = Date.now();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const envelope: CacheEnvelope<T> = {
        timestamp,
        payload,
      };
      window.localStorage.setItem(key, JSON.stringify(envelope));
    }
  } catch {
    // Ignore storage quota or private mode restrictions
  }
  return timestamp;
}

/**
 * Describe el estado del último pool de clima espacial cargado (en vivo vs archivo verificado).
 */
export function getWeatherPoolStatus(): WeatherPoolStatus {
  const cachedEnv = readCacheEnvelope<SpaceWeatherEvent[]>(DONKI_CACHE_KEY);
  if (cachedEnv && Array.isArray(cachedEnv.payload) && cachedEnv.payload.length > 0 && !lastWeatherPoolStatus.live) {
    return {
      live: cachedEnv.payload.some((ev) => Boolean(ev.isLiveNasaData)),
      fetchedAt: new Date(cachedEnv.timestamp).toISOString(),
      count: cachedEnv.payload.length,
    };
  }
  return { ...lastWeatherPoolStatus };
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function mapDonkiFlareToEvent(flr: DonkiFlrItem, idx = 0): SpaceWeatherEvent {
  const rawClass = typeof flr.classType === 'string' && flr.classType.trim() ? flr.classType.trim().toUpperCase() : 'M1.0';
  const isXClass = rawClass.startsWith('X');
  const isMClass = rawClass.startsWith('M');
  const regionLabel = flr.activeRegionNum ? `AR${flr.activeRegionNum}` : 'Solar Disk';
  const id = (flr.flrID && flr.flrID.trim()) || `DONKI-LIVE-FLR-${idx}`;

  const rawRad = isXClass ? 2.8 : isMClass ? 1.9 : 1.35;

  return {
    id,
    type: 'FLR',
    classOrIntensity: `${rawClass} Solar Flare (${regionLabel})`,
    startTime: flr.beginTime || flr.peakTime || '2026-11-14T00:00Z',
    sourceUrl: flr.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: true,
    severity: isXClass ? 'critical' : isMClass ? 'warning' : 'watch',
    title: {
      es: `DONKI en Vivo: Llamarada Solar Clase ${rawClass}`,
      en: `Live DONKI: ${rawClass}-Class Solar Flare`,
    },
    kidFriendlyExplanation: {
      es: `Telemetría real recibida de la NASA. El Sol emitió una llamarada clase ${rawClass} en la región ${regionLabel}. Ajusta el blindaje de tu base para proteger a tus astronautas.`,
      en: `Live telemetry straight from NASA. The Sun emitted a class ${rawClass} flare from ${regionLabel}. Adjust your outpost shielding to protect your astronauts.`,
    },
    scienceFact: {
      es: `Evento oficial NASA DONKI ID: ${id} detectado en rayos X por satélites GOES/SDO.`,
      en: `Official NASA DONKI ID: ${id} detected in X-rays by GOES/SDO satellites.`,
    },
    radiationMultiplier: clampNumber(rawRad, 1.0, 3.5),
    solarEfficiencyMultiplier: clampNumber(1.0, 0.4, 1.1),
  };
}

export function mapDonkiSepToEvent(sep: DonkiSepItem, idx = 0): SpaceWeatherEvent {
  const instrument =
    sep.instruments?.[0]?.displayName?.trim() || 'GOES / SOHO Energetic Particle Sensor';
  const id = (sep.sepID && sep.sepID.trim()) || `DONKI-LIVE-SEP-${idx}`;

  return {
    id,
    type: 'SEP',
    classOrIntensity: `SEP Proton Shower (${instrument})`,
    startTime: sep.eventTime || '2026-11-14T00:00Z',
    sourceUrl: sep.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: true,
    severity: 'warning',
    title: {
      es: `DONKI en Vivo: Tormenta de Protones Solares (SEP)`,
      en: `Live DONKI: Solar Energetic Particle (SEP) Storm`,
    },
    kidFriendlyExplanation: {
      es: `Alerta real de partículas solares. El detector ${instrument} captó protones veloces viajando por el sistema solar. Usa paredes de agua para frenar la dosis en mSv.`,
      en: `Live solar particle alert. Detector ${instrument} captured fast protons racing across the solar system. Use water walls to block the mSv radiation dose.`,
    },
    scienceFact: {
      es: `Evento oficial NASA DONKI SEP (${id}). Los protones energéticos pueden atravesar trajes espaciales durante una caminata EVA.`,
      en: `Official NASA DONKI SEP (${id}). Energetic protons can penetrate spacesuits during a spacewalk (EVA).`,
    },
    radiationMultiplier: clampNumber(2.35, 1.0, 3.5),
    solarEfficiencyMultiplier: clampNumber(0.92, 0.4, 1.1),
  };
}

export function mapDonkiCmeToEvent(cme: DonkiCmeItem, idx = 0): SpaceWeatherEvent {
  const id = (cme.activityID && cme.activityID.trim()) || `DONKI-LIVE-CME-${idx}`;
  const bestAnalysis =
    cme.cmeAnalyses?.find((a) => a.isMostAccurate) || cme.cmeAnalyses?.[0];
  const rawSpeed = bestAnalysis?.speed && Number.isFinite(bestAnalysis.speed)
    ? Math.round(bestAnalysis.speed)
    : 780;
  const speed = clampNumber(rawSpeed, 250, 3500);
  const isExtreme = speed >= 1500;
  const isFast = speed >= 1000;

  const rawRad = isExtreme ? 3.1 : isFast ? 2.65 : 1.85;
  const rawSolar = isExtreme ? 0.84 : isFast ? 0.88 : 0.94;

  return {
    id,
    type: 'CME',
    classOrIntensity: `CME Plasma Cloud (${speed} km/s)`,
    startTime: cme.startTime || '2026-11-14T00:00Z',
    sourceUrl: cme.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: true,
    severity: isFast ? 'critical' : 'warning',
    title: {
      es: `DONKI en Vivo: Eyección de Masa Coronal (${speed} km/s)`,
      en: `Live DONKI: Coronal Mass Ejection (${speed} km/s)`,
    },
    kidFriendlyExplanation: {
      es: `Una nube real de plasma solar viaja a ${speed} km por segundo. Puede sobrecargar los sistemas eléctricos de la base y elevar la radiación.`,
      en: `A real cloud of solar plasma is traveling at ${speed} km per second. It can strain outpost power grids and increase radiation.`,
    },
    scienceFact: {
      es: `Evento oficial NASA DONKI CME (${id}) medido por coronógrafos SOHO/STEREO a ${speed} km/s.`,
      en: `Official NASA DONKI CME (${id}) measured by SOHO/STEREO coronagraphs at ${speed} km/s.`,
    },
    radiationMultiplier: clampNumber(rawRad, 1.0, 3.5),
    solarEfficiencyMultiplier: clampNumber(rawSolar, 0.4, 1.1),
  };
}

/**
 * Normaliza un evento para garantizar que siempre cumpla los rangos del motor:
 * radiationMultiplier en [1.0, 3.5] y solarEfficiencyMultiplier en [0.4, 1.1].
 */
export function sanitizeWeatherEvent(
  event: SpaceWeatherEvent,
  forceArchiveFlag?: boolean
): SpaceWeatherEvent {
  return {
    ...event,
    isLiveNasaData:
      forceArchiveFlag !== undefined ? !forceArchiveFlag : Boolean(event.isLiveNasaData),
    radiationMultiplier: clampNumber(event.radiationMultiplier, 1.0, 3.5),
    solarEfficiencyMultiplier: clampNumber(event.solarEfficiencyMultiplier, 0.4, 1.1),
  };
}

/**
 * Función pura que construye el pool de clima espacial a partir de respuestas crudas de DONKI
 * (FLR, SEP, CME) y el archivo histórico verificado de la NASA.
 * Garantiza:
 * - IDs únicos
 * - radiationMultiplier entre 1.0 y 3.5
 * - solarEfficiencyMultiplier entre 0.4 y 1.1
 * - Al menos un evento NOMINAL siempre presente
 * - isLiveNasaData = true para los eventos mapeados de DONKI y false para los del archivo
 */
export function buildWeatherPoolFromDonki(
  rawInput: {
    flr?: DonkiFlrItem[] | null;
    sep?: DonkiSepItem[] | null;
    cme?: DonkiCmeItem[] | null;
  },
  fallbackPool: SpaceWeatherEvent[] = VERIFIED_NASA_WEATHER_EVENTS
): SpaceWeatherEvent[] {
  const liveMapped: SpaceWeatherEvent[] = [];

  if (Array.isArray(rawInput.flr) && rawInput.flr.length > 0) {
    const latestFlares = rawInput.flr.slice(-2).reverse();
    liveMapped.push(...latestFlares.map((item, idx) => mapDonkiFlareToEvent(item, idx)));
  }

  if (Array.isArray(rawInput.sep) && rawInput.sep.length > 0) {
    const latestSeps = rawInput.sep.slice(-2).reverse();
    liveMapped.push(...latestSeps.map((item, idx) => mapDonkiSepToEvent(item, idx)));
  }

  if (Array.isArray(rawInput.cme) && rawInput.cme.length > 0) {
    const latestCmes = rawInput.cme.slice(-2).reverse();
    liveMapped.push(...latestCmes.map((item, idx) => mapDonkiCmeToEvent(item, idx)));
  }

  const archiveEvents = fallbackPool.map((ev) => sanitizeWeatherEvent(ev, true));
  const combined = [...liveMapped.map((ev) => sanitizeWeatherEvent(ev)), ...archiveEvents];

  const uniquePool: SpaceWeatherEvent[] = [];
  const seenIds = new Set<string>();

  for (const ev of combined) {
    let candidateId = ev.id.trim() || `NASA-EVENT-${uniquePool.length}`;
    if (seenIds.has(candidateId)) {
      if (ev.isLiveNasaData) {
        candidateId = `${candidateId}-LIVE-${uniquePool.length}`;
      } else {
        continue;
      }
    }
    seenIds.add(candidateId);
    uniquePool.push({
      ...ev,
      id: candidateId,
    });
  }

  const hasNominal = uniquePool.some((ev) => ev.type === 'NOMINAL');
  if (!hasNominal) {
    const fallbackNominal =
      VERIFIED_NASA_WEATHER_EVENTS.find((ev) => ev.type === 'NOMINAL') || {
        id: 'NOMINAL-SOLAR-WIND',
        type: 'NOMINAL',
        classOrIntensity: 'Viento Solar Estable (~380 km/s)',
        startTime: '2026-11-14T00:00Z',
        sourceUrl: 'https://api.nasa.gov/',
        isLiveNasaData: false,
        severity: 'nominal',
        title: {
          es: 'Clima Espacial Tranquilo — Sol Estable',
          en: 'Quiet Space Weather — Calm Sun',
        },
        kidFriendlyExplanation: {
          es: 'El Sol está tranquilo hoy. Tus paneles solares funcionan al 100%.',
          en: 'The Sun is calm today. Your solar panels run at 100% efficiency.',
        },
        scienceFact: {
          es: 'Incluso en días tranquilos existe radiación cósmica de fondo (GCR) medida por NASA OSDR.',
          en: 'Even on calm days, background Galactic Cosmic Rays (GCR) are measured by NASA OSDR.',
        },
        radiationMultiplier: 1.0,
        solarEfficiencyMultiplier: 1.05,
      };
    uniquePool.push(sanitizeWeatherEvent(fallbackNominal, true));
  }

  return uniquePool;
}

/**
 * Consulta en vivo los 3 endpoints de clima espacial de NASA DONKI (FLR, SEP y CME)
 * con timeout de 6s y combina los resultados con el archivo histórico verificado.
 * Ante HTTP 429 o cualquier error de red, devuelve el archivo verificado sin lanzar excepciones.
 */
export async function fetchLiveOrVerifiedSpaceWeather(
  forceRefresh = false
): Promise<SpaceWeatherEvent[]> {
  const verifiedFallback = buildWeatherPoolFromDonki({});

  if (!forceRefresh) {
    const cachedEnv = readCacheEnvelope<SpaceWeatherEvent[]>(DONKI_CACHE_KEY);
    if (cachedEnv && cachedEnv.payload.length > 0) {
      lastWeatherPoolStatus = {
        live: cachedEnv.payload.some((ev) => Boolean(ev.isLiveNasaData)),
        fetchedAt: new Date(cachedEnv.timestamp).toISOString(),
        count: cachedEnv.payload.length,
      };
      return cachedEnv.payload;
    }
  }

  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const apiKey = getNasaApiKey();
    const baseUrl = 'https://api.nasa.gov/DONKI';
    const queryParams = `startDate=${startStr}&endDate=${endStr}&api_key=${encodeURIComponent(apiKey)}`;

    const [flrRes, sepRes, cmeRes] = await Promise.allSettled([
      fetchWithTimeout(`${baseUrl}/FLR?${queryParams}`, NASA_FETCH_TIMEOUT_MS),
      fetchWithTimeout(`${baseUrl}/SEP?${queryParams}`, NASA_FETCH_TIMEOUT_MS),
      fetchWithTimeout(`${baseUrl}/CME?${queryParams}`, NASA_FETCH_TIMEOUT_MS),
    ]);

    // Si algún endpoint devuelve HTTP 429 (Rate Limit), respaldamos limpiamente al archivo verificado
    const hitRateLimit = [flrRes, sepRes, cmeRes].some(
      (res) => res.status === 'fulfilled' && res.value.status === 429
    );
    if (hitRateLimit) {
      lastWeatherPoolStatus = {
        live: false,
        fetchedAt: new Date().toISOString(),
        count: verifiedFallback.length,
      };
      return verifiedFallback;
    }

    let flrData: DonkiFlrItem[] | null = null;
    let sepData: DonkiSepItem[] | null = null;
    let cmeData: DonkiCmeItem[] | null = null;

    if (flrRes.status === 'fulfilled' && flrRes.value.ok) {
      try {
        const parsed = await flrRes.value.json();
        if (Array.isArray(parsed)) flrData = parsed as DonkiFlrItem[];
      } catch {
        flrData = null;
      }
    }

    if (sepRes.status === 'fulfilled' && sepRes.value.ok) {
      try {
        const parsed = await sepRes.value.json();
        if (Array.isArray(parsed)) sepData = parsed as DonkiSepItem[];
      } catch {
        sepData = null;
      }
    }

    if (cmeRes.status === 'fulfilled' && cmeRes.value.ok) {
      try {
        const parsed = await cmeRes.value.json();
        if (Array.isArray(parsed)) cmeData = parsed as DonkiCmeItem[];
      } catch {
        cmeData = null;
      }
    }

    const hasAnyLive =
      (flrData && flrData.length > 0) ||
      (sepData && sepData.length > 0) ||
      (cmeData && cmeData.length > 0);

    if (!hasAnyLive) {
      lastWeatherPoolStatus = {
        live: false,
        fetchedAt: new Date().toISOString(),
        count: verifiedFallback.length,
      };
      return verifiedFallback;
    }

    const mergedPool = buildWeatherPoolFromDonki({
      flr: flrData,
      sep: sepData,
      cme: cmeData,
    });

    const cachedTimestamp = writeCache(DONKI_CACHE_KEY, mergedPool);
    lastWeatherPoolStatus = {
      live: mergedPool.some((ev) => Boolean(ev.isLiveNasaData)),
      fetchedAt: new Date(cachedTimestamp).toISOString(),
      count: mergedPool.length,
    };
    return mergedPool;
  } catch {
    lastWeatherPoolStatus = {
      live: false,
      fetchedAt: new Date().toISOString(),
      count: verifiedFallback.length,
    };
    return verifiedFallback;
  }
}

/**
 * Consulta en vivo la API oficial NASA Image and Video Library (https://images-api.nasa.gov)
 * con timeout de 6s, manteniendo fallback instantáneo a fotografías verificadas sin lanzar excepciones.
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

  const fallbackImages =
    curatedMatches.length > 0 ? curatedMatches : VERIFIED_NASA_GALLERY_IMAGES;

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
    const response = await fetchWithTimeout(
      `https://images-api.nasa.gov/search?q=${encodeURIComponent(apiSearchTerm)}&media_type=image&page_size=4`,
      NASA_FETCH_TIMEOUT_MS
    );

    if (!response.ok) {
      return fallbackImages;
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
              ? 'MARS-IMG'
              : inferredCategory === 'solar'
                ? 'SDO-IMG'
                : inferredCategory === 'plants'
                  ? 'OSDR-IMG'
                  : inferredCategory === 'radiation'
                    ? 'RAD-IMG'
                    : 'LRO-IMG',
          isLiveApiResult: true,
        };
      })
      .filter((item): item is NasaGalleryImage => item !== null);

    const seenIds = new Set(curatedMatches.map((img) => img.nasaId));
    const combined = [
      ...curatedMatches,
      ...liveImages.filter((img) => !seenIds.has(img.nasaId)),
    ];

    const finalResult = combined.length > 0 ? combined : fallbackImages;
    writeCache(cacheKey, finalResult);
    return finalResult;
  } catch {
    return fallbackImages;
  }
}
