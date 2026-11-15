/**
 * Pruebas unitarias de persistencia, disparadores e interfaz de Parches de Misión (P04).
 *
 * Verifica:
 * 1. Desbloquear un parche lo guarda inmediatamente en `localStorage` bajo `'jamt_unlocked_patches'`.
 * 2. Reinicializar el estado / hook tras simular una recarga conserva intactos los parches previos.
 * 3. Desbloquear el mismo parche dos veces no crea duplicados ni re-dispara la notificación.
 * 4. Texto corrupto o almacenamiento bloqueado se recuperan limpiamente con `[]` sin errores.
 * 5. Disparadores reales (Luna/Marte, emergencia crítica, entrenamiento completo sin Skip),
 *    catálogo completo bilingüe ES/EN, emblemas SVG propios sin emoji y renderizado de UI.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { MissionPatch } from '../../components/MissionHUD/MissionPatch';
import { PatchShowcaseModal } from '../../components/MissionHUD/PatchShowcaseModal';
import { PatchUnlockBanner } from '../../components/MissionHUD/PatchUnlockBanner';
import { VERIFIED_NASA_WEATHER_EVENTS } from '../../data/nasa-datasets';
import { OUTPOST_SITES } from '../../data/scenarios';
import {
  advanceMissionTurn,
  createInitialMissionState,
  evaluateTurnPatchUnlocks,
} from '../../engine/simulationEngine';
import {
  PATCH_CATALOG,
  PATCH_STORAGE_KEY,
  readUnlockedPatches,
  unlockPatchInStorage,
  writeUnlockedPatches,
} from '../../services/patchStorage';
import { ONBOARDING_STEPS, onboardingReducer } from '../useOnboarding';
import {
  initPatchControllerState,
  unlockPatchInState,
  unlockPatchesBatchInState,
  usePatches,
} from '../usePatches';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

describe('Persistent Mission Patches System (P01–P04)', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map<string, string>();
    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 1280,
        innerHeight: 800,
        location: {
          href: 'https://prosito0284.github.io/proyecto-nasa/',
          search: '',
          hash: '',
        },
        localStorage: {
          getItem: (key: string) => store.get(key) ?? null,
          setItem: (key: string, val: string) => {
            store.set(key, val);
          },
          removeItem: (key: string) => {
            store.delete(key);
          },
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        scrollTo: () => {},
      },
      configurable: true,
      writable: true,
    });
  });

  it('1. Al desbloquear un parche se guarda inmediatamente en localStorage bajo jamt_unlocked_patches', () => {
    expect(PATCH_STORAGE_KEY).toBe('jamt_unlocked_patches');
    expect(store.get(PATCH_STORAGE_KEY)).toBeUndefined();

    const state0 = initPatchControllerState();
    expect(state0.unlockedPatches).toEqual([]);

    const fixedIso = '2026-06-15T14:30:00.000Z';
    const { nextState, unlocked, record } = unlockPatchInState(
      state0,
      'training-graduate',
      'moon-shackleton',
      fixedIso,
    );

    expect(unlocked).toBe(true);
    expect(record).toEqual({
      id: 'training-graduate',
      unlockedAt: fixedIso,
      scenarioId: 'moon-shackleton',
    });
    expect(nextState.unlockedPatches).toHaveLength(1);
    expect(nextState.notificationQueue).toHaveLength(1);

    const rawPersisted = store.get(PATCH_STORAGE_KEY);
    expect(typeof rawPersisted).toBe('string');
    const parsed = JSON.parse(rawPersisted!);
    expect(parsed).toEqual([
      {
        id: 'training-graduate',
        unlockedAt: fixedIso,
        scenarioId: 'moon-shackleton',
      },
    ]);
  });

  it('2. Reinicializar el estado / hook tras simular una recarga conserva intactos los parches previos', () => {
    unlockPatchInStorage('quiz-ace', undefined, '2026-06-10T10:00:00.000Z');
    unlockPatchInStorage('mars-commander', 'mars-jezero', '2026-06-11T18:45:00.000Z');

    // Simula un reinicio completo de la pestaña / aplicación leyendo de cero
    const reloadedController = initPatchControllerState();
    expect(reloadedController.unlockedPatches).toHaveLength(2);
    expect(reloadedController.unlockedPatches).toEqual([
      { id: 'quiz-ace', unlockedAt: '2026-06-10T10:00:00.000Z' },
      {
        id: 'mars-commander',
        unlockedAt: '2026-06-11T18:45:00.000Z',
        scenarioId: 'mars-jezero',
      },
    ]);
    // Al recargar NO se disparan notificaciones de parches viejos
    expect(reloadedController.notificationQueue).toEqual([]);

    // Verifica también la hidratación directa del hook React `usePatches()` al montarse
    const ProbeHookComponent: React.FC = () => {
      const { unlockedCount, totalCatalogCount, isUnlocked } = usePatches();
      return React.createElement(
        'div',
        { 'data-testid': 'probe-patches' },
        `${unlockedCount}/${totalCatalogCount}:${isUnlocked('quiz-ace')}:${isUnlocked('mars-commander')}`,
      );
    };

    const probeHtml = renderToStaticMarkup(React.createElement(ProbeHookComponent));
    expect(probeHtml).toContain(`2/${PATCH_CATALOG.length}:true:true`);

    // Y en la aplicación real montada tras recargar aparece el contador persistido en el botón de Vitrina
    const appHtml = renderToStaticMarkup(React.createElement(App));
    expect(appHtml).toContain(`Vitrina 2/${PATCH_CATALOG.length}`);
  });

  it('3. Intentar desbloquear el mismo parche dos veces no crea duplicados ni re-dispara la notificación', () => {
    const initial = initPatchControllerState();

    const first = unlockPatchInState(
      initial,
      'lunar-commander',
      'moon-shackleton',
      '2026-06-01T12:00:00.000Z',
    );
    expect(first.unlocked).toBe(true);
    expect(first.nextState.unlockedPatches).toHaveLength(1);
    expect(first.nextState.notificationQueue).toHaveLength(1);

    // Segundo intento (mismo id, aunque cambie el scenarioId o la hora)
    const second = unlockPatchInState(
      first.nextState,
      'lunar-commander',
      'mars-jezero',
      '2026-06-02T12:00:00.000Z',
    );
    expect(second.unlocked).toBe(false);
    expect(second.record).toBeNull();
    expect(second.nextState.unlockedPatches).toHaveLength(1);
    expect(second.nextState.unlockedPatches[0].unlockedAt).toBe('2026-06-01T12:00:00.000Z');
    expect(second.nextState.notificationQueue).toHaveLength(1);

    // También en lotes y tras simular recarga de página
    const reloaded = initPatchControllerState();
    const batchResult = unlockPatchesBatchInState(reloaded, [
      { id: 'lunar-commander', scenarioId: 'moon-shackleton' },
      { id: 'emergency-responder', scenarioId: 'moon-shackleton' },
      { id: 'emergency-responder', scenarioId: 'moon-shackleton' },
    ]);
    expect(batchResult.newlyUnlocked.map((r) => r.id)).toEqual(['emergency-responder']);
    expect(batchResult.nextState.unlockedPatches).toHaveLength(2);
    expect(batchResult.nextState.notificationQueue).toHaveLength(1);

    const persistedArray = JSON.parse(store.get(PATCH_STORAGE_KEY)!);
    expect(persistedArray).toHaveLength(2);
  });

  it('4. Si localStorage tiene JSON corrupto, datos inválidos o bloqueados, recupera [] limpiamente sin lanzar errores', () => {
    const corruptPayloads = [
      '{corrupt-json-syntax',
      'not json at all',
      'null',
      '12345',
      '{"id": "quiz-ace"}',
      '[null, 42, {"id": ""}, {"id": "quiz-ace", "unlockedAt": "invalid-date"}, {"id": "lunar-commander", "unlockedAt": "2026-06-01T00:00:00Z", "scenarioId": "jupiter"}]',
    ];

    for (const payload of corruptPayloads) {
      store.set(PATCH_STORAGE_KEY, payload);
      expect(() => readUnlockedPatches()).not.toThrow();
      expect(readUnlockedPatches()).toEqual([]);
      expect(initPatchControllerState().unlockedPatches).toEqual([]);
    }

    // Modo incógnito o almacenamiento bloqueado que lanza excepción
    Object.defineProperty(globalThis.window, 'localStorage', {
      value: {
        getItem: () => {
          throw new Error('SecurityError: storage disabled');
        },
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
      },
      configurable: true,
    });

    expect(() => readUnlockedPatches()).not.toThrow();
    expect(readUnlockedPatches()).toEqual([]);
    expect(writeUnlockedPatches([{ id: 'quiz-ace', unlockedAt: '2026-06-01T00:00:00Z' }])).toBe(
      false,
    );
    expect(() => renderToStaticMarkup(React.createElement(App))).not.toThrow();
  });

  it('P02: disparadores reales detectan victoria lunar/marciana, emergencia crítica estable y graduación real del entrenamiento (sin Skip)', () => {
    // 1) Emergencia crítica sobrevivida con vitales estables -> emergency-responder
    const criticalStorm = VERIFIED_NASA_WEATHER_EVENTS.find(
      (e) => e.severity === 'critical',
    )!;
    const initialMoon = createInitialMissionState('moon-shackleton', criticalStorm, 20260415);
    const stableChoice =
      initialMoon.currentDilemma!.choices.find((c) => (c.resourceDelta.power ?? 0) >= 0) ??
      initialMoon.currentDilemma!.choices[0];

    const turn2State = advanceMissionTurn(
      initialMoon,
      stableChoice,
      criticalStorm,
      { lifeSupportAlloc: 35, shieldingAlloc: 40, greenhouseAlloc: 15, scienceAndCommsAlloc: 10 },
    );
    const turnUnlocks = evaluateTurnPatchUnlocks(initialMoon, turn2State);
    expect(turnUnlocks).toContain('emergency-responder');

    // Caso negativo: si la colonia falla (0% energía), NO debe otorgar emergency-responder
    const depletedMoon = {
      ...initialMoon,
      resources: { ...initialMoon.resources, power: 2 },
    };
    const failedTurn = advanceMissionTurn(
      depletedMoon,
      depletedMoon.currentDilemma!.choices[0],
      criticalStorm,
      { lifeSupportAlloc: 35, shieldingAlloc: 40, greenhouseAlloc: 15, scienceAndCommsAlloc: 10 },
    );
    if (failedTurn.status === 'failed') {
      expect(evaluateTurnPatchUnlocks(depletedMoon, failedTurn)).not.toContain(
        'emergency-responder',
      );
    }

    // 2) Victoria en Luna y Marte en día final -> lunar-commander / mars-commander
    const almostWonMoon = {
      ...initialMoon,
      currentDay: OUTPOST_SITES['moon-shackleton'].totalMissionDays,
    };
    const wonMoon = advanceMissionTurn(
      almostWonMoon,
      stableChoice,
      criticalStorm,
      { lifeSupportAlloc: 35, shieldingAlloc: 40, greenhouseAlloc: 15, scienceAndCommsAlloc: 10 },
    );
    expect(wonMoon.status).toBe('won');
    expect(evaluateTurnPatchUnlocks(almostWonMoon, wonMoon)).toContain('lunar-commander');

    const almostWonMars = createInitialMissionState(
      'mars-jezero',
      VERIFIED_NASA_WEATHER_EVENTS[0],
      20260415,
    );
    almostWonMars.currentDay = OUTPOST_SITES['mars-jezero'].totalMissionDays;
    const wonMars = advanceMissionTurn(
      almostWonMars,
      almostWonMars.currentDilemma!.choices[0],
      VERIFIED_NASA_WEATHER_EVENTS[0],
      { lifeSupportAlloc: 35, shieldingAlloc: 40, greenhouseAlloc: 15, scienceAndCommsAlloc: 10 },
    );
    expect(wonMars.status).toBe('won');
    expect(evaluateTurnPatchUnlocks(almostWonMars, wonMars)).toContain('mars-commander');

    // 3) Onboarding: Skip NO incrementa graduatedSeq; completar los 4 clics reales SÍ
    let obState = onboardingReducer(
      { isActive: false, isDone: false, stepIndex: 0, completionSeq: 0, graduatedSeq: 0 },
      { type: 'START', totalSteps: ONBOARDING_STEPS.length },
    );
    const skipped = onboardingReducer(obState, { type: 'SKIP' });
    expect(skipped.graduatedSeq).toBe(0);

    for (const step of ONBOARDING_STEPS) {
      obState = onboardingReducer(obState, {
        type: 'COMPLETE_TARGET',
        targetId: step.targetId,
        steps: ONBOARDING_STEPS,
      });
    }
    expect(obState.isActive).toBe(false);
    expect(obState.graduatedSeq).toBe(1);
  });

  it('P03: Vitrina de Parches y Banner de desbloqueo renderizan en ES/EN con SVG propio, cero emoji y fechas/siluetas', () => {
    const unlockedById = {
      'training-graduate': {
        id: 'training-graduate',
        unlockedAt: '2026-06-15T12:00:00.000Z',
        scenarioId: 'moon-shackleton' as const,
      },
    };

    // Todos los parches del catálogo tienen SVG distinto y cero emoji
    for (const def of PATCH_CATALOG) {
      expect(EMOJI_REGEX.test(def.title.es)).toBe(false);
      expect(EMOJI_REGEX.test(def.title.en)).toBe(false);
      expect(EMOJI_REGEX.test(def.unlockHint.es)).toBe(false);
      expect(EMOJI_REGEX.test(def.unlockHint.en)).toBe(false);

      const svgEarned = renderToStaticMarkup(
        React.createElement(MissionPatch, { badgeId: def.id, earned: true }),
      );
      const svgLocked = renderToStaticMarkup(
        React.createElement(MissionPatch, { badgeId: def.id, earned: false }),
      );
      expect(svgEarned).toContain('patch-is-earned');
      expect(svgLocked).toContain('patch-is-unearned');
      expect(EMOJI_REGEX.test(svgEarned)).toBe(false);
    }

    const showcaseEs = renderToStaticMarkup(
      React.createElement(PatchShowcaseModal, {
        lang: 'es',
        isOpen: true,
        onClose: () => {},
        unlockedById,
      }),
    );
    expect(showcaseEs).toContain('Vitrina de parches de misión');
    expect(showcaseEs).toContain(`1 / ${PATCH_CATALOG.length}`);
    expect(showcaseEs).toContain('DESBLOQUEADO');
    expect(showcaseEs).toContain('BLOQUEADO');
    expect(showcaseEs).toContain('Cadete de Encendido');
    expect(showcaseEs).toContain(PATCH_CATALOG[1].unlockHint.es);
    expect(EMOJI_REGEX.test(showcaseEs)).toBe(false);

    const showcaseEn = renderToStaticMarkup(
      React.createElement(PatchShowcaseModal, {
        lang: 'en',
        isOpen: true,
        onClose: () => {},
        unlockedById,
      }),
    );
    expect(showcaseEn).toContain('Mission patch showcase');
    expect(showcaseEn).toContain('UNLOCKED');
    expect(showcaseEn).toContain('LOCKED');
    expect(showcaseEn).toContain('Ignition Cadet');
    expect(EMOJI_REGEX.test(showcaseEn)).toBe(false);

    const bannerHtml = renderToStaticMarkup(
      React.createElement(PatchUnlockBanner, {
        lang: 'es',
        record: unlockedById['training-graduate'],
        onDismiss: () => {},
        onOpenShowcase: () => {},
      }),
    );
    expect(bannerHtml).toContain('data-testid="patch-unlock-banner"');
    expect(bannerHtml).toContain('aria-live="polite"');
    expect(bannerHtml).toContain('PARCHE DESBLOQUEADO');
    expect(bannerHtml).toContain('Cadete de Encendido');
    expect(EMOJI_REGEX.test(bannerHtml)).toBe(false);
  });
});
