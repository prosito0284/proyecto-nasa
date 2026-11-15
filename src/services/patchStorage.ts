/**
 * Servicio de almacenamiento persistente de Parches de Misión (Logros).
 * P01 — Contrato y persistencia segura bajo `localStorage` ('jamt_unlocked_patches').
 *
 * Reglas:
 * - Cada parche desbloqueado guarda `{ id, unlockedAt (ISO), scenarioId? }`.
 * - Todas las lecturas/escrituras validan esquema y usan `try/catch` para que JSON
 *   corrupto, valores inesperados o modo incógnito nunca rompan la aplicación.
 * - Cero duplicados por `id`.
 */

import { LocalizedText, OutpostSiteId } from '../types/mission';

export const PATCH_STORAGE_KEY = 'jamt_unlocked_patches';
export const LEGACY_QUIZ_ACE_STORAGE_KEY = 'jamt-quiz-ace-v1';

export type PatchCategory = 'training' | 'mission' | 'science' | 'survival';

export interface UnlockedPatchRecord {
  id: string;
  unlockedAt: string;
  scenarioId?: OutpostSiteId;
}

export interface PatchDefinition {
  id: string;
  order: number;
  category: PatchCategory;
  title: LocalizedText;
  unlockHint: LocalizedText;
  siteSpecific?: OutpostSiteId;
}

const VALID_SCENARIO_IDS: readonly OutpostSiteId[] = ['moon-shackleton', 'mars-jezero'];

/**
 * Catálogo completo de Parches de Misión disponibles en Junior Astronaut Mission Trainer.
 * Cero emoji: cada id tiene un emblema SVG bordado específico en `MissionPatch.tsx`.
 */
export const PATCH_CATALOG: PatchDefinition[] = [
  {
    id: 'training-graduate',
    order: 1,
    category: 'training',
    title: { es: 'Cadete de Encendido', en: 'Ignition Cadet' },
    unlockHint: {
      es: 'Completa los 4 pasos del entrenamiento interactivo inicial.',
      en: 'Complete all 4 steps of the initial interactive training.',
    },
  },
  {
    id: 'quiz-ace',
    order: 2,
    category: 'science',
    title: { es: 'As del Quiz NASA', en: 'NASA Quiz Ace' },
    unlockHint: {
      es: 'Aprueba el cuestionario en Ciencia NASA y quiz con al menos 65% de aciertos.',
      en: 'Pass the quiz in NASA Science & Quiz with at least 65% accuracy.',
    },
  },
  {
    id: 'emergency-responder',
    order: 3,
    category: 'survival',
    title: { es: 'Respuesta en Emergencia', en: 'Emergency Responder' },
    unlockHint: {
      es: 'Supera un turno de tormenta o alerta crítica manteniendo los vitales por encima de 25%.',
      en: 'Survive a storm or critical alert turn while keeping vitals above 25%.',
    },
  },
  {
    id: 'lunar-commander',
    order: 4,
    category: 'mission',
    siteSpecific: 'moon-shackleton',
    title: { es: 'Comandante Lunar', en: 'Lunar Commander' },
    unlockHint: {
      es: 'Completa con éxito una misión de 8 días en el Cráter Shackleton (Luna).',
      en: 'Successfully complete an 8-day mission at Shackleton Crater (Moon).',
    },
  },
  {
    id: 'mars-commander',
    order: 5,
    category: 'mission',
    siteSpecific: 'mars-jezero',
    title: { es: 'Comandante Marciano', en: 'Mars Commander' },
    unlockHint: {
      es: 'Completa con éxito una misión de 8 soles en el Cráter Jezero (Marte).',
      en: 'Successfully complete an 8-sol mission at Jezero Crater (Mars).',
    },
  },
  {
    id: 'solar-guardian',
    order: 6,
    category: 'survival',
    title: { es: 'Guardián Solar', en: 'Solar Guardian' },
    unlockHint: {
      es: 'Mantén el blindaje al 60% o más en todos los días de tormenta solar DONKI.',
      en: 'Keep shielding at 60% or higher on every DONKI solar storm day.',
    },
  },
  {
    id: 'dust-survivor',
    order: 7,
    category: 'survival',
    siteSpecific: 'mars-jezero',
    title: { es: 'Sobreviviente del Polvo', en: 'Dust Storm Survivor' },
    unlockHint: {
      es: 'Supera una tormenta de polvo marciana sin que la batería baje de 25%.',
      en: 'Get through a Martian dust storm without the battery dropping below 25%.',
    },
  },
  {
    id: 'eclss-master',
    order: 8,
    category: 'mission',
    title: { es: 'Maestro del ECLSS', en: 'ECLSS Master' },
    unlockHint: {
      es: 'Completa una misión sin que el oxígeno y el agua bajen de 40%.',
      en: 'Finish a mission with oxygen and water never dropping below 40%.',
    },
  },
  {
    id: 'space-farmer',
    order: 9,
    category: 'mission',
    title: { es: 'Granjero Espacial', en: 'Space Farmer' },
    unlockHint: {
      es: 'Termina una misión con 60% o más de reservas de comida en el invernadero.',
      en: 'Finish a mission with 60% food reserves or higher in the greenhouse.',
    },
  },
  {
    id: 'power-engineer',
    order: 10,
    category: 'mission',
    title: { es: 'Ingeniero de Energía', en: 'Power Engineer' },
    unlockHint: {
      es: 'Completa una misión sin sobrecargar la red (>100%) ni bajar de 20% de batería.',
      en: 'Finish a mission without grid overload (>100%) or battery below 20%.',
    },
  },
  {
    id: 'alara-champion',
    order: 11,
    category: 'science',
    title: { es: 'Campeón ALARA', en: 'ALARA Champion' },
    unlockHint: {
      es: 'Completa una misión recibiendo menos radiación que una base sin blindaje.',
      en: 'Finish a mission with lower radiation dose than an unshielded outpost.',
    },
  },
  {
    id: 'star-scientist',
    order: 12,
    category: 'science',
    title: { es: 'Científico Estrella', en: 'Star Scientist' },
    unlockHint: {
      es: 'Consigue 120 o más puntos de ciencia en una misma misión.',
      en: 'Earn 120 or more science points during a single mission.',
    },
  },
  {
    id: 'isru-pioneer',
    order: 13,
    category: 'science',
    title: { es: 'Pionero ISRU', en: 'ISRU Pioneer' },
    unlockHint: {
      es: 'Aprovecha recursos locales (hielo o regolito) al menos 2 veces en una misión.',
      en: 'Use local resources (ice or regolith) at least 2 times in a mission.',
    },
  },
  {
    id: 'happy-crew',
    order: 14,
    category: 'mission',
    title: { es: 'Tripulación Feliz', en: 'Happy Crew' },
    unlockHint: {
      es: 'Termina una misión con la salud de la tripulación en 80% o más.',
      en: 'Finish a mission with crew health at 80% or higher.',
    },
  },
];

const CATALOG_BY_ID = new Map<string, PatchDefinition>(
  PATCH_CATALOG.map((def) => [def.id, def]),
);

export function getPatchDefinition(patchId: string): PatchDefinition | undefined {
  return CATALOG_BY_ID.get(patchId);
}

export function getPatchMeta(patchId: string): {
  title: LocalizedText;
  unlockHint: LocalizedText;
} {
  const def = CATALOG_BY_ID.get(patchId);
  if (def) {
    return { title: def.title, unlockHint: def.unlockHint };
  }
  return {
    title: { es: patchId, en: patchId },
    unlockHint: {
      es: 'Completa hitos de vuelo espacial para obtener este parche.',
      en: 'Complete spaceflight milestones to earn this patch.',
    },
  };
}

export function isValidScenarioId(value: unknown): value is OutpostSiteId {
  return typeof value === 'string' && VALID_SCENARIO_IDS.includes(value as OutpostSiteId);
}

export function isValidIsoTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length < 10) return false;
  // Require basic ISO 8601 date prefix YYYY-MM-DD and valid parsed timestamp
  if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false;
  return !Number.isNaN(Date.parse(trimmed));
}

export function isValidUnlockedPatchRecord(value: unknown): value is UnlockedPatchRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;

  if (typeof candidate.id !== 'string') return false;
  const normalizedId = candidate.id.trim();
  if (normalizedId.length === 0 || normalizedId.length > 64) return false;

  if (!isValidIsoTimestamp(candidate.unlockedAt)) return false;

  if (candidate.scenarioId !== undefined && !isValidScenarioId(candidate.scenarioId)) {
    return false;
  }

  return true;
}

/** Limpia un arreglo arbitrario de registros: valida esquema y elimina duplicados por `id`. */
export function sanitizePatchRecords(rawList: unknown): UnlockedPatchRecord[] {
  if (!Array.isArray(rawList)) return [];

  const seenIds = new Set<string>();
  const clean: UnlockedPatchRecord[] = [];

  for (const item of rawList) {
    if (!isValidUnlockedPatchRecord(item)) continue;
    const id = item.id.trim();
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const record: UnlockedPatchRecord = {
      id,
      unlockedAt: new Date(Date.parse(item.unlockedAt)).toISOString(),
    };
    if (item.scenarioId !== undefined) {
      record.scenarioId = item.scenarioId;
    }
    clean.push(record);
  }

  return clean;
}

function getSafeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Lee y valida los parches desbloqueados desde `localStorage` ('jamt_unlocked_patches').
 * Si el contenido está corrupto, inválido o no es un arreglo, se recupera limpiamente con `[]`.
 */
export function readUnlockedPatches(): UnlockedPatchRecord[] {
  const storage = getSafeStorage();
  if (!storage) return [];

  try {
    const raw = storage.getItem(PATCH_STORAGE_KEY);
    if (raw === null) {
      // Migración suave si el usuario había ganado 'quiz-ace' en versión anterior
      if (storage.getItem(LEGACY_QUIZ_ACE_STORAGE_KEY) === '1') {
        const migrated: UnlockedPatchRecord[] = [
          { id: 'quiz-ace', unlockedAt: new Date().toISOString() },
        ];
        writeUnlockedPatches(migrated);
        return migrated;
      }
      return [];
    }
    if (raw.trim() === '') return [];
    const parsed: unknown = JSON.parse(raw);
    return sanitizePatchRecords(parsed);
  } catch {
    return [];
  }
}

/**
 * Escribe de forma segura la lista sanitizada en `localStorage` bajo `'jamt_unlocked_patches'`.
 * Devuelve `true` si se persistió o `false` si `localStorage` está bloqueado (modo incógnito/SSR).
 */
export function writeUnlockedPatches(records: UnlockedPatchRecord[]): boolean {
  const clean = sanitizePatchRecords(records);
  const storage = getSafeStorage();
  if (!storage) return false;

  try {
    storage.setItem(PATCH_STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch {
    return false;
  }
}

export interface UnlockOperationResult {
  nextRecords: UnlockedPatchRecord[];
  unlocked: boolean;
  record: UnlockedPatchRecord | null;
}

/** Función pura e idempotente para desbloquear un parche evitando duplicados. */
export function applyPatchUnlock(
  current: UnlockedPatchRecord[],
  patchId: string,
  scenarioId?: OutpostSiteId,
  unlockedAt?: string,
): UnlockOperationResult {
  const cleanId = typeof patchId === 'string' ? patchId.trim() : '';
  if (!cleanId || cleanId.length > 64) {
    return { nextRecords: current, unlocked: false, record: null };
  }

  if (current.some((entry) => entry.id === cleanId)) {
    return { nextRecords: current, unlocked: false, record: null };
  }

  const timestamp =
    unlockedAt && isValidIsoTimestamp(unlockedAt)
      ? new Date(Date.parse(unlockedAt)).toISOString()
      : new Date().toISOString();

  const record: UnlockedPatchRecord = {
    id: cleanId,
    unlockedAt: timestamp,
  };
  if (isValidScenarioId(scenarioId)) {
    record.scenarioId = scenarioId;
  }

  return {
    nextRecords: [...current, record],
    unlocked: true,
    record,
  };
}

/** Desbloquea un parche directamente contra `localStorage` evitando duplicados. */
export function unlockPatchInStorage(
  patchId: string,
  scenarioId?: OutpostSiteId,
  unlockedAt?: string,
): UnlockOperationResult {
  const current = readUnlockedPatches();
  const result = applyPatchUnlock(current, patchId, scenarioId, unlockedAt);
  if (result.unlocked) {
    writeUnlockedPatches(result.nextRecords);
  }
  return result;
}
