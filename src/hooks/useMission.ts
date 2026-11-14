/**
 * LÍDER / BLOQUE A — Hook de orquestación de la partida.
 * Único punto donde la UI toca el motor: crea misiones, aplica decisiones, sincroniza el
 * clima espacial real (DONKI en vivo o archivo verificado) y guarda la partida en el navegador.
 * Los componentes (Bloques B y C) solo reciben props; no importan el motor para mutar estado.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CoreResources,
  MissionLogEntry,
  MissionState,
  OutpostSiteId,
  PowerAllocation,
  SpaceWeatherEvent,
  TradeoffChoice,
} from "../types/mission";
import { VERIFIED_NASA_WEATHER_EVENTS } from "../data/nasa-datasets";
import { fetchLiveOrVerifiedSpaceWeather } from "../services/nasaApi";
import {
  advanceMissionTurn,
  createInitialMissionState,
  evaluateCommanderPerformance,
  projectSystemsTurn,
  selectNextWeather,
  selectStartingWeather,
} from "../engine/simulationEngine";

/** Sube la versión si cambia la forma de lo guardado para descartar partidas viejas. */
const SAVE_KEY = "jamt-mission-v2";

const SITE_IDS: OutpostSiteId[] = ["moon-shackleton", "mars-jezero"];

/** Resumen del turno recién jugado: alimenta el "Informe del día" (antes → después). */
export interface TurnSummary {
  day: number;
  previous: CoreResources;
  current: CoreResources;
  logs: MissionLogEntry[];
}

interface SavedGame {
  mission: MissionState;
  challengeSeed: number | null;
}

/** Semilla del "Reto del día": la misma para todo el mundo durante un día (UTC). */
export function getDailyChallengeSeed(date: Date = new Date()): number {
  return (
    date.getUTCFullYear() * 10000 +
    (date.getUTCMonth() + 1) * 100 +
    date.getUTCDate()
  );
}

/** Enlace para compartir una misión idéntica (mismo sitio, clima y dilemas). */
export function buildChallengeUrl(siteId: OutpostSiteId, seed: number): string {
  const url = new URL(window.location.href);
  url.search = `?site=${siteId}&seed=${seed}`;
  url.hash = "";
  return url.toString();
}

function readChallengeFromUrl(): {
  siteId: OutpostSiteId;
  seed: number;
} | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const seed = Number(params.get("seed"));
    const site = params.get("site") as OutpostSiteId | null;
    if (
      !site ||
      !SITE_IDS.includes(site) ||
      !Number.isInteger(seed) ||
      seed <= 0
    )
      return null;
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
): MissionState {
  const seed = challengeSeed ?? Date.now();
  const source = challengeSeed === null ? pool : VERIFIED_NASA_WEATHER_EVENTS;
  return createInitialMissionState(
    siteId,
    selectStartingWeather(siteId, source, seed),
    seed,
  );
}

function loadSavedGame(): SavedGame | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedGame;
    const m = saved?.mission;
    const valid =
      m?.status === "playing" && m.engine && m.currentDilemma && m.resources;
    return valid
      ? { mission: m, challengeSeed: saved.challengeSeed ?? null }
      : null;
  } catch {
    return null;
  }
}

function saveGame(game: SavedGame | null): void {
  try {
    if (game && game.mission.status === "playing") {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(game));
    } else {
      window.localStorage.removeItem(SAVE_KEY);
    }
  } catch {
    // Almacenamiento no disponible (modo privado): la partida sigue solo en memoria.
  }
}

const hasStarted = (state: MissionState) =>
  (state.engine?.history.length ?? 0) > 0;

interface InitialGame extends SavedGame {
  /** true si hay una partida que mostrar de inmediato (guardada o abierta desde un enlace de reto). */
  inProgress: boolean;
}

function initGame(defaultSite: OutpostSiteId): InitialGame {
  const linked = readChallengeFromUrl();
  if (linked) {
    return {
      mission: newMission(
        linked.siteId,
        VERIFIED_NASA_WEATHER_EVENTS,
        linked.seed,
      ),
      challengeSeed: linked.seed,
      inProgress: true,
    };
  }
  const saved = loadSavedGame();
  if (saved) return { ...saved, inProgress: true };
  return {
    mission: newMission(defaultSite, VERIFIED_NASA_WEATHER_EVENTS),
    challengeSeed: null,
    inProgress: false,
  };
}

export function useMission(defaultSite: OutpostSiteId = "moon-shackleton") {
  const [initial] = useState(() => initGame(defaultSite));
  const [weatherPool, setWeatherPool] = useState<SpaceWeatherEvent[]>(
    VERIFIED_NASA_WEATHER_EVENTS,
  );
  const [mission, setMission] = useState<MissionState>(initial.mission);
  const [challengeSeed, setChallengeSeed] = useState<number | null>(
    initial.challengeSeed,
  );
  /** false = se muestra la pantalla de bienvenida (briefing) */
  const [isBriefing, setIsBriefing] = useState(!initial.inProgress);
  const [lastTurn, setLastTurn] = useState<TurnSummary | null>(null);
  const [previewChoice, setPreviewChoice] = useState<TradeoffChoice | null>(
    null,
  );

  // Clima real: al llegar datos nuevos se usan desde el siguiente día. Si una misión libre aún
  // no empezó, se reinicia para que el clima y el dilema del Día 1 sean coherentes entre sí.
  useEffect(() => {
    let cancelled = false;
    fetchLiveOrVerifiedSpaceWeather().then((events) => {
      if (cancelled || events.length === 0) return;
      setWeatherPool(events);
      if (initial.challengeSeed !== null) return;
      setMission((prev) =>
        hasStarted(prev) ? prev : newMission(prev.siteId, events),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  useEffect(() => {
    saveGame(isBriefing ? null : { mission, challengeSeed });
  }, [mission, challengeSeed, isBriefing]);

  /** Empieza una misión. Con `seed` es un reto reproducible; sin él, una misión libre. */
  const startMission = useCallback(
    (siteId: OutpostSiteId, seed: number | null = null) => {
      setPreviewChoice(null);
      setLastTurn(null);
      setChallengeSeed(seed);
      setMission(newMission(siteId, weatherPool, seed));
      setIsBriefing(false);
    },
    [weatherPool],
  );

  const setAllocation = useCallback((allocation: PowerAllocation) => {
    setMission((prev) => ({ ...prev, powerAllocation: allocation }));
  }, []);

  /** Aplica la decisión y devuelve el estado nuevo (para que la UI dispare sonidos/modales). */
  const decide = useCallback(
    (choice: TradeoffChoice): MissionState => {
      const pool =
        challengeSeed === null ? weatherPool : VERIFIED_NASA_WEATHER_EVENTS;
      const nextWeather = selectNextWeather(mission, pool);
      const updated = advanceMissionTurn(
        mission,
        choice,
        nextWeather,
        mission.powerAllocation,
      );
      setPreviewChoice(null);
      setLastTurn({
        day: mission.currentDay,
        previous: mission.resources,
        current: updated.resources,
        logs: updated.logs.slice(0, updated.logs.length - mission.logs.length),
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
  const evaluation = useMemo(
    () => evaluateCommanderPerformance(mission),
    [mission],
  );

  return {
    mission,
    weatherPool,
    projection,
    evaluation,
    isBriefing,
    challengeSeed,
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
    setAllocation,
    decide,
  };
}
