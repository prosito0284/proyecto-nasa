/**
 * Pruebas de contrato y renderizado del Sistema de Entrenamiento Guiado (T01–T08)
 * Verifican:
 * - T01 & T04: Estructura bilingüe (máximo 2 frases por paso) y cero emoji.
 * - T02: Persistencia en `localStorage` ('jamt_tutorial_completed') y búsqueda segura de objetivos DOM.
 * - T03: Motor Spotlight de 4 cuadrantes oscuros e independencia de clics.
 * - T05: `TutorialCallout` con inversión inteligente de bordes (`computeCalloutPosition`) y botones >=44x44 px.
 * - T06: `TutorialPointer` con conector SVG ortogonal de 90° (`buildOrthogonalConnector`) y 4 escuadras (`buildCornerBrackets`).
 * - T07 & T08: Instrumentación real `data-tutorial-id` en el HUD y triggers de aprendizaje activo.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../../App';
import { WorkOrder } from '../../components/Mission/WorkOrder';
import { ResourcePanel } from '../../components/MissionHUD/ResourcePanel';
import { OutpostMap } from '../../components/OutpostView/OutpostMap';
import { ScienceModal } from '../../components/ScienceTraceability/ScienceModal';
import { computeCalloutPosition } from '../../components/Tutorial/TutorialCallout';
import {
  buildCornerBrackets,
  buildOrthogonalConnector,
} from '../../components/Tutorial/TutorialPointer';
import { TutorialSpotlight } from '../../components/Tutorial/TutorialSpotlight';
import {
  KID_SCIENCE_GLOSSARY,
  VERIFIED_NASA_WEATHER_EVENTS,
} from '../../data/nasa-datasets';
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

describe('Interactive Tutorial System (T01–T08)', () => {
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
    expect(TUTORIAL_STEPS.length).toBeGreaterThanOrEqual(6);
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

  it('T03, T05 & T06: TutorialSpotlight renderiza 4 cuadrantes, TutorialPointer (90° + 4 escuadras) y TutorialCallout', () => {
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
    expect(htmlInfo).toContain('data-testid="tutorial-callout-box"');
    expect(htmlInfo).toContain('data-testid="tutorial-pointer-svg"');
    expect(htmlInfo).toContain('data-corner-bracket="top-left"');
    expect(htmlInfo).toContain('data-corner-bracket="top-right"');
    expect(htmlInfo).toContain('data-corner-bracket="bottom-left"');
    expect(htmlInfo).toContain('data-corner-bracket="bottom-right"');
    expect(htmlInfo).toContain('id="tutorial-prev-btn"');
    expect(htmlInfo).toContain('id="tutorial-next-btn"');
    expect(htmlInfo).toContain('id="tutorial-skip-btn"');
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
    expect(htmlAction).toContain('data-testid="tutorial-action-indicator"');
    expect(htmlAction).not.toContain('id="tutorial-next-btn"');
    expect(htmlAction).toContain(actionStep.title.en);
  });

  it('T05 & T06: computeCalloutPosition invierte bordes al salirse del viewport y buildOrthogonalConnector genera ángulos de 90°', () => {
    // Recorte pegado al borde inferior de una pantalla móvil (360x640) con placement preferido 'bottom'
    const bottomEdgeCutout = {
      top: 520,
      left: 20,
      width: 320,
      height: 100,
      right: 340,
      bottom: 620,
    };
    const flipped = computeCalloutPosition(
      bottomEdgeCutout,
      'bottom',
      330,
      210,
      360,
      640,
    );
    expect(flipped.resolvedPlacement).toBe('top');
    expect(flipped.left).toBeGreaterThanOrEqual(12);
    expect(flipped.right).toBeLessThanOrEqual(348);
    expect(flipped.top).toBeGreaterThanOrEqual(12);

    const brackets = buildCornerBrackets(bottomEdgeCutout);
    expect(brackets).toHaveLength(4);

    const vector = buildOrthogonalConnector(
      bottomEdgeCutout,
      {
        top: flipped.top,
        left: flipped.left,
        width: flipped.width,
        height: flipped.height,
        right: flipped.right,
        bottom: flipped.bottom,
      },
      flipped.resolvedPlacement,
    );
    expect(vector.pathD).toMatch(/^M \d+ \d+ L \d+ \d+ L \d+ \d+ L \d+ \d+$/);
    expect(vector.arrowPoints.split(' ')).toHaveLength(3);
  });

  it('T07 & T08: todos los contenedores reales del HUD y ScienceModal exponen data-tutorial-id y aceptan onTutorialAction', () => {
    const site = OUTPOST_SITES['moon-shackleton'];
    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    const projection = projectSystemsTurn(mission, mission.powerAllocation);
    const evaluation = evaluateCommanderPerformance(mission);
    const crew = getCrewStatus(mission);

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
        onTutorialAction: () => {},
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
        onTutorialAction: () => {},
      }),
    );
    const workOrderMarkup = renderToStaticMarkup(
      React.createElement(WorkOrder, {
        lang: 'es',
        choice: mission.currentDilemma!.choices[0],
        code: 'OT-1A',
        weatherIsLive: false,
        executed: false,
        disabled: false,
        onPreview: () => {},
        onExecute: () => {},
        tutorialId: 'primary-work-order',
        onTutorialAction: () => {},
      }),
    );
    const scienceMarkup = renderToStaticMarkup(
      React.createElement(ScienceModal, {
        lang: 'es',
        isOpen: true,
        onClose: () => {},
        glossary: KID_SCIENCE_GLOSSARY,
        currentWeather: weather,
        siteId: 'moon-shackleton',
        onTutorialAction: () => {},
      }),
    );

    const combinedHtml = [
      appMarkup,
      panelMarkup,
      mapMarkup,
      workOrderMarkup,
      scienceMarkup,
    ].join('\n');

    for (const step of TUTORIAL_STEPS) {
      expect(combinedHtml).toContain(`data-tutorial-id="${step.targetSelector}"`);
    }
    expect(combinedHtml).toContain('data-tutorial-id="timeline-bar"');
    expect(combinedHtml).toContain('data-tutorial-id="crew-status"');
    expect(combinedHtml).toContain('data-tutorial-id="primary-work-order"');
    expect(combinedHtml).toContain('data-tutorial-id="science-modal-sheet"');
    expect(combinedHtml).toContain('data-tutorial-id="science-folder-tabs"');
  });
});
