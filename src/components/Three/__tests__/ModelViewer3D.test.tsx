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
import * as THREE from 'three';
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
  findModelPartId,
  HARDWARE_MODEL_HOTSPOTS,
  highlightModelPart,
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

  it('M02/M03: OutpostMap incluye conmutador accesible de 3 vistas (2D, Orbital, Rover) y acceso a módulos conservando data-tutorial-id', () => {
    const site = OUTPOST_SITES['mars-jezero'];
    const weather = selectStartingWeather('mars-jezero', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('mars-jezero', weather, 20260415);
    const projection = projectSystemsTurn(mission, mission.powerAllocation);

    // En vista 2D / sin WebGL muestra diagrama SVG + conmutador de 3 modos
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
    expect(html2D).toContain('id="outpost-cam-rover-btn"');
    expect(html2D).toContain('VISTA 2D');
    expect(html2D).toContain('CÁMARA ORBITAL');
    expect(html2D).toContain('CÁMARA ROVER');
    expect(html2D).toContain('class="outpost-svg"');

    // En vista Orbital y Cámara Rover muestra el entorno ColonyWorld3D (o su respaldo SVG sin WebGL) y los 5 módulos
    for (const mode of ['orbital', 'rover'] as const) {
      const html3D = renderToStaticMarkup(
        React.createElement(OutpostMap, {
          lang: 'en',
          site,
          currentDay: 1,
          resources: mission.resources,
          allocation: mission.powerAllocation,
          weather,
          projection,
          defaultViewMode: mode,
        }),
      );
      expect(html3D).toContain('data-tutorial-id="outpost-map"');
      expect(html3D).toContain('2D VIEW');
      expect(html3D).toContain('ORBITAL CAMERA');
      expect(html3D).toContain('ROVER CAMERA');
      expect(html3D).toContain('Inspect 5 Outpost Modules');
      expect(html3D).toContain('data-testid="outpost-3d-stage"');
      expect(html3D).toContain('data-testid="colony-world-3d"');
      expect(html3D).toContain('data-testid="colony-world-svg-fallback"');
      expect(html3D).toContain('id="colony-3d-btn-power-grid"');
      expect(html3D).toContain('id="colony-3d-btn-oxygen-module"');
      expect(html3D).toContain('id="colony-3d-btn-greenhouse"');
      expect(html3D).toContain('id="colony-3d-btn-comms-array"');
      expect(html3D).toContain('id="colony-3d-btn-rover-moxie"');
      expect(html3D).toContain('data-testid="viewer3d-svg-fallback-colony-base"');
    }
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
    expect(htmlEs).toContain('data-testid="science-3d-selected-readout"');
    expect(htmlEs).toContain('Haz clic en una pieza del modelo 3D o abajo para inspeccionarla.');
    expect(htmlEs).toContain('id="hotspot-moxie-unit"');
    expect(htmlEs).toContain('id="hotspot-mmrtg"');
    expect(htmlEs).toContain('id="hotspot-mastcam-z"');
    expect(htmlEs).toContain('data-part-id="moxie-unit"');
    expect(htmlEs).toContain('data-part-id="mmrtg"');
    expect(htmlEs).toContain('data-part-id="mastcam-z"');

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
    expect(htmlEn).toContain('Click any piece on the 3D model or below to inspect its function.');

    expect(HARDWARE_MODEL_HOTSPOTS['rover-moxie'].map((h) => h.id)).toEqual([
      'moxie-unit',
      'mmrtg',
      'mastcam-z',
    ]);
    expect(HARDWARE_MODEL_HOTSPOTS['habitat-shield'].map((h) => h.id)).toEqual([
      'regolith-shell',
      'water-jacket',
      'pressurized-core',
    ]);

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

  it('M03: ModelViewer3D expone piezas interactivas en SVG y Three.js (findModelPartId + highlightModelPart)', () => {
    const htmlRover = renderToStaticMarkup(
      React.createElement(ModelViewer3D, {
        lang: 'es',
        modelId: 'rover-moxie',
        forceFallback: true,
        selectedPartId: 'mmrtg',
        options: { siteId: 'mars-jezero' },
      }),
    );
    expect(htmlRover).toContain('data-testid="viewer3d-active-part-badge"');
    expect(htmlRover).toContain('Generador MMRTG');
    expect(htmlRover).toContain('data-part-id="moxie-unit"');
    expect(htmlRover).toContain('data-part-id="mmrtg"');
    expect(htmlRover).toContain('data-part-id="mastcam-z"');

    const htmlHab = renderToStaticMarkup(
      React.createElement(ModelViewer3D, {
        lang: 'en',
        modelId: 'habitat-shield',
        forceFallback: true,
        selectedPartId: 'water-jacket',
        options: { siteId: 'moon-shackleton' },
      }),
    );
    expect(htmlHab).toContain('H₂O Water Jacket');
    expect(htmlHab).toContain('data-part-id="regolith-shell"');
    expect(htmlHab).toContain('data-part-id="water-jacket"');
    expect(htmlHab).toContain('data-part-id="pressurized-core"');

    for (const [modelId, expectedIds] of [
      ['rover-moxie', ['moxie-unit', 'mmrtg', 'mastcam-z']],
      ['habitat-shield', ['regolith-shell', 'water-jacket', 'pressurized-core']],
    ] as const) {
      const built = buildProceduralModel(modelId);
      const foundIds = new Set<string>();
      built.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const pid = findModelPartId(obj);
          if (pid) foundIds.add(pid);
        }
      });
      for (const expectedId of expectedIds) {
        expect(foundIds.has(expectedId)).toBe(true);
      }

      const targetId = expectedIds[1];
      highlightModelPart(built.group, targetId);
      let highlightedMeshCount = 0;
      built.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.partId === targetId) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (mat.userData.isPartHighlighted) highlightedMeshCount++;
        }
      });
      expect(highlightedMeshCount).toBeGreaterThan(0);

      highlightModelPart(built.group, null);
      let stillHighlightedCount = 0;
      built.group.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.partId) {
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (mat.userData.isPartHighlighted) stillHighlightedCount++;
        }
      });
      expect(stillHighlightedCount).toBe(0);
      disposeObject3D(built.group);
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

    const globe = buildProceduralModel('planet-globe', { siteId: 'moon-shackleton' });
    globe.updateState?.({ siteId: 'mars-jezero' });
    globe.animate?.(0.5, 0.016);
    globe.updateState?.({ siteId: 'moon-shackleton' });
    disposeObject3D(globe.group);
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
