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
import { App } from '../../App';
import { MissionBriefing } from '../../components/MissionHUD/MissionBriefing';
import { ResourcePanel } from '../../components/MissionHUD/ResourcePanel';
import {
  countCommandSentences,
  countCommandWords,
  OnboardingSpotlight,
} from '../../components/Tutorial/OnboardingSpotlight';
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
});
