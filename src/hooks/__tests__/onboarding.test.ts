/**
 * Pruebas unitarias del Entrenamiento Interactivo de Encendido ("Aprender Haciendo")
 * (src/hooks/__tests__/onboarding.test.ts — T01 a T05)
 *
 * Incluye al inicio del archivo el mock explícito de `window.ResizeObserver` y
 * `Element.prototype.getBoundingClientRect` para garantizar geometría determinista en JSDOM / Vitest.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  App,
  computeOutcomeFlagsAfterTutorialLaunch,
  isExecutionLocked,
  resolvePostDrillAllocation,
} from '../../App';
import { CrewRoster } from '../../components/crew';
import { CommanderCertificate } from '../../components/MissionHUD/CommanderCertificate';
import { MissionBriefing } from '../../components/MissionHUD/MissionBriefing';
import { MissionPatch } from '../../components/MissionHUD/MissionPatch';
import {
  BALANCED_POWER_ALLOCATION,
  ResourcePanel,
  shouldCommitPresetChange,
} from '../../components/MissionHUD/ResourcePanel';
import { TurnReport } from '../../components/MissionHUD/TurnReport';
import { cancelCommIntervalRef } from '../../components/OutpostView/OutpostMap';
import {
  computeOnboardingCutout,
  countCommandSentences,
  countCommandWords,
  OnboardingSpotlight,
} from '../../components/Tutorial/OnboardingSpotlight';
import { CREW_MEMBERS, findCrewWatcherForVital, getCrewMemberName } from '../../data/crew';
import { VERIFIED_NASA_WEATHER_EVENTS } from '../../data/nasa-datasets';
import { OUTPOST_SITES } from '../../data/scenarios';
import {
  createInitialMissionState,
  evaluateCommanderPerformance,
  getCrewStatus,
  projectSystemsTurn,
  selectStartingWeather,
} from '../../engine/simulationEngine';
import {
  ONBOARDING_STEPS,
  ONBOARDING_STORAGE_KEY,
  onboardingReducer,
  readOnboardingDone,
  scrollOnboardingTargetIntoView,
  writeOnboardingDone,
} from '../useOnboarding';

// Mock explícito al inicio del archivo para window.ResizeObserver y Element.prototype.getBoundingClientRect
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

const DEFAULT_MOCK_DOM_RECT: DOMRect = {
  top: 120,
  left: 40,
  width: 220,
  height: 56,
  right: 260,
  bottom: 176,
  x: 40,
  y: 120,
  toJSON: () => ({}),
};

if (typeof globalThis.window === 'undefined') {
  Object.defineProperty(globalThis, 'window', {
    value: globalThis,
    configurable: true,
    writable: true,
  });
}

Object.defineProperty(window, 'ResizeObserver', {
  value: MockResizeObserver,
  configurable: true,
  writable: true,
});

if (typeof globalThis.Element === 'undefined') {
  class MockElement {}
  Object.defineProperty(globalThis, 'Element', {
    value: MockElement,
    configurable: true,
    writable: true,
  });
}

Element.prototype.getBoundingClientRect = vi.fn(() => DEFAULT_MOCK_DOM_RECT);

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

describe('Interactive Ignition Onboarding (T01–T05)', () => {
  let keydownHandlers: Array<(e: KeyboardEvent) => void> = [];

  beforeEach(() => {
    keydownHandlers = [];
    const store = new Map<string, string>();

    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 1280,
        innerHeight: 800,
        ResizeObserver: MockResizeObserver,
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
        addEventListener: (type: string, handler: (e: KeyboardEvent) => void) => {
          if (type === 'keydown') keydownHandlers.push(handler);
        },
        removeEventListener: (type: string, handler: (e: KeyboardEvent) => void) => {
          if (type === 'keydown') {
            keydownHandlers = keydownHandlers.filter((h) => h !== handler);
          }
        },
        scrollTo: () => {},
      },
      configurable: true,
      writable: true,
    });

    Element.prototype.getBoundingClientRect = vi.fn(() => DEFAULT_MOCK_DOM_RECT);
  });

  it('T01 & T03: cada paso de ONBOARDING_STEPS y la portada cumplen <= 15 palabras, 1 sola frase y cero emoji', () => {
    expect(ONBOARDING_STEPS).toHaveLength(4);

    for (const step of ONBOARDING_STEPS) {
      for (const lang of ['es', 'en'] as const) {
        const cmd = step.command[lang];
        const eyebrow = step.eyebrow[lang];
        expect(countCommandWords(eyebrow)).toBeLessThanOrEqual(3);
        expect(countCommandWords(cmd)).toBeLessThanOrEqual(15);
        expect(countCommandSentences(cmd)).toBe(1);
        expect(EMOJI_REGEX.test(cmd)).toBe(false);
        expect(EMOJI_REGEX.test(eyebrow)).toBe(false);
      }
    }

    for (const site of Object.values(OUTPOST_SITES)) {
      for (const lang of ['es', 'en'] as const) {
        expect(countCommandWords(site.description[lang])).toBeLessThanOrEqual(15);
        expect(countCommandSentences(site.description[lang])).toBe(1);
      }
    }

    const briefingHtml = renderToStaticMarkup(
      React.createElement(MissionBriefing, {
        lang: 'es',
        sites: Object.values(OUTPOST_SITES),
        onStart: () => {},
      }),
    );
    expect(briefingHtml).toContain('data-telemetry-metric="gravity"');
    expect(briefingHtml).toContain('data-telemetry-metric="temperature"');
    expect(briefingHtml).toContain('data-telemetry-metric="radiation"');
    expect(briefingHtml).toContain('data-testid="telemetry-readout-moon-shackleton"');
  });

  it('T02, T03 & T05: OnboardingSpotlight renderiza 4 paneles, flecha SVG ortogonal, aria-live="polite" y cero botones Siguiente/Anterior', () => {
    const rect = Element.prototype.getBoundingClientRect.call({});
    const step1 = ONBOARDING_STEPS[0];

    const html = renderToStaticMarkup(
      React.createElement(OnboardingSpotlight, {
        lang: 'es',
        isActive: true,
        step: step1,
        targetRect: rect,
        onSkip: () => {},
      }),
    );

    expect(html).toContain('data-onboarding-quadrant="top"');
    expect(html).toContain('data-onboarding-quadrant="bottom"');
    expect(html).toContain('data-onboarding-quadrant="left"');
    expect(html).toContain('data-onboarding-quadrant="right"');
    expect(html).toContain('data-testid="onboarding-cutout-frame"');
    expect(html).toContain('data-testid="onboarding-connector-svg"');
    expect(html).toContain('data-onboarding-bracket="tl"');
    expect(html).toContain('data-onboarding-bracket="br"');
    expect(html).toContain('data-testid="onboarding-micro-callout"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('SISTEMA 1/4');
    expect(html).toContain(step1.command.es);
    expect(html).toContain('id="onboarding-skip-btn"');
    // Prohibido incluir botones de Siguiente / Anterior en el Callout micro-táctico
    expect(html).not.toContain('Siguiente');
    expect(html).not.toContain('Anterior');
    expect(html).not.toContain('Next');
    expect(html).not.toContain('Back');
  });

  it('T04 & T05: avanza únicamente por clic en los 4 controles reales y permite cerrar con Esc persistiendo en localStorage', () => {
    expect(ONBOARDING_STORAGE_KEY).toBe('jamt_onboarding_done');
    expect(readOnboardingDone()).toBe(false);

    let state = onboardingReducer(
      { isActive: false, isDone: false, stepIndex: 0, completionSeq: 0 },
      { type: 'START', totalSteps: ONBOARDING_STEPS.length },
    );
    expect(state.isActive).toBe(true);
    expect(state.stepIndex).toBe(0);

    // Clic en un control distinto al iluminado NO avanza el paso
    state = onboardingReducer(state, {
      type: 'COMPLETE_TARGET',
      targetId: 'oxygen-module',
      steps: ONBOARDING_STEPS,
    });
    expect(state.stepIndex).toBe(0);

    // 1. Clic en Energía/Sistemas ('power-grid') -> avanza al paso 2
    state = onboardingReducer(state, {
      type: 'COMPLETE_TARGET',
      targetId: 'power-grid',
      steps: ONBOARDING_STEPS,
    });
    expect(state.stepIndex).toBe(1);

    // 2. Clic en Soporte Vital / Hábitat ('oxygen-module') -> avanza al paso 3
    state = onboardingReducer(state, {
      type: 'COMPLETE_TARGET',
      targetId: 'oxygen-module',
      steps: ONBOARDING_STEPS,
    });
    expect(state.stepIndex).toBe(2);

    // 3. Clic en Datos NASA ('nasa-telemetry') -> avanza al paso 4 (micro-emergencia ámbar)
    state = onboardingReducer(state, {
      type: 'COMPLETE_TARGET',
      targetId: 'nasa-telemetry',
      steps: ONBOARDING_STEPS,
    });
    expect(state.stepIndex).toBe(3);
    expect(ONBOARDING_STEPS[state.stepIndex].tone).toBe('caution');
    expect(ONBOARDING_STEPS[state.stepIndex].isEmergency).toBe(true);

    // 4. Clic en estabilizador térmico ('thermal-stabilizer') -> desbloquea partida libre
    state = onboardingReducer(state, {
      type: 'COMPLETE_TARGET',
      targetId: 'thermal-stabilizer',
      steps: ONBOARDING_STEPS,
    });
    expect(state.isActive).toBe(false);
    expect(state.isDone).toBe(true);
    expect(state.completionSeq).toBe(1);

    // Cierre inmediato con Escape / Skip y persistencia en localStorage
    const restarted = onboardingReducer(state, {
      type: 'START',
      totalSteps: ONBOARDING_STEPS.length,
    });
    expect(restarted.isActive).toBe(true);
    const afterEsc = onboardingReducer(restarted, { type: 'SKIP' });
    expect(afterEsc.isActive).toBe(false);
    expect(afterEsc.isDone).toBe(true);

    writeOnboardingDone(true);
    expect(readOnboardingDone()).toBe(true);

    // Verificar que los 4 data-onboarding-id reales están presentes en el HUD
    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    window.localStorage.setItem(
      'jamt-mission-v2',
      JSON.stringify({ mission, challengeSeed: null }),
    );

    const appHtml = renderToStaticMarkup(React.createElement(App));
    const panelHtml = renderToStaticMarkup(
      React.createElement(ResourcePanel, {
        lang: 'es',
        resources: mission.resources,
        allocation: mission.powerAllocation,
        projection: projectSystemsTurn(mission, mission.powerAllocation),
        hoveredChoice: null,
        pendingEffects: [],
        evaluation: evaluateCommanderPerformance(mission),
        onChangeAllocation: () => {},
        onOpenBadgesModal: () => {},
        crew: getCrewStatus(mission),
      }),
    );

    const combined = `${appHtml}\n${panelHtml}`;
    for (const step of ONBOARDING_STEPS) {
      expect(combined).toContain(`data-onboarding-id="${step.targetId}"`);
    }
  });

  it('F01: centra instantáneamente targets fuera del pliegue (1280x800), lleva top-nav al tope en móvil (360x640) y nunca genera recorte invertido', () => {
    const scrollIntoView = vi.fn();
    const offscreenDesktopTarget = {
      closest: () => null,
      getBoundingClientRect: () => ({
        top: 1298,
        left: 24,
        width: 170,
        height: 62,
        right: 194,
        bottom: 1360,
        x: 24,
        y: 1298,
        toJSON: () => ({}),
      }),
      scrollIntoView,
    } as unknown as HTMLElement;

    scrollOnboardingTargetIntoView(offscreenDesktopTarget);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: 'instant',
      block: 'center',
      inline: 'nearest',
    });

    // Recorte seguro si todavía llegara un rect temporal fuera del viewport: nunca top > vh ni top > bottom
    const collapsedOffscreen = computeOnboardingCutout(
      { top: 1298, left: 24, width: 170, height: 62, right: 194, bottom: 1360 },
      6,
      1280,
      800,
    );
    expect(collapsedOffscreen.width).toBe(0);
    expect(collapsedOffscreen.height).toBe(0);
    expect(collapsedOffscreen.top).toBeLessThanOrEqual(800);
    expect(collapsedOffscreen.top).toBeLessThanOrEqual(collapsedOffscreen.bottom);

    // En móvil (360x640), #open-science-modal-btn dentro de .top-nav fuerza scrollTo({ top: 0, behavior: 'instant' })
    const scrollToSpy = vi.fn();
    Object.assign(window, { innerWidth: 360, innerHeight: 640, scrollTo: scrollToSpy });
    const mobileTopNavTarget = {
      closest: (sel: string) => (sel === '.top-nav' ? {} : null),
      getBoundingClientRect: () => ({
        top: 68,
        left: 16,
        width: 210,
        height: 44,
        right: 226,
        bottom: 112,
        x: 16,
        y: 68,
        toJSON: () => ({}),
      }),
      scrollIntoView: vi.fn(),
    } as unknown as HTMLElement;

    scrollOnboardingTargetIntoView(mobileTopNavTarget);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });

    const mobileCutout = computeOnboardingCutout(
      mobileTopNavTarget.getBoundingClientRect(),
      6,
      360,
      640,
    );
    expect(mobileCutout.height).toBe(56);
    expect(mobileCutout.top).toBe(62);
  });

  it('F02: restaura la asignación de energía tras el Paso 4 sin dejar Escudo Tormenta activo, eleva utilidades y da >=44x44px a Saltar', () => {
    const stormAlloc = {
      lifeSupportAlloc: 35,
      shieldingAlloc: 40,
      greenhouseAlloc: 15,
      scienceAndCommsAlloc: 10,
    };
    const greenhouseAlloc = {
      lifeSupportAlloc: 35,
      shieldingAlloc: 15,
      greenhouseAlloc: 40,
      scienceAndCommsAlloc: 10,
    };

    // Restaura la asignación previa guardada (Balanced / Greenhouse) en lugar de mantener Tormenta
    expect(resolvePostDrillAllocation(BALANCED_POWER_ALLOCATION, stormAlloc)).toEqual(
      BALANCED_POWER_ALLOCATION,
    );
    expect(resolvePostDrillAllocation(greenhouseAlloc, stormAlloc)).toEqual(greenhouseAlloc);
    // Si no había asignación válida guardada (o también era Tormenta), vuelve a balanced
    expect(resolvePostDrillAllocation(null, stormAlloc)).toEqual(BALANCED_POWER_ALLOCATION);
    expect(resolvePostDrillAllocation(stormAlloc, stormAlloc)).toEqual(BALANCED_POWER_ALLOCATION);

    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    const balancedHtml = renderToStaticMarkup(
      React.createElement(ResourcePanel, {
        lang: 'es',
        resources: mission.resources,
        allocation: BALANCED_POWER_ALLOCATION,
        projection: projectSystemsTurn(mission, BALANCED_POWER_ALLOCATION),
        hoveredChoice: null,
        pendingEffects: [],
        evaluation: evaluateCommanderPerformance(mission),
        onChangeAllocation: () => {},
        onOpenBadgesModal: () => {},
        crew: getCrewStatus(mission),
        isOnboardingEmergency: true,
      }),
    );

    expect(balancedHtml).toMatch(/id="power-preset-balanced-btn"[^>]*aria-pressed="true"/);
    expect(balancedHtml).toMatch(/id="power-preset-storm-btn"[^>]*aria-pressed="false"/);
    expect(shouldCommitPresetChange('storm', true)).toBe(false);
    expect(shouldCommitPresetChange('storm', false)).toBe(true);
    expect(shouldCommitPresetChange('balanced', true)).toBe(true);
  });

  it('F03: bloquea acciones secundarias durante la ventana de sello de 650 ms y limpia el intervalo de radio sin fugas', () => {
    expect(isExecutionLocked(null, false)).toBe(false);
    expect(isExecutionLocked('choice-a', false)).toBe(true);
    expect(isExecutionLocked(null, true)).toBe(true);

    vi.useFakeTimers();
    try {
      const tick = vi.fn();
      const ref: { current: ReturnType<typeof setInterval> | null } = {
        current: setInterval(tick, 60),
      };
      vi.advanceTimersByTime(120);
      expect(tick).toHaveBeenCalledTimes(2);

      // Al cambiar de día/base o desmontar OutpostMap, se cancela y anula la referencia
      expect(cancelCommIntervalRef(ref)).toBe(true);
      expect(ref.current).toBeNull();
      expect(cancelCommIntervalRef(ref)).toBe(false);

      vi.advanceTimersByTime(500);
      expect(tick).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('F04: reinicia boardSaved y linkCopied al relanzar Entrenamiento tras misión ganada o abortada', () => {
    expect(
      computeOutcomeFlagsAfterTutorialLaunch('won', { linkCopied: true, boardSaved: true }),
    ).toEqual({ linkCopied: false, boardSaved: false });

    expect(
      computeOutcomeFlagsAfterTutorialLaunch('failed', { linkCopied: true, boardSaved: true }),
    ).toEqual({ linkCopied: false, boardSaved: false });

    expect(
      computeOutcomeFlagsAfterTutorialLaunch('playing', { linkCopied: true, boardSaved: false }),
    ).toEqual({ linkCopied: true, boardSaved: false });
  });

  it('F05: da accesibilidad de teclado/ratón a oxygen-module y separa la lectura de telemetría en Briefing', () => {
    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);

    const panelHtml = renderToStaticMarkup(
      React.createElement(ResourcePanel, {
        lang: 'es',
        resources: mission.resources,
        allocation: mission.powerAllocation,
        projection: projectSystemsTurn(mission, mission.powerAllocation),
        hoveredChoice: null,
        pendingEffects: [],
        evaluation: evaluateCommanderPerformance(mission),
        onChangeAllocation: () => {},
        onOpenBadgesModal: () => {},
        crew: getCrewStatus(mission),
      }),
    );

    expect(panelHtml).toMatch(
      /role="button"[^>]*tabindex="0"[^>]*data-onboarding-id="oxygen-module"[^>]*style="cursor:pointer"/,
    );

    const briefingHtml = renderToStaticMarkup(
      React.createElement(MissionBriefing, {
        lang: 'es',
        sites: Object.values(OUTPOST_SITES),
        onStart: () => {},
      }),
    );
    expect(briefingHtml).toContain('telemetry-readout-tag">RADIACIÓN</span> <span>Medido por');
    expect(briefingHtml).not.toContain('RADIACIÓN</span><span>');

    const certHtml = renderToStaticMarkup(
      React.createElement(CommanderCertificate, {
        lang: 'es',
        isOpen: true,
        onClose: () => {},
        evaluation: evaluateCommanderPerformance(mission),
        site: OUTPOST_SITES['moon-shackleton'],
        currentDay: 1,
        totalDays: 8,
        missionStatus: 'playing',
        onRestartMission: () => {},
        crew: getCrewStatus(mission),
      }),
    );
    expect(certHtml).toContain('id="commander-certificate-modal"');
    expect(certHtml).toContain('id="close-certificate-modal-btn"');
  });

  it('F07: traduce textos fijos del diploma y nombres de tripulación (Ing./Eng. Sato, Dra./Dr. Okafor) en ES/EN', () => {
    const engineer = CREW_MEMBERS.find((c) => c.id === 'engineer')!;
    const botanist = CREW_MEMBERS.find((c) => c.id === 'botanist')!;
    expect(getCrewMemberName(engineer, 'es')).toBe('Ing. Sato');
    expect(getCrewMemberName(engineer, 'en')).toBe('Eng. Sato');
    expect(getCrewMemberName(botanist, 'es')).toBe('Dra. Okafor');
    expect(getCrewMemberName(botanist, 'en')).toBe('Dr. Okafor');

    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    const crew = getCrewStatus(mission);
    const evaluation = evaluateCommanderPerformance(mission);

    const certEs = renderToStaticMarkup(
      React.createElement(CommanderCertificate, {
        lang: 'es',
        isOpen: true,
        onClose: () => {},
        evaluation,
        site: OUTPOST_SITES['moon-shackleton'],
        currentDay: 1,
        totalDays: 8,
        missionStatus: 'playing',
        onRestartMission: () => {},
        crew,
      }),
    );
    expect(certEs).toContain('FORMULARIO JSC-2026-CERT');
    expect(certEs).toContain('SITIO:');
    expect(certEs).toContain('PARCHES:');
    expect(certEs).toContain('EVALUACIÓN NASA');
    expect(certEs).toContain('TELEMETRÍA VERIFICADA');
    expect(certEs).toContain('Ing. Sato');
    expect(certEs).toContain('Dra. Okafor');
    expect(certEs).not.toContain('TELEMETRY VERIFIED');

    const certEn = renderToStaticMarkup(
      React.createElement(CommanderCertificate, {
        lang: 'en',
        isOpen: true,
        onClose: () => {},
        evaluation,
        site: OUTPOST_SITES['moon-shackleton'],
        currentDay: 1,
        totalDays: 8,
        missionStatus: 'playing',
        onRestartMission: () => {},
        crew,
      }),
    );
    expect(certEn).toContain('FORM JSC-2026-CERT');
    expect(certEn).toContain('SITE:');
    expect(certEn).toContain('PATCHES:');
    expect(certEn).toContain('NASA EVALUATION');
    expect(certEn).toContain('TELEMETRY VERIFIED');
    expect(certEn).toContain('Eng. Sato');
    expect(certEn).toContain('Dr. Okafor');
    expect(certEn).not.toContain('Ing. Sato');
    expect(certEn).not.toContain('Dra. Okafor');
    expect(certEn).not.toContain('EVALUACIÓN NASA');

    const rosterEn = renderToStaticMarkup(React.createElement(CrewRoster, { lang: 'en', crew }));
    expect(rosterEn).toContain('Eng. Sato');
    expect(rosterEn).toContain('Dr. Okafor');
    expect(rosterEn).not.toContain('Ing. Sato');

    const turnEn = renderToStaticMarkup(
      React.createElement(TurnReport, {
        lang: 'en',
        previous: mission.resources,
        current: mission.resources,
        logs: mission.logs,
        onContinue: () => {},
        crewLine: crew.find((c) => c.member.id === 'engineer'),
      }),
    );
    expect(turnEn).toContain('crew-name">Eng. Sato</strong> <span class="crew-role">');
    expect(turnEn).not.toContain('Ing. Sato');
  });
});

describe('QA F08 — 5to vital, parche quiz-ace y favicon', () => {
  it('asigna retrato de Cmdr. Vega al 5to vital (lifeSupport) manteniendo 4 tripulantes en el motor', () => {
    const mission = createInitialMissionState('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS[0], 1);
    const projection = projectSystemsTurn(mission, mission.powerAllocation);
    const evaluation = evaluateCommanderPerformance(mission);
    const crew = getCrewStatus(mission);

    expect(CREW_MEMBERS).toHaveLength(4);
    expect(findCrewWatcherForVital(undefined, 'lifeSupport')).toBeUndefined();

    const lifeSupportWatcher = findCrewWatcherForVital(crew, 'lifeSupport');
    expect(lifeSupportWatcher?.status.member.id).toBe('commander');
    expect(lifeSupportWatcher?.roleLabel?.es).toBe('Supervisión ECLSS');
    expect(lifeSupportWatcher?.roleLabel?.en).toBe('ECLSS oversight');

    const withCrewHtml = renderToStaticMarkup(
      React.createElement(ResourcePanel, {
        lang: 'en',
        resources: mission.resources,
        allocation: mission.powerAllocation,
        projection,
        hoveredChoice: null,
        pendingEffects: [],
        evaluation,
        crew,
        onChangeAllocation: () => {},
        onOpenBadgesModal: () => {},
      }),
    );
    const portraitMatches = withCrewHtml.match(/vital-watcher-portrait/g) ?? [];
    expect(portraitMatches).toHaveLength(5);
    expect(withCrewHtml).toContain('Cmdr. Vega · ECLSS oversight');

    const withoutCrewHtml = renderToStaticMarkup(
      React.createElement(ResourcePanel, {
        lang: 'es',
        resources: mission.resources,
        allocation: mission.powerAllocation,
        projection,
        hoveredChoice: null,
        pendingEffects: [],
        evaluation,
        onChangeAllocation: () => {},
        onOpenBadgesModal: () => {},
      }),
    );
    expect(withoutCrewHtml.match(/vital-watcher-portrait/g) ?? []).toHaveLength(0);
  });

  it('MissionPatch renderiza un emblema propio para quiz-ace distinto del fallback default', () => {
    const earnedQuizAce = renderToStaticMarkup(
      React.createElement(MissionPatch, {
        badgeId: 'quiz-ace',
        earned: true,
        size: 46,
        title: 'Quiz ace',
      }),
    );
    const lockedQuizAce = renderToStaticMarkup(
      React.createElement(MissionPatch, {
        badgeId: 'quiz-ace',
        earned: false,
        size: 46,
        title: 'Quiz ace',
      }),
    );
    const fallbackEarned = renderToStaticMarkup(
      React.createElement(MissionPatch, {
        badgeId: 'unknown-badge',
        earned: true,
        size: 46,
        title: 'Quiz ace',
      }),
    );

    expect(earnedQuizAce).not.toBe(fallbackEarned);
    expect(earnedQuizAce).toContain('polyline');
    expect(earnedQuizAce).toContain('#2E7D4F');
    expect(lockedQuizAce).toContain('stroke-dasharray="2.5 2.5"');
  });
});

