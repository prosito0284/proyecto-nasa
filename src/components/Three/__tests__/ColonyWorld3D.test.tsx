/**
 * Pruebas unitarias e integración del Mundo 3D de la Colonia (M01–M04)
 * Valida:
 * - Atmósferas diferenciadas Luna vs. Marte (cielo, niebla FogExp2, estrellas, Tierra, polvo).
 * - Horizonte infinito (2000x2000), plaza de la colonia nivelada (y = 0) y límites invisibles de cámara [-22, 22].
 * - Picking de los 5 módulos por Raycasting/findColonyModuleId, estados ambientales en vivo y antena de radio.
 * - Navegación completa por teclado (flechas, WASD, +/-, Tab sin trampa, Enter/Espacio, R), cero emoji y limpieza GPU.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getGlossaryTerm, VERIFIED_NASA_WEATHER_EVENTS } from '../../../data/nasa-datasets';
import { OUTPOST_SITES } from '../../../data/scenarios';
import {
  createInitialMissionState,
  projectSystemsTurn,
  selectStartingWeather,
} from '../../../engine/simulationEngine';
import {
  applyAnomalyScanToMission,
  applyMaintenanceToMission,
  getMaintenanceDelayedBonus,
} from '../../../hooks/useMission';
import { OutpostMap } from '../../OutpostView/OutpostMap';
import {
  ColonyWorld3D,
  getNextCameraMode,
  normalizeCameraMode,
  resolveColonyKeyCommand,
} from '../ColonyWorld3D';
import {
  ANOMALY_GLOSSARY_TERM_MAP,
  buildColonyWorld,
  clampColonyCameraDistance,
  clampColonyPolarAngle,
  clampToColonyBounds,
  COLONY_CAMERA_LIMITS,
  COLONY_WORLD_GLB_ASSETS,
  COLONY_WORLD_MODULE_IDS,
  COLONY_WORLD_MODULES,
  type ColonyWorldModuleId,
  computeColonyEvolutionState,
  computeColonyFocusPose,
  computeDynamicSunDirection,
  disposeObject3D,
  findAnomalyId,
  findColonyModuleId,
  generateTurnAnomalies,
  getAnomalyGlossaryTermId,
  getColonyEvolutionSummary,
  getColonyModuleStatus,
  getMaintenanceConfirmation,
  getModuleGlossaryTermId,
  getModulesNeedingMaintenance,
  getWorldAtmosphere,
  isStormShieldDeployed,
  resolveColonyModuleGlbUrl,
  SAMPLE_COLLECT_RADIUS,
  SAMPLE_COLLECTION_DURATION,
  sampleWorldTerrainHeight,
  softClampColonyTarget,
  type WorldAnomalyKind,
  WORLD_ATMOSPHERES,
  WORLD_TERRAIN_SIZE,
} from '../proceduralModels';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

describe('Interactive 3D Colony World (M01–M04)', () => {
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

  it('M01: separa atmósferas Luna (negro, estrellas, Tierra, sol rasante) y Marte (óxido, polvo, luz cálida) con FogExp2 sincronizada', () => {
    expect(WORLD_ATMOSPHERES.lunar.skyColor).toBe(0x03060c);
    expect(WORLD_ATMOSPHERES.lunar.fogColor).toBe(WORLD_ATMOSPHERES.lunar.skyColor);
    expect(WORLD_ATMOSPHERES.lunar.showStars).toBe(true);
    expect(WORLD_ATMOSPHERES.lunar.showEarth).toBe(true);
    expect(WORLD_ATMOSPHERES.lunar.sunDirection[1]).toBeLessThan(0.25);

    expect(WORLD_ATMOSPHERES.mars.skyColor).toBe(0x2d160e);
    expect(WORLD_ATMOSPHERES.mars.fogColor).toBe(WORLD_ATMOSPHERES.mars.skyColor);
    expect(WORLD_ATMOSPHERES.mars.showStars).toBe(false);
    expect(WORLD_ATMOSPHERES.mars.showEarth).toBe(false);
    expect(WORLD_ATMOSPHERES.mars.dustBaseCount).toBeGreaterThan(0);
    expect(WORLD_ATMOSPHERES.mars.dustStormCount).toBeGreaterThan(WORLD_ATMOSPHERES.mars.dustBaseCount);
    expect(getWorldAtmosphere('mars-jezero').kind).toBe('mars');
    expect(getWorldAtmosphere('moon-shackleton').kind).toBe('lunar');

    const lunarWorld = buildColonyWorld({ siteId: 'moon-shackleton' });
    expect(lunarWorld.fog.color.getHex()).toBe(0x03060c);
    expect(lunarWorld.group.getObjectByName('world-stars')).toBeTruthy();
    expect(lunarWorld.group.getObjectByName('world-earth')).toBeTruthy();
    expect(lunarWorld.group.getObjectByName('world-sun')).toBeTruthy();
    expect(lunarWorld.group.getObjectByName('world-terrain')).toBeTruthy();
    disposeObject3D(lunarWorld.group);

    const marsWorld = buildColonyWorld({ siteId: 'mars-jezero' });
    expect(marsWorld.fog.color.getHex()).toBe(0x2d160e);
    expect(marsWorld.group.getObjectByName('world-stars')).toBeUndefined();
    expect(marsWorld.group.getObjectByName('world-earth')).toBeUndefined();
    expect(marsWorld.group.getObjectByName('world-sun')).toBeTruthy();
    expect(marsWorld.group.getObjectByName('world-terrain')).toBeTruthy();
    disposeObject3D(marsWorld.group);
  });

  it('M01: el terreno es extenso (2000x2000), nivela la plaza de la base en y = 0 y varía relieve exterior entre Luna y Marte', () => {
    expect(WORLD_TERRAIN_SIZE).toBe(2000);

    // Dentro del radio de la colonia todas las coordenadas están a y = 0 para no enterrar módulos
    for (const siteId of ['moon-shackleton', 'mars-jezero'] as const) {
      expect(sampleWorldTerrainHeight(0, 0, siteId)).toBe(0);
      for (const modId of COLONY_WORLD_MODULE_IDS) {
        const [mx, mz] = COLONY_WORLD_MODULES[modId].position;
        expect(sampleWorldTerrainHeight(mx, mz, siteId)).toBe(0);
      }
    }

    // Relieve lejano distinto y no plano más allá de 120 m
    let lunarVar = 0;
    let marsVar = 0;
    for (let r = 80; r <= 600; r += 65) {
      lunarVar += Math.abs(sampleWorldTerrainHeight(r, r * 0.4, 'moon-shackleton'));
      marsVar += Math.abs(sampleWorldTerrainHeight(r, r * 0.4, 'mars-jezero'));
    }
    expect(lunarVar).toBeGreaterThan(5);
    expect(marsVar).toBeGreaterThan(5);
    expect(lunarVar).not.toBeCloseTo(marsVar, 2);

    const world = buildColonyWorld({ siteId: 'moon-shackleton' });
    const terrain = world.group.getObjectByName('world-terrain') as THREE.Mesh;
    const box = new THREE.Box3().setFromObject(terrain);
    expect(box.min.x).toBeLessThanOrEqual(-999);
    expect(box.max.x).toBeGreaterThanOrEqual(999);
    expect(box.min.z).toBeLessThanOrEqual(-999);
    expect(box.max.z).toBeGreaterThanOrEqual(999);
    disposeObject3D(world.group);
  });

  it('M01: aplica límites invisibles de cámara ampliados [-46, 46] con retorno amortiguado y maxDistance 88', () => {
    expect(COLONY_CAMERA_LIMITS.boundsMin).toBe(-46);
    expect(COLONY_CAMERA_LIMITS.boundsMax).toBe(46);
    expect(COLONY_CAMERA_LIMITS.minDistance).toBe(7);
    expect(COLONY_CAMERA_LIMITS.maxDistance).toBe(88);
    expect(COLONY_CAMERA_LIMITS.minPolarAngle).toBe(0.18);
    expect(COLONY_CAMERA_LIMITS.maxPolarAngle).toBeLessThan(Math.PI / 2);

    expect(clampToColonyBounds(-99)).toBe(-46);
    expect(clampToColonyBounds(99)).toBe(46);
    expect(clampColonyCameraDistance(2)).toBe(7);
    expect(clampColonyCameraDistance(120)).toBe(88);
    expect(clampColonyPolarAngle(0.01)).toBe(COLONY_CAMERA_LIMITS.minPolarAngle);
    expect(clampColonyPolarAngle(Math.PI)).toBe(COLONY_CAMERA_LIMITS.maxPolarAngle);

    const inside = softClampColonyTarget(30, -32, 0.5);
    expect(inside.wasOutside).toBe(false);
    expect(inside.x).toBe(30);
    expect(inside.z).toBe(-32);

    const soft = softClampColonyTarget(64, -60, 0.5);
    expect(soft.wasOutside).toBe(true);
    expect(soft.x).toBeLessThanOrEqual(46 + COLONY_CAMERA_LIMITS.overshoot);
    expect(soft.z).toBeGreaterThanOrEqual(-46 - COLONY_CAMERA_LIMITS.overshoot);

    const hard = softClampColonyTarget(120, -120, 1);
    expect(hard.wasOutside).toBe(true);
    expect(hard.x).toBe(46);
    expect(hard.z).toBe(-46);

    for (const id of COLONY_WORLD_MODULE_IDS) {
      const pose = computeColonyFocusPose(id);
      expect(pose.target[0]).toBeGreaterThanOrEqual(-46);
      expect(pose.target[0]).toBeLessThanOrEqual(46);
      expect(pose.target[2]).toBeGreaterThanOrEqual(-46);
      expect(pose.target[2]).toBeLessThanOrEqual(46);
      const dist = Math.hypot(
        pose.cameraPos[0] - pose.target[0],
        pose.cameraPos[1] - pose.target[1],
        pose.cameraPos[2] - pose.target[2],
      );
      expect(dist).toBeGreaterThanOrEqual(7 - 0.001);
      expect(dist).toBeLessThanOrEqual(88 + 0.001);
    }
  });

  it('M01: genera topografías deterministas por semilla (Seed) y mantiene nivelada la plaza central', () => {
    const seedA = 104729;
    const seedB = 739391;
    const worldA = buildColonyWorld({ siteId: 'mars-jezero', terrainSeed: seedA });
    const worldB = buildColonyWorld({ siteId: 'mars-jezero', terrainSeed: seedB });

    expect(worldA.terrainSeed).toBe(seedA);
    expect(worldB.terrainSeed).toBe(seedB);
    expect(worldA.group.getObjectByName('world-outcrops')).toBeTruthy();
    expect(worldB.group.getObjectByName('world-outcrops')).toBeTruthy();

    let diffSum = 0;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const rx = Math.cos(angle) * 95;
      const rz = Math.sin(angle) * 95;
      const hA1 = sampleWorldTerrainHeight(rx, rz, 'mars-jezero', seedA);
      const hA2 = sampleWorldTerrainHeight(rx, rz, 'mars-jezero', seedA);
      const hB = sampleWorldTerrainHeight(rx, rz, 'mars-jezero', seedB);
      expect(hA1).toBe(hA2);
      diffSum += Math.abs(hA1 - hB);
    }
    expect(diffSum).toBeGreaterThan(2);

    // La plaza central sigue nivelada en y = 0 bajo cualquier semilla
    expect(sampleWorldTerrainHeight(0, 0, 'mars-jezero', seedA)).toBe(0);
    expect(sampleWorldTerrainHeight(0, 0, 'mars-jezero', seedB)).toBe(0);

    disposeObject3D(worldA.group);
    disposeObject3D(worldB.group);
  });

  it('M02: permite picking Raycaster de los 5 módulos, sincroniza clima/escudo/apagón y reemplaza GLB sin 404', () => {
    expect(Object.keys(COLONY_WORLD_GLB_ASSETS)).toHaveLength(0);
    for (const id of COLONY_WORLD_MODULE_IDS) {
      expect(resolveColonyModuleGlbUrl(id)).toBeNull();
    }

    const world = buildColonyWorld({
      siteId: 'mars-jezero',
      powerPercent: 72,
      lifeSupportPercent: 80,
      shieldingPercent: 60,
      foodPercent: 70,
      shieldingAllocPercent: 15,
    });

    expect(world.pickables).toHaveLength(5);
    const resolvedPickables = new Set<ColonyWorldModuleId>();
    for (const group of world.pickables) {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const found = findColonyModuleId(obj);
          if (found) resolvedPickables.add(found);
        }
      });
    }
    expect(resolvedPickables.size).toBe(5);

    // Probar hover, selección, pulso y actualización reactiva de tormenta + alerta + apagón
    world.setHovered('comms-array');
    world.setSelected('power-grid');
    world.pulse('oxygen-module');
    world.updateState({
      siteId: 'mars-jezero',
      powerPercent: 10,
      lifeSupportPercent: 22,
      foodPercent: 18,
      shieldingAllocPercent: 45,
      isDustStorm: true,
      isSolarStorm: true,
      isEnvironmentalAlert: true,
      isLowPowerBlackout: true,
      isGreenhouseWilted: true,
      commsActive: true,
      commDelaySeconds: 720,
    });
    world.animate(1.5, 0.05);
    world.setHovered(null);

    const customObj = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 }),
    );
    world.replaceModuleVisual('rover-moxie', customObj);
    expect(findColonyModuleId(customObj)).toBe('rover-moxie');

    expect(isStormShieldDeployed({ shieldingAllocPercent: 40 })).toBe(true);
    expect(isStormShieldDeployed({ isSolarStorm: true })).toBe(true);
    expect(isStormShieldDeployed({ isEnvironmentalAlert: true })).toBe(true);
    expect(isStormShieldDeployed({ shieldingAllocPercent: 10 })).toBe(false);

    for (const lang of ['es', 'en'] as const) {
      for (const id of COLONY_WORLD_MODULE_IDS) {
        const st = getColonyModuleStatus(
          id,
          {
            siteId: 'mars-jezero',
            powerPercent: 20,
            lifeSupportPercent: 30,
            foodPercent: 20,
            shieldingAllocPercent: 40,
            isGreenhouseWilted: true,
            isEnvironmentalAlert: true,
            commsActive: true,
            commDelaySeconds: 720,
          },
          lang,
        );
        expect(st.text.length).toBeGreaterThan(5);
        expect(EMOJI_REGEX.test(st.text)).toBe(false);
        expect(EMOJI_REGEX.test(COLONY_WORLD_MODULES[id].label[lang])).toBe(false);
      }
    }

    disposeObject3D(world.group);
  });

  it('M02: evoluciona la colonia por día/asignación (alas solares, túneles, invernadero y regolito) y varía el ángulo solar', () => {
    const evoDay1 = computeColonyEvolutionState({
      currentDay: 1,
      solarAllocPercent: 30,
      shieldingAllocPercent: 20,
      greenhouseAllocPercent: 15,
      sciencePoints: 10,
      lifeSupportPercent: 60,
      powerPercent: 60,
      foodPercent: 60,
    });
    expect(evoDay1.solarWingLeft).toBe(false);
    expect(evoDay1.solarWingRight).toBe(false);
    expect(evoDay1.tunnelAirlockSpur).toBe(false);
    expect(evoDay1.tunnelNorthUmbilical).toBe(false);
    expect(evoDay1.greenhouseTier2).toBe(false);
    expect(evoDay1.greenhouseTier3).toBe(false);
    expect(evoDay1.regolithWall).toBe(false);
    expect(evoDay1.regolithArches).toBe(false);

    const world = buildColonyWorld({
      siteId: 'moon-shackleton',
      currentDay: 1,
      solarAllocPercent: 30,
      shieldingAllocPercent: 20,
      greenhouseAllocPercent: 15,
      sciencePoints: 10,
      lifeSupportPercent: 60,
      powerPercent: 60,
      foodPercent: 60,
    });

    expect(world.getEvolutionState()).toEqual(evoDay1);
    expect(world.group.getObjectByName('evo-solar-wing-left')?.visible).toBe(false);
    expect(world.group.getObjectByName('evo-tunnel-airlock')?.visible).toBe(false);
    expect(world.group.getObjectByName('evo-regolith-wall')?.visible).toBe(false);
    expect(world.group.getObjectByName('evo-greenhouse-tier2')?.visible).toBe(false);

    const sunDay1 = new THREE.Vector3();
    world.getSunDirection(sunDay1);

    // Al avanzar a Sol/Día 5 con ciencia y blindaje, despliega todas las expansiones y rota el Sol
    world.updateState({
      siteId: 'moon-shackleton',
      currentDay: 5,
      sciencePoints: 50,
      powerPercent: 85,
      lifeSupportPercent: 82,
      foodPercent: 78,
      solarAllocPercent: 70,
      shieldingAllocPercent: 45,
      greenhouseAllocPercent: 40,
      isGreenhouseWilted: false,
    });

    const evoDay5 = world.getEvolutionState();
    expect(evoDay5.solarWingLeft).toBe(true);
    expect(evoDay5.solarWingRight).toBe(true);
    expect(evoDay5.tunnelAirlockSpur).toBe(true);
    expect(evoDay5.tunnelNorthUmbilical).toBe(true);
    expect(evoDay5.greenhouseTier2).toBe(true);
    expect(evoDay5.greenhouseTier3).toBe(true);
    expect(evoDay5.regolithWall).toBe(true);
    expect(evoDay5.regolithArches).toBe(true);

    for (const partName of [
      'evo-solar-wing-left',
      'evo-solar-wing-right',
      'evo-tunnel-airlock',
      'evo-tunnel-north',
      'evo-greenhouse-tier2',
      'evo-greenhouse-tier3',
      'evo-regolith-wall',
      'evo-regolith-arches',
    ]) {
      const obj = world.group.getObjectByName(partName);
      expect(obj).toBeTruthy();
      expect(obj?.visible).toBe(true);
    }

    // Todas las alas nuevas de módulos siguen siendo seleccionables por Raycaster
    expect(findColonyModuleId(world.group.getObjectByName('evo-solar-wing-left') ?? null)).toBe('power-grid');
    expect(findColonyModuleId(world.group.getObjectByName('evo-regolith-arches') ?? null)).toBe('oxygen-module');
    expect(findColonyModuleId(world.group.getObjectByName('evo-greenhouse-tier3') ?? null)).toBe('greenhouse');

    const sunDay5 = new THREE.Vector3();
    world.getSunDirection(sunDay5);
    expect(sunDay5.distanceTo(sunDay1)).toBeGreaterThan(0.2);

    const rimSun = computeDynamicSunDirection('moon-shackleton', { currentDay: 2, isRimShadowPass: true });
    expect(rimSun[1]).toBeLessThan(0.1);
    const marsDustSun = computeDynamicSunDirection('mars-jezero', { currentDay: 4, isDustStorm: true });
    expect(marsDustSun[1]).toBeCloseTo(0.38, 3);

    world.animate(2.0, 0.2);
    disposeObject3D(world.group);

    // Respaldo SVG sin WebGL también refleja evolución por día
    const htmlEvo = renderToStaticMarkup(
      React.createElement(ColonyWorld3D, {
        lang: 'es',
        forceFallback: true,
        options: {
          siteId: 'mars-jezero',
          currentDay: 5,
          sciencePoints: 50,
          powerPercent: 85,
          lifeSupportPercent: 85,
          foodPercent: 75,
          solarAllocPercent: 70,
          shieldingAllocPercent: 45,
          greenhouseAllocPercent: 40,
        },
      }),
    );
    expect(htmlEvo).toContain('data-evo="solar-left"');
    expect(htmlEvo).toContain('data-evo="solar-right"');
    expect(htmlEvo).toContain('data-evo="regolith-arches"');
    expect(htmlEvo).toContain('data-evo="greenhouse-tier3"');
    expect(htmlEvo).toContain('data-evo="tunnel-north"');
  });

  it('M04: resolveColonyKeyCommand soporta órbita, paneo (Shift/WASD), zoom, cámara C, Tab, Enter, Espacio y R', () => {
    expect(resolveColonyKeyCommand('ArrowLeft')).toEqual({
      type: 'orbit',
      dTheta: 0.16,
      dPhi: 0,
      zoomScale: 1,
    });
    expect(resolveColonyKeyCommand('ArrowLeft', true)).toEqual({
      type: 'pan',
      dx: -1.8,
      dz: 0,
    });
    expect(resolveColonyKeyCommand('w')).toEqual({ type: 'pan', dx: 0, dz: -1.8 });
    expect(resolveColonyKeyCommand('s')).toEqual({ type: 'pan', dx: 0, dz: 1.8 });
    expect(resolveColonyKeyCommand('a')).toEqual({ type: 'pan', dx: -1.8, dz: 0 });
    expect(resolveColonyKeyCommand('d')).toEqual({ type: 'pan', dx: 1.8, dz: 0 });
    expect(resolveColonyKeyCommand('+')?.type).toBe('orbit');
    expect(resolveColonyKeyCommand('-')?.type).toBe('orbit');
    expect(resolveColonyKeyCommand('c')).toEqual({ type: 'toggle-camera' });
    expect(resolveColonyKeyCommand('C')).toEqual({ type: 'toggle-camera' });
    expect(resolveColonyKeyCommand('Tab')).toEqual({ type: 'cycle-module', dir: 1 });
    expect(resolveColonyKeyCommand('Tab', true)).toEqual({ type: 'cycle-module', dir: -1 });
    expect(resolveColonyKeyCommand('Enter')).toEqual({ type: 'activate-module' });
    expect(resolveColonyKeyCommand(' ')).toEqual({ type: 'toggle-pause' });
    expect(resolveColonyKeyCommand('r')).toEqual({ type: 'reset' });
    expect(resolveColonyKeyCommand('Escape')).toBeNull();
  });

  it('M03/M04: generateTurnAnomalies es determinista, respeta zonas de exclusión y cumple <= 15 palabras sin emojis', () => {
    const keepOutCenters = [
      { x: 0, z: 0, r: 7.5 },
      { x: -13, z: 4, r: 6.5 },
      { x: 12.5, z: 3, r: 5.5 },
      { x: -6, z: -13, r: 4.0 },
      { x: 9, z: 12.5, r: 4.2 },
    ];

    for (const siteId of ['moon-shackleton', 'mars-jezero'] as const) {
      const a1 = generateTurnAnomalies(siteId, 20260415, 1);
      const a1Repeat = generateTurnAnomalies(siteId, 20260415, 1);
      const a2Day2 = generateTurnAnomalies(siteId, 20260415, 2);
      const a2Seed = generateTurnAnomalies(siteId, 991177, 1);

      expect(a1).toEqual(a1Repeat);
      expect(a1).toHaveLength(2);
      expect(a2Day2).toHaveLength(2);
      expect(a1[0].id).not.toBe(a1[1].id);
      expect(a1[0].id).not.toBe(a2Day2[0].id);
      expect(a1[0].position).not.toEqual(a2Seed[0].position);

      for (let day = 1; day <= 8; day++) {
        const turnItems = generateTurnAnomalies(siteId, 20260415 + day * 13, day);
        expect(turnItems).toHaveLength(2);
        expect(turnItems[0].kind).not.toBe(turnItems[1].kind);
        for (const anom of turnItems) {
          expect(anom.position[0]).toBeGreaterThanOrEqual(-20);
          expect(anom.position[0]).toBeLessThanOrEqual(20);
          expect(anom.position[2]).toBeGreaterThanOrEqual(-20);
          expect(anom.position[2]).toBeLessThanOrEqual(20);
          for (const zone of keepOutCenters) {
            expect(Math.hypot(anom.position[0] - zone.x, anom.position[2] - zone.z)).toBeGreaterThanOrEqual(
              zone.r,
            );
          }
          for (const lang of ['es', 'en'] as const) {
            expect(countWords(anom.title[lang])).toBeLessThanOrEqual(15);
            expect(countWords(anom.finding[lang])).toBeLessThanOrEqual(15);
            expect(EMOJI_REGEX.test(anom.title[lang])).toBe(false);
            expect(EMOJI_REGEX.test(anom.finding[lang])).toBe(false);
          }
        }
      }
    }
  });

  it('M03/M04: Three.js anomalías, expedición del Rover, mantenimiento directo y limpieza GPU completa', () => {
    const world = buildColonyWorld({
      siteId: 'mars-jezero',
      terrainSeed: 20260415,
      currentDay: 2,
      isDustStorm: true,
      isSolarStorm: true,
      isGreenhouseWilted: true,
      powerPercent: 32,
      lifeSupportPercent: 38,
      foodPercent: 20,
    });

    expect(world.anomalyPickables).toHaveLength(2);
    expect(world.pickables).toHaveLength(5);

    const anomalies = world.getAnomalies();
    expect(anomalies).toHaveLength(2);
    for (let i = 0; i < 2; i++) {
      let resolvedId: string | null = null;
      world.anomalyPickables[i].traverse((o) => {
        if (!resolvedId && o instanceof THREE.Mesh) {
          resolvedId = findAnomalyId(o);
        }
      });
      expect(resolvedId).toBe(anomalies[i].id);
    }

    // Mantenimiento pendiente debe activar balizas e invisibilizarlas al completar mantenimiento
    for (const modId of ['power-grid', 'oxygen-module', 'greenhouse', 'comms-array'] as const) {
      expect(world.group.getObjectByName(`maint-${modId}`)?.visible).toBe(true);
    }

    world.triggerMaintenanceAnimation('power-grid');
    world.triggerMaintenanceAnimation('greenhouse');
    world.triggerMaintenanceAnimation('comms-array');
    world.updateState({
      maintainedModuleIds: ['power-grid', 'oxygen-module', 'greenhouse', 'comms-array'],
    });
    for (const modId of ['power-grid', 'oxygen-module', 'greenhouse', 'comms-array'] as const) {
      expect(world.group.getObjectByName(`maint-${modId}`)?.visible).toBe(false);
    }

    // Despacho del Rover hacia anomalía 0 -> conducir -> escanear (láser activo) -> marcar escaneada -> regresar
    const startPos = new THREE.Vector3();
    const forward = new THREE.Vector3();
    world.getRoverPose(startPos, forward);
    expect(Number.isFinite(startPos.x)).toBe(true);
    expect(forward.length()).toBeCloseTo(1, 3);

    expect(world.dispatchRoverToAnomaly('non-existent')).toBe(false);
    expect(world.dispatchRoverToAnomaly(anomalies[0].id)).toBe(true);

    const beamMesh = world.group.getObjectByName('rover-scanner-beam');
    expect(beamMesh).toBeTruthy();

    let sawActiveLaserBeam = false;
    let t = 0;
    for (let step = 0; step < 110; step++) {
      t += 0.1;
      world.animate(t, 0.1);
      if (beamMesh?.visible) {
        sawActiveLaserBeam = true;
      }
    }
    expect(sawActiveLaserBeam).toBe(true);
    expect(beamMesh?.visible).toBe(false);

    // Pose válida tras volver o conducir
    const endPos = new THREE.Vector3();
    const endFwd = new THREE.Vector3();
    world.getRoverPose(endPos, endFwd);
    expect(Number.isFinite(endPos.y)).toBe(true);
    expect(endFwd.length()).toBeCloseTo(1, 3);

    // Reinicio limpio al vaciar anomalías escaneadas y al avanzar de día
    world.updateState({ currentDay: 3, scannedAnomalyIds: [] });
    expect(world.getAnomalies()[0].id).not.toBe(anomalies[0].id);

    // Verificar dispose GPU sobre geometrías y materiales añadidos en M02/M03
    const terrain = world.group.getObjectByName('world-terrain') as THREE.Mesh;
    const beam = world.group.getObjectByName('rover-scanner-beam') as THREE.Mesh;
    const geoSpy = vi.spyOn(terrain.geometry, 'dispose');
    const beamGeoSpy = vi.spyOn(beam.geometry, 'dispose');
    disposeObject3D(world.group);
    expect(geoSpy).toHaveBeenCalledTimes(1);
    expect(beamGeoSpy).toHaveBeenCalledTimes(1);
  });

  it('M03/M04: getModulesNeedingMaintenance y helpers de useMission cumplen recompensas y <= 15 palabras', () => {
    const allIssues = getModulesNeedingMaintenance({
      isDustStorm: true,
      isSolarStorm: true,
      isEnvironmentalAlert: true,
      isGreenhouseWilted: true,
      powerPercent: 25,
      lifeSupportPercent: 30,
      foodPercent: 20,
    });
    expect(allIssues.map((i) => i.moduleId)).toEqual([
      'power-grid',
      'oxygen-module',
      'greenhouse',
      'comms-array',
    ]);

    for (const issue of allIssues) {
      const conf = getMaintenanceConfirmation(issue.moduleId);
      expect(conf).toBeTruthy();
      for (const lang of ['es', 'en'] as const) {
        expect(countWords(issue.prompt[lang])).toBeLessThanOrEqual(15);
        expect(countWords(issue.confirmation[lang])).toBeLessThanOrEqual(15);
        expect(EMOJI_REGEX.test(issue.prompt[lang])).toBe(false);
        expect(EMOJI_REGEX.test(issue.confirmation[lang])).toBe(false);
      }
    }

    const filteredIssues = getModulesNeedingMaintenance(
      { isDustStorm: true, isSolarStorm: true },
      ['power-grid', 'comms-array'],
    );
    expect(filteredIssues.some((i) => i.moduleId === 'power-grid')).toBe(false);
    expect(filteredIssues.some((i) => i.moduleId === 'comms-array')).toBe(false);
    expect(getMaintenanceConfirmation('rover-moxie')).toBeNull();

    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    const anomalies = generateTurnAnomalies('moon-shackleton', 20260415, 1);

    const afterScan = applyAnomalyScanToMission(mission, anomalies[0]);
    expect(afterScan.resources.sciencePoints).toBe(mission.resources.sciencePoints + 3);
    expect(afterScan.logs[0].nasaTag).toBe('Lunar Rover LRO');
    expect(afterScan.logs.length).toBe(mission.logs.length + 1);

    const lowPowerMission = {
      ...afterScan,
      resources: { ...afterScan.resources, power: 40, lifeSupport: 50, food: 60 },
    };
    const afterPowerMaint = applyMaintenanceToMission(lowPowerMission, 'power-grid')!;
    expect(afterPowerMaint.resources.power).toBe(42);
    expect(afterPowerMaint.logs[0].nasaTag).toBe('Artemis ECLSS');
    expect(afterPowerMaint.pendingDelayedEffects).toHaveLength(1);
    expect(afterPowerMaint.pendingDelayedEffects[0].resourceDelta.power).toBe(3);

    const afterCommsMaint = applyMaintenanceToMission(afterPowerMaint, 'comms-array')!;
    expect(afterCommsMaint.resources.sciencePoints).toBe(afterPowerMaint.resources.sciencePoints + 1);
    expect(afterCommsMaint.pendingDelayedEffects).toHaveLength(2);
    expect(afterCommsMaint.pendingDelayedEffects[1].resourceDelta.sciencePoints).toBe(2);
    expect(getMaintenanceDelayedBonus('greenhouse')?.resourceDelta.food).toBe(3);
    expect(getMaintenanceDelayedBonus('oxygen-module')?.resourceDelta.lifeSupport).toBe(3);
    expect(getMaintenanceDelayedBonus('rover-moxie')).toBeNull();

    const evoStarter = computeColonyEvolutionState({ currentDay: 1, solarAllocPercent: 20, shieldingAllocPercent: 10, greenhouseAllocPercent: 10 });
    const evoMax = computeColonyEvolutionState({ currentDay: 6, sciencePoints: 50, lifeSupportPercent: 85, powerPercent: 85, foodPercent: 80, solarAllocPercent: 70, shieldingAllocPercent: 45, greenhouseAllocPercent: 45 });
    expect(getColonyEvolutionSummary(evoStarter, 'es').badgeLabel).toBe('FASE I · 0/8');
    expect(getColonyEvolutionSummary(evoMax, 'en').badgeLabel).toBe('TIER III · 8/8');
  });

  it('M04: ColonyWorld3D y OutpostMap renderizan respaldo SVG sin WebGL (orbital, rover, anomalías, mantenimiento) con cero errores', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const day1Anomalies = generateTurnAnomalies('moon-shackleton', 20260415, 1);

    for (const [lang, siteId] of [
      ['es', 'moon-shackleton'],
      ['en', 'mars-jezero'],
    ] as const) {
      const siteAnoms = generateTurnAnomalies(siteId, 20260415, 1);
      const html = renderToStaticMarkup(
        React.createElement(ColonyWorld3D, {
          lang,
          forceFallback: true,
          cameraMode: 'rover',
          selectedModule: 'comms-array',
          options: {
            siteId,
            terrainSeed: 20260415,
            currentDay: 1,
            powerPercent: 80,
            lifeSupportPercent: 85,
            shieldingPercent: 75,
            foodPercent: 70,
            shieldingAllocPercent: 40,
            isEnvironmentalAlert: siteId === 'moon-shackleton',
            isDustStorm: siteId === 'mars-jezero',
            scannedAnomalyIds: [siteAnoms[0].id],
            maintainedModuleIds: [],
          },
        }),
      );
      expect(html).toContain('data-testid="colony-world-3d"');
      expect(html).toContain('data-testid="colony-evo-badge"');
      expect(html).toContain('data-testid="colony-world-svg-fallback"');
      expect(html).toContain('data-testid="colony-anomalies-bar"');
      expect(html).toContain(`data-testid="svg-anomaly-${siteAnoms[0].id}"`);
      expect(html).toContain(`data-testid="svg-anomaly-${siteAnoms[1].id}"`);
      expect(html).toContain(lang === 'es' ? '(analizada)' : '(scanned)');
      expect(html).toContain(lang === 'es' ? '(+3 ciencia)' : '(+3 science)');
      if (siteId === 'moon-shackleton') {
        expect(html).toContain('data-testid="svg-maint-oxygen-module"');
      } else {
        expect(html).toContain('data-testid="svg-maint-power-grid"');
        expect(html).toContain('data-testid="svg-maint-comms-array"');
      }
      expect(html).toContain(lang === 'es' ? 'SVG // SIN WEBGL' : 'SVG // NO WEBGL');
      expect(html).toContain(lang === 'es' ? 'Módulo (Tab)' : 'Module (Tab)');
      expect(html).toContain(lang === 'es' ? 'Centrar vista' : 'Reset view');
      expect(html).toContain(lang === 'es' ? 'Pausar' : 'Pause');
      for (const modId of COLONY_WORLD_MODULE_IDS) {
        expect(html).toContain(`aria-label="${COLONY_WORLD_MODULES[modId].label[lang]}`);
      }
      expect(EMOJI_REGEX.test(html)).toBe(false);
    }

    const site = OUTPOST_SITES['moon-shackleton'];
    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    const projection = projectSystemsTurn(mission, mission.powerAllocation);

    const htmlOutpostRover = renderToStaticMarkup(
      React.createElement(OutpostMap, {
        lang: 'es',
        site,
        currentDay: 1,
        resources: { ...mission.resources, power: 25 },
        allocation: mission.powerAllocation,
        weather,
        projection,
        defaultViewMode: 'rover',
        terrainSeed: 20260415,
        scannedAnomalyIds: [day1Anomalies[0].id],
        maintainedModules: [],
      }),
    );
    expect(htmlOutpostRover).toContain('id="outpost-cam-rover-btn"');
    expect(htmlOutpostRover).toContain('aria-pressed="true"');
    expect(htmlOutpostRover).toContain('data-testid="outpost-maint-chip"');
    expect(htmlOutpostRover).toContain('colony-anomalies-bar');
    expect(EMOJI_REGEX.test(htmlOutpostRover)).toBe(false);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('Bloque 4: cielo Phobos/corona, anillo láser de escaneo + estela del Rover y enlaces al glosario NASA', () => {
    // 1. Todos los módulos y anomalías 3D mapean a entradas reales del glosario científico NASA
    for (const kind of Object.keys(ANOMALY_GLOSSARY_TERM_MAP) as WorldAnomalyKind[]) {
      const termId = getAnomalyGlossaryTermId(kind);
      expect(getGlossaryTerm(termId)).toBeTruthy();
    }
    for (const siteId of ['moon-shackleton', 'mars-jezero'] as const) {
      for (const modId of COLONY_WORLD_MODULE_IDS) {
        const termId = getModuleGlossaryTermId(modId, siteId);
        expect(getGlossaryTerm(termId)).toBeTruthy();
      }
    }

    // 2. Cielo diferenciado en 3D: Marte añade Phobos/Deimos y bruma de horizonte sin estrellas; Luna mantiene corona y Tierra
    const marsWorld = buildColonyWorld({ siteId: 'mars-jezero', terrainSeed: 20260415 });
    expect(marsWorld.group.getObjectByName('world-phobos')).toBeTruthy();
    expect(marsWorld.group.getObjectByName('world-mars-horizon-haze')).toBeTruthy();
    expect(marsWorld.group.getObjectByName('world-sun-corona')).toBeTruthy();
    expect(marsWorld.group.getObjectByName('world-stars')).toBeUndefined();
    expect(marsWorld.group.getObjectByName('world-earth')).toBeUndefined();

    // 3. Anillo láser horizontal, pivote Mastcam-Z y estela de ruedas del Rover activos y con dispose limpio
    const ringMesh = marsWorld.group.getObjectByName('rover-scanner-ring') as THREE.Mesh;
    const wakePoints = marsWorld.group.getObjectByName('rover-wake-dust') as THREE.Points;
    const mastPivot = marsWorld.group.getObjectByName('rover-mastcam-pivot');
    expect(ringMesh).toBeTruthy();
    expect(wakePoints).toBeTruthy();
    expect(mastPivot).toBeTruthy();

    const anom = marsWorld.getAnomalies()[0];
    expect(marsWorld.dispatchRoverToAnomaly(anom.id)).toBe(true);
    let sawRing = false;
    let t = 0;
    for (let s = 0; s < 100; s++) {
      t += 0.1;
      marsWorld.animate(t, 0.1);
      if (ringMesh.visible) sawRing = true;
    }
    expect(sawRing).toBe(true);

    const ringGeoSpy = vi.spyOn(ringMesh.geometry, 'dispose');
    disposeObject3D(marsWorld.group);
    expect(ringGeoSpy).toHaveBeenCalledTimes(1);

    const lunarWorld = buildColonyWorld({ siteId: 'moon-shackleton', terrainSeed: 20260415 });
    expect(lunarWorld.group.getObjectByName('world-phobos')).toBeUndefined();
    expect(lunarWorld.group.getObjectByName('world-earth')).toBeTruthy();
    expect(lunarWorld.group.getObjectByName('world-sun-corona')).toBeTruthy();
    disposeObject3D(lunarWorld.group);

    // 4. ColonyWorld3D acepta onInspectScienceTerm sin errores
    const htmlWithCallback = renderToStaticMarkup(
      React.createElement(ColonyWorld3D, {
        lang: 'es',
        forceFallback: true,
        onInspectScienceTerm: () => {},
        options: { siteId: 'moon-shackleton', terrainSeed: 20260415 },
      }),
    );
    expect(htmlWithCallback).toContain('data-testid="colony-world-3d"');
  });

  it('R04: sistema de 3 cámaras dinámicas (Seguir, Cabina Mastcam 1ra persona con brazo visible y Orbital), atajo C y OutpostMap', () => {
    expect(normalizeCameraMode(undefined)).toBe('orbital');
    expect(normalizeCameraMode('rover')).toBe('chase');
    expect(normalizeCameraMode('chase')).toBe('chase');
    expect(normalizeCameraMode('mastcam')).toBe('mastcam');

    expect(getNextCameraMode('orbital')).toBe('chase');
    expect(getNextCameraMode('chase')).toBe('mastcam');
    expect(getNextCameraMode('mastcam')).toBe('orbital');
    expect(getNextCameraMode('rover')).toBe('mastcam');

    const world = buildColonyWorld({ siteId: 'mars-jezero', terrainSeed: 20260415 });
    const mastPivot = world.group.getObjectByName('rover-mastcam-pivot')!;
    const armPivot = world.group.getObjectByName('rover-scanner-arm')!;
    expect(mastPivot.visible).toBe(true);

    world.setFirstPersonMastcam(true);
    expect(mastPivot.visible).toBe(false);
    world.setRoverControlInput({ forward: true, backward: false, left: false, right: false });
    world.animate(0.5, 0.25);
    world.animate(0.8, 0.25);

    const roverPos = new THREE.Vector3();
    const roverFwd = new THREE.Vector3();
    world.getRoverPose(roverPos, roverFwd);

    const mastPos = new THREE.Vector3();
    const mastTarget = new THREE.Vector3();
    const mastUp = new THREE.Vector3();
    world.getMastcamPose(mastPos, mastTarget, mastUp);

    const lookDir = mastTarget.clone().sub(mastPos).normalize();
    expect(lookDir.dot(roverFwd)).toBeGreaterThan(0.75);
    expect(mastPos.y).toBeGreaterThanOrEqual(
      sampleWorldTerrainHeight(mastPos.x, mastPos.z, 'mars-jezero', 20260415) + 1.4,
    );
    expect(mastUp.length()).toBeCloseTo(1, 3);
    expect(mastUp.y).toBeGreaterThan(0.25);
    expect(armPivot.rotation.z).toBeGreaterThan(0.15);

    world.setFirstPersonMastcam(false);
    expect(mastPivot.visible).toBe(true);
    disposeObject3D(world.group);

    const site = OUTPOST_SITES['moon-shackleton'];
    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    const projection = projectSystemsTurn(mission, mission.powerAllocation);

    for (const defaultViewMode of ['chase', 'mastcam'] as const) {
      const html = renderToStaticMarkup(
        React.createElement(OutpostMap, {
          lang: 'en',
          site,
          currentDay: 1,
          resources: mission.resources,
          allocation: mission.powerAllocation,
          weather,
          projection,
          defaultViewMode,
          terrainSeed: 20260415,
        }),
      );
      expect(html).toMatch(/id="outpost-cam-rover-btn"[^>]*aria-pressed="true"/);
      expect(html).not.toMatch(/id="outpost-view-3d-btn"[^>]*aria-pressed="true"/);
    }
  });

  it('R05: muestras 3D procedurales, balizas pulsantes, recolección animada con brazo y barra táctica en ES/EN', () => {
    expect(SAMPLE_COLLECT_RADIUS).toBeCloseTo(2.2, 2);
    expect(SAMPLE_COLLECTION_DURATION).toBeCloseTo(0.88, 2);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    for (const siteId of ['moon-shackleton', 'mars-jezero'] as const) {
      const world = buildColonyWorld({ siteId, terrainSeed: 20260415, currentDay: 1 });
      const samplesContainer = world.group.getObjectByName('world-samples');
      expect(samplesContainer).toBeTruthy();

      const samples = world.getSamples();
      expect(samples.length).toBeGreaterThanOrEqual(4);
      expect(samples.length).toBeLessThanOrEqual(6);
      expect(world.samplePickables).toHaveLength(samples.length);

      // Animación de baliza pulsante y rotación del diamante
      const first = samples[0];
      const beamMesh = world.group.getObjectByName(`sample-beacon-beam-${first.id}`) as THREE.Mesh;
      const diamondMesh = world.group.getObjectByName(
        `sample-beacon-diamond-${first.id}`,
      ) as THREE.Mesh;
      const rockGroup = world.group.getObjectByName(`sample-rock-${first.id}`) as THREE.Group;
      const ringMesh = world.group.getObjectByName(`sample-ring-${first.id}`) as THREE.Mesh;
      expect(beamMesh).toBeTruthy();
      expect(diamondMesh).toBeTruthy();
      expect(rockGroup).toBeTruthy();
      expect(ringMesh).toBeTruthy();

      const diamondYaw0 = diamondMesh.rotation.y;
      world.animate(0.6, 0.2);
      expect(diamondMesh.rotation.y).toBeGreaterThan(diamondYaw0);

      // Autonomía hacia la muestra (driving-sample -> collecting-sample -> guardada)
      const armPivot = world.group.getObjectByName('rover-scanner-arm') as THREE.Object3D;
      const laserBeam = world.group.getObjectByName('rover-scanner-beam') as THREE.Mesh;
      const laserRing = world.group.getObjectByName('rover-scanner-ring') as THREE.Mesh;

      expect(world.dispatchRoverToSample(first.id)).toBe(true);
      let sawCollecting = false;
      let sawArmDeployed = false;
      let sawLaser = false;
      let sawShrinkingRock = false;
      let t = 0.6;
      for (let step = 0; step < 95; step++) {
        t += 0.1;
        world.animate(t, 0.1);
        const tele = world.getRoverTelemetry();
        if (tele.collectingSampleId === first.id) {
          sawCollecting = true;
          if (armPivot.rotation.z < -0.15) sawArmDeployed = true;
          if (laserBeam.visible && laserRing.visible) sawLaser = true;
          if (rockGroup.scale.x < 0.95) sawShrinkingRock = true;
        }
      }

      expect(sawCollecting).toBe(true);
      expect(sawArmDeployed).toBe(true);
      expect(sawLaser).toBe(true);
      expect(sawShrinkingRock).toBe(true);

      // Tras finalizar la recolección: roca oculta, baliza apagada y anillo verde
      expect(rockGroup.visible).toBe(false);
      expect(beamMesh.visible).toBe(false);
      expect(diamondMesh.visible).toBe(false);
      expect((ringMesh.material as THREE.MeshBasicMaterial).color.getHex()).toBe(0x2e7d4f);

      // Segunda recolección manual directa mediante proximidad (< 2.2) o collectSample(id)
      const second = samples[1];
      expect(world.collectSample(second.id)).toBe(true);
      expect(world.getRoverTelemetry().collectingSampleId).toBe(second.id);
      for (let s = 0; s < 12; s++) {
        t += 0.1;
        world.animate(t, 0.1);
      }
      expect(world.getRoverTelemetry().collectingSampleId).toBeNull();
      expect(world.getSamples()[1].id).toBe(second.id);
      const secondBeam = world.group.getObjectByName(
        `sample-beacon-beam-${second.id}`,
      ) as THREE.Mesh;
      expect(secondBeam.visible).toBe(false);

      // Conducción manual pura hacia la 3ra muestra (< 2.2 u) activa auto-recolección y frenado
      const manualTarget = samples[2];
      let manualTriggered = false;
      const rPos = new THREE.Vector3();
      const rFwd = new THREE.Vector3();
      for (let step = 0; step < 360; step++) {
        world.getRoverPose(rPos, rFwd);
        const curYaw = Math.atan2(-rFwd.z, rFwd.x);
        const goalYaw = Math.atan2(-(manualTarget.position[2] - rPos.z), manualTarget.position[0] - rPos.x);
        let diff = (goalYaw - curYaw + Math.PI) % (Math.PI * 2);
        if (diff < 0) diff += Math.PI * 2;
        diff -= Math.PI;
        world.setRoverControlInput({
          forward: Math.abs(diff) < 1.25,
          backward: false,
          left: diff > 0.07,
          right: diff < -0.07,
        });
        t += 0.05;
        world.animate(t, 0.05);
        const tele = world.getRoverTelemetry();
        if (tele.collectingSampleId === manualTarget.id) {
          manualTriggered = true;
          const speedBeforeBrake = Math.abs(tele.linearVelocity);
          world.animate(t + 0.12, 0.12);
          world.animate(t + 0.24, 0.12);
          expect(Math.abs(world.getRoverTelemetry().linearVelocity)).toBeLessThanOrEqual(
            speedBeforeBrake,
          );
          expect(Math.abs(world.getRoverTelemetry().linearVelocity)).toBeLessThan(0.5);
          break;
        }
      }
      expect(manualTriggered).toBe(true);
      world.setRoverControlInput({ forward: false, backward: false, left: false, right: false });

      // Cambio de Día/Sol rota la generación determinista de muestras
      world.updateState({ currentDay: 2 });
      const day2Samples = world.getSamples();
      expect(day2Samples.length).toBeGreaterThanOrEqual(4);
      expect(day2Samples[0].id).not.toBe(first.id);

      const day2Beam = world.group.getObjectByName(
        `sample-beacon-beam-${day2Samples[0].id}`,
      ) as THREE.Mesh;
      const geoDisposeSpy = vi.spyOn(day2Beam.geometry, 'dispose');
      disposeObject3D(world.group);
      expect(geoDisposeSpy).toHaveBeenCalledTimes(1);
    }

    // Renderizado React / SVG fallback sin WebGL en ES y EN (incluyendo OutpostMap)
    const site = OUTPOST_SITES['moon-shackleton'];
    const weather = selectStartingWeather('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS, 20260415);
    const mission = createInitialMissionState('moon-shackleton', weather, 20260415);
    const projection = projectSystemsTurn(mission, mission.powerAllocation);

    for (const lang of ['es', 'en'] as const) {
      const worldHtml = renderToStaticMarkup(
        React.createElement(ColonyWorld3D, {
          lang,
          forceFallback: true,
          options: {
            siteId: 'moon-shackleton',
            terrainSeed: 20260415,
            currentDay: 1,
            collectedSampleIds: [],
          },
          onCollectSample: () => {},
        }),
      );
      expect(EMOJI_REGEX.test(worldHtml)).toBe(false);
      expect(worldHtml).toContain('data-testid="colony-samples-bar"');
      expect(worldHtml).toContain('data-testid="colony-samples-counter"');
      expect(worldHtml).toContain('0/');
      expect(worldHtml).toContain('data-testid="svg-sample-');

      const mapHtml = renderToStaticMarkup(
        React.createElement(OutpostMap, {
          lang,
          site,
          currentDay: 1,
          resources: mission.resources,
          allocation: mission.powerAllocation,
          weather,
          projection,
          defaultViewMode: 'orbital',
          terrainSeed: 20260415,
          collectedSampleIds: [],
          onCollectSample: () => {},
        }),
      );
      expect(EMOJI_REGEX.test(mapHtml)).toBe(false);
      expect(mapHtml).toContain('data-testid="colony-samples-bar"');
    }

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
