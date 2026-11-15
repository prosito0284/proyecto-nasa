/**
 * R09 — Pruebas completas del Rover 3D jugable, telemetría HUD, retorno a base y recolección 2D/WebGL.
 */

import * as THREE from 'three';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OUTPOST_SITES } from '../../../data/scenarios';
import { VERIFIED_NASA_WEATHER_EVENTS } from '../../../data/nasa-datasets';
import {
  createInitialMissionState,
  getScienceBonusTier,
  projectSystemsTurn,
  selectStartingWeather,
} from '../../../engine/simulationEngine';
import { applySampleCollectToMission } from '../../../hooks/useMission';
import { missionAudio } from '../../../utils/sound';
import { OutpostMap } from '../../OutpostView/OutpostMap';
import { ColonyWorld3D } from '../ColonyWorld3D';
import {
  buildColonyWorld,
  disposeObject3D,
  generateTurnAnomalies,
  sampleWorldTerrainHeight,
} from '../proceduralModels';
import {
  createRoverController,
  EMPTY_ROVER_INPUT,
  getColonyObstacleColliders,
  ROVER_COLLISION_RADIUS,
  ROVER_MAX_STEER_RAD,
  ROVER_WORLD_LIMITS,
} from '../roverController';
import {
  EMPTY_ROVER_DIRECTIONS,
  mapKeyToRoverDirection,
  RoverControlsOverlay,
  type RoverDirectionKey,
} from '../RoverControlsOverlay';
import {
  generateTurnSamples,
  SAMPLE_CATALOG,
  type SurfaceSampleKind,
} from '../sampleManager';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function countSentences(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0).length;
}

function findElementsByTestId(
  node: React.ReactNode,
  out: Record<string, React.ReactElement> = {},
): Record<string, React.ReactElement> {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const child of node) findElementsByTestId(child, out);
    return out;
  }
  if (React.isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    if (typeof props['data-testid'] === 'string') {
      out[props['data-testid']] = node;
    }
    if (props.children !== undefined) {
      findElementsByTestId(props.children as React.ReactNode, out);
    }
  }
  return out;
}

describe('RoverPlayable (R09: Kinematics, Controls, Samples, Telemetry & Return to Base)', () => {
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
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (missionAudio.isMuted()) {
      missionAudio.toggleMute();
    }
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
      writable: true,
    });
  });

  it('kinematics (roverController): forward drives X/Z, spins wheels, clamps steer ±ROVER_MAX_STEER_RAD, stays in [-22, 22], differentiates Moon/Mars & avoids domes', () => {
    const lunarCtrl = createRoverController({
      planet: 'lunar',
      initialX: -14,
      initialZ: -14,
      initialHeading: 0,
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'moon-shackleton', 20260415),
    });
    const marsCtrl = createRoverController({
      planet: 'mars',
      initialX: -14,
      initialZ: -14,
      initialHeading: 0,
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'mars-jezero', 20260415),
    });

    const lunarStart = lunarCtrl.getState();
    let totalLunarWheelSpin = 0;
    let totalMarsWheelSpin = 0;

    for (let i = 0; i < 30; i++) {
      const lStep = lunarCtrl.step({
        dt: 0.05,
        input: { ...EMPTY_ROVER_INPUT, forward: true },
        getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'moon-shackleton', 20260415),
      });
      const mStep = marsCtrl.step({
        dt: 0.05,
        input: { ...EMPTY_ROVER_INPUT, forward: true },
        getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'mars-jezero', 20260415),
      });
      totalLunarWheelSpin += lStep.wheelSpinDelta;
      totalMarsWheelSpin += mStep.wheelSpinDelta;
    }

    expect(lunarCtrl.getState().x).toBeGreaterThan(lunarStart.x + 2.5);
    expect(totalLunarWheelSpin).toBeGreaterThan(3.0);
    expect(totalMarsWheelSpin).toBeGreaterThan(2.5);

    // Soltar acelerador -> regolito lunar desliza más lejos que arena marciana
    const lCoast0 = lunarCtrl.getState().x;
    const mCoast0 = marsCtrl.getState().x;
    for (let i = 0; i < 30; i++) {
      lunarCtrl.step({
        dt: 0.05,
        input: EMPTY_ROVER_INPUT,
        getTerrainHeight: () => 0,
      });
      marsCtrl.step({
        dt: 0.05,
        input: EMPTY_ROVER_INPUT,
        getTerrainHeight: () => 0,
      });
    }
    expect(lunarCtrl.getState().x - lCoast0).toBeGreaterThan((marsCtrl.getState().x - mCoast0) * 1.3);

    // Giro izquierdo/derecho dentro de ±ROVER_MAX_STEER_RAD
    const steerLeft = lunarCtrl.step({
      dt: 0.25,
      input: { forward: true, backward: false, left: true, right: false },
      getTerrainHeight: () => 0,
    });
    expect(steerLeft.steerAngle).toBeGreaterThan(0);
    expect(steerLeft.steerAngle).toBeLessThanOrEqual(ROVER_MAX_STEER_RAD + 0.0001);

    for (let i = 0; i < 20; i++) {
      marsCtrl.step({
        dt: 0.05,
        input: { forward: true, backward: false, left: false, right: true },
        getTerrainHeight: () => 0,
      });
    }
    expect(marsCtrl.getState().steerAngle).toBeLessThan(0);
    expect(Math.abs(marsCtrl.getState().steerAngle)).toBeLessThanOrEqual(ROVER_MAX_STEER_RAD + 0.0001);

    // Límites físicos invisibles [-22, 22] y anticolisión contra domos de la colonia
    const obstacles = getColonyObstacleColliders({
      solarWingLeft: true,
      solarWingRight: true,
      tunnelAirlockSpur: true,
      tunnelNorthUmbilical: true,
      greenhouseTier2: true,
      greenhouseTier3: true,
      regolithWall: true,
      regolithArches: true,
    });
    const edgeCtrl = createRoverController({
      planet: 'lunar',
      initialX: 20.5,
      initialZ: 20.5,
      initialHeading: -Math.PI / 4,
    });
    for (let i = 0; i < 60; i++) {
      const s = edgeCtrl.step({
        dt: 0.05,
        input: { ...EMPTY_ROVER_INPUT, forward: true },
        getTerrainHeight: () => 0,
        obstacles,
      });
      expect(s.x).toBeGreaterThanOrEqual(ROVER_WORLD_LIMITS.boundsMin);
      expect(s.x).toBeLessThanOrEqual(ROVER_WORLD_LIMITS.boundsMax);
      expect(s.z).toBeGreaterThanOrEqual(ROVER_WORLD_LIMITS.boundsMin);
      expect(s.z).toBeLessThanOrEqual(ROVER_WORLD_LIMITS.boundsMax);
      for (const obs of obstacles) {
        expect(Math.hypot(s.x - obs.x, s.z - obs.z)).toBeGreaterThanOrEqual(
          obs.radius + ROVER_COLLISION_RADIUS - 0.02,
        );
      }
    }
    expect(edgeCtrl.getState().hitBoundary).toBe(true);
  });

  it('returnRoverToBase (R08): regresa el Rover suavemente junto al domo central rodeando obstáculos, respeta apagón y admite cola post-muestra', () => {
    for (const siteId of ['moon-shackleton', 'mars-jezero'] as const) {
      const world = buildColonyWorld({ siteId, terrainSeed: 20260415, currentDay: 1 });
      const obstacles = getColonyObstacleColliders(world.getEvolutionState());

      // Conducir lejos hacia cuadrante noroeste (-X, -Z) para que deba rodear el domo central
      let t = 0;
      world.setRoverControlInput({ forward: true, backward: false, left: false, right: true });
      for (let i = 0; i < 45; i++) {
        t += 0.08;
        world.animate(t, 0.08);
      }
      world.setRoverControlInput(EMPTY_ROVER_INPUT);
      const farTele = world.getRoverTelemetry();
      expect(Math.hypot(farTele.x - 6.8, farTele.z - 6.0)).toBeGreaterThan(2.5);

      expect(world.returnRoverToBase()).toBe(true);
      let arrived = false;
      for (let step = 0; step < 120; step++) {
        t += 0.08;
        world.animate(t, 0.08);
        const cur = world.getRoverTelemetry();
        for (const obs of obstacles) {
          expect(Math.hypot(cur.x - obs.x, cur.z - obs.z)).toBeGreaterThanOrEqual(
            obs.radius + ROVER_COLLISION_RADIUS - 0.15,
          );
        }
        if (Math.hypot(cur.x - 6.8, cur.z - 6.0) < 0.6 && Math.abs(cur.linearVelocity) < 0.05) {
          arrived = true;
          break;
        }
      }
      expect(arrived).toBe(true);

      // Tras llegar junto al domo central el jugador puede retomar el control manual inmediatamente
      const parked = world.getRoverTelemetry();
      world.setRoverControlInput({ forward: true, backward: false, left: false, right: false });
      for (let i = 0; i < 8; i++) {
        t += 0.05;
        world.animate(t, 0.05);
      }
      expect(world.getRoverTelemetry().linearVelocity).toBeGreaterThan(0.5);
      expect(
        Math.hypot(world.getRoverTelemetry().x - parked.x, world.getRoverTelemetry().z - parked.z),
      ).toBeGreaterThan(0.2);

      // Encolar retorno a base durante una recolección activa espera a que termine el brazo
      const firstSample = world.getSamples()[0];
      expect(world.collectSample(firstSample.id)).toBe(true);
      expect(world.returnRoverToBase()).toBe(true);
      for (let step = 0; step < 120; step++) {
        t += 0.08;
        world.animate(t, 0.08);
      }
      const postCollectDock = world.getRoverTelemetry();
      expect(postCollectDock.collectingSampleId).toBeNull();
      expect(Math.hypot(postCollectDock.x - 6.8, postCollectDock.z - 6.0)).toBeLessThan(0.75);

      // Protección durante apagón (< 15%): returnRoverToBase no activa motores
      world.updateState({ powerPercent: 10, isLowPowerBlackout: true });
      expect(world.returnRoverToBase()).toBe(false);

      disposeObject3D(world.group);
    }
  });

  it('controls & HUD overlay (R02/R04/R07/R08): D-pad 44x44, 3 cámaras, telemetría en vivo, botón REGRESAR A BASE y CSS AGENTS.md sin emoji', async () => {
    expect(mapKeyToRoverDirection('ArrowUp')).toBe('forward');
    expect(mapKeyToRoverDirection('w')).toBe('forward');
    expect(mapKeyToRoverDirection('s')).toBe('backward');
    expect(mapKeyToRoverDirection('a')).toBe('left');
    expect(mapKeyToRoverDirection('d')).toBe('right');

    const radarSamples = [
      { dist: 2.1, expectedClass: 'is-near', expectedText: 'RADAR: 2.1 m' },
      { dist: 6.4, expectedClass: 'is-mid', expectedText: 'RADAR: 6.4 m' },
      { dist: null, expectedClass: 'is-ok', expectedText: null },
    ] as const;

    for (const lang of ['es', 'en'] as const) {
      for (const r of radarSamples) {
        const html = renderToStaticMarkup(
          React.createElement(RoverControlsOverlay, {
            lang,
            activeDirections: { forward: true, backward: false, left: false, right: false },
            speedMps: 3.6,
            cameraMode: 'mastcam',
            onCameraModeChange: () => {},
            onReturnToBase: () => {},
            telemetry: {
              sciencePoints: 45,
              collectedCount: 2,
              totalSamples: 5,
              x: -4.2,
              z: 9.8,
              nearestSampleDistance: r.dist,
            },
            onDirectionChange: () => {},
          }),
        );

        expect(EMOJI_REGEX.test(html)).toBe(false);
        expect(html).toContain('data-testid="rover-telemetry-bar"');
        expect(html).toContain(lang === 'es' ? 'CIENCIA: 45 PTS' : 'SCIENCE: 45 PTS');
        expect(html).toContain(lang === 'es' ? 'MUESTRAS: 2/5' : 'SAMPLES: 2/5');
        expect(html).toContain('X -4.2 / Z 9.8');
        expect(html).toContain('3.6 m/s');
        expect(html).toContain('data-testid="rover-return-base-btn"');
        expect(html).toContain(lang === 'es' ? 'REGRESAR A BASE' : 'RETURN TO BASE');
        expect(html).toMatch(new RegExp(`class="[^"]*rover-tel-radar ${r.expectedClass}`));
        expect(html).toContain(
          r.expectedText ?? (lang === 'es' ? 'RADAR: OK' : 'RADAR: DONE'),
        );
      }
    }

    // Eventos interactivos del overlay (puntero, teclado y botón REGRESAR A BASE)
    const onDirectionChange = vi.fn<(dir: RoverDirectionKey, pressed: boolean) => void>();
    const onCameraModeChange = vi.fn();
    const onCollectSample = vi.fn();
    const onReturnToBase = vi.fn();

    const tree = RoverControlsOverlay({
      lang: 'es',
      activeDirections: EMPTY_ROVER_DIRECTIONS,
      cameraMode: 'chase',
      onCameraModeChange,
      nearbySample: {
        id: 'smp-1',
        code: 'ICE-15',
        label: 'Núcleo de hielo polar',
        points: 15,
        distance: 1.5,
      },
      onCollectSample,
      onReturnToBase,
      telemetry: {
        sciencePoints: 30,
        collectedCount: 1,
        totalSamples: 5,
        x: 6.8,
        z: 6.0,
        nearestSampleDistance: 1.5,
      },
      onDirectionChange,
    });
    const byId = findElementsByTestId(tree);
    const stopPropagation = vi.fn();
    const preventDefault = vi.fn();

    const fwdProps = byId['rover-dpad-forward'].props as Record<string, (e?: unknown) => void>;
    fwdProps.onPointerDown({ pointerType: 'mouse', button: 0, stopPropagation, preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onDirectionChange).toHaveBeenLastCalledWith('forward', true);

    fwdProps.onKeyDown({ key: 'Enter', stopPropagation, preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(onDirectionChange).toHaveBeenLastCalledWith('forward', true);
    fwdProps.onKeyUp({ key: 'Enter', stopPropagation, preventDefault });
    expect(onDirectionChange).toHaveBeenLastCalledWith('forward', false);

    (byId['rover-cam-mastcam-btn'].props as { onClick: () => void }).onClick();
    expect(onCameraModeChange).toHaveBeenCalledWith('mastcam');

    (byId['rover-collect-btn'].props as { onClick: () => void }).onClick();
    expect(onCollectSample).toHaveBeenCalledWith('smp-1');

    const retProps = byId['rover-return-base-btn'].props as {
      onClick: () => void;
      onPointerDown: (e: unknown) => void;
    };
    retProps.onPointerDown({ stopPropagation });
    expect(stopPropagation).toHaveBeenCalled();
    retProps.onClick();
    expect(onReturnToBase).toHaveBeenCalledTimes(1);

    // Validar reglas CSS de AGENTS.md (0 degradados, 0 sombras, >= 44x44 px, bordes 2px)
    const fsModuleName = 'node:' + 'fs';
    const fsMod = (await import(/* @vite-ignore */ fsModuleName)) as {
      readFileSync: (file: URL, encoding: string) => string;
    };
    const viewer3dCss = fsMod.readFileSync(
      new URL('../../../styles/viewer3d.css', import.meta.url),
      'utf8',
    );
    const indexCss = fsMod.readFileSync(
      new URL('../../../styles/index.css', import.meta.url),
      'utf8',
    );

    for (const css of [viewer3dCss, indexCss]) {
      expect(css).not.toMatch(/linear-gradient|radial-gradient|conic-gradient/i);
      expect(css).not.toMatch(/box-shadow\s*:/i);
    }
    expect(viewer3dCss).toMatch(/\.rover-return-btn\s*\{[^}]*min-width:\s*44px;/s);
    expect(viewer3dCss).toMatch(/\.rover-return-btn\s*\{[^}]*min-height:\s*44px;/s);
    expect(viewer3dCss).toMatch(/\.rover-return-btn\s*\{[^}]*border-radius:\s*2px;/s);
    expect(viewer3dCss).toMatch(/\.colony3d-tactical-toast\s*\{[^}]*border:\s*2px solid/s);
    expect(indexCss).toMatch(/\.outpost-2d-notice\s*\{[^}]*border:\s*2px solid/s);
  });

  it('samples, telemetry points, audio cue & mute, blackout, and accessible 2D / no-WebGL views (R05–R08)', () => {
    // 1. Hallazgos NASA R07 en ES/EN: 1 sola oración y <= 15 palabras, sin emoji
    for (const kind of Object.keys(SAMPLE_CATALOG) as SurfaceSampleKind[]) {
      const entry = SAMPLE_CATALOG[kind];
      for (const lang of ['es', 'en'] as const) {
        expect(EMOJI_REGEX.test(entry.title[lang])).toBe(false);
        expect(EMOJI_REGEX.test(entry.finding[lang])).toBe(false);
        expect(countSentences(entry.finding[lang])).toBe(1);
        expect(countWords(entry.finding[lang])).toBeLessThanOrEqual(15);
      }
    }

    // 2. Puntos de Ciencia sin duplicados + niveles de eficiencia
    const weather = selectStartingWeather('mars-jezero', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('mars-jezero', weather, 20260415);
    const anomalies = generateTurnAnomalies('mars-jezero', 20260415, 1);
    const turnSamples = generateTurnSamples('mars-jezero', 20260415, 1, {
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'mars-jezero', 20260415),
      avoidPositions: anomalies.map((a) => ({ x: a.position[0], z: a.position[2], minDist: 4.6 })),
    });
    expect(turnSamples.length).toBeGreaterThanOrEqual(4);

    const first = turnSamples[0];
    const once = applySampleCollectToMission(mission, first);
    expect(once.resources.sciencePoints).toBe(mission.resources.sciencePoints + first.points);
    expect(once.roverSamplesCollected).toBe(1);
    const twice = applySampleCollectToMission(once, first);
    expect(twice).toBe(once);
    expect(getScienceBonusTier(once.resources.sciencePoints + 75).tier).toBeGreaterThanOrEqual(1);

    // 3. Protección en apagón (< 15%): collectSample y dispatchRoverToSample bloqueados en 3D
    const blackoutWorld = buildColonyWorld({
      siteId: 'mars-jezero',
      terrainSeed: 20260415,
      currentDay: 1,
      powerPercent: 10,
      isLowPowerBlackout: true,
    });
    expect(blackoutWorld.collectSample(first.id)).toBe(false);
    expect(blackoutWorld.dispatchRoverToSample(first.id)).toBe(false);
    expect(blackoutWorld.getRoverTelemetry().isMoving).toBe(false);
    disposeObject3D(blackoutWorld.group);

    // 4. Audio sintetizado al recolectar muestra respeta estado Mute en missionAudio
    vi.useFakeTimers();
    const createdOscillators: Array<{ freq: number }> = [];
    const MockAudioCtx = vi.fn().mockImplementation(() => ({
      state: 'running',
      currentTime: 0,
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      createOscillator: vi.fn(() => {
        const osc = {
          type: 'sine',
          frequency: {
            setValueAtTime: vi.fn((f: number) => {
              createdOscillators.push({ freq: f });
            }),
          },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        return osc;
      }),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
    }));
    Object.defineProperty(globalThis.window, 'AudioContext', {
      value: MockAudioCtx,
      configurable: true,
      writable: true,
    });

    if (missionAudio.isMuted()) {
      missionAudio.toggleMute();
    }
    missionAudio.playSampleCollect();
    vi.advanceTimersByTime(300);
    expect(createdOscillators.length).toBe(3);

    createdOscillators.length = 0;
    expect(missionAudio.toggleMute()).toBe(true);
    missionAudio.playSampleCollect();
    vi.advanceTimersByTime(300);
    expect(createdOscillators.length).toBe(0);

    // 5. Accesibilidad en VISTA 2D (OutpostMap defaultViewMode="2d") y sin WebGL (ColonyWorld3D forceFallback)
    const projection = projectSystemsTurn(once, once.powerAllocation);
    for (const lang of ['es', 'en'] as const) {
      const map2DHtml = renderToStaticMarkup(
        React.createElement(OutpostMap, {
          lang,
          site: OUTPOST_SITES['mars-jezero'],
          currentDay: 1,
          resources: once.resources,
          allocation: once.powerAllocation,
          weather,
          projection,
          defaultViewMode: '2d',
          terrainSeed: 20260415,
          collectedSampleIds: once.collectedSampleIds,
          onCollectSample: () => {},
        }),
      );
      expect(EMOJI_REGEX.test(map2DHtml)).toBe(false);
      expect(map2DHtml).toContain('data-testid="outpost-2d-telemetry-bar"');
      expect(map2DHtml).toContain(
        lang === 'es'
          ? `CIENCIA: ${once.resources.sciencePoints} PTS`
          : `SCIENCE: ${once.resources.sciencePoints} PTS`,
      );
      expect(map2DHtml).toContain(
        lang === 'es'
          ? `MUESTRAS: 1/${turnSamples.length}`
          : `SAMPLES: 1/${turnSamples.length}`,
      );
      for (const smp of turnSamples) {
        expect(map2DHtml).toContain(`data-testid="svg-2d-sample-${smp.id}"`);
        expect(map2DHtml).toContain(`data-testid="outpost-2d-sample-btn-${smp.id}"`);
      }
      const svgSampleTagMatch = map2DHtml.match(
        new RegExp(`<g[^>]*data-testid="svg-2d-sample-${first.id}"[^>]*>`),
      );
      expect(svgSampleTagMatch).not.toBeNull();
      expect(svgSampleTagMatch![0]).toContain('tabindex="0"');
      expect(svgSampleTagMatch![0]).toContain('aria-pressed="true"');
      const btnSampleTagMatch = map2DHtml.match(
        new RegExp(`<button[^>]*data-testid="outpost-2d-sample-btn-${first.id}"[^>]*>`),
      );
      expect(btnSampleTagMatch).not.toBeNull();
      expect(btnSampleTagMatch![0]).toContain('aria-pressed="true"');

      const fallbackHtml = renderToStaticMarkup(
        React.createElement(ColonyWorld3D, {
          lang,
          forceFallback: true,
          options: {
            siteId: 'mars-jezero',
            terrainSeed: 20260415,
            currentDay: 1,
            sciencePoints: once.resources.sciencePoints,
            collectedSampleIds: once.collectedSampleIds,
          },
          onCollectSample: () => {},
        }),
      );
      expect(EMOJI_REGEX.test(fallbackHtml)).toBe(false);
      for (const smp of turnSamples) {
        expect(fallbackHtml).toContain(`data-testid="svg-sample-${smp.id}"`);
        expect(fallbackHtml).toContain(`data-testid="colony-sample-btn-${smp.id}"`);
      }
    }
  });
});
