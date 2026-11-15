/**
 * LÍDER / BLOQUE A — Hook de orquestación de la partida.
 * Único punto donde la UI toca el motor: crea misiones, aplica decisiones, sincroniza el
 * clima espacial real (DONKI en vivo o archivo verificado) y guarda la partida en el navegador.
 * Los componentes (Bloques B y C) solo reciben props; no importan el motor para mutar estado.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CoreResources,
  LocalizedText,
  MissionLogEntry,
  MissionState,
  OutpostSiteId,
  PowerAllocation,
  SpaceWeatherEvent,
  TradeoffChoice,
} from '../types/mission';
import { VERIFIED_NASA_WEATHER_EVENTS } from '../data/nasa-datasets';
import {
  fetchLiveOrVerifiedSpaceWeather,
  getWeatherPoolStatus,
  type WeatherPoolStatus,
} from '../services/nasaApi';
import {
  advanceMissionTurn,
  clampPercent,
  createInitialMissionState,
  evaluateCommanderPerformance,
  evaluateTurnPatchUnlocks,
  getScienceBonusTier,
  projectSystemsTurn,
  type ScienceBonusTier,
  selectNextWeather,
  selectStartingWeather,
} from '../engine/simulationEngine';
import {
  COLONY_WORLD_MODULES,
  type ColonyWorldModuleId,
  getMaintenanceConfirmation,
  type SurfaceSampleSpec,
  type WorldAnomalySpec,
} from '../components/Three/proceduralModels';

/** Sube la versión si cambia la forma de lo guardado para descartar partidas viejas. */
const SAVE_KEY = 'jamt-mission-v2';

const SITE_IDS: OutpostSiteId[] = ['moon-shackleton', 'mars-jezero'];

/** Resumen del turno recién jugado: alimenta el "Informe del día" (antes → después). */
export interface TurnSummary {
  day: number;
  previous: CoreResources;
  current: CoreResources;
  logs: MissionLogEntry[];
  scenarioId?: OutpostSiteId;
  unlockedPatchIds?: string[];
  scienceBonus?: ScienceBonusTier;
  roverSamplesCollected?: number;
  roverScienceEarned?: number;
}

interface SavedGame {
  mission: MissionState;
  challengeSeed: number | null;
  terrainSeed?: number;
  scannedAnomalyIds?: string[];
  maintainedModules?: ColonyWorldModuleId[];
}

function generateFreeTerrainSeed(prevSeed?: number): number {
  const salt = Math.floor(Math.random() * 899999);
  const raw = ((Date.now() ^ (salt * 2654435761)) >>> 0) % 900000 + 100000;
  if (prevSeed !== undefined && raw === prevSeed) {
    return ((raw + 7919) % 900000) + 100000;
  }
  return raw;
}

/** Semilla del "Reto del día": la misma para todo el mundo durante un día (UTC). */
export function getDailyChallengeSeed(date: Date = new Date()): number {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

/** Enlace para compartir una misión idéntica (mismo sitio, clima y dilemas). */
export function buildChallengeUrl(siteId: OutpostSiteId, seed: number): string {
  const url = new URL(window.location.href);
  url.search = `?site=${siteId}&seed=${seed}`;
  url.hash = '';
  return url.toString();
}

function readChallengeFromUrl(): {
  siteId: OutpostSiteId;
  seed: number;
} | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const seed = Number(params.get('seed'));
    const site = params.get('site') as OutpostSiteId | null;
    if (!site || !SITE_IDS.includes(site) || !Number.isInteger(seed) || seed <= 0) return null;
    return { siteId: site, seed };
  } catch {
    return null;
  }
}

/**
 * Misión libre: semilla aleatoria y clima del pool actual (DONKI en vivo si está disponible).
 * Misión reto: semilla fija y SIEMPRE el archivo verificado, para que dos jugadores con el
 * mismo enlace vivan exactamente la misma secuencia de clima y dilemas.
 */
function newMission(
  siteId: OutpostSiteId,
  pool: SpaceWeatherEvent[],
  challengeSeed: number | null = null,
  freeSeed?: number,
): MissionState {
  const seed = challengeSeed ?? freeSeed ?? Date.now();
  const source = challengeSeed === null ? pool : VERIFIED_NASA_WEATHER_EVENTS;
  return createInitialMissionState(siteId, selectStartingWeather(siteId, source, seed), seed);
}

function loadSavedGame(): SavedGame | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedGame;
    const m = saved?.mission;
    const valid = m?.status === 'playing' && m.engine && m.currentDilemma && m.resources;
    if (!valid) return null;
    const normalizedMission: MissionState = {
      ...m,
      collectedSampleIds: Array.isArray(m.collectedSampleIds)
        ? m.collectedSampleIds.filter((id): id is string => typeof id === 'string')
        : [],
      roverSamplesCollected:
        typeof m.roverSamplesCollected === 'number' && Number.isFinite(m.roverSamplesCollected)
          ? Math.max(0, Math.round(m.roverSamplesCollected))
          : 0,
      roverScienceEarned:
        typeof m.roverScienceEarned === 'number' && Number.isFinite(m.roverScienceEarned)
          ? Math.max(0, Math.round(m.roverScienceEarned))
          : 0,
    };
    return {
      mission: normalizedMission,
      challengeSeed: saved.challengeSeed ?? null,
      terrainSeed:
        typeof saved.terrainSeed === 'number'
          ? saved.terrainSeed
          : saved.challengeSeed ?? m.engine?.rngState,
      scannedAnomalyIds: Array.isArray(saved.scannedAnomalyIds)
        ? saved.scannedAnomalyIds.filter((id): id is string => typeof id === 'string')
        : [],
      maintainedModules: Array.isArray(saved.maintainedModules)
        ? saved.maintainedModules.filter((id): id is ColonyWorldModuleId =>
            typeof id === 'string' && id in COLONY_WORLD_MODULES,
          )
        : [],
    };
  } catch {
    return null;
  }
}

function saveGame(game: SavedGame | null): void {
  try {
    if (game && game.mission.status === 'playing') {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } else {
      window.localStorage.removeItem(SAVE_KEY);
    }
  } catch {
    // Almacenamiento no disponible (modo privado): la partida sigue solo en memoria.
  }
}

const hasStarted = (state: MissionState) =>
  (state.engine?.history.length ?? 0) > 0 ||
  (state.roverSamplesCollected ?? 0) > 0 ||
  (state.collectedSampleIds?.length ?? 0) > 0;

interface InitialGame extends SavedGame {
  /** true si hay una partida que mostrar de inmediato (guardada o abierta desde un enlace de reto). */
  inProgress: boolean;
  terrainSeed: number;
  scannedAnomalyIds: string[];
  maintainedModules: ColonyWorldModuleId[];
}

function initGame(defaultSite: OutpostSiteId): InitialGame {
  const linked = readChallengeFromUrl();
  if (linked) {
    return {
      mission: newMission(linked.siteId, VERIFIED_NASA_WEATHER_EVENTS, linked.seed),
      challengeSeed: linked.seed,
      terrainSeed: linked.seed,
      scannedAnomalyIds: [],
      maintainedModules: [],
      inProgress: true,
    };
  }
  const saved = loadSavedGame();
  if (saved) {
    return {
      ...saved,
      terrainSeed: saved.terrainSeed ?? saved.challengeSeed ?? generateFreeTerrainSeed(),
      scannedAnomalyIds: saved.scannedAnomalyIds ?? [],
      maintainedModules: saved.maintainedModules ?? [],
      inProgress: true,
    };
  }
  const initialFreeSeed = generateFreeTerrainSeed();
  return {
    mission: newMission(defaultSite, VERIFIED_NASA_WEATHER_EVENTS, null, initialFreeSeed),
    challengeSeed: null,
    terrainSeed: initialFreeSeed,
    scannedAnomalyIds: [],
    maintainedModules: [],
    inProgress: false,
  };
}

export function applySampleCollectToMission(
  prev: MissionState,
  sample: SurfaceSampleSpec,
): MissionState {
  if (prev.status !== 'playing') return prev;
  const existingIds = prev.collectedSampleIds ?? [];
  if (existingIds.includes(sample.id)) return prev;

  const nextScience = prev.resources.sciencePoints + sample.points;
  const prevTier = getScienceBonusTier(prev.resources.sciencePoints);
  const nextTier = getScienceBonusTier(nextScience);

  const entry: MissionLogEntry = {
    day: prev.currentDay,
    title: {
      es: `Muestra Rover ${sample.code}: ${sample.title.es} (+${sample.points} ciencia)`,
      en: `Rover Sample ${sample.code}: ${sample.title.en} (+${sample.points} science)`,
    },
    detail:
      nextTier.tier > prevTier.tier
        ? {
            es: `${sample.finding.es} ¡Desbloqueado ${nextTier.title.es}!`,
            en: `${sample.finding.en} Unlocked ${nextTier.title.en}!`,
          }
        : sample.finding,
    severity: 'nominal',
    nasaTag: sample.nasaSource === 'ARTEMIS' ? 'ARTEMIS / LRO' : 'Mars 2020 / Perseverance',
  };

  return {
    ...prev,
    resources: {
      ...prev.resources,
      sciencePoints: nextScience,
    },
    collectedSampleIds: [...existingIds, sample.id],
    roverSamplesCollected: (prev.roverSamplesCollected ?? 0) + 1,
    roverScienceEarned: (prev.roverScienceEarned ?? 0) + sample.points,
    logs: [entry, ...prev.logs],
  };
}

export function applyAnomalyScanToMission(
  prev: MissionState,
  anomaly: WorldAnomalySpec,
): MissionState {
  const entry: MissionLogEntry = {
    day: prev.currentDay,
    title: {
      es: `Rover: ${anomaly.title.es} (+3 ciencia)`,
      en: `Rover: ${anomaly.title.en} (+3 science)`,
    },
    detail: anomaly.finding,
    severity: 'nominal',
    nasaTag: anomaly.nasaSource === 'ARTEMIS' ? 'Lunar Rover LRO' : 'Mars Rover Perseverance',
  };
  return {
    ...prev,
    resources: {
      ...prev.resources,
      sciencePoints: prev.resources.sciencePoints + 3,
    },
    logs: [entry, ...prev.logs],
  };
}

export function getMaintenanceDelayedBonus(
  moduleId: ColonyWorldModuleId,
): { description: LocalizedText; resourceDelta: Partial<CoreResources> } | null {
  switch (moduleId) {
    case 'power-grid':
      return {
        description: {
          es: 'Paneles cepillados: +3 % batería garantizados al cierre del turno.',
          en: 'Solar arrays brushed: +3% battery guaranteed at turn close.',
        },
        resourceDelta: { power: 3 },
      };
    case 'oxygen-module':
      return {
        description: {
          es: 'Radiadores ECLSS purgados: +3 % soporte vital al cierre del turno.',
          en: 'ECLSS radiators purged: +3% life support at turn close.',
        },
        resourceDelta: { lifeSupport: 3 },
      };
    case 'greenhouse':
      return {
        description: {
          es: 'Boquillas Veggie limpias: +3 % comida al cierre del turno.',
          en: 'Veggie nozzles rinsed: +3% food yield at turn close.',
        },
        resourceDelta: { food: 3 },
      };
    case 'comms-array':
      return {
        description: {
          es: 'Antena recalibrada: +2 puntos de ciencia al cierre del turno.',
          en: 'Dish recalibrated: +2 science points at turn close.',
        },
        resourceDelta: { sciencePoints: 2 },
      };
    default:
      return null;
  }
}

export function applyMaintenanceToMission(
  prev: MissionState,
  moduleId: ColonyWorldModuleId,
): MissionState | null {
  const confirmation = getMaintenanceConfirmation(moduleId);
  if (!confirmation) return null;

  const nextRes: CoreResources = { ...prev.resources };
  if (moduleId === 'power-grid') {
    nextRes.power = clampPercent(nextRes.power + 2);
  } else if (moduleId === 'oxygen-module') {
    nextRes.lifeSupport = clampPercent(nextRes.lifeSupport + 2);
  } else if (moduleId === 'greenhouse') {
    nextRes.food = clampPercent(nextRes.food + 2);
  } else if (moduleId === 'comms-array') {
    nextRes.sciencePoints += 1;
  }
  const delayedBonus = getMaintenanceDelayedBonus(moduleId);
  const modLabel = COLONY_WORLD_MODULES[moduleId].label;
  const entry: MissionLogEntry = {
    day: prev.currentDay,
    title: {
      es: `Mantenimiento: ${modLabel.es}`,
      en: `Maintenance: ${modLabel.en}`,
    },
    detail: confirmation,
    severity: 'nominal',
    nasaTag: prev.siteId === 'moon-shackleton' ? 'Artemis ECLSS' : 'Mars Perseverance',
  };
  return {
    ...prev,
    resources: nextRes,
    pendingDelayedEffects: delayedBonus
      ? [...prev.pendingDelayedEffects, delayedBonus]
      : prev.pendingDelayedEffects,
    logs: [entry, ...prev.logs],
  };
}

export function useMission(defaultSite: OutpostSiteId = 'moon-shackleton') {
  const [initial] = useState(() => initGame(defaultSite));
  const [weatherPool, setWeatherPool] = useState<SpaceWeatherEvent[]>(VERIFIED_NASA_WEATHER_EVENTS);
  const [mission, setMission] = useState<MissionState>(initial.mission);
  const [challengeSeed, setChallengeSeed] = useState<number | null>(initial.challengeSeed);
  const [terrainSeed, setTerrainSeed] = useState<number>(initial.terrainSeed);
  const [scannedAnomalyIds, setScannedAnomalyIds] = useState<string[]>(initial.scannedAnomalyIds);
  const scannedAnomalyRef = useRef<string[]>(initial.scannedAnomalyIds);
  const collectedSamplesRef = useRef<string[]>(initial.mission.collectedSampleIds ?? []);
  const [maintainedModules, setMaintainedModules] = useState<ColonyWorldModuleId[]>(
    initial.maintainedModules,
  );
  const maintainedModulesRef = useRef<ColonyWorldModuleId[]>(initial.maintainedModules);
  /** false = se muestra la pantalla de bienvenida (briefing) */
  const [isBriefing, setIsBriefing] = useState(!initial.inProgress);
  const [lastTurn, setLastTurn] = useState<TurnSummary | null>(null);
  const [previewChoice, setPreviewChoice] = useState<TradeoffChoice | null>(null);
  /** Procedencia del clima cargado: DONKI en vivo o archivo verificado. */
  const [weatherStatus, setWeatherStatus] = useState<WeatherPoolStatus | null>(null);

  // Clima real: al llegar datos nuevos se usan desde el siguiente día. Si una misión libre aún
  // no empezó, se reinicia para que el clima y el dilema del Día 1 sean coherentes entre sí.
  useEffect(() => {
    let cancelled = false;
    fetchLiveOrVerifiedSpaceWeather().then((events) => {
      if (cancelled) return;
      setWeatherStatus(getWeatherPoolStatus());
      if (events.length === 0) return;
      setWeatherPool(events);
      if (initial.challengeSeed !== null) return;
      setMission((prev) =>
        hasStarted(prev)
          ? prev
          : newMission(prev.siteId, events, null, initial.terrainSeed),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  useEffect(() => {
    saveGame(
      isBriefing
        ? null
        : { mission, challengeSeed, terrainSeed, scannedAnomalyIds, maintainedModules },
    );
  }, [mission, challengeSeed, terrainSeed, scannedAnomalyIds, maintainedModules, isBriefing]);

  /** Empieza una misión. Con `seed` es un reto reproducible; sin él, una misión libre. */
  const startMission = useCallback(
    (siteId: OutpostSiteId, seed: number | null = null) => {
      setPreviewChoice(null);
      setLastTurn(null);
      setChallengeSeed(seed);
      const nextTerrainSeed = seed ?? generateFreeTerrainSeed();
      setTerrainSeed(nextTerrainSeed);
      scannedAnomalyRef.current = [];
      setScannedAnomalyIds([]);
      collectedSamplesRef.current = [];
      maintainedModulesRef.current = [];
      setMaintainedModules([]);
      setMission(newMission(siteId, weatherPool, seed, nextTerrainSeed));
      setIsBriefing(false);
    },
    [weatherPool],
  );

  /** En partida libre genera una nueva topografía procedural sin alterar recursos del turno. */
  const reseedTerrain = useCallback(() => {
    if (challengeSeed !== null) return;
    setTerrainSeed((prev) => generateFreeTerrainSeed(prev));
  }, [challengeSeed]);

  /** Registra el escaneo 3D de una anomalía una sola vez (+3 ciencia). */
  const recordAnomalyScan = useCallback(
    (anomaly: WorldAnomalySpec): boolean => {
      if (mission.status !== 'playing') return false;
      if (scannedAnomalyRef.current.includes(anomaly.id)) return false;
      const nextIds = [...scannedAnomalyRef.current, anomaly.id];
      scannedAnomalyRef.current = nextIds;
      setScannedAnomalyIds(nextIds);
      setMission((prev) => applyAnomalyScanToMission(prev, anomaly));
      return true;
    },
    [mission.status],
  );

  /** R06: Registra la recolección física 3D de una muestra por el Rover y suma sus puntos de ciencia. */
  const recordSampleCollection = useCallback(
    (sample: SurfaceSampleSpec): boolean => {
      if (mission.status !== 'playing') return false;
      if (collectedSamplesRef.current.includes(sample.id)) return false;
      collectedSamplesRef.current = [...collectedSamplesRef.current, sample.id];
      setMission((prev) => applySampleCollectToMission(prev, sample));
      return true;
    },
    [mission.status],
  );

  /** Registra mantenimiento directo 3D en un módulo afectado (1 vez por módulo y turno). */
  const recordModuleMaintenance = useCallback(
    (moduleId: ColonyWorldModuleId): boolean => {
      if (mission.status !== 'playing') return false;
      if (maintainedModulesRef.current.includes(moduleId)) return false;
      if (!getMaintenanceConfirmation(moduleId)) return false;

      const nextIds = [...maintainedModulesRef.current, moduleId];
      maintainedModulesRef.current = nextIds;
      setMaintainedModules(nextIds);

      setMission((prev) => applyMaintenanceToMission(prev, moduleId) ?? prev);
      return true;
    },
    [mission.status],
  );

  const setAllocation = useCallback((allocation: PowerAllocation) => {
    setMission((prev) => ({ ...prev, powerAllocation: allocation }));
  }, []);

  /** Aplica la decisión y devuelve el estado nuevo (para que la UI dispare sonidos/modales). */
  const decide = useCallback(
    (choice: TradeoffChoice): MissionState => {
      const pool = challengeSeed === null ? weatherPool : VERIFIED_NASA_WEATHER_EVENTS;
      const nextWeather = selectNextWeather(mission, pool);
      const updated = advanceMissionTurn(mission, choice, nextWeather, mission.powerAllocation);
      const activeBonus = getScienceBonusTier(updated.resources.sciencePoints);
      const unlockedPatchIds = evaluateTurnPatchUnlocks(mission, updated);
      maintainedModulesRef.current = [];
      setMaintainedModules([]);
      setPreviewChoice(null);
      setLastTurn({
        day: mission.currentDay,
        previous: mission.resources,
        current: updated.resources,
        logs: updated.logs.slice(0, updated.logs.length - mission.logs.length),
        scenarioId: updated.siteId,
        unlockedPatchIds,
        scienceBonus: activeBonus,
        roverSamplesCollected: updated.roverSamplesCollected ?? 0,
        roverScienceEarned: updated.roverScienceEarned ?? 0,
      });
      setMission(updated);
      return updated;
    },
    [mission, weatherPool, challengeSeed],
  );

  const projection = useMemo(
    () =>
      projectSystemsTurn(
        mission,
        mission.powerAllocation,
        previewChoice?.resourceDelta.shielding ?? 0,
      ),
    [mission, previewChoice],
  );
  const evaluation = useMemo(() => evaluateCommanderPerformance(mission), [mission]);

  return {
    mission,
    weatherPool,
    weatherStatus,
    projection,
    evaluation,
    isBriefing,
    challengeSeed,
    terrainSeed,
    reseedTerrain,
    scannedAnomalyIds,
    maintainedModules,
    recordAnomalyScan,
    recordSampleCollection,
    recordModuleMaintenance,
    lastTurn,
    dismissTurnReport: useCallback(() => setLastTurn(null), []),
    previewChoice,
    setPreviewChoice,
    startMission,
    /** Repite la misma base; si era un reto, repite exactamente el mismo reto. */
    restartMission: useCallback(
      () => startMission(mission.siteId, challengeSeed),
      [startMission, mission.siteId, challengeSeed],
    ),
    openBriefing: useCallback(() => {
      setLastTurn(null);
      setIsBriefing(true);
    }, []),
    /** Vuelve a la misión en curso sin reiniciarla ni perder el progreso actual. */
    resumeMission: useCallback(() => {
      setLastTurn(null);
      setIsBriefing(false);
    }, []),
    setAllocation,
    decide,
  };
}
