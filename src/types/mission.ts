/**
 * Contrato Compartido Multi-Agente (Shared Types)
 * Reto NASA Space Apps 2026: Build a Junior Astronaut Mission Trainer
 *
 * IMPORTANTE: Cualquier cambio a este archivo afecta a los 3 bloques:
 * - Bloque A (Claude Code): src/engine/*, src/data/scenarios.ts
 * - Bloque B (Antigravity Compañero): src/services/*, src/data/nasa-datasets.ts, src/components/ScienceTraceability/*
 * - Bloque C (Antigravity Principal): src/components/OutpostView/*, src/components/MissionHUD/*
 */

export type Language = 'es' | 'en';

export type OutpostSiteId = 'moon-shackleton' | 'mars-jezero';

export type AlertSeverity = 'nominal' | 'watch' | 'warning' | 'critical';

export interface LocalizedText {
  es: string;
  en: string;
}

/**
 * Los recursos principales de la base (0 a 100%).
 * NASA recomienda centrarse en 3-4 sistemas clave para niños de 7 a 12 años:
 * 1. Energía (power)
 * 2. Soporte Vital: Oxígeno/Agua y Comida (lifeSupport & food)
 * 3. Blindaje contra Radiación y Salud de la Tripulación (shielding & crewHealth)
 * + Progreso Científico de la Misión (scienceScore)
 */
export interface CoreResources {
  /** Reserva de batería y energía disponible (0 - 100%) */
  power: number;
  /** Nivel de Oxígeno (O2) y Agua reciclada (ECLSS / MOXIE) (0 - 100%) */
  lifeSupport: number;
  /** Producción de alimentos en el invernadero hidropónico (0 - 100%) */
  food: number;
  /** Integridad/nivel activo del blindaje contra radiación (0 - 100%) */
  shielding: number;
  /** Salud general y bienestar de los astronautas (0 - 100%) */
  crewHealth: number;
  /** Dosis acumulada de radiación en milisieverts (mSv) - Dato educativo OSDR/RAD */
  radiationDoseMsv: number;
  /** Puntos de descubrimientos científicos acumulados */
  sciencePoints: number;
}

/**
 * Distribución del presupuesto de energía decidida por el jugador en cada turno/Sol.
 * La suma o el peso determina el trade-off entre sistemas.
 */
export interface PowerAllocation {
  /** % o nivel de energía asignado a Soporte Vital (ECLSS / MOXIE / Calefacción) */
  lifeSupportAlloc: number;
  /** % o nivel de energía asignado al Escudo de Radiación y Refugio de Agua */
  shieldingAlloc: number;
  /** % o nivel de energía asignado al Invernadero Hidropónico */
  greenhouseAlloc: number;
  /** % o nivel de energía asignado a Ciencia, Rovers y Comunicaciones */
  scienceAndCommsAlloc: number;
}

/**
 * Evento de Clima Espacial Real proveniente de NASA DONKI (en vivo o archivo histórico real)
 */
export interface SpaceWeatherEvent {
  id: string;
  type: 'FLR' | 'SEP' | 'CME' | 'DUST_STORM' | 'NOMINAL';
  /** Clase o intensidad real, ej. "X1.5 Solar Flare", "SEP >10 MeV", "CME 1200 km/s" */
  classOrIntensity: string;
  startTime: string;
  sourceUrl?: string;
  /** Indica si proviene de consulta en vivo a api.nasa.gov o del dataset real curado */
  isLiveNasaData: boolean;
  severity: AlertSeverity;
  title: LocalizedText;
  kidFriendlyExplanation: LocalizedText;
  scienceFact: LocalizedText;
  /** Multiplicador de riesgo de radiación durante este turno (1.0 = normal, 3.5 = tormenta severa) */
  radiationMultiplier: number;
  /** Impacto en generación solar (1.0 = 100%, 0.4 = tormenta de polvo o falla de paneles) */
  solarEfficiencyMultiplier: number;
  /** Base planetaria relevante cuando un evento histórico ocurrió específicamente en Luna o Marte */
  siteRelevance?: OutpostSiteId | 'both';
}

/**
 * Opción de decisión dentro de un dilema de ingeniería (Trade-off Card).
 * REGLA NASA: Ninguna opción es "gratis"; toda opción tiene un beneficio y un costo real.
 */
export interface TradeoffChoice {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  /** Explicación clara del sacrificio de ingeniería para niños de 7 a 12 años */
  tradeoffWarning: LocalizedText;
  /** Cambios inmediatos en los recursos */
  resourceDelta: Partial<CoreResources>;
  /** Efecto diferido para el siguiente Sol/Día (consecuencia compuesta en el tiempo) */
  nextTurnEffect?: {
    description: LocalizedText;
    resourceDelta: Partial<CoreResources>;
  };
  /** Explicación educativa mostrada después de elegir */
  outcomeFeedback: LocalizedText;
  /** Referencia al dataset o estudio real de la NASA (DONKI, OSDR, Artemis, Mars) */
  nasaDataReference: string;
}

/**
 * Tarjeta de Dilema / Evento de Misión en un Sol/Día determinado
 */
export interface MissionDilemmaCard {
  id: string;
  siteFilter?: OutpostSiteId | 'both';
  triggeredByWeather?: SpaceWeatherEvent['type'][];
  title: LocalizedText;
  situation: LocalizedText;
  /** Término científico destacado en este dilema (conectado al glosario) */
  highlightedTermId?: string;
  choices: [TradeoffChoice, TradeoffChoice, ...TradeoffChoice[]];
}

/**
 * Configuración física real del sitio de la base (Luna vs. Marte)
 */
export interface OutpostSiteConfig {
  id: OutpostSiteId;
  name: LocalizedText;
  locationName: LocalizedText;
  coordinates: string;
  gravityG: number;
  avgTempCelsius: string;
  commDelaySeconds: number;
  commDelayDisplay: LocalizedText;
  dayName: LocalizedText;
  totalMissionDays: number;
  description: LocalizedText;
  nasaMissionReference: LocalizedText;
  initialResources: CoreResources;
}

/**
 * Término del Glosario Científico para niños (7-12 años) y Trazabilidad NASA
 */
export interface GlossaryTerm {
  id: string;
  term: LocalizedText;
  shortDefinition: LocalizedText;
  kidAnalogy: LocalizedText;
  nasaSource: 'DONKI' | 'OSDR' | 'ARTEMIS' | 'MARS_ROVER' | 'ECLSS';
  nasaStudyOrUrl: string;
}

/**
 * Registro en la bitácora de la misión (Log)
 */
export interface MissionLogEntry {
  day: number;
  title: LocalizedText;
  detail: LocalizedText;
  severity: AlertSeverity;
  nasaTag?: string;
}

/**
 * Estado global de una partida en curso
 */
export interface MissionState {
  siteId: OutpostSiteId;
  currentDay: number;
  totalDays: number;
  status: 'briefing' | 'playing' | 'won' | 'failed';
  failureReason?: LocalizedText;
  resources: CoreResources;
  powerAllocation: PowerAllocation;
  currentWeather: SpaceWeatherEvent;
  currentDilemma: MissionDilemmaCard | null;
  pendingDelayedEffects: Array<{
    description: LocalizedText;
    resourceDelta: Partial<CoreResources>;
  }>;
  logs: MissionLogEntry[];
  /**
   * Telemetría interna del motor (semilla RNG, historial de decisiones, mínimos alcanzados).
   * La escribe SOLO `src/engine/*`. La UI debe conservarla al copiar el estado (`{ ...state }`)
   * y puede leerla (p. ej. `history` para una pantalla de repaso), pero nunca modificarla.
   */
  engine?: EngineTelemetry;
}

/** Decisión tomada por el jugador en un día concreto (para repaso y logros). */
export interface DecisionRecord {
  day: number;
  cardId: string;
  choiceId: string;
  weatherType: SpaceWeatherEvent['type'];
}

/** Telemetría que el motor acumula durante la partida para calcular rangos e insignias. */
export interface EngineTelemetry {
  rngState: number;
  usedDilemmaIds: string[];
  history: DecisionRecord[];
  minPower: number;
  minLifeSupport: number;
  minFood: number;
  minCrewHealth: number;
  maxLoad: number;
  overloadTurns: number;
  stormDays: number;
  shieldedStormDays: number;
  dustStormDays: number;
  dustStormPowerFloor: number;
  startingDoseMsv: number;
}

/**
 * RONDA 4 — Tripulación con nombre y cara.
 * El Líder define los datos (`src/data/crew.ts`) y el estado (`getCrewStatus` en el motor);
 * el Bloque C dibuja los retratos y el componente `CrewRoster` a partir de `CrewStatus[]`.
 */
export type CrewMood = 'great' | 'ok' | 'worried' | 'critical';

export interface CrewMember {
  /** Identificador estable: 'commander' | 'engineer' | 'botanist' | 'medic' */
  id: string;
  name: string;
  localizedName?: LocalizedText;
  role: LocalizedText;
  /** Recurso del que esta persona se encarga y sobre el que opina */
  watches: 'power' | 'lifeSupport' | 'food' | 'shielding' | 'crewHealth';
}

export interface CrewStatus {
  member: CrewMember;
  mood: CrewMood;
  /** Frase corta que dice ahora mismo (máx. ~90 caracteres) */
  line: LocalizedText;
}
