/**
 * BLOQUE A (Asignado a: Claude Code - Rama: feat/simulation-engine)
 * Motor matemático de simulación de turnos (Soles/Días), presupuesto de energía
 * y consecuencias encadenadas.
 *
 * Todas las funciones son puras: reciben estado y devuelven estado nuevo.
 * La aleatoriedad (eventos locales, orden del mazo) usa un generador con semilla
 * guardado en el propio estado, así una partida se puede reproducir.
 */

import {
  CoreResources,
  CrewMood,
  CrewStatus,
  EngineTelemetry,
  LocalizedText,
  MissionDilemmaCard,
  MissionLogEntry,
  MissionState,
  OutpostSiteId,
  PowerAllocation,
  SpaceWeatherEvent,
  TradeoffChoice,
} from '../types/mission';
import { CREW_LINES, CREW_MEMBERS, CREW_REACTIONS, CREW_WEATHER_LINES } from '../data/crew';
import {
  INITIAL_DILEMMA_CARDS,
  OUTPOST_SITES,
  SITE_ENVIRONMENT_EVENTS,
  SITE_PHYSICS,
  getDilemmaDeckForSite,
} from '../data/scenarios';

// ───────────────────────────── Tipos internos del motor ─────────────────────────────

export type { DecisionRecord, EngineTelemetry } from '../types/mission';

/** @deprecated `MissionState` ya incluye el campo opcional `engine`. Se mantiene por compatibilidad. */
export type EngineMissionState = MissionState;

const STORM_TYPES: SpaceWeatherEvent['type'][] = ['FLR', 'SEP', 'CME'];

// Constantes de balance (ajustadas con simulaciones Monte Carlo de partidas completas)
const BASELINE_ALLOC = 25; // % de referencia por sistema (4 sistemas × 25 = 100%)
const ALLOC_EFFECT = 0.4; // cuánto mueve un sistema cada punto de energía por encima/debajo de 25
const OVERLOAD_DRAIN = 0.3; // batería extra perdida por cada % de carga por encima de 100
const UNDERLOAD_SAVING = 0.2; // batería ahorrada por cada % por debajo de 100
const STORM_SAFE_SHIELDING = 60;

// ───────────────────────────── Utilidades ─────────────────────────────

export function clampPercent(val: number): number {
  return Math.max(0, Math.min(100, Math.round(val)));
}

const round2 = (v: number) => Number(v.toFixed(2));

/** Generador pseudoaleatorio mulberry32: devuelve [valor 0..1, nuevo estado]. */
function nextRandom(rngState: number): [number, number] {
  const s = (rngState + 0x6d2b79f5) >>> 0;
  let x = s;
  x = Math.imul(x ^ (x >>> 15), x | 1);
  x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  const value = ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  return [value, s];
}

function totalLoad(a: PowerAllocation): number {
  return a.lifeSupportAlloc + a.shieldingAlloc + a.greenhouseAlloc + a.scienceAndCommsAlloc;
}

function freshTelemetry(state: MissionState, seed: number): EngineTelemetry {
  const r = state.resources;
  return {
    rngState: seed >>> 0,
    usedDilemmaIds: state.currentDilemma ? [state.currentDilemma.id] : [],
    history: [],
    minPower: r.power,
    minLifeSupport: r.lifeSupport,
    minFood: r.food,
    minCrewHealth: r.crewHealth,
    maxLoad: totalLoad(state.powerAllocation),
    overloadTurns: 0,
    stormDays: 0,
    shieldedStormDays: 0,
    dustStormDays: 0,
    dustStormPowerFloor: 100,
    startingDoseMsv: r.radiationDoseMsv,
  };
}

/** Lee la telemetría del estado (o la reconstruye si la UI perdió el campo extra). */
export function getEngineTelemetry(state: MissionState): EngineTelemetry {
  const existing = state.engine;
  if (existing) return existing;
  return freshTelemetry(state, state.currentDay * 2654435761);
}

// ───────────────────────────── Clima y comunicaciones ─────────────────────────────

/**
 * En días tranquilos, el entorno local puede generar su propio evento:
 * tormentas de polvo en Marte o sombras pasajeras en el borde de Shackleton.
 */
function applyLocalEnvironment(
  siteId: OutpostSiteId,
  weather: SpaceWeatherEvent,
  rngState: number
): [SpaceWeatherEvent, number] {
  const [roll, next] = nextRandom(rngState);
  if (weather.type !== 'NOMINAL') return [weather, next];
  if (roll < SITE_PHYSICS[siteId].localEventChance) {
    return [SITE_ENVIRONMENT_EVENTS[siteId], next];
  }
  return [weather, next];
}

/**
 * Elige el próximo evento del pool de clima (DONKI en vivo o archivo real) evitando
 * repetir el mismo evento dos días seguidos. Útil para la UI si quiere variedad.
 */
export function selectNextWeather(
  state: MissionState,
  pool: SpaceWeatherEvent[]
): SpaceWeatherEvent {
  const tel = getEngineTelemetry(state);
  return pickWeather(state.siteId, pool, tel.rngState ^ 0x9e3779b9, state.currentWeather);
}

/** Clima del Día/Sol 1 de una partida nueva (varía con la semilla para dar rejugabilidad). */
export function selectStartingWeather(
  siteId: OutpostSiteId,
  pool: SpaceWeatherEvent[],
  seed: number = Date.now()
): SpaceWeatherEvent {
  return pickWeather(siteId, pool, seed >>> 0);
}

/** Probabilidad de día tranquilo: da respiro entre tormentas para que haya días de ciencia y EVA. */
const CALM_DAY_CHANCE = 0.4;

function pickWeather(
  siteId: OutpostSiteId,
  pool: SpaceWeatherEvent[],
  rngState: number,
  current?: SpaceWeatherEvent
): SpaceWeatherEvent {
  // En la Luna no hay atmósfera: las tormentas de polvo solo existen en Marte.
  const valid = pool.filter((w) => siteId === 'mars-jezero' || w.type !== 'DUST_STORM');
  if (valid.length === 0) return current ?? pool[0];
  const calm = valid.filter((w) => w.type === 'NOMINAL');
  const active = valid.filter((w) => w.type !== 'NOMINAL' && w.id !== current?.id);

  const [calmRoll, rng] = nextRandom(rngState);
  const [pickRoll] = nextRandom(rng);
  const source =
    calm.length > 0 && (calmRoll < CALM_DAY_CHANCE || active.length === 0)
      ? calm
      : active.length > 0
        ? active
        : valid;
  return source[Math.floor(pickRoll * source.length)] ?? valid[0];
}

/**
 * Retraso de comunicación de un día concreto (segundos, una vía).
 * Luna: ~1.3 s. Marte: varía entre 4 y 24 min según la posición orbital.
 */
export function getCommDelaySeconds(siteId: OutpostSiteId, day: number): number {
  const [min, max] = SITE_PHYSICS[siteId].commDelayRangeSeconds;
  if (siteId === 'moon-shackleton') return OUTPOST_SITES[siteId].commDelaySeconds;
  // Oscilación suave alrededor del valor de referencia del sitio (12 min)
  const base = OUTPOST_SITES[siteId].commDelaySeconds;
  const swing = Math.sin(day * 0.7) * 120;
  return Math.round(Math.max(min, Math.min(max, base + swing)));
}

// ───────────────────────────── Selección de dilemas ─────────────────────────────

/**
 * Elige la próxima tarjeta de dilema:
 * - Si el clima de mañana coincide con una tarjeta disparada por clima, tiene prioridad (70%).
 * - Si no, se elige al azar una tarjeta general del sitio que no se haya jugado.
 * - Las tarjetas disparadas por clima NUNCA aparecen si ese clima no está activo.
 */
export function selectNextDilemma(
  siteId: OutpostSiteId,
  weather: SpaceWeatherEvent,
  usedIds: string[],
  rngState: number
): [MissionDilemmaCard, number] {
  const deck = getDilemmaDeckForSite(siteId);
  const isPlayable = (c: MissionDilemmaCard) =>
    !c.triggeredByWeather || c.triggeredByWeather.includes(weather.type);

  let pool = deck.filter((c) => isPlayable(c) && !usedIds.includes(c.id));
  if (pool.length === 0) pool = deck.filter(isPlayable); // mazo agotado: se rebaraja
  if (pool.length === 0) pool = deck;

  const triggered = pool.filter((c) => c.triggeredByWeather?.includes(weather.type));
  const general = pool.filter((c) => !c.triggeredByWeather);

  let [roll, rng] = nextRandom(rngState);
  let source = pool;
  if (triggered.length > 0 && (roll < 0.7 || general.length === 0)) source = triggered;
  else if (general.length > 0) source = general;

  [roll, rng] = nextRandom(rng);
  return [source[Math.floor(roll * source.length)] ?? deck[0], rng];
}

// ───────────────────────────── Estado inicial ─────────────────────────────

export const DEFAULT_POWER_ALLOCATION: PowerAllocation = {
  lifeSupportAlloc: 30,
  shieldingAlloc: 25,
  greenhouseAlloc: 25,
  scienceAndCommsAlloc: 20,
};

export function createInitialMissionState(
  siteId: OutpostSiteId,
  initialWeather: SpaceWeatherEvent,
  seed: number = Date.now()
): MissionState {
  const site = OUTPOST_SITES[siteId];
  const [firstCard, rngState] = selectNextDilemma(siteId, initialWeather, [], seed >>> 0);

  const base: MissionState = {
    siteId,
    currentDay: 1,
    totalDays: site.totalMissionDays,
    status: 'playing',
    resources: { ...site.initialResources },
    powerAllocation: { ...DEFAULT_POWER_ALLOCATION },
    currentWeather: initialWeather,
    currentDilemma: firstCard,
    pendingDelayedEffects: [],
    logs: [
      {
        day: 1,
        title: {
          es: `Inicio de Misión en ${site.name.es}`,
          en: `Mission Initialized at ${site.name.en}`,
        },
        detail: {
          es: `Todos los sistemas vitales en línea. Retraso de comunicación con la Tierra: ${site.commDelayDisplay.es}. Ajusta la distribución de energía y toma tu primera decisión de comandante.`,
          en: `All life support systems online. Earth communication delay: ${site.commDelayDisplay.en}. Adjust your power budget and make your first commander decision.`,
        },
        severity: 'nominal',
        nasaTag: siteId === 'moon-shackleton' ? 'ARTEMIS / LRO' : 'MARS 2020 / RAD',
      },
    ],
  };

  const state: EngineMissionState = {
    ...base,
    engine: { ...freshTelemetry(base, rngState), usedDilemmaIds: [firstCard.id] },
  };
  return state;
}

// ───────────────────────────── Física del turno ─────────────────────────────

export interface TurnProjection {
  /** Cambios por turno debidos SOLO a la energía asignada y al clima (sin la tarjeta) */
  delta: Required<Omit<CoreResources, 'radiationDoseMsv'>> & { radiationDoseMsv: number };
  solarGain: number;
  load: number;
  effectiveShielding: number;
}

/**
 * Calcula el efecto de la distribución de energía + clima espacial de HOY.
 * Se puede usar desde la UI para mostrar una vista previa antes de confirmar.
 */
export function projectSystemsTurn(
  state: MissionState,
  allocation: PowerAllocation,
  choiceShieldingDelta = 0
): TurnProjection {
  const phys = SITE_PHYSICS[state.siteId];
  const weather = state.currentWeather;
  const prev = state.resources;
  const load = totalLoad(allocation);

  // Energía: generación solar - consumo base - sobrecarga (o ahorro si se usa < 100%)
  const solarGain = Math.round(phys.solarGainPerTurn * weather.solarEfficiencyMultiplier);
  const loadPenalty =
    load > 100 ? (load - 100) * OVERLOAD_DRAIN : -(100 - load) * UNDERLOAD_SAVING;
  const powerDelta = Math.round(solarGain - phys.baseHabitatLoad - loadPenalty);

  // Soporte vital, comida, blindaje dependen de cuánta energía reciben
  const lifeSupportDelta = Math.round(
    -phys.lifeSupportDrainPerTurn + (allocation.lifeSupportAlloc - BASELINE_ALLOC) * ALLOC_EFFECT
  );
  const foodDelta = Math.round(
    -phys.foodDrainPerTurn + (allocation.greenhouseAlloc - BASELINE_ALLOC) * ALLOC_EFFECT
  );
  const shieldingDelta = Math.round(
    -phys.shieldingDecayPerTurn + (allocation.shieldingAlloc - BASELINE_ALLOC) * ALLOC_EFFECT
  );

  // Ciencia: rovers y antenas. En tormenta de polvo los rovers rinden la mitad.
  const scienceEfficiency = weather.type === 'DUST_STORM' ? 0.5 : 1;
  const scienceDelta = Math.max(
    0,
    Math.round((allocation.scienceAndCommsAlloc - 10) * 0.5 * scienceEfficiency)
  );

  // Radiación: dosis de fondo real × multiplicador DONKI × fracción no blindada
  const effectiveShielding = clampPercent(prev.shielding + shieldingDelta + choiceShieldingDelta);
  const unshielded = Math.max(0.15, 1 - (effectiveShielding / 100) * 0.85);
  const doseMsv = round2(phys.backgroundDoseMsvPerDay * weather.radiationMultiplier * unshielded);

  // Salud: tormentas fuertes dañan si el blindaje es bajo (penalización continua)
  let healthDelta = 0;
  if (weather.radiationMultiplier > 1.5) {
    const stormStrength = (weather.radiationMultiplier - 1) / 2; // X8.7 ≈ 0.9
    healthDelta -= Math.round((1 - effectiveShielding / 100) * 22 * stormStrength);
  }

  return {
    delta: {
      power: powerDelta,
      lifeSupport: lifeSupportDelta,
      food: foodDelta,
      shielding: shieldingDelta,
      crewHealth: healthDelta,
      radiationDoseMsv: doseMsv,
      sciencePoints: scienceDelta,
    },
    solarGain,
    load,
    effectiveShielding,
  };
}

type Delta = Partial<CoreResources>;

function sumDeltas(deltas: Delta[]): Required<CoreResources> {
  const out: Required<CoreResources> = {
    power: 0,
    lifeSupport: 0,
    food: 0,
    shielding: 0,
    crewHealth: 0,
    radiationDoseMsv: 0,
    sciencePoints: 0,
  };
  for (const d of deltas) {
    out.power += d.power ?? 0;
    out.lifeSupport += d.lifeSupport ?? 0;
    out.food += d.food ?? 0;
    out.shielding += d.shielding ?? 0;
    out.crewHealth += d.crewHealth ?? 0;
    out.radiationDoseMsv += d.radiationDoseMsv ?? 0;
    out.sciencePoints += d.sciencePoints ?? 0;
  }
  return out;
}

// ───────────────────────────── Avance de turno ─────────────────────────────

/**
 * Avanza un turno (Sol / Día Lunar) aplicando:
 * 1. El trade-off de la distribución de energía (PowerAllocation)
 * 2. El impacto del clima espacial real (NASA DONKI) o local (polvo / sombra)
 * 3. La decisión tomada por el jugador (TradeoffChoice)
 * 4. Los efectos diferidos del turno anterior (consecuencias compuestas)
 * 5. Consecuencias automáticas que se arrastran al siguiente turno
 */
export function advanceMissionTurn(
  state: MissionState,
  choice: TradeoffChoice,
  nextWeather: SpaceWeatherEvent,
  allocation: PowerAllocation
): MissionState {
  if (state.status !== 'playing') return state;

  const phys = SITE_PHYSICS[state.siteId];
  const tel = { ...getEngineTelemetry(state) };
  const prev = state.resources;
  const weather = state.currentWeather;
  const day = state.currentDay;
  const consequenceLogs: MissionLogEntry[] = [];

  // 1-2. Sistemas + clima
  const proj = projectSystemsTurn(state, allocation, choice.resourceDelta.shielding ?? 0);

  // 3-4. Decisión del jugador + efectos diferidos del turno anterior
  const delayed = sumDeltas(state.pendingDelayedEffects.map((e) => e.resourceDelta));
  const chosen = sumDeltas([choice.resourceDelta]);

  for (const eff of state.pendingDelayedEffects) {
    consequenceLogs.push({
      day,
      title: { es: 'Consecuencia de ayer', en: 'Yesterday’s consequence' },
      detail: eff.description,
      severity: 'watch',
    });
  }

  const next: CoreResources = {
    power: clampPercent(prev.power + proj.delta.power + chosen.power + delayed.power),
    lifeSupport: clampPercent(
      prev.lifeSupport + proj.delta.lifeSupport + chosen.lifeSupport + delayed.lifeSupport
    ),
    food: clampPercent(prev.food + proj.delta.food + chosen.food + delayed.food),
    shielding: clampPercent(proj.effectiveShielding + delayed.shielding),
    crewHealth: clampPercent(
      prev.crewHealth + proj.delta.crewHealth + chosen.crewHealth + delayed.crewHealth
    ),
    radiationDoseMsv: round2(
      prev.radiationDoseMsv +
        proj.delta.radiationDoseMsv +
        Math.max(0, chosen.radiationDoseMsv + delayed.radiationDoseMsv)
    ),
    sciencePoints: Math.max(
      0,
      prev.sciencePoints + proj.delta.sciencePoints + chosen.sciencePoints + delayed.sciencePoints
    ),
  };

  // Salud: efectos de recursos bajos / altos sobre la tripulación
  let healthAdj = 0;
  if (next.lifeSupport < 25) healthAdj -= 8;
  if (next.food < 20) healthAdj -= 6;
  if (next.food === 0) healthAdj -= 8;
  const missionDose = next.radiationDoseMsv - tel.startingDoseMsv;
  if (missionDose > phys.doseWarningMsv) healthAdj -= 3;
  if (healthAdj === 0 && next.lifeSupport >= 60 && next.food >= 50 && weather.radiationMultiplier <= 1.5) {
    healthAdj += 3; // tripulación bien alimentada y descansada se recupera
  }
  next.crewHealth = clampPercent(next.crewHealth + healthAdj);

  if (proj.delta.crewHealth < 0) {
    consequenceLogs.push({
      day,
      title: { es: 'Radiación de tormenta solar', en: 'Solar storm radiation' },
      detail: {
        es: `Con el blindaje al ${proj.effectiveShielding}%, la tormenta (${weather.classOrIntensity}) bajó la salud ${-proj.delta.crewHealth}%. Más blindaje = menos daño.`,
        en: `With shielding at ${proj.effectiveShielding}%, the storm (${weather.classOrIntensity}) lowered health by ${-proj.delta.crewHealth}%. More shielding = less harm.`,
      },
      severity: proj.effectiveShielding < STORM_SAFE_SHIELDING ? 'warning' : 'watch',
      nasaTag: 'DONKI',
    });
  }

  // 5. Consecuencias automáticas para mañana (efectos compuestos del motor)
  const newPending: MissionState['pendingDelayedEffects'] = [];
  if (choice.nextTurnEffect) newPending.push(choice.nextTurnEffect);

  if (next.power < 15) {
    newPending.push({
      description: {
        es: 'Batería casi vacía: se apagaron bombas y calefactores durante la noche (-6% Soporte Vital, -4% Comida).',
        en: 'Battery nearly empty: pumps and heaters shut down overnight (-6% Life Support, -4% Food).',
      },
      resourceDelta: { lifeSupport: -6, food: -4 },
    });
  }
  if (proj.load > 110) {
    newPending.push({
      description: {
        es: `Sobrecarga eléctrica (${proj.load}%): los cables se calentaron y el blindaje activo perdió potencia (-5% Blindaje).`,
        en: `Electrical overload (${proj.load}%): wiring overheated and active shielding lost power (-5% Shielding).`,
      },
      resourceDelta: { shielding: -5 },
    });
  }
  if (next.food < 25 && next.food > 0) {
    newPending.push({
      description: {
        es: 'Comida racionada: la tripulación tiene hambre y trabaja más lento (-4% Salud).',
        en: 'Food is rationed: the crew is hungry and works slower (-4% Health).',
      },
      resourceDelta: { crewHealth: -4 },
    });
  }

  // Telemetría para logros
  tel.history = [
    ...tel.history,
    { day, cardId: state.currentDilemma?.id ?? 'none', choiceId: choice.id, weatherType: weather.type },
  ];
  tel.minPower = Math.min(tel.minPower, next.power);
  tel.minLifeSupport = Math.min(tel.minLifeSupport, next.lifeSupport);
  tel.minFood = Math.min(tel.minFood, next.food);
  tel.minCrewHealth = Math.min(tel.minCrewHealth, next.crewHealth);
  tel.maxLoad = Math.max(tel.maxLoad, proj.load);
  if (proj.load > 100) tel.overloadTurns += 1;
  if (STORM_TYPES.includes(weather.type)) {
    tel.stormDays += 1;
    if (proj.effectiveShielding >= STORM_SAFE_SHIELDING) tel.shieldedStormDays += 1;
  }
  if (weather.type === 'DUST_STORM') {
    tel.dustStormDays += 1;
    tel.dustStormPowerFloor = Math.min(tel.dustStormPowerFloor, next.power);
  }

  // Victoria / derrota
  let status: MissionState['status'] = 'playing';
  let failureReason: LocalizedText | undefined;

  if (next.power <= 0) {
    status = 'failed';
    failureReason = {
      es: 'Apagón Total (0% Energía): La base se quedó sin baterías para mantener la calefacción y las bombas de aire. Lección: guarda siempre una reserva de energía.',
      en: 'Total Blackout (0% Power): The outpost ran out of battery reserves to run heaters and air pumps. Lesson: always keep an energy reserve.',
    };
  } else if (next.lifeSupport <= 0) {
    status = 'failed';
    failureReason = {
      es: 'Soporte Vital Agotado (0% O₂/Agua): Priorizar otros sistemas dejó a la tripulación sin oxígeno reciclado. Lección: el aire es lo primero.',
      en: 'Life Support Depleted (0% O₂/Water): Prioritizing other systems left the crew without recycled oxygen. Lesson: air comes first.',
    };
  } else if (next.crewHealth <= 0) {
    status = 'failed';
    failureReason = {
      es: 'Emergencia Médica de la Tripulación: La radiación solar, el hambre o el cansancio obligaron a evacuar. Lección: la tripulación es el sistema más importante.',
      en: 'Crew Medical Emergency: Solar radiation, hunger or fatigue forced an emergency abort. Lesson: the crew is the most important system.',
    };
  } else if (day >= state.totalDays) {
    status = 'won';
  }

  // Clima y dilema de mañana
  let rng = tel.rngState;
  let upcomingWeather = nextWeather;
  let nextDilemma: MissionDilemmaCard | null = null;
  if (status === 'playing') {
    [upcomingWeather, rng] = applyLocalEnvironment(state.siteId, nextWeather, rng);
    const used = state.currentDilemma ? [...tel.usedDilemmaIds, state.currentDilemma.id] : tel.usedDilemmaIds;
    [nextDilemma, rng] = selectNextDilemma(state.siteId, upcomingWeather, used, rng);
    tel.usedDilemmaIds = Array.from(new Set([...used, nextDilemma.id]));
  }
  tel.rngState = rng;

  const decisionLog: MissionLogEntry = {
    day,
    title: choice.label,
    detail: choice.outcomeFeedback,
    severity: weather.severity,
    nasaTag: choice.nasaDataReference,
  };

  const endLogs: MissionLogEntry[] = [];
  if (status !== 'playing') {
    const rating = evaluateCommanderPerformance({
      ...state,
      status,
      resources: next,
      engine: tel,
    });
    const earned = rating.badges.filter((b) => b.earned);
    endLogs.push({
      day,
      title: {
        es: `Rango final: ${rating.rank.title.es} (${rating.score}/100)`,
        en: `Final rank: ${rating.rank.title.en} (${rating.score}/100)`,
      },
      detail: {
        es: earned.length
          ? `Insignias: ${earned.map((b) => b.title.es).join(', ')}.`
          : 'Aún no ganaste insignias. ¡Intenta otra estrategia!',
        en: earned.length
          ? `Badges: ${earned.map((b) => b.title.en).join(', ')}.`
          : 'No badges earned yet. Try another strategy!',
      },
      severity: status === 'won' ? 'nominal' : 'critical',
    });
  }

  const result: EngineMissionState = {
    ...state,
    currentDay: status === 'playing' ? day + 1 : day,
    status,
    failureReason,
    resources: next,
    powerAllocation: allocation,
    currentWeather: upcomingWeather,
    currentDilemma: nextDilemma,
    pendingDelayedEffects: status === 'playing' ? newPending : [],
    logs: [...endLogs, decisionLog, ...consequenceLogs, ...state.logs],
    engine: tel,
  };
  return result;
}

// ───────────────────────────── Calificación y logros ─────────────────────────────

export interface CommanderRank {
  id: 'cadet' | 'explorer' | 'engineer' | 'commander' | 'star-commander';
  minScore: number;
  title: LocalizedText;
  message: LocalizedText;
}

export const COMMANDER_RANKS: CommanderRank[] = [
  {
    id: 'star-commander',
    minScore: 73,
    title: { es: 'Comandante Estelar', en: 'Star Commander' },
    message: {
      es: '¡Equilibraste todos los sistemas como un verdadero director de vuelo de la NASA!',
      en: 'You balanced every system like a real NASA flight director!',
    },
  },
  {
    id: 'commander',
    minScore: 65,
    title: { es: 'Comandante Junior', en: 'Junior Commander' },
    message: {
      es: 'Misión sólida: tu tripulación confía en tus decisiones.',
      en: 'Solid mission: your crew trusts your decisions.',
    },
  },
  {
    id: 'engineer',
    minScore: 50,
    title: { es: 'Ingeniero de Misión', en: 'Mission Engineer' },
    message: {
      es: 'Sobreviviste, pero algunos sistemas sufrieron. ¡Revisa qué trade-offs cambiarías!',
      en: 'You survived, but some systems suffered. Which trade-offs would you change?',
    },
  },
  {
    id: 'explorer',
    minScore: 30,
    title: { es: 'Explorador en Entrenamiento', en: 'Explorer in Training' },
    message: {
      es: 'Aprendiste lecciones importantes. ¡Cada misión fallida enseña algo a la NASA también!',
      en: 'You learned important lessons. Every failed mission teaches NASA something too!',
    },
  },
  {
    id: 'cadet',
    minScore: 0,
    title: { es: 'Cadete Espacial', en: 'Space Cadet' },
    message: {
      es: 'Todo gran astronauta empezó aquí. ¡Inténtalo otra vez!',
      en: 'Every great astronaut started here. Try again!',
    },
  },
];

export interface CommanderBadge {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  earned: boolean;
}

export interface CommanderEvaluation {
  score: number;
  rank: CommanderRank;
  badges: CommanderBadge[];
  breakdown: {
    survival: number;
    resources: number;
    crew: number;
    radiation: number;
    science: number;
  };
  missionDoseMsv: number;
  /** Lista de requisitos del rango máximo y cuáles se cumplen (para mostrar qué faltó). */
  topRankChecks: Array<{ id: string; met: boolean; label: LocalizedText }>;
}

const ISRU_CHOICES = ['launch-eva', 'psr-rover-ice-run', 'build-berm', 'regolith-sandbags'];
const SCIENCE_TARGET = 120;

/** Requisitos del rango máximo (Comandante Estelar): puntos Y disciplina durante toda la misión. */
export const TOP_RANK = {
  minScore: 73,
  minPower: 25,
  minSupplies: 40,
  minCrewHealth: 70,
};

/**
 * Calcula la puntuación (0-100), el rango de Comandante Junior y las insignias.
 * Funciona en cualquier momento de la partida (parcial) o al terminar.
 */
export function evaluateCommanderPerformance(state: MissionState): CommanderEvaluation {
  const tel = getEngineTelemetry(state);
  const r = state.resources;
  const phys = SITE_PHYSICS[state.siteId];
  const missionDoseMsv = round2(r.radiationDoseMsv - tel.startingDoseMsv);
  const daysPlayed = Math.max(1, tel.history.length);

  const survival =
    state.status === 'won' ? 30 : state.status === 'failed' ? Math.round((daysPlayed / state.totalDays) * 15) : 15;
  const avgResources = (r.power + r.lifeSupport + r.food + r.shielding) / 4;
  const resources = Math.round((avgResources / 100) * 25);
  const crew = Math.round((r.crewHealth / 100) * 20);
  // Dosis "esperada" sin blindaje = fondo × días; menos que eso da puntos
  const expectedDose = phys.backgroundDoseMsvPerDay * daysPlayed;
  const radiation = Math.round(Math.max(0, Math.min(1, 1.5 - missionDoseMsv / expectedDose)) * 10);
  const sciEarned = Math.max(0, r.sciencePoints - OUTPOST_SITES[state.siteId].initialResources.sciencePoints);
  const science = Math.round(Math.min(1, sciEarned / SCIENCE_TARGET) * 15);

  const score = Math.max(0, Math.min(100, survival + resources + crew + radiation + science));
  // El rango máximo no se gana solo con puntos: exige haber planificado toda la misión,
  // sin dejar que ningún sistema vital llegue a zona de riesgo en ningún día.
  const topRankChecks: CommanderEvaluation['topRankChecks'] = [
    {
      id: 'won',
      met: state.status === 'won',
      label: { es: 'Completar los 8 días', en: 'Complete all 8 days' },
    },
    {
      id: 'score',
      met: score >= TOP_RANK.minScore,
      label: { es: `Lograr ${TOP_RANK.minScore} puntos o más`, en: `Score ${TOP_RANK.minScore} or more` },
    },
    {
      id: 'power',
      met: tel.minPower >= TOP_RANK.minPower,
      label: {
        es: `La batería nunca bajó de ${TOP_RANK.minPower}%`,
        en: `Battery never fell below ${TOP_RANK.minPower}%`,
      },
    },
    {
      id: 'supplies',
      met: tel.minLifeSupport >= TOP_RANK.minSupplies && tel.minFood >= TOP_RANK.minSupplies,
      label: {
        es: `Aire, agua y comida nunca bajaron de ${TOP_RANK.minSupplies}%`,
        en: `Air, water and food never fell below ${TOP_RANK.minSupplies}%`,
      },
    },
    {
      id: 'crew',
      met: tel.minCrewHealth >= TOP_RANK.minCrewHealth,
      label: {
        es: `La salud de la tripulación nunca bajó de ${TOP_RANK.minCrewHealth}%`,
        en: `Crew health never fell below ${TOP_RANK.minCrewHealth}%`,
      },
    },
  ];
  const earnsTopRank = topRankChecks.every((c) => c.met);
  const rank =
    COMMANDER_RANKS.find(
      (rk) => score >= rk.minScore && (rk.id !== 'star-commander' || earnsTopRank)
    ) ?? COMMANDER_RANKS[COMMANDER_RANKS.length - 1];

  const finished = state.status === 'won';
  const choices = tel.history.map((h) => h.choiceId);

  const badges: CommanderBadge[] = [
    {
      id: 'solar-guardian',
      title: { es: 'Guardián Solar', en: 'Solar Guardian' },
      description: {
        es: 'Mantuviste el blindaje ≥60% en todos los días de tormenta solar DONKI.',
        en: 'Kept shielding ≥60% on every DONKI solar storm day.',
      },
      earned: tel.stormDays > 0 && tel.shieldedStormDays === tel.stormDays,
    },
    {
      id: 'eclss-master',
      title: { es: 'Maestro del ECLSS', en: 'ECLSS Master' },
      description: {
        es: 'El oxígeno y el agua nunca bajaron de 40%.',
        en: 'Oxygen and water never dropped below 40%.',
      },
      earned: finished && tel.minLifeSupport >= 40,
    },
    {
      id: 'space-farmer',
      title: { es: 'Granjero Espacial', en: 'Space Farmer' },
      description: {
        es: 'Terminaste la misión con 60% o más de comida.',
        en: 'Finished the mission with 60% food or more.',
      },
      earned: finished && r.food >= 60,
    },
    {
      id: 'power-engineer',
      title: { es: 'Ingeniero de Energía', en: 'Power Engineer' },
      description: {
        es: 'Nunca sobrecargaste la red (>100%) y la batería nunca bajó de 20%.',
        en: 'Never overloaded the grid (>100%) and the battery never fell below 20%.',
      },
      earned: finished && tel.overloadTurns === 0 && tel.minPower >= 20,
    },
    {
      id: 'alara-champion',
      title: { es: 'Campeón ALARA', en: 'ALARA Champion' },
      description: {
        es: 'Recibiste menos radiación que una base sin blindaje (dosis “tan baja como sea razonable”).',
        en: 'Received less radiation than an unshielded base (dose “as low as reasonably achievable”).',
      },
      earned: finished && missionDoseMsv < expectedDose,
    },
    {
      id: 'star-scientist',
      title: { es: 'Científico Estrella', en: 'Star Scientist' },
      description: {
        es: `Ganaste ${SCIENCE_TARGET} o más puntos de ciencia en la misión.`,
        en: `Earned ${SCIENCE_TARGET}+ science points during the mission.`,
      },
      earned: sciEarned >= SCIENCE_TARGET,
    },
    {
      id: 'isru-pioneer',
      title: { es: 'Pionero ISRU', en: 'ISRU Pioneer' },
      description: {
        es: 'Usaste recursos locales (hielo o regolito) al menos 2 veces.',
        en: 'Used local resources (ice or regolith) at least 2 times.',
      },
      earned: choices.filter((c) => ISRU_CHOICES.includes(c)).length >= 2,
    },
    {
      id: 'happy-crew',
      title: { es: 'Tripulación Feliz', en: 'Happy Crew' },
      description: {
        es: 'La salud de la tripulación terminó en 80% o más.',
        en: 'Crew health ended at 80% or higher.',
      },
      earned: finished && r.crewHealth >= 80,
    },
  ];

  if (state.siteId === 'mars-jezero') {
    badges.push({
      id: 'dust-survivor',
      title: { es: 'Sobreviviente del Polvo', en: 'Dust Storm Survivor' },
      description: {
        es: 'Superaste una tormenta de polvo sin que la batería bajara de 25%.',
        en: 'Got through a dust storm without the battery dropping below 25%.',
      },
      earned: tel.dustStormDays > 0 && tel.dustStormPowerFloor >= 25 && state.status !== 'failed',
    });
  }

  return {
    score,
    rank,
    badges,
    breakdown: { survival, resources, crew, radiation, science },
    missionDoseMsv,
    topRankChecks,
  };
}

/**
 * Calcula qué parches persistentes se activan al completar un turno en el motor:
 * - Victoria en Cráter Shackleton (Luna) o Cráter Jezero (Marte).
 * - Supervivencia estable tras un evento crítico (tormenta DONKI / polvo / vitales en riesgo).
 * - Insignias de ingeniería obtenidas en `evaluateCommanderPerformance`.
 */
export function evaluateTurnPatchUnlocks(
  previousState: MissionState,
  updatedState: MissionState,
): string[] {
  const unlocked: string[] = [];

  if (updatedState.status === 'won') {
    unlocked.push(
      updatedState.siteId === 'moon-shackleton' ? 'lunar-commander' : 'mars-commander',
    );
  }

  const prevWeather = previousState.currentWeather;
  const prevRes = previousState.resources;
  const hadHazardousWeather =
    prevWeather.severity === 'critical' ||
    prevWeather.severity === 'warning' ||
    STORM_TYPES.includes(prevWeather.type) ||
    prevWeather.type === 'DUST_STORM';
  const hadCriticalVital =
    Math.min(
      prevRes.power,
      prevRes.lifeSupport,
      prevRes.food,
      prevRes.shielding,
      prevRes.crewHealth,
    ) <= 25;

  const nextRes = updatedState.resources;
  const colonyStable =
    updatedState.status !== 'failed' &&
    nextRes.power > 25 &&
    nextRes.lifeSupport > 25 &&
    nextRes.crewHealth > 25 &&
    nextRes.food >= 20;

  if ((hadHazardousWeather || hadCriticalVital) && colonyStable) {
    unlocked.push('emergency-responder');
  }

  const perf = evaluateCommanderPerformance(updatedState);
  for (const badge of perf.badges) {
    if (!badge.earned) continue;
    if (badge.id === 'solar-guardian' && updatedState.status !== 'won') continue;
    unlocked.push(badge.id);
  }

  return Array.from(new Set(unlocked));
}

/** Compatibilidad: listado completo de tarjetas por si la UI lo necesita. */
export const ALL_DILEMMA_CARDS = INITIAL_DILEMMA_CARDS;

// ───────────────────────────── Tripulación ─────────────────────────────

function moodFor(value: number): CrewMood {
  if (value >= 70) return 'great';
  if (value >= 45) return 'ok';
  if (value >= 25) return 'worried';
  return 'critical';
}

/**
 * Estado de cada tripulante según el sistema que vigila y el clima de hoy.
 * La UI lo usa para mostrar caras y frases en lugar de solo barras.
 */
export function getCrewStatus(state: MissionState): CrewStatus[] {
  const weather = state.currentWeather;
  const isStorm = weather.radiationMultiplier > 1.5;
  const isDim = weather.solarEfficiencyMultiplier < 0.7;

  return CREW_MEMBERS.map((member) => {
    const value = state.resources[member.watches];
    let mood = moodFor(value);
    let line = CREW_LINES[member.id][mood];

    if (member.id === 'medic' && isStorm && value < STORM_SAFE_SHIELDING) {
      if (mood === 'great' || mood === 'ok') mood = 'worried';
      line = CREW_WEATHER_LINES.medicStorm;
    } else if (member.id === 'engineer' && isDim && mood !== 'critical') {
      if (mood === 'great') mood = 'ok';
      line = CREW_WEATHER_LINES.engineerDim;
    }
    return { member, mood, line };
  });
}

/**
 * Tripulante que comenta el turno recién jugado: aquel cuyo sistema cambió más.
 * Devuelve null si nada cambió de forma apreciable.
 */
export function getCrewReaction(previous: CoreResources, current: CoreResources): CrewStatus | null {
  let best: { index: number; delta: number } | null = null;
  CREW_MEMBERS.forEach((member, index) => {
    const delta = current[member.watches] - previous[member.watches];
    if (Math.abs(delta) >= 3 && (!best || Math.abs(delta) > Math.abs(best.delta))) {
      best = { index, delta };
    }
  });
  if (!best) return null;
  const { index, delta } = best as { index: number; delta: number };
  const member = CREW_MEMBERS[index];
  return {
    member,
    mood: moodFor(current[member.watches]),
    line: delta < 0 ? CREW_REACTIONS[member.id].drop : CREW_REACTIONS[member.id].rise,
  };
}
