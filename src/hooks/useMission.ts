/**
 * LÍDER / BLOQUE A — Hook de orquestación de la partida.
 * Único punto donde la UI toca el motor: crea misiones, aplica decisiones, sincroniza el
 * clima espacial real (DONKI en vivo o archivo verificado) y guarda la partida en el navegador.
 * Los componentes (Bloques B y C) solo reciben props; no importan el motor para mutar estado.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MissionState,
  OutpostSiteId,
  PowerAllocation,
  SpaceWeatherEvent,
  TradeoffChoice,
} from '../types/mission';
import { VERIFIED_NASA_WEATHER_EVENTS } from '../data/nasa-datasets';
import { fetchLiveOrVerifiedSpaceWeather } from '../services/nasaApi';
import {
  advanceMissionTurn,
  createInitialMissionState,
  evaluateCommanderPerformance,
  projectSystemsTurn,
  selectNextWeather,
  selectStartingWeather,
} from '../engine/simulationEngine';

/** Sube la versión si cambia la forma de MissionState para descartar partidas guardadas viejas. */
const SAVE_KEY = 'jamt-mission-v1';

function newMission(siteId: OutpostSiteId, pool: SpaceWeatherEvent[]): MissionState {
  const seed = Date.now();
  return createInitialMissionState(siteId, selectStartingWeather(siteId, pool, seed), seed);
}

function loadSavedMission(): MissionState | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as MissionState;
    const valid =
      saved?.status === 'playing' && saved.engine && saved.currentDilemma && saved.resources;
    return valid ? saved : null;
  } catch {
    return null;
  }
}

function saveMission(state: MissionState): void {
  try {
    if (state.status === 'playing') window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Almacenamiento no disponible (modo privado): la partida sigue solo en memoria.
  }
}

const hasStarted = (state: MissionState) => (state.engine?.history.length ?? 0) > 0;

export function useMission(defaultSite: OutpostSiteId = 'moon-shackleton') {
  const [weatherPool, setWeatherPool] = useState<SpaceWeatherEvent[]>(VERIFIED_NASA_WEATHER_EVENTS);
  const [mission, setMission] = useState<MissionState>(
    () => loadSavedMission() ?? newMission(defaultSite, VERIFIED_NASA_WEATHER_EVENTS)
  );
  const [previewChoice, setPreviewChoice] = useState<TradeoffChoice | null>(null);

  // Clima real: al llegar datos nuevos se usan desde el siguiente día. Si la partida aún no
  // empezó, se reinicia para que el clima y el dilema del Día 1 sean coherentes entre sí.
  useEffect(() => {
    let cancelled = false;
    fetchLiveOrVerifiedSpaceWeather().then((events) => {
      if (cancelled || events.length === 0) return;
      setWeatherPool(events);
      setMission((prev) => (hasStarted(prev) ? prev : newMission(prev.siteId, events)));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => saveMission(mission), [mission]);

  const startMission = useCallback(
    (siteId: OutpostSiteId) => {
      setPreviewChoice(null);
      setMission(newMission(siteId, weatherPool));
    },
    [weatherPool]
  );

  const setAllocation = useCallback((allocation: PowerAllocation) => {
    setMission((prev) => ({ ...prev, powerAllocation: allocation }));
  }, []);

  /** Aplica la decisión y devuelve el estado nuevo (para que la UI dispare sonidos/modales). */
  const decide = useCallback(
    (choice: TradeoffChoice): MissionState => {
      const nextWeather = selectNextWeather(mission, weatherPool);
      const updated = advanceMissionTurn(mission, choice, nextWeather, mission.powerAllocation);
      setPreviewChoice(null);
      setMission(updated);
      return updated;
    },
    [mission, weatherPool]
  );

  const projection = useMemo(
    () =>
      projectSystemsTurn(
        mission,
        mission.powerAllocation,
        previewChoice?.resourceDelta.shielding ?? 0
      ),
    [mission, previewChoice]
  );
  const evaluation = useMemo(() => evaluateCommanderPerformance(mission), [mission]);

  return {
    mission,
    weatherPool,
    projection,
    evaluation,
    previewChoice,
    setPreviewChoice,
    startMission,
    restartMission: useCallback(() => startMission(mission.siteId), [startMission, mission.siteId]),
    setAllocation,
    decide,
  };
}
