/**
 * Pruebas de contrato y renderizado del Sistema de Entrenamiento Guiado (T01–T04)
 * Verifican la estructura bilingüe (máximo 2 frases por paso), la presencia real de
 * `data-tutorial-id` en el DOM renderizado, la persistencia en `localStorage`
 * ('jamt_tutorial_completed') y el motor Spotlight de 4 cuadrantes.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { ResourcePanel } from '../../components/MissionHUD/ResourcePanel';
import { OutpostMap } from '../../components/OutpostView/OutpostMap';
import { TutorialSpotlight } from '../../components/Tutorial/TutorialSpotlight';
import { VERIFIED_NASA_WEATHER_EVENTS } from '../../data/nasa-datasets';
import { OUTPOST_SITES } from '../../data/scenarios';
import { TUTORIAL_STEPS } from '../../data/tutorial-steps';
import {
  createInitialMissionState,
  evaluateCommanderPerformance,
  getCrewStatus,
  projectSystemsTurn,
  selectStartingWeather,
} from '../../engine/simulationEngine';
import { TUTORIAL_STORAGE_KEY } from '../../types/tutorial';
import {
  findTutorialTargetElement,
  readTutorialCompleted,
  writeTutorialCompleted,
} from '../useTutorial';

function countSentences(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0).length;
}

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

describe('Interactive Tutorial System (T01–T04)', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
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

  it('T01 & T04: TUTORIAL_STEPS cumple el contrato bilingüe, <= 2 frases por paso y cero emoji', () => {
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(5);
    const seenIds = new Set<string>();

    for (const step of TUTORIAL_STEPS) {
      expect(seenIds.has(step.id)).toBe(false);
      seenIds.add(step.id);

      expect(step.targetSelector.length).toBeGreaterThan(0);
      expect(['top', 'bottom', 'left', 'right']).toContain(step.placement);
      expect(['info', 'caution']).toContain(step.tone);
      expect(typeof step.requireAction).toBe('boolean');
      expect(step.spotlightPadding).toBeGreaterThanOrEqual(0);

      for (const lang of ['es', 'en'] as const) {
        const title = step.title[lang].trim();
        const body = step.body[lang].trim();

        expect(title.length).toBeGreaterThan(3);
        expect(body.length).toBeGreaterThan(10);
        expect(countSentences(body)).toBeLessThanOrEqual(2);
        expect(EMOJI_REGEX.test(title)).toBe(false);
        expect(EMOJI_REGEX.test(body)).toBe(false);
      }
    }

    expect(TUTORIAL_STEPS.some((s) => s.requireAction)).toBe(true);
  });

  it('T02: persiste el estado completado bajo la clave jamt_tutorial_completed en localStorage', () => {
    expect(TUTORIAL_STORAGE_KEY).toBe('jamt_tutorial_completed');
    expect(readTutorialCompleted()).toBe(false);

    writeTutorialCompleted(true);
    expect(readTutorialCompleted()).toBe(true);
    expect(window.localStorage.getItem('jamt_tutorial_completed')).toBe('true');

    writeTutorialCompleted(false);
    expect(readTutorialCompleted()).toBe(false);
    expect(findTutorialTargetElement('non-existent-selector')).toBeNull();
  });

  it('T03: TutorialSpotlight renderiza los 4 cuadrantes oscuros, el marco de 2px y oculta Siguiente cuando requireAction es true', () => {
    const infoStep = TUTORIAL_STEPS.find((s) => !s.requireAction && s.tone === 'info')!;
    const actionStep = TUTORIAL_STEPS.find((s) => s.requireAction && s.tone === 'caution')!;
    const rect = { top: 100, left: 120, width: 300, height: 180, right: 420, bottom: 280 };

    const htmlInfo = renderToStaticMarkup(
      React.createElement(TutorialSpotlight, {
        lang: 'es',
        isActive: true,
        step: infoStep,
        stepIndex: 0,
        totalSteps: TUTORIAL_STEPS.length,
        targetRect: rect,
        onNext: () => {},
        onPrev: () => {},
        onSkip: () => {},
      }),
    );

    expect(htmlInfo).toContain('data-quadrant="top"');
    expect(htmlInfo).toContain('data-quadrant="bottom"');
    expect(htmlInfo).toContain('data-quadrant="left"');
    expect(htmlInfo).toContain('data-quadrant="right"');
    expect(htmlInfo).toContain('tutorial-tone-info');
    expect(htmlInfo).toContain('id="tutorial-next-btn"');
    expect(htmlInfo).toContain(infoStep.title.es);

    const htmlAction = renderToStaticMarkup(
      React.createElement(TutorialSpotlight, {
        lang: 'en',
        isActive: true,
        step: actionStep,
        stepIndex: 1,
        totalSteps: TUTORIAL_STEPS.length,
        targetRect: rect,
        onNext: () => {},
        onPrev: () => {},
        onSkip: () => {},
      }),
    );

    expect(htmlAction).toContain('tutorial-tone-caution');
    expect(htmlAction).toContain('tutorial-action-prompt');
    // Cuando requireAction es true, el botón "Next" se omite para exigir clic en el elemento real
    expect(htmlAction).not.toContain('id="tutorial-next-btn"');
    expect(htmlAction).toContain(actionStep.title.en);
  });

  it('T04: los componentes reales renderizan todos los atributos data-tutorial-id requeridos por TUTORIAL_STEPS', () => {
    const site = OUTPOST_SITES['moon-shackleton'];
    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    const projection = projectSystemsTurn(mission, mission.powerAllocation);
    const evaluation = evaluateCommanderPerformance(mission);
    const crew = getCrewStatus(mission);

    // Guardamos una partida activa para que App renderice la vista de misión completa
    window.localStorage.setItem(
      'jamt-mission-v2',
      JSON.stringify({ mission, challengeSeed: null }),
    );

    const appMarkup = renderToStaticMarkup(React.createElement(App));
    const panelMarkup = renderToStaticMarkup(
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
        crew,
      }),
    );
    const mapMarkup = renderToStaticMarkup(
      React.createElement(OutpostMap, {
        lang: 'es',
        site,
        currentDay: 1,
        resources: mission.resources,
        allocation: mission.powerAllocation,
        weather,
        projection,
      }),
    );

    const combinedHtml = `${appMarkup}\n${panelMarkup}\n${mapMarkup}`;
    for (const step of TUTORIAL_STEPS) {
      expect(combinedHtml).toContain(`data-tutorial-id="${step.targetSelector}"`);
    }
  });
});
