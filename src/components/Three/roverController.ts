import type { ColonyEvolutionState, WorldAtmosphereKind } from './proceduralModels';

export interface RoverControlInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export interface RoverObstacleCollider {
  id: string;
  x: number;
  z: number;
  radius: number;
}

export interface PlanetRoverPhysicsProfile {
  kind: WorldAtmosphereKind;
  gravityFactor: number;
  maxForwardSpeed: number;
  maxReverseSpeed: number;
  acceleration: number;
  brakingDeceleration: number;
  /** Desaceleración por rodadura sin acelerar: la Luna desliza más; Marte frena más rápido */
  rollingFriction: number;
  /** Agarre lateral en curvas: menor en regolito lunar (ligero derrape), mayor en arena marciana */
  lateralGrip: number;
  /** Máximo giro en eje Y de ruedas delanteras y traseras (±28°) */
  maxSteerAngleRad: number;
  steerResponseRate: number;
  turnRateMoving: number;
  turnRateStationary: number;
  suspensionFreq: number;
  suspensionAmp: number;
  wheelRadius: number;
}

export const ROVER_MAX_STEER_DEG = 28;
export const ROVER_MAX_STEER_RAD = (ROVER_MAX_STEER_DEG * Math.PI) / 180;
export const ROVER_WHEEL_RADIUS = 0.42;
export const ROVER_COLLISION_RADIUS = 1.45;

export const ROVER_WORLD_LIMITS = {
  boundsMin: -44,
  boundsMax: 44,
  /** Franja invisible interior (41..44) donde se amortigua suavemente la componente saliente */
  softMargin: 3.0,
} as const;

export const PLANET_ROVER_PHYSICS: Record<WorldAtmosphereKind, PlanetRoverPhysicsProfile> = {
  lunar: {
    kind: 'lunar',
    gravityFactor: 0.166,
    maxForwardSpeed: 10.3,
    maxReverseSpeed: 5.8,
    acceleration: 10.6,
    brakingDeceleration: 12.6,
    rollingFriction: 1.15,
    lateralGrip: 2.8,
    maxSteerAngleRad: ROVER_MAX_STEER_RAD,
    steerResponseRate: 6.5,
    turnRateMoving: 2.05,
    turnRateStationary: 1.35,
    suspensionFreq: 5.2,
    suspensionAmp: 0.044,
    wheelRadius: ROVER_WHEEL_RADIUS,
  },
  mars: {
    kind: 'mars',
    gravityFactor: 0.378,
    maxForwardSpeed: 8.9,
    maxReverseSpeed: 5.0,
    acceleration: 13.0,
    brakingDeceleration: 21.0,
    rollingFriction: 3.6,
    lateralGrip: 7.8,
    maxSteerAngleRad: ROVER_MAX_STEER_RAD,
    steerResponseRate: 7.2,
    turnRateMoving: 1.9,
    turnRateStationary: 1.2,
    suspensionFreq: 6.8,
    suspensionAmp: 0.028,
    wheelRadius: ROVER_WHEEL_RADIUS,
  },
};

export const EMPTY_ROVER_INPUT: RoverControlInput = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

export interface RoverTelemetryState {
  x: number;
  y: number;
  z: number;
  heading: number;
  pitch: number;
  roll: number;
  linearVelocity: number;
  lateralVelocity: number;
  steerAngle: number;
  wheelSpinAngle: number;
  wheelSpinDelta: number;
  suspensionHeave: number;
  suspensionPitch: number;
  terrainRoughness: number;
  distanceTraveled: number;
  isMoving: boolean;
  hitBoundary: boolean;
  collidedWith: string | null;
}

export interface RoverStepParams {
  dt: number;
  input: RoverControlInput;
  getTerrainHeight: (x: number, z: number) => number;
  obstacles?: readonly RoverObstacleCollider[];
  disabled?: boolean;
}

export interface RoverControllerConfig {
  planet?: WorldAtmosphereKind;
  initialX?: number;
  initialZ?: number;
  initialHeading?: number;
  getTerrainHeight?: (x: number, z: number) => number;
}

export function getColonyObstacleColliders(
  evolution?: Partial<ColonyEvolutionState>,
): RoverObstacleCollider[] {
  const colliders: RoverObstacleCollider[] = [
    { id: 'oxygen-module', x: 0, z: 0, radius: 6.35 },
    { id: 'oxygen-airlock', x: 0, z: 4.8, radius: 1.55 },
    { id: 'power-grid', x: -13, z: 4.0, radius: 4.55 },
    { id: 'greenhouse', x: 12.5, z: 3.0, radius: 3.65 },
    { id: 'comms-array', x: -6, z: -13, radius: 2.35 },
  ];
  if (evolution?.solarWingLeft) {
    colliders.push({ id: 'evo-solar-wing-left', x: -18.5, z: 3.6, radius: 2.4 });
  }
  if (evolution?.solarWingRight) {
    colliders.push({ id: 'evo-solar-wing-right', x: -13, z: -0.7, radius: 2.5 });
  }
  if (evolution?.tunnelAirlockSpur) {
    colliders.push({ id: 'evo-tunnel-airlock', x: 4.8, z: 8.8, radius: 1.25 });
  }
  if (evolution?.greenhouseTier2) {
    colliders.push({ id: 'evo-greenhouse-tier2', x: 12.5, z: 5.55, radius: 2.15 });
  }
  if (evolution?.greenhouseTier3) {
    colliders.push({ id: 'evo-greenhouse-tier3', x: 12.5, z: 0.45, radius: 2.15 });
  }
  return colliders;
}

export function getObstacleClearanceHeight(id: string): number {
  switch (id) {
    case 'oxygen-module':
      return 6.4;
    case 'comms-array':
      return 6.8;
    case 'greenhouse':
      return 4.4;
    case 'power-grid':
      return 3.8;
    default:
      return 3.2;
  }
}

export function resolveCameraObstacleClearance(
  camX: number,
  camY: number,
  camZ: number,
  groundY: number,
  obstacles: readonly RoverObstacleCollider[],
  minGroundClearance = 1.0,
  radialPadding = 0.85,
): { x: number; y: number; z: number; pushedOut: boolean } {
  let x = camX;
  let y = Math.max(camY, groundY + minGroundClearance);
  let z = camZ;
  let pushedOut = false;

  for (let pass = 0; pass < 2; pass++) {
    for (const obs of obstacles) {
      const safeRadius = obs.radius + radialPadding;
      const domeTop = groundY + getObstacleClearanceHeight(obs.id);
      const dx = x - obs.x;
      const dz = z - obs.z;
      const dist = Math.hypot(dx, dz);
      if (dist < safeRadius && y < domeTop) {
        pushedOut = true;
        if (y >= domeTop * 0.72) {
          y = Math.max(y, domeTop + 0.45);
        } else {
          const nx = dist > 1e-4 ? dx / dist : 0;
          const nz = dist > 1e-4 ? dz / dist : 1;
          x = obs.x + nx * safeRadius;
          z = obs.z + nz * safeRadius;
        }
      }
    }
  }

  return { x, y, z, pushedOut };
}

export function clampRoverAxis(value: number): number {
  return Math.max(ROVER_WORLD_LIMITS.boundsMin, Math.min(ROVER_WORLD_LIMITS.boundsMax, value));
}

function clampValue(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface RoverController {
  getPlanet: () => WorldAtmosphereKind;
  setPlanet: (planet: WorldAtmosphereKind) => void;
  getState: () => RoverTelemetryState;
  setPose: (pose: { x?: number; y?: number; z?: number; heading?: number; velocity?: number }) => void;
  step: (params: RoverStepParams) => RoverTelemetryState;
}

export function createRoverController(config: RoverControllerConfig = {}): RoverController {
  let planet: WorldAtmosphereKind = config.planet ?? 'lunar';
  const startX = clampRoverAxis(config.initialX ?? 11.4);
  const startZ = clampRoverAxis(config.initialZ ?? 12.5);
  const startHeading = config.initialHeading ?? -Math.PI / 2;
  const startY = config.getTerrainHeight ? config.getTerrainHeight(startX, startZ) : 0;

  const state: RoverTelemetryState = {
    x: startX,
    y: startY,
    z: startZ,
    heading: startHeading,
    pitch: 0,
    roll: 0,
    linearVelocity: 0,
    lateralVelocity: 0,
    steerAngle: 0,
    wheelSpinAngle: 0,
    wheelSpinDelta: 0,
    suspensionHeave: 0,
    suspensionPitch: 0,
    terrainRoughness: 0,
    distanceTraveled: 0,
    isMoving: false,
    hitBoundary: false,
    collidedWith: null,
  };

  const sampleWheelPose = (
    x: number,
    z: number,
    heading: number,
    getTerrainHeight: (px: number, pz: number) => number,
  ) => {
    const fx = Math.cos(heading);
    const fz = -Math.sin(heading);
    const rx = Math.sin(heading);
    const rz = Math.cos(heading);

    const frontOff = 0.95;
    const rearOff = -0.95;
    const sideOff = 1.05;

    const hFL = getTerrainHeight(x + fx * frontOff - rx * sideOff, z + fz * frontOff - rz * sideOff);
    const hFR = getTerrainHeight(x + fx * frontOff + rx * sideOff, z + fz * frontOff + rz * sideOff);
    const hML = getTerrainHeight(x - rx * sideOff, z - rz * sideOff);
    const hMR = getTerrainHeight(x + rx * sideOff, z + rz * sideOff);
    const hRL = getTerrainHeight(x + fx * rearOff - rx * sideOff, z + fz * rearOff - rz * sideOff);
    const hRR = getTerrainHeight(x + fx * rearOff + rx * sideOff, z + fz * rearOff + rz * sideOff);
    const hCenter = getTerrainHeight(x, z);

    const wheelAvg = (hFL + hFR + hML + hMR + hRL + hRR) / 6;
    const targetY = Math.max(wheelAvg, hCenter * 0.65 + wheelAvg * 0.35);

    const frontAvg = (hFL + hFR) / 2;
    const rearAvg = (hRL + hRR) / 2;
    const leftAvg = (hFL + hML + hRL) / 3;
    const rightAvg = (hFR + hMR + hRR) / 3;

    const targetPitch = clampValue(Math.atan2(frontAvg - rearAvg, 1.9), -0.42, 0.42);
    const targetRoll = clampValue(Math.atan2(leftAvg - rightAvg, 2.1), -0.38, 0.38);

    const maxW = Math.max(hFL, hFR, hML, hMR, hRL, hRR, hCenter);
    const minW = Math.min(hFL, hFR, hML, hMR, hRL, hRR, hCenter);
    const roughness = Math.max(0, maxW - minW);

    return { targetY, targetPitch, targetRoll, roughness };
  };

  if (config.getTerrainHeight) {
    const initialWheelPose = sampleWheelPose(
      state.x,
      state.z,
      state.heading,
      config.getTerrainHeight,
    );
    state.y = initialWheelPose.targetY;
    state.pitch = initialWheelPose.targetPitch;
    state.roll = initialWheelPose.targetRoll;
    state.terrainRoughness = initialWheelPose.roughness;
  }

  return {
    getPlanet: () => planet,
    setPlanet: (next) => {
      planet = next;
    },
    getState: () => ({ ...state }),
    setPose: (pose) => {
      if (typeof pose.x === 'number') state.x = clampRoverAxis(pose.x);
      if (typeof pose.y === 'number') state.y = pose.y;
      if (typeof pose.z === 'number') state.z = clampRoverAxis(pose.z);
      if (typeof pose.heading === 'number') state.heading = pose.heading;
      if (typeof pose.velocity === 'number') state.linearVelocity = pose.velocity;
    },
    step: ({ dt, input, getTerrainHeight, obstacles = [], disabled = false }) => {
      const clampedDt = clampValue(dt, 0, 0.1);
      if (clampedDt <= 0) {
        state.wheelSpinDelta = 0;
        return { ...state };
      }

      const physics = PLANET_ROVER_PHYSICS[planet];
      const throttle = disabled ? 0 : (input.forward ? 1 : 0) - (input.backward ? 1 : 0);
      const steerCmd = disabled ? 0 : (input.left ? 1 : 0) - (input.right ? 1 : 0);

      // 1. Dirección articulada progresiva (±28° en eje Y)
      const targetSteer = steerCmd * physics.maxSteerAngleRad;
      const steerStep = physics.steerResponseRate * clampedDt;
      if (Math.abs(targetSteer - state.steerAngle) <= steerStep) {
        state.steerAngle = targetSteer;
      } else {
        state.steerAngle += Math.sign(targetSteer - state.steerAngle) * steerStep;
      }

      // 2. Aceleración, frenado, pendiente gravitatoria y fricción diferenciada (Luna vs. Marte)
      const prevSpeed = state.linearVelocity;
      const slopeAccel = -physics.gravityFactor * 4.5 * Math.sin(state.pitch);
      if (throttle > 0) {
        const accel =
          state.linearVelocity < -0.1 ? physics.brakingDeceleration : physics.acceleration;
        state.linearVelocity = Math.min(
          physics.maxForwardSpeed,
          state.linearVelocity + (accel + slopeAccel) * clampedDt,
        );
      } else if (throttle < 0) {
        const decel =
          state.linearVelocity > 0.1 ? physics.brakingDeceleration : physics.acceleration * 0.85;
        state.linearVelocity = Math.max(
          -physics.maxReverseSpeed,
          state.linearVelocity - (decel - slopeAccel) * clampedDt,
        );
      } else {
        // Desaceleración libre: regolito lunar conserva deslizamiento; arena marciana frena mucho antes
        const speedWithSlope = state.linearVelocity + slopeAccel * clampedDt;
        const damped = speedWithSlope * Math.exp(-physics.rollingFriction * clampedDt);
        const drop = physics.rollingFriction * 0.35 * clampedDt;
        if (Math.abs(damped) <= drop) {
          state.linearVelocity = 0;
        } else {
          state.linearVelocity = damped - Math.sign(damped) * drop;
        }
      }

      const accelSample = (state.linearVelocity - prevSpeed) / clampedDt;

      // 3. Velocidad angular progresiva (curva Ackerman + pivote 4x4 suave en reposo)
      const steerNorm = state.steerAngle / physics.maxSteerAngleRad;
      const absV = Math.abs(state.linearVelocity);
      let angularVel = 0;
      if (absV > 0.2) {
        const dirSign = state.linearVelocity >= 0 ? 1 : -1;
        const speedFactor = 0.38 + 0.62 * Math.min(1, absV / physics.maxForwardSpeed);
        angularVel = dirSign * steerNorm * physics.turnRateMoving * speedFactor;
      } else if (Math.abs(steerNorm) > 0.02) {
        angularVel = steerNorm * physics.turnRateStationary;
      }
      const dHeading = angularVel * clampedDt;
      state.heading += dHeading;

      // 4. Deslizamiento lateral (mayor en Luna por menor gravedad y regolito suelto)
      const driftRatio = planet === 'lunar' ? 0.24 : 0.04;
      state.lateralVelocity += state.linearVelocity * dHeading * driftRatio;
      state.lateralVelocity *= Math.exp(-physics.lateralGrip * clampedDt);
      if (Math.abs(state.lateralVelocity) < 0.01) state.lateralVelocity = 0;

      // 5. Integración XZ con amortiguación suave cerca del borde invisible [-22, 22]
      const fx = Math.cos(state.heading);
      const fz = -Math.sin(state.heading);
      const rx = Math.sin(state.heading);
      const rz = Math.cos(state.heading);

      let worldVx = fx * state.linearVelocity + rx * state.lateralVelocity;
      let worldVz = fz * state.linearVelocity + rz * state.lateralVelocity;

      const { boundsMin, boundsMax, softMargin } = ROVER_WORLD_LIMITS;
      let hitBoundary = false;

      if (state.x > boundsMax - softMargin && worldVx > 0) {
        const ratio = clampValue((boundsMax - state.x) / softMargin, 0, 1);
        worldVx *= ratio;
        if (ratio <= 0.05) hitBoundary = true;
      } else if (state.x < boundsMin + softMargin && worldVx < 0) {
        const ratio = clampValue((state.x - boundsMin) / softMargin, 0, 1);
        worldVx *= ratio;
        if (ratio <= 0.05) hitBoundary = true;
      }

      if (state.z > boundsMax - softMargin && worldVz > 0) {
        const ratio = clampValue((boundsMax - state.z) / softMargin, 0, 1);
        worldVz *= ratio;
        if (ratio <= 0.05) hitBoundary = true;
      } else if (state.z < boundsMin + softMargin && worldVz < 0) {
        const ratio = clampValue((state.z - boundsMin) / softMargin, 0, 1);
        worldVz *= ratio;
        if (ratio <= 0.05) hitBoundary = true;
      }

      let nextX = state.x + worldVx * clampedDt;
      let nextZ = state.z + worldVz * clampedDt;

      // 6. Detección de colisión deslizante contra edificios/domos de la colonia
      let collidedWith: string | null = null;
      let lastObsNx = 0;
      let lastObsNz = 0;
      for (let pass = 0; pass < 2; pass++) {
        for (const obs of obstacles) {
          const minDist = obs.radius + ROVER_COLLISION_RADIUS;
          const dx = nextX - obs.x;
          const dz = nextZ - obs.z;
          const dist = Math.hypot(dx, dz);
          if (dist < minDist) {
            const nx = dist > 1e-4 ? dx / dist : 1;
            const nz = dist > 1e-4 ? dz / dist : 0;
            nextX = obs.x + nx * minDist;
            nextZ = obs.z + nz * minDist;
            const vn = worldVx * nx + worldVz * nz;
            if (vn < 0) {
              worldVx -= vn * nx;
              worldVz -= vn * nz;
            }
            collidedWith = obs.id;
            lastObsNx = nx;
            lastObsNz = nz;
          }
        }
      }

      if (nextX >= boundsMax) {
        nextX = boundsMax;
        if (worldVx > 0) worldVx = 0;
        hitBoundary = true;
      } else if (nextX <= boundsMin) {
        nextX = boundsMin;
        if (worldVx < 0) worldVx = 0;
        hitBoundary = true;
      }

      if (nextZ >= boundsMax) {
        nextZ = boundsMax;
        if (worldVz > 0) worldVz = 0;
        hitBoundary = true;
      } else if (nextZ <= boundsMin) {
        nextZ = boundsMin;
        if (worldVz < 0) worldVz = 0;
        hitBoundary = true;
      }

      // Re-proyectar velocidad resultante tras deslizamiento y guiar ligeramente el parachoques alrededor de domos curvos
      if (collidedWith !== null || hitBoundary) {
        if (collidedWith !== null && throttle !== 0 && steerCmd === 0) {
          const dirSign = throttle >= 0 ? 1 : -1;
          const t1x = -lastObsNz;
          const t1z = lastObsNx;
          const fwdDotT = fx * dirSign * t1x + fz * dirSign * t1z;
          const side = Math.abs(fwdDotT) > 0.04 ? Math.sign(fwdDotT) : 1;
          const tangX = t1x * side * dirSign;
          const tangZ = t1z * side * dirSign;
          const tangHeading = Math.atan2(-tangZ, tangX);
          let hDiff = (tangHeading - state.heading + Math.PI) % (Math.PI * 2);
          if (hDiff < 0) hDiff += Math.PI * 2;
          hDiff -= Math.PI;
          const maxNudge = 1.65 * clampedDt;
          state.heading += clampValue(hDiff, -maxNudge, maxNudge);
        }
        const nFx = Math.cos(state.heading);
        const nFz = -Math.sin(state.heading);
        const nRx = Math.sin(state.heading);
        const nRz = Math.cos(state.heading);
        state.linearVelocity = worldVx * nFx + worldVz * nFz;
        state.lateralVelocity = worldVx * nRx + worldVz * nRz;
      }

      const stepDist = Math.hypot(nextX - state.x, nextZ - state.z);
      state.x = nextX;
      state.z = nextZ;
      state.distanceTraveled += stepDist;
      state.hitBoundary = hitBoundary;
      state.collidedWith = collidedWith;

      // 7. Lectura del terreno debajo de las 6 ruedas -> Y, pitch y roll suaves
      const wheelPose = sampleWheelPose(state.x, state.z, state.heading, getTerrainHeight);
      const tiltBlend = 1 - Math.exp(-clampedDt * 14);
      state.y += (wheelPose.targetY - state.y) * tiltBlend;
      state.pitch += (wheelPose.targetPitch - state.pitch) * tiltBlend;
      state.roll += (wheelPose.targetRoll - state.roll) * tiltBlend;
      state.terrainRoughness = wheelPose.roughness;

      // 8. Rotación de ruedas proporcional a velocidad lineal + balanceo de suspensión
      const spinDelta = (state.linearVelocity / physics.wheelRadius) * clampedDt;
      state.wheelSpinDelta = spinDelta;
      state.wheelSpinAngle += spinDelta;

      const speedNorm = Math.min(1, Math.abs(state.linearVelocity) / physics.maxForwardSpeed);
      const roughScale = 0.45 + Math.min(1.6, state.terrainRoughness * 2.2);
      const targetHeave =
        speedNorm > 0.04
          ? Math.sin(state.distanceTraveled * physics.suspensionFreq) *
            physics.suspensionAmp *
            speedNorm *
            roughScale
          : 0;
      const targetSuspPitch = clampValue(accelSample * 0.0022, -0.045, 0.045);
      const suspBlend = 1 - Math.exp(-clampedDt * 12);
      state.suspensionHeave += (targetHeave - state.suspensionHeave) * suspBlend;
      state.suspensionPitch += (targetSuspPitch - state.suspensionPitch) * suspBlend;

      state.isMoving = absV > 0.05 || Math.abs(angularVel) > 0.05;
      return { ...state };
    },
  };
}
