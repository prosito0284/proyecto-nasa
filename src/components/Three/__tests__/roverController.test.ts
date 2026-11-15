import { describe, expect, it } from 'vitest';
import {
  buildColonyWorld,
  COLONY_WORLD_MODULE_IDS,
  COLONY_WORLD_MODULES,
  disposeObject3D,
  sampleWorldTerrainHeight,
} from '../proceduralModels';
import {
  createRoverController,
  EMPTY_ROVER_INPUT,
  getColonyObstacleColliders,
  PLANET_ROVER_PHYSICS,
  ROVER_COLLISION_RADIUS,
  ROVER_MAX_STEER_RAD,
  ROVER_WORLD_LIMITS,
} from '../roverController';

describe('Planetary Rover Controller (R01)', () => {
  const flatGround = () => 0;

  it('diferencia fricción de rodadura y agarre lateral entre Luna (deslizamiento) y Marte (arena pesada)', () => {
    expect(PLANET_ROVER_PHYSICS.lunar.rollingFriction).toBeLessThan(
      PLANET_ROVER_PHYSICS.mars.rollingFriction,
    );
    expect(PLANET_ROVER_PHYSICS.lunar.lateralGrip).toBeLessThan(
      PLANET_ROVER_PHYSICS.mars.lateralGrip,
    );

    const lunar = createRoverController({
      planet: 'lunar',
      initialX: -15,
      initialZ: -15,
      initialHeading: 0,
    });
    const mars = createRoverController({
      planet: 'mars',
      initialX: -15,
      initialZ: -15,
      initialHeading: 0,
    });

    // Acelerar ambos durante 1.4 s
    for (let i = 0; i < 28; i++) {
      lunar.step({ dt: 0.05, input: { ...EMPTY_ROVER_INPUT, forward: true }, getTerrainHeight: flatGround });
      mars.step({ dt: 0.05, input: { ...EMPTY_ROVER_INPUT, forward: true }, getTerrainHeight: flatGround });
    }

    const lunarPosBeforeCoast = lunar.getState().x;
    const marsPosBeforeCoast = mars.getState().x;

    // Soltar acelerador y medir distancia de planeo libre durante 1.5 s
    for (let i = 0; i < 30; i++) {
      lunar.step({ dt: 0.05, input: EMPTY_ROVER_INPUT, getTerrainHeight: flatGround });
      mars.step({ dt: 0.05, input: EMPTY_ROVER_INPUT, getTerrainHeight: flatGround });
    }

    const lunarCoastDist = lunar.getState().x - lunarPosBeforeCoast;
    const marsCoastDist = mars.getState().x - marsPosBeforeCoast;
    expect(lunarCoastDist).toBeGreaterThan(marsCoastDist * 1.35);

    // En giro rápido a alta velocidad, la Luna genera mayor deslizamiento lateral que Marte
    const lunarDrift = createRoverController({
      planet: 'lunar',
      initialX: 0,
      initialZ: 0,
      initialHeading: 0,
    });
    const marsDrift = createRoverController({
      planet: 'mars',
      initialX: 0,
      initialZ: 0,
      initialHeading: 0,
    });
    lunarDrift.setPose({ velocity: 7 });
    marsDrift.setPose({ velocity: 7 });
    const lTurn = lunarDrift.step({
      dt: 0.08,
      input: { forward: true, backward: false, left: true, right: false },
      getTerrainHeight: flatGround,
    });
    const mTurn = marsDrift.step({
      dt: 0.08,
      input: { forward: true, backward: false, left: true, right: false },
      getTerrainHeight: flatGround,
    });
    expect(Math.abs(lTurn.lateralVelocity)).toBeGreaterThan(Math.abs(mTurn.lateralVelocity));
  });

  it('calcula altura Y, pitch y roll del chasis leyendo el terreno bajo las ruedas', () => {
    const rampTerrain = (x: number, z: number) => x * 0.25 - z * 0.14;
    const rover = createRoverController({
      planet: 'mars',
      initialX: 4,
      initialZ: 2,
      initialHeading: 0, // +X adelante, +Z derecha, -Z izquierda
      getTerrainHeight: rampTerrain,
    });

    const before = rover.getState();
    expect(before.y).toBeCloseTo(rampTerrain(4, 2), 2);
    expect(before.pitch).toBeGreaterThan(0.2);
    expect(before.roll).toBeGreaterThan(0.1);

    let after = before;
    for (let i = 0; i < 30; i++) {
      after = rover.step({
        dt: 0.05,
        input: { ...EMPTY_ROVER_INPUT, forward: true },
        getTerrainHeight: rampTerrain,
      });
    }
    expect(after.x).toBeGreaterThan(before.x + 2);
    expect(after.y).toBeGreaterThan(before.y + 0.4);
  });

  it('respeta límites físicos invisibles [-22, 22] con amortiguación suave', () => {
    const rover = createRoverController({
      planet: 'lunar',
      initialX: 20,
      initialZ: 19.5,
      initialHeading: -Math.PI / 4, // Rumbo diagonal (+X, +Z) hacia esquina exterior
    });

    let last = rover.getState();
    for (let i = 0; i < 80; i++) {
      last = rover.step({
        dt: 0.05,
        input: { ...EMPTY_ROVER_INPUT, forward: true },
        getTerrainHeight: flatGround,
      });
      expect(last.x).toBeGreaterThanOrEqual(ROVER_WORLD_LIMITS.boundsMin);
      expect(last.x).toBeLessThanOrEqual(ROVER_WORLD_LIMITS.boundsMax);
      expect(last.z).toBeGreaterThanOrEqual(ROVER_WORLD_LIMITS.boundsMin);
      expect(last.z).toBeLessThanOrEqual(ROVER_WORLD_LIMITS.boundsMax);
    }
    expect(last.hitBoundary).toBe(true);
    expect(last.x).toBeCloseTo(ROVER_WORLD_LIMITS.boundsMax, 1);
  });

  it('evita atravesar domos/edificios de la colonia y rodea sus perímetros suavemente', () => {
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
    const habObs = obstacles.find((o) => o.id === 'oxygen-module')!;

    // Rumbo oblicuo contra el domo del hábitat central (0,0) desde pasillo abierto suroeste
    const rover = createRoverController({
      planet: 'mars',
      initialX: -7.5,
      initialZ: 10.5,
      initialHeading: Math.atan2(8.0, 7.5), // rumbo (+X, -Z) hacia (0, 2.5) en el costado +Z del domo
    });

    let touchedHab = false;
    let tele = rover.getState();
    for (let i = 0; i < 90; i++) {
      tele = rover.step({
        dt: 0.05,
        input: { ...EMPTY_ROVER_INPUT, forward: true },
        getTerrainHeight: flatGround,
        obstacles,
      });
      if (tele.collidedWith === 'oxygen-module') touchedHab = true;
      for (const obs of obstacles) {
        const dist = Math.hypot(tele.x - obs.x, tele.z - obs.z);
        expect(dist).toBeGreaterThanOrEqual(obs.radius + ROVER_COLLISION_RADIUS - 0.02);
      }
    }
    expect(touchedHab).toBe(true);
    // Tras deslizarse alrededor del domo debe seguir avanzando más allá de X > 0 sin atravesarlo
    expect(Math.hypot(tele.x - habObs.x, tele.z - habObs.z)).toBeGreaterThanOrEqual(
      habObs.radius + ROVER_COLLISION_RADIUS - 0.02,
    );
    expect(tele.x).toBeGreaterThan(2.0);
  });

  it('limita el ángulo de dirección Y dentro de ±28° y se integra en buildColonyWorld', () => {
    const world = buildColonyWorld({ siteId: 'mars-jezero', terrainSeed: 20260415 });

    // Los centros de módulos siguen nivelados en y = 0 mientras hay microrrelieve en rutas abiertas
    for (const id of COLONY_WORLD_MODULE_IDS) {
      const [mx, mz] = COLONY_WORLD_MODULES[id].position;
      expect(sampleWorldTerrainHeight(mx, mz, 'mars-jezero', 20260415)).toBe(0);
    }
    const openSlope = Math.abs(sampleWorldTerrainHeight(15, -14, 'mars-jezero', 20260415));
    expect(openSlope).toBeGreaterThan(0.05);

    const t0 = world.getRoverTelemetry();
    world.setRoverControlInput({ forward: true, backward: false, left: true, right: false });
    let t1 = t0;
    for (let i = 0; i < 20; i++) {
      world.animate((i + 1) * 0.05, 0.05);
    }
    t1 = world.getRoverTelemetry();

    expect(Math.hypot(t1.x - t0.x, t1.z - t0.z)).toBeGreaterThan(1.5);
    expect(Math.abs(t1.steerAngle)).toBeLessThanOrEqual(ROVER_MAX_STEER_RAD + 0.001);
    expect(t1.steerAngle).toBeGreaterThan(0.2);

    disposeObject3D(world.group);
  });
});
