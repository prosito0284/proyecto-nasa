/**
 * Hook de estado e hidratación automática para Parches de Misión persistentes.
 * P01 — Sincroniza la colección de parches con `localStorage` ('jamt_unlocked_patches')
 * en tiempo real y evita duplicados o notificaciones repetidas.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OutpostSiteId } from '../types/mission';
import {
  PATCH_CATALOG,
  PATCH_STORAGE_KEY,
  UnlockedPatchRecord,
  applyPatchUnlock,
  readUnlockedPatches,
  writeUnlockedPatches,
} from '../services/patchStorage';

export interface PatchBatchEntry {
  id: string;
  scenarioId?: OutpostSiteId;
}

export interface PatchControllerState {
  unlockedPatches: UnlockedPatchRecord[];
  notificationQueue: UnlockedPatchRecord[];
}

export function initPatchControllerState(): PatchControllerState {
  return {
    unlockedPatches: readUnlockedPatches(),
    notificationQueue: [],
  };
}

/**
 * Transición pura de desbloqueo con persistencia inmediata en `localStorage`.
 * Si el `patchId` ya existe, no crea duplicados ni encola otra notificación.
 */
export function unlockPatchInState(
  state: PatchControllerState,
  patchId: string,
  scenarioId?: OutpostSiteId,
  unlockedAt?: string,
): { nextState: PatchControllerState; unlocked: boolean; record: UnlockedPatchRecord | null } {
  const result = applyPatchUnlock(state.unlockedPatches, patchId, scenarioId, unlockedAt);
  if (!result.unlocked || !result.record) {
    return { nextState: state, unlocked: false, record: null };
  }

  writeUnlockedPatches(result.nextRecords);

  return {
    nextState: {
      unlockedPatches: result.nextRecords,
      notificationQueue: [...state.notificationQueue, result.record],
    },
    unlocked: true,
    record: result.record,
  };
}

/**
 * Transición pura de desbloqueo en lote evitando duplicados y escribiendo una sola vez.
 */
export function unlockPatchesBatchInState(
  state: PatchControllerState,
  entries: PatchBatchEntry[],
  unlockedAt?: string,
): { nextState: PatchControllerState; newlyUnlocked: UnlockedPatchRecord[] } {
  let working = state.unlockedPatches;
  const newlyUnlocked: UnlockedPatchRecord[] = [];

  for (const entry of entries) {
    const result = applyPatchUnlock(working, entry.id, entry.scenarioId, unlockedAt);
    if (result.unlocked && result.record) {
      working = result.nextRecords;
      newlyUnlocked.push(result.record);
    }
  }

  if (newlyUnlocked.length === 0) {
    return { nextState: state, newlyUnlocked: [] };
  }

  writeUnlockedPatches(working);

  return {
    nextState: {
      unlockedPatches: working,
      notificationQueue: [...state.notificationQueue, ...newlyUnlocked],
    },
    newlyUnlocked,
  };
}

export interface UsePatchesReturn {
  /** Lista ordenada de parches desbloqueados y persistidos en este dispositivo */
  unlockedPatches: UnlockedPatchRecord[];
  /** Mapa rápido por id de parche */
  unlockedById: Record<string, UnlockedPatchRecord>;
  /** Cantidad de parches del catálogo oficial desbloqueados */
  unlockedCount: number;
  /** Total de parches disponibles en el catálogo oficial */
  totalCatalogCount: number;
  /** Verifica si un parche ya fue desbloqueado */
  isUnlocked: (patchId: string) => boolean;
  /** Obtiene el registro completo de desbloqueo de un parche */
  getUnlockRecord: (patchId: string) => UnlockedPatchRecord | undefined;
  /** Desbloquea un parche por id (idempotente: devuelve `true` solo la primera vez) */
  unlockPatch: (patchId: string, scenarioId?: OutpostSiteId) => boolean;
  /** Desbloquea varios parches en una sola escritura (evita duplicados) */
  unlockPatches: (entries: PatchBatchEntry[]) => UnlockedPatchRecord[];
  /** Banner activo de desbloqueo recién obtenido (null si no hay avisos pendientes) */
  activeUnlockBanner: UnlockedPatchRecord | null;
  /** Cierra el banner actual y muestra el siguiente si había más en cola */
  dismissUnlockBanner: () => void;
  /** Recarga manualmente el estado desde `localStorage` */
  reloadFromStorage: () => void;
}

export function usePatches(): UsePatchesReturn {
  const [unlockedPatches, setUnlockedPatches] = useState<UnlockedPatchRecord[]>(() =>
    readUnlockedPatches(),
  );
  const [notificationQueue, setNotificationQueue] = useState<UnlockedPatchRecord[]>([]);
  const recordsRef = useRef<UnlockedPatchRecord[]>(unlockedPatches);
  recordsRef.current = unlockedPatches;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
      return;
    }
    const handleStorageSync = (event: StorageEvent) => {
      if (event.key !== PATCH_STORAGE_KEY && event.key !== null) return;
      const fresh = readUnlockedPatches();
      recordsRef.current = fresh;
      setUnlockedPatches(fresh);
    };
    window.addEventListener('storage', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  const unlockPatch = useCallback(
    (patchId: string, scenarioId?: OutpostSiteId): boolean => {
      const result = applyPatchUnlock(recordsRef.current, patchId, scenarioId);
      if (!result.unlocked || !result.record) {
        return false;
      }

      recordsRef.current = result.nextRecords;
      writeUnlockedPatches(result.nextRecords);
      setUnlockedPatches(result.nextRecords);
      setNotificationQueue((prev) => [...prev, result.record!]);
      return true;
    },
    [],
  );

  const unlockPatches = useCallback((entries: PatchBatchEntry[]): UnlockedPatchRecord[] => {
    if (entries.length === 0) return [];
    let working = recordsRef.current;
    const newlyUnlocked: UnlockedPatchRecord[] = [];

    for (const entry of entries) {
      const result = applyPatchUnlock(working, entry.id, entry.scenarioId);
      if (result.unlocked && result.record) {
        working = result.nextRecords;
        newlyUnlocked.push(result.record);
      }
    }

    if (newlyUnlocked.length === 0) return [];

    recordsRef.current = working;
    writeUnlockedPatches(working);
    setUnlockedPatches(working);
    setNotificationQueue((prev) => [...prev, ...newlyUnlocked]);
    return newlyUnlocked;
  }, []);

  const dismissUnlockBanner = useCallback(() => {
    setNotificationQueue((prev) => (prev.length > 0 ? prev.slice(1) : prev));
  }, []);

  const reloadFromStorage = useCallback(() => {
    const fresh = readUnlockedPatches();
    recordsRef.current = fresh;
    setUnlockedPatches(fresh);
  }, []);

  const unlockedById = useMemo(() => {
    const map: Record<string, UnlockedPatchRecord> = {};
    for (const entry of unlockedPatches) {
      map[entry.id] = entry;
    }
    return map;
  }, [unlockedPatches]);

  const unlockedCount = useMemo(
    () => PATCH_CATALOG.filter((def) => Boolean(unlockedById[def.id])).length,
    [unlockedById],
  );

  const isUnlocked = useCallback(
    (patchId: string) => Boolean(unlockedById[patchId]),
    [unlockedById],
  );

  const getUnlockRecord = useCallback(
    (patchId: string) => unlockedById[patchId],
    [unlockedById],
  );

  return {
    unlockedPatches,
    unlockedById,
    unlockedCount,
    totalCatalogCount: PATCH_CATALOG.length,
    isUnlocked,
    getUnlockRecord,
    unlockPatch,
    unlockPatches,
    activeUnlockBanner: notificationQueue[0] ?? null,
    dismissUnlockBanner,
    reloadFromStorage,
  };
}
