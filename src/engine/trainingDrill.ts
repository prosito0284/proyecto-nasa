/**
 * Simulacro de micro-emergencia del Entrenamiento Guiado (T09)
 *
 * Funciones puras: calculan qué pasaría si mañana llegara una tormenta solar real (evento SEP
 * del archivo verificado de DONKI) con el reparto de energía actual frente al modo
 * "Escudo Tormenta". NUNCA mutan `MissionState`, no avanzan el día y no pueden provocar
 * Game Over: la partida real queda intacta.
 */

import type {
  CoreResources,
  MissionState,
  OutpostSiteId,
  PowerAllocation,
  SpaceWeatherEvent,
} from '../types/mission';
import { VERIFIED_NASA_WEATHER_EVENTS } from '../data/nasa-datasets';
import { projectSystemsTurn } from './simulationEngine';

/**
 * Eventos SEP reales del archivo verificado que se usan como simulacro según la base:
 * - Luna: lluvia de protones >100 MeV del 11 de mayo de 2024 (GOES-18 / SOHO, catálogo DONKI).
 * - Marte: pico de radiación medido por Curiosity RAD el 20 de mayo de 2024 (JPL).
 */
export const TRAINING_DRILL_EVENT_IDS: Record<OutpostSiteId, string> = {
  'moon-shackleton': '2024-05-11T01:20:00-SEP-001',
  'mars-jezero': '2024-05-20T05:17:00-SEP-MARS',
};

/** Mismo reparto que el modo "Escudo Tormenta" del panel de energía. */
export const STORM_SHIELD_ALLOCATION: PowerAllocation = {
  lifeSupportAlloc: 35,
  shieldingAlloc: 40,
  greenhouseAlloc: 15,
  scienceAndCommsAlloc: 10,
};

export interface TrainingDrillOutcome {
  /** Dosis proyectada para el día del simulacro (mSv) */
  doseMsv: number;
  /** Cambio de salud de la tripulación proyectado */
  crewHealthDelta: number;
  /** Cambio del invernadero (comida): el costo del trade-off */
  foodDelta: number;
  /** Blindaje efectivo resultante (%) */
  effectiveShielding: number;
}

export interface TrainingDrillReadout {
  /** Siempre true: marca que el resultado es de entrenamiento y no toca la partida. */
  isTrainingOnly: true;
  event: SpaceWeatherEvent;
  current: TrainingDrillOutcome;
  stormShield: TrainingDrillOutcome;
  /** Dosis evitada al activar el escudo (mSv, nunca negativa) */
  doseSavedMsv: number;
}

/** Devuelve el evento SEP real usado como simulacro para la base indicada. */
export function getTrainingDrillEvent(siteId: OutpostSiteId): SpaceWeatherEvent {
  const wanted = TRAINING_DRILL_EVENT_IDS[siteId];
  const found =
    VERIFIED_NASA_WEATHER_EVENTS.find((e) => e.id === wanted) ??
    VERIFIED_NASA_WEATHER_EVENTS.find((e) => e.type === 'SEP');
  if (!found) {
    throw new Error('trainingDrill: no SEP event available in the verified NASA archive');
  }
  // Copia defensiva: el simulacro nunca comparte referencias con el archivo verificado.
  return { ...found, title: { ...found.title } };
}

function toOutcome(state: MissionState, allocation: PowerAllocation): TrainingDrillOutcome {
  const projection = projectSystemsTurn(state, allocation);
  return {
    doseMsv: projection.delta.radiationDoseMsv ?? 0,
    crewHealthDelta: projection.delta.crewHealth ?? 0,
    foodDelta: projection.delta.food ?? 0,
    effectiveShielding: projection.effectiveShielding,
  };
}

/**
 * Proyecta el simulacro sobre una copia del estado con el clima de tormenta real.
 * @param state Estado real de la misión (solo lectura).
 * @param allocation Reparto a comparar (por defecto, el actual de la misión).
 */
export function simulateTrainingDrill(
  state: MissionState,
  allocation: PowerAllocation = state.powerAllocation,
): TrainingDrillReadout {
  const event = getTrainingDrillEvent(state.siteId);
  const resources: CoreResources = { ...state.resources };
  const drillState: MissionState = { ...state, resources, currentWeather: event };
  const current = toOutcome(drillState, allocation);
  const stormShield = toOutcome(drillState, STORM_SHIELD_ALLOCATION);
  return {
    isTrainingOnly: true,
    event,
    current,
    stormShield,
    doseSavedMsv: Math.max(0, Math.round((current.doseMsv - stormShield.doseMsv) * 100) / 100),
  };
}
