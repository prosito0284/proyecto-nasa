/**
 * Pruebas unitarias de los Visores 3D NASA (M01–M04)
 * Valida:
 * - Respaldo elegante SVG técnico cuando WebGL no está disponible (JSDOM / SSR / navegadores antiguos)
 *   sin emitir errores ni advertencias en consola.
 * - Etiquetas `aria-label` bilingües y atajos de teclado (Flechas, +/-, R, Espacio).
 * - Conmutador 2D/3D y selector accesible de módulos en `OutpostMap`.
 * - Nueva pestaña `"MODELO 3D"` / `"3D MODEL"` y hotspots `<= 15` palabras en `ScienceModal`.
 * - Globo `'planet-globe'` integrado en `MissionBriefing`.
 * - Resolución segura de URLs `.glb` con `BASE_URL` (cero 404) y construcción/limpieza Three.js.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MissionBriefing } from '../../MissionHUD/MissionBriefing';
import { OutpostMap } from '../../OutpostView/OutpostMap';
import { ScienceModal } from '../../ScienceTraceability/ScienceModal';
import {
  KID_SCIENCE_GLOSSARY,
  VERIFIED_NASA_WEATHER_EVENTS,
} from '../../../data/nasa-datasets';
import { OUTPOST_SITES } from '../../../data/scenarios';
import {
  createInitialMissionState,
  projectSystemsTurn,
  selectStartingWeather,
} from '../../../engine/simulationEngine';
import {
  isWebGLAvailable,
  ModelViewer3D,
  resolveViewerKeyCommand,
} from '../ModelViewer3D';
import {
  buildProceduralModel,
  disposeObject3D,
  EXTERNAL_GLB_ASSETS,
  HARDWARE_MODEL_HOTSPOTS,
  type Model3DId,
  resolveExternalModelUrl,
} from '../proceduralModels';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

describe('NASA 3D Models & CAD Viewer (M01–M04)', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 1280,
        innerHeight: 800,
        addEventListener: () => {},
        removeEventListener: () => {},
      },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it('M04: detecta de forma segura la falta de WebGL (SSR y JSDOM sin contexto) sin warnings ni errores', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Caso SSR / Node sin document
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    expect(isWebGLAvailable()).toBe(false);

    // Caso JSDOM simulando canvas.getContext devolviendo null
    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: () => ({
          getContext: () => null,
        }),
      },
      configurable: true,
      writable: true,
    });
    expect(isWebGLAvailable()).toBe(false);

    // Caso getContext que lanza excepción en navegador bloqueado
    Object.defineProperty(globalThis, 'document', {
      value: {
        createElement: () => ({
          getContext: () => {
            throw new Error('WebGL blocked');
          },
        }),
      },
      configurable: true,
      writable: true,
    });
    expect(isWebGLAvailable()).toBe(false);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('M04: renderiza el plano SVG técnico limpio en modo sin WebGL para los 4 modelos con aria-label bilingüe y cero emoji', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const models: Model3DId[] = ['colony-base', 'rover-moxie', 'habitat-shield', 'planet-globe'];

    for (const modelId of models) {
      const htmlEs = renderToStaticMarkup(
        React.createElement(ModelViewer3D, {
          lang: 'es',
          modelId,
          forceFallback: true,
          options: { siteId: modelId === 'rover-moxie' ? 'mars-jezero' : 'moon-shackleton' },
        }),
      );
      expect(htmlEs).toContain(`data-testid="viewer3d-svg-fallback-${modelId}"`);
      expect(htmlEs).toContain('SVG // SIN WEBGL');
      expect(htmlEs).toContain('aria-label="Visor 3D interactivo:');
      expect(htmlEs).toContain('Centrar vista');
      expect(htmlEs).toContain('Pausar rotación');
      expect(EMOJI_REGEX.test(htmlEs)).toBe(false);

      const htmlEn = renderToStaticMarkup(
        React.createElement(ModelViewer3D, {
          lang: 'en',
          modelId,
          forceFallback: true,
          options: { siteId: 'mars-jezero' },
        }),
      );
      expect(htmlEn).toContain('SVG // NO WEBGL');
      expect(htmlEn).toContain('aria-label="Interactive 3D viewer:');
      expect(htmlEn).toContain('Reset view');
      expect(htmlEn).toContain('Pause rotation');
      expect(EMOJI_REGEX.test(htmlEn)).toBe(false);
    }

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('M04: resolveViewerKeyCommand soporta flechas para rotar, +/- para zoom y R para centrar', () => {
    expect(resolveViewerKeyCommand('ArrowLeft')).toEqual({
      type: 'orbit',
      dTheta: 0.16,
      dPhi: 0,
      zoomScale: 1,
    });
    expect(resolveViewerKeyCommand('ArrowRight')).toEqual({
      type: 'orbit',
      dTheta: -0.16,
      dPhi: 0,
      zoomScale: 1,
    });
    expect(resolveViewerKeyCommand('ArrowUp')?.type).toBe('orbit');
    expect(resolveViewerKeyCommand('ArrowDown')?.type).toBe('orbit');
    expect(resolveViewerKeyCommand('+')).toEqual({
      type: 'orbit',
      dTheta: 0,
      dPhi: 0,
      zoomScale: 0.88,
    });
    expect(resolveViewerKeyCommand('-')).toEqual({
      type: 'orbit',
      dTheta: 0,
      dPhi: 0,
      zoomScale: 1.14,
    });
    expect(resolveViewerKeyCommand('r')).toEqual({ type: 'reset' });
    expect(resolveViewerKeyCommand('R')).toEqual({ type: 'reset' });
    expect(resolveViewerKeyCommand(' ')).toEqual({ type: 'toggle-pause' });
    expect(resolveViewerKeyCommand('Escape')).toBeNull();
  });

  it('M02: OutpostMap incluye conmutador accesible VISTA 2D / VISTA 3D y acceso a módulos conservando data-tutorial-id', () => {
    const site = OUTPOST_SITES['mars-jezero'];
    const weather = selectStartingWeather('mars-jezero', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('mars-jezero', weather, 20260415);
    const projection = projectSystemsTurn(mission, mission.powerAllocation);

    // En vista 2D / sin WebGL muestra diagrama SVG + conmutador
    const html2D = renderToStaticMarkup(
      React.createElement(OutpostMap, {
        lang: 'es',
        site,
        currentDay: 1,
        resources: mission.resources,
        allocation: mission.powerAllocation,
        weather,
        projection,
        defaultViewMode: '2d',
      }),
    );
    expect(html2D).toContain('data-tutorial-id="outpost-map"');
    expect(html2D).toContain('id="outpost-view-2d-btn"');
    expect(html2D).toContain('id="outpost-view-3d-btn"');
    expect(html2D).toContain('VISTA 2D');
    expect(html2D).toContain('VISTA 3D');
    expect(html2D).toContain('class="outpost-svg"');

    // En vista 3D muestra el visor 3D (o su respaldo SVG limpio sin WebGL) y los 5 botones de módulos
    const html3D = renderToStaticMarkup(
      React.createElement(OutpostMap, {
        lang: 'en',
        site,
        currentDay: 1,
        resources: mission.resources,
        allocation: mission.powerAllocation,
        weather,
        projection,
        defaultViewMode: '3d',
      }),
    );
    expect(html3D).toContain('data-tutorial-id="outpost-map"');
    expect(html3D).toContain('2D VIEW');
    expect(html3D).toContain('3D VIEW');
    expect(html3D).toContain('data-testid="outpost-3d-stage"');
    expect(html3D).toContain('id="colony-3d-btn-solar"');
    expect(html3D).toContain('id="colony-3d-btn-eclss"');
    expect(html3D).toContain('id="colony-3d-btn-shielding"');
    expect(html3D).toContain('id="colony-3d-btn-greenhouse"');
    expect(html3D).toContain('id="colony-3d-btn-comms"');
    expect(html3D).toContain('data-testid="viewer3d-svg-fallback-colony-base"');
  });

  it('M03: ScienceModal expone la pestaña MODELO 3D / 3D MODEL con Rover MOXIE, Hábitat y 3 hotspots <= 15 palabras', () => {
    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);

    const htmlEs = renderToStaticMarkup(
      React.createElement(ScienceModal, {
        lang: 'es',
        isOpen: true,
        onClose: () => {},
        glossary: KID_SCIENCE_GLOSSARY,
        currentWeather: weather,
        siteId: 'moon-shackleton',
        initialTab: 'model-3d',
      }),
    );
    expect(htmlEs).toContain('id="tab-model-3d-btn"');
    expect(htmlEs).toContain('MODELO 3D');
    expect(htmlEs).toContain('id="panel-model-3d"');
    expect(htmlEs).toContain('id="hw-select-rover-moxie"');
    expect(htmlEs).toContain('id="hw-select-habitat-shield"');
    expect(htmlEs).toContain('data-testid="viewer3d-svg-fallback-rover-moxie"');

    const htmlEn = renderToStaticMarkup(
      React.createElement(ScienceModal, {
        lang: 'en',
        isOpen: true,
        onClose: () => {},
        glossary: KID_SCIENCE_GLOSSARY,
        currentWeather: weather,
        siteId: 'mars-jezero',
        initialTab: 'model-3d',
      }),
    );
    expect(htmlEn).toContain('3D MODEL');
    expect(htmlEn).toContain('Perseverance Rover + MOXIE');
    expect(htmlEn).toContain('Regolith-Shielded Habitat');

    for (const modelKey of ['rover-moxie', 'habitat-shield'] as const) {
      const spots = HARDWARE_MODEL_HOTSPOTS[modelKey];
      expect(spots).toHaveLength(3);
      for (const spot of spots) {
        for (const lang of ['es', 'en'] as const) {
          expect(countWords(spot.explanation[lang])).toBeLessThanOrEqual(15);
          expect(EMOJI_REGEX.test(spot.explanation[lang])).toBe(false);
          expect(EMOJI_REGEX.test(spot.label[lang])).toBe(false);
        }
      }
    }
  });

  it('M03: MissionBriefing integra planet-globe reactivo sin texto largo ni emojis', () => {
    const htmlBriefing = renderToStaticMarkup(
      React.createElement(MissionBriefing, {
        lang: 'es',
        sites: Object.values(OUTPOST_SITES),
        selectedSiteId: 'mars-jezero',
        onStart: () => {},
      }),
    );
    expect(htmlBriefing).toContain('data-testid="briefing-globe-card"');
    expect(htmlBriefing).toContain('data-testid="model-viewer-planet-globe"');
    expect(htmlBriefing).toContain('id="briefing-globe-select-moon-shackleton"');
    expect(htmlBriefing).toContain('id="briefing-globe-select-mars-jezero"');
    expect(EMOJI_REGEX.test(htmlBriefing)).toBe(false);
  });

  it('M01: resolveExternalModelUrl respeta BASE_URL y evita peticiones 404 por defecto', () => {
    expect(Object.keys(EXTERNAL_GLB_ASSETS)).toHaveLength(0);
    expect(resolveExternalModelUrl('colony-base')).toBeNull();
    expect(resolveExternalModelUrl('rover-moxie', 'rover.glb', '/proyecto-nasa/')).toBe(
      '/proyecto-nasa/models/rover.glb',
    );
    expect(resolveExternalModelUrl('planet-globe', '/models/globe.glb', './')).toBe(
      './models/globe.glb',
    );
  });

  it('M01: los modelos procedurales CAD de Three.js se construyen, actualizan estado y liberan memoria sin errores', () => {
    const models: Model3DId[] = ['colony-base', 'rover-moxie', 'habitat-shield', 'planet-globe'];

    for (const id of models) {
      const handle = buildProceduralModel(id, {
        siteId: 'mars-jezero',
        isDustStorm: true,
        isSolarStorm: true,
        isLowPowerBlackout: true,
        isGreenhouseWilted: true,
        shieldingAllocPercent: 45,
        solarAllocPercent: 80,
      });
      expect(handle.group.children.length).toBeGreaterThan(0);
      handle.updateState?.({
        siteId: 'moon-shackleton',
        isDustStorm: false,
        isSolarStorm: false,
        isLowPowerBlackout: false,
        isGreenhouseWilted: false,
        shieldingAllocPercent: 20,
        selectedModule: 'solar',
      });
      handle.animate?.(1.2, 0.016);
      disposeObject3D(handle.group);
    }
  });
});
