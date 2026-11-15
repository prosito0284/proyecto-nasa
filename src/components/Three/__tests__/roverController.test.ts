import * as THREE from 'three';
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
  ROVER_WHEEL_RADIUS,
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

describe('Articulated Rover Mechanical Animations (R03)', () => {
  it('gira las 6 ruedas en eje X proporcionalmente a la velocidad de avance y reversa', () => {
    const moonWorld = buildColonyWorld({ siteId: 'moon-shackleton', terrainSeed: 20260415 });

    expect(moonWorld.group.getObjectByName('wheels')).toBeTruthy();
    expect(moonWorld.group.getObjectByName('frontSteering')).toBeTruthy();
    expect(moonWorld.group.getObjectByName('rearSteering')).toBeTruthy();
    expect(moonWorld.group.getObjectByName('roboticArm')).toBeTruthy();
    expect(moonWorld.group.getObjectByName('mastCam')).toBeTruthy();
    expect(moonWorld.group.getObjectByName('scannerBeam')).toBeTruthy();
    expect(moonWorld.group.getObjectByName('rover-chassis-suspension')).toBeTruthy();

    const wheelNames = ['fl', 'fr', 'ml', 'mr', 'rl', 'rr'] as const;
    const wheels = wheelNames.map((n) => moonWorld.group.getObjectByName(`rover-wheel-${n}`)!);
    for (const w of wheels) expect(w).toBeTruthy();

    // Avance durante 1s (dt=0.05) -> rotation.x aumenta exactamente sum((v / r) * dt)
    moonWorld.setRoverControlInput({ forward: true, backward: false, left: false, right: false });
    let t = 0;
    let expectedXSpin = 0;
    for (let i = 0; i < 20; i++) {
      t += 0.05;
      moonWorld.animate(t, 0.05);
      const tele = moonWorld.getRoverTelemetry();
      expectedXSpin += (tele.linearVelocity / ROVER_WHEEL_RADIUS) * 0.05;
    }
    expect(expectedXSpin).toBeGreaterThan(2.5);
    for (const w of wheels) {
      expect(w.rotation.x).toBeCloseTo(expectedXSpin, 4);
      expect(w.rotation.y).toBe(0);
    }

    // Reversa durante 1.8s -> velocidad negativa invierte sentido de giro en eje X
    moonWorld.setRoverControlInput({ forward: false, backward: true, left: false, right: false });
    const spinAfterForward = wheels[0].rotation.x;
    for (let i = 0; i < 36; i++) {
      t += 0.05;
      moonWorld.animate(t, 0.05);
    }
    expect(moonWorld.getRoverTelemetry().linearVelocity).toBeLessThan(-1.5);
    for (const w of wheels) {
      expect(w.rotation.x).toBeLessThan(spinAfterForward);
    }

    disposeObject3D(moonWorld.group);
  });

  it('articula dirección Y (±28°) en ruedas delanteras/traseras, suspende chasis y barre mastCam', () => {
    const world = buildColonyWorld({ siteId: 'mars-jezero', terrainSeed: 20260415 });

    const flPivot = world.group.getObjectByName('rover-steer-fl')!;
    const frPivot = world.group.getObjectByName('rover-steer-fr')!;
    const rlPivot = world.group.getObjectByName('rover-steer-rl')!;
    const rrPivot = world.group.getObjectByName('rover-steer-rr')!;
    const chassis = world.group.getObjectByName('rover-chassis-suspension')!;
    const mastPivot = world.group.getObjectByName('rover-mastcam-pivot')!;

    // Girar a la izquierda + avanzar: delanteras positivas (<= +28°), traseras negativas (>= -28°)
    world.setRoverControlInput({ forward: true, backward: false, left: true, right: false });
    let t = 0;
    let sawSuspBounce = false;
    let sawAccelSquat = false;
    let maxMastYaw = 0;
    for (let i = 0; i < 24; i++) {
      t += 0.05;
      world.animate(t, 0.05);
      if (Math.abs(chassis.position.y) > 0.002) sawSuspBounce = true;
      if (chassis.rotation.z > 0.002) sawAccelSquat = true;
      maxMastYaw = Math.max(maxMastYaw, Math.abs(mastPivot.rotation.y));
    }

    expect(flPivot.rotation.y).toBeGreaterThan(0.4);
    expect(frPivot.rotation.y).toBeGreaterThan(0.4);
    expect(flPivot.rotation.y).toBeLessThanOrEqual(ROVER_MAX_STEER_RAD + 0.001);
    expect(rlPivot.rotation.y).toBeCloseTo(-flPivot.rotation.y, 4);
    expect(rrPivot.rotation.y).toBeCloseTo(-frPivot.rotation.y, 4);
    expect(sawSuspBounce).toBe(true);
    expect(sawAccelSquat).toBe(true);
    expect(maxMastYaw).toBeGreaterThan(0.1);

    // Girar a la derecha + frenar/reversa -> inversión de dirección y cabeceo negativo al frenar
    world.setRoverControlInput({ forward: false, backward: true, left: false, right: true });
    let sawBrakeDive = false;
    for (let i = 0; i < 36; i++) {
      t += 0.05;
      world.animate(t, 0.05);
      if (chassis.rotation.z < -0.002) sawBrakeDive = true;
    }
    expect(flPivot.rotation.y).toBeLessThan(-0.4);
    expect(rlPivot.rotation.y).toBeCloseTo(-flPivot.rotation.y, 4);
    expect(sawBrakeDive).toBe(true);

    disposeObject3D(world.group);
  });

  it('despliega roboticArm y scannerBeam cyan/ámbar al acercarse manualmente a <= 4.0 m de una anomalía y se retrae al alejarse', () => {
    const world = buildColonyWorld({ siteId: 'mars-jezero', terrainSeed: 20260415, currentDay: 1 });
    const anomalies = world.getAnomalies();
    const targetAnom = anomalies[0];
    const armPivot = world.group.getObjectByName('rover-scanner-arm')!;
    const beamMesh = world.group.getObjectByName('rover-scanner-beam') as THREE.Mesh;
    const beamMat = beamMesh.material as THREE.MeshBasicMaterial;
    const beamGroup = world.group.getObjectByName('scannerBeam')!;

    expect(beamMesh.visible).toBe(false);
    expect(beamGroup.visible).toBe(false);

    // Conducir manualmente guiando dirección hacia la anomalía hasta quedar a <= 4.0 m
    let t = 0;
    let reachedProximity = false;
    const observedLaserHex = new Set<number>();
    for (let step = 0; step < 300; step++) {
      const tele = world.getRoverTelemetry();
      const dx = targetAnom.position[0] - tele.x;
      const dz = targetAnom.position[2] - tele.z;
      const dist = Math.hypot(dx, dz);
      const desiredYaw = Math.atan2(-dz, dx);
      let hErr = (desiredYaw - tele.heading + Math.PI) % (Math.PI * 2);
      if (hErr < 0) hErr += Math.PI * 2;
      hErr -= Math.PI;

      world.setRoverControlInput({
        forward: dist > 2.4,
        backward: false,
        left: hErr > 0.12,
        right: hErr < -0.12,
      });

      t += 0.05;
      world.animate(t, 0.05);

      const post = world.getRoverTelemetry();
      if (post.nearestAnomalyDistance <= 4.0) {
        reachedProximity = true;
        expect(post.scannerActive).toBe(true);
        expect(beamMesh.visible).toBe(true);
        expect(beamGroup.visible).toBe(true);
        observedLaserHex.add(beamMat.color.getHex());
        if (observedLaserHex.size === 2 && armPivot.rotation.z < -0.3) {
          break;
        }
      }
    }

    expect(reachedProximity).toBe(true);
    expect(armPivot.rotation.z).toBeLessThan(-0.3);
    expect(observedLaserHex.has(0x00e5ff)).toBe(true);
    expect(observedLaserHex.has(0xffb300)).toBe(true);

    // Alejarse en reversa fuera de 4.0 m -> debe ocultar el haz y replegar el brazo
    world.setRoverControlInput({ forward: false, backward: true, left: false, right: false });
    for (let step = 0; step < 60; step++) {
      t += 0.05;
      world.animate(t, 0.05);
    }
    const retreated = world.getRoverTelemetry();
    if (retreated.nearestAnomalyDistance > 4.0) {
      expect(retreated.scannerActive).toBe(false);
      expect(beamMesh.visible).toBe(false);
      expect(beamGroup.visible).toBe(false);
      expect(armPivot.rotation.z).toBeGreaterThan(-0.15);
    }

    disposeObject3D(world.group);
  });
});

