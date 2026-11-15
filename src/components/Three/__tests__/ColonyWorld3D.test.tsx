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
import { ColonyWorld3D, resolveColonyKeyCommand } from '../ColonyWorld3D';
import {
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
  findColonyModuleId,
  getColonyModuleStatus,
  getWorldAtmosphere,
  isStormShieldDeployed,
  resolveColonyModuleGlbUrl,
  sampleWorldTerrainHeight,
  softClampColonyTarget,
  WORLD_ATMOSPHERES,
  WORLD_TERRAIN_SIZE,
} from '../proceduralModels';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

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

  it('M01: aplica límites invisibles de cámara en [-24, 24] con retorno amortiguado y focos seguros', () => {
    expect(COLONY_CAMERA_LIMITS.boundsMin).toBe(-24);
    expect(COLONY_CAMERA_LIMITS.boundsMax).toBe(24);
    expect(COLONY_CAMERA_LIMITS.minDistance).toBe(7);
    expect(COLONY_CAMERA_LIMITS.maxDistance).toBe(45);
    expect(COLONY_CAMERA_LIMITS.minPolarAngle).toBe(0.18);
    expect(COLONY_CAMERA_LIMITS.maxPolarAngle).toBeLessThan(Math.PI / 2);

    expect(clampToColonyBounds(-99)).toBe(-24);
    expect(clampToColonyBounds(99)).toBe(24);
    expect(clampColonyCameraDistance(2)).toBe(7);
    expect(clampColonyCameraDistance(120)).toBe(45);
    expect(clampColonyPolarAngle(0.01)).toBe(COLONY_CAMERA_LIMITS.minPolarAngle);
    expect(clampColonyPolarAngle(Math.PI)).toBe(COLONY_CAMERA_LIMITS.maxPolarAngle);

    const inside = softClampColonyTarget(10, -12, 0.5);
    expect(inside.wasOutside).toBe(false);
    expect(inside.x).toBe(10);
    expect(inside.z).toBe(-12);

    const soft = softClampColonyTarget(40, -35, 0.5);
    expect(soft.wasOutside).toBe(true);
    expect(soft.x).toBeLessThanOrEqual(24 + COLONY_CAMERA_LIMITS.overshoot);
    expect(soft.z).toBeGreaterThanOrEqual(-24 - COLONY_CAMERA_LIMITS.overshoot);

    const hard = softClampColonyTarget(80, -80, 1);
    expect(hard.wasOutside).toBe(true);
    expect(hard.x).toBe(24);
    expect(hard.z).toBe(-24);

    for (const id of COLONY_WORLD_MODULE_IDS) {
      const pose = computeColonyFocusPose(id);
      expect(pose.target[0]).toBeGreaterThanOrEqual(-24);
      expect(pose.target[0]).toBeLessThanOrEqual(24);
      expect(pose.target[2]).toBeGreaterThanOrEqual(-24);
      expect(pose.target[2]).toBeLessThanOrEqual(24);
      const dist = Math.hypot(
        pose.cameraPos[0] - pose.target[0],
        pose.cameraPos[1] - pose.target[1],
        pose.cameraPos[2] - pose.target[2],
      );
      expect(dist).toBeGreaterThanOrEqual(7 - 0.001);
      expect(dist).toBeLessThanOrEqual(45 + 0.001);
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

  it('M04: resolveColonyKeyCommand soporta órbita, paneo (Shift/WASD), zoom, Tab, Enter, Espacio y R', () => {
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
    expect(resolveColonyKeyCommand('Tab')).toEqual({ type: 'cycle-module', dir: 1 });
    expect(resolveColonyKeyCommand('Tab', true)).toEqual({ type: 'cycle-module', dir: -1 });
    expect(resolveColonyKeyCommand('Enter')).toEqual({ type: 'activate-module' });
    expect(resolveColonyKeyCommand(' ')).toEqual({ type: 'toggle-pause' });
    expect(resolveColonyKeyCommand('r')).toEqual({ type: 'reset' });
    expect(resolveColonyKeyCommand('Escape')).toBeNull();
  });

  it('M04: ColonyWorld3D renderiza respaldo SVG accesible y bilingüe sin WebGL, con cero errores de consola y cero emojis', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    for (const [lang, siteId] of [
      ['es', 'moon-shackleton'],
      ['en', 'mars-jezero'],
    ] as const) {
      const html = renderToStaticMarkup(
        React.createElement(ColonyWorld3D, {
          lang,
          forceFallback: true,
          selectedModule: 'comms-array',
          options: {
            siteId,
            powerPercent: 80,
            lifeSupportPercent: 85,
            shieldingPercent: 75,
            foodPercent: 70,
            shieldingAllocPercent: 40,
            isEnvironmentalAlert: siteId === 'moon-shackleton',
            isDustStorm: siteId === 'mars-jezero',
          },
        }),
      );
      expect(html).toContain('data-testid="colony-world-3d"');
      expect(html).toContain('data-testid="colony-world-svg-fallback"');
      expect(html).toContain(lang === 'es' ? 'SVG // SIN WEBGL' : 'SVG // NO WEBGL');
      expect(html).toContain(lang === 'es' ? 'Módulo (Tab)' : 'Module (Tab)');
      expect(html).toContain(lang === 'es' ? 'Centrar vista' : 'Reset view');
      expect(html).toContain(lang === 'es' ? 'Pausar' : 'Pause');
      for (const modId of COLONY_WORLD_MODULE_IDS) {
        expect(html).toContain(`aria-label="${COLONY_WORLD_MODULES[modId].label[lang]}"`);
      }
      expect(EMOJI_REGEX.test(html)).toBe(false);
    }

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
