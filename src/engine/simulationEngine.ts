/**
 * BLOQUE A (Asignado a: Claude Code - Rama: feat/simulation-engine)
 * Motor matemático de simulación de turnos (Soles/Días), presupuesto de energía
 * y consecuencias encadenadas.
 */

import {
  CoreResources,
  MissionDilemmaCard,
  MissionState,
  OutpostSiteId,
  PowerAllocation,
  SpaceWeatherEvent,
  TradeoffChoice,
} from '../types/mission';
import { INITIAL_DILEMMA_CARDS, OUTPOST_SITES } from '../data/scenarios';

export function clampPercent(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

export function createInitialMissionState(
  siteId: OutpostSiteId,
  initialWeather: SpaceWeatherEvent
): MissionState {
  const site = OUTPOST_SITES[siteId];
  return {
    siteId,
    currentDay: 1,
    totalDays: site.totalMissionDays,
    status: 'playing',
    resources: { ...site.initialResources },
    powerAllocation: {
      lifeSupportAlloc: 30,
      shieldingAlloc: 25,
      greenhouseAlloc: 25,
      scienceAndCommsAlloc: 20,
    },
    currentWeather: initialWeather,
    currentDilemma: INITIAL_DILEMMA_CARDS[0],
    pendingDelayedEffects: [],
    logs: [
      {
        day: 1,
        title: {
          es: `Inicio de Misión en ${site.name.es}`,
          en: `Mission Initialized at ${site.name.en}`,
        },
        detail: {
          es: 'Todos los sistemas vitales en línea. Ajusta la distribución de energía y toma tu primera decisión de comandante.',
          en: 'All life support systems online. Adjust your power budget and make your first commander decision.',
        },
        severity: 'nominal',
        nasaTag: 'ARTEMIS / MARS',
      },
    ],
  };
}

/**
 * Avanza un turno (Sol / Día Lunar) aplicando:
 * 1. El trade-off de la distribución de energía (PowerAllocation)
 * 2. El impacto del clima espacial real (NASA DONKI)
 * 3. La decisión tomada por el jugador (TradeoffChoice)
 * 4. Los efectos diferidos del turno anterior (consecuencias compuestas)
 */
export function advanceMissionTurn(
  state: MissionState,
  choice: TradeoffChoice,
  nextWeather: SpaceWeatherEvent,
  allocation: PowerAllocation
): MissionState {
  const prev = state.resources;

  // 1. Cálculo de generación y consumo según distribución de energía y eficiencia solar
  const solarGain = Math.round(22 * state.currentWeather.solarEfficiencyMultiplier);
  const totalAlloc =
    allocation.lifeSupportAlloc +
    allocation.shieldingAlloc +
    allocation.greenhouseAlloc +
    allocation.scienceAndCommsAlloc;
  const powerDrainFromAlloc = Math.round((totalAlloc - 100) * 0.25);

  const lifeSupportFromPower = Math.round((allocation.lifeSupportAlloc - 25) * 0.35);
  const shieldingFromPower = Math.round((allocation.shieldingAlloc - 25) * 0.35);
  const foodFromPower = Math.round((allocation.greenhouseAlloc - 25) * 0.35);
  const scienceFromPower = Math.max(0, Math.round((allocation.scienceAndCommsAlloc - 15) * 0.4));

  // 2. Impacto de radiación espacial (DONKI) mitigado por el blindaje activo
  const effectiveShielding = clampPercent(
    prev.shielding + shieldingFromPower + (choice.resourceDelta.shielding ?? 0)
  );
  const unshieldedFactor = Math.max(0.1, (100 - effectiveShielding) / 100);
  const weatherRadiationMsv = Number(
    (0.4 * state.currentWeather.radiationMultiplier * unshieldedFactor).toFixed(2)
  );
  const radiationHealthPenalty =
    state.currentWeather.radiationMultiplier > 1.5 && effectiveShielding < 60 ? -10 : 0;

  // 3. Sumar efectos diferidos pendientes del turno anterior
  let delayedPower = 0;
  let delayedLifeSupport = 0;
  let delayedFood = 0;
  let delayedShielding = 0;
  let delayedHealth = 0;

  for (const eff of state.pendingDelayedEffects) {
    delayedPower += eff.resourceDelta.power ?? 0;
    delayedLifeSupport += eff.resourceDelta.lifeSupport ?? 0;
    delayedFood += eff.resourceDelta.food ?? 0;
    delayedShielding += eff.resourceDelta.shielding ?? 0;
    delayedHealth += eff.resourceDelta.crewHealth ?? 0;
  }

  // 4. Calcular nuevos recursos
  const nextResources: CoreResources = {
    power: clampPercent(
      prev.power +
        solarGain -
        14 -
        powerDrainFromAlloc +
        (choice.resourceDelta.power ?? 0) +
        delayedPower
    ),
    lifeSupport: clampPercent(
      prev.lifeSupport -
        6 +
        lifeSupportFromPower +
        (choice.resourceDelta.lifeSupport ?? 0) +
        delayedLifeSupport
    ),
    food: clampPercent(
      prev.food - 5 + foodFromPower + (choice.resourceDelta.food ?? 0) + delayedFood
    ),
    shielding: clampPercent(effectiveShielding + delayedShielding),
    crewHealth: clampPercent(
      prev.crewHealth +
        radiationHealthPenalty +
        (choice.resourceDelta.crewHealth ?? 0) +
        delayedHealth
    ),
    radiationDoseMsv: Number(
      (
        prev.radiationDoseMsv +
        weatherRadiationMsv +
        (choice.resourceDelta.radiationDoseMsv ?? 0)
      ).toFixed(2)
    ),
    sciencePoints:
      prev.sciencePoints + scienceFromPower + (choice.resourceDelta.sciencePoints ?? 0),
  };

  // Penalización si algún recurso vital cae muy bajo
  if (nextResources.lifeSupport < 25 || nextResources.food < 20) {
    nextResources.crewHealth = clampPercent(nextResources.crewHealth - 12);
  }

  // 5. Verificar condiciones de victoria o fallo educativo
  let status: MissionState['status'] = 'playing';
  let failureReason = undefined;

  if (nextResources.power <= 0) {
    status = 'failed';
    failureReason = {
      es: 'Apagón Total (0% Energía): La base se quedó sin baterías para mantener la calefacción y las bombas de aire.',
      en: 'Total Blackout (0% Power): The outpost ran out of battery reserves to run heaters and air pumps.',
    };
  } else if (nextResources.lifeSupport <= 0) {
    status = 'failed';
    failureReason = {
      es: 'Soporte Vital Agotado (0% O₂/Agua): Priorizar otros sistemas dejó a la tripulación sin oxígeno reciclado.',
      en: 'Life Support Depleted (0% O₂/Water): Prioritizing other systems left the crew without recycled oxygen.',
    };
  } else if (nextResources.crewHealth <= 0) {
    status = 'failed';
    failureReason = {
      es: 'Emergencia Médica de la Tripulación: La exposición a radiación solar y falta de suministros obligó a evacuar.',
      en: 'Crew Medical Emergency: Solar radiation exposure and supply shortages forced an emergency abort.',
    };
  } else if (state.currentDay >= state.totalDays) {
    status = 'won';
  }

  const nextDay = state.currentDay + 1;
  const nextDilemma: MissionDilemmaCard =
    INITIAL_DILEMMA_CARDS[(nextDay - 1) % INITIAL_DILEMMA_CARDS.length];

  const newLogs = [
    {
      day: state.currentDay,
      title: choice.label,
      detail: choice.outcomeFeedback,
      severity: state.currentWeather.severity,
      nasaTag: choice.nasaDataReference,
    },
    ...state.logs,
  ];

  return {
    ...state,
    currentDay: status === 'playing' ? nextDay : state.currentDay,
    status,
    failureReason,
    resources: nextResources,
    powerAllocation: allocation,
    currentWeather: nextWeather,
    currentDilemma: nextDilemma,
    pendingDelayedEffects: choice.nextTurnEffect ? [choice.nextTurnEffect] : [],
    logs: newLogs,
  };
}
