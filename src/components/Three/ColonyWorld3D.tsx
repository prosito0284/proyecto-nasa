import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Language } from '../../types/mission';
import { missionAudio } from '../../utils/sound';
import {
  AlertIcon,
  ArrowIcon,
  CheckIcon,
  CloseIcon,
  GlobeIcon,
  ScienceIcon,
  SlidersIcon,
} from '../icons';
import { isWebGLAvailable } from './ModelViewer3D';
import {
  buildColonyWorld,
  clampColonyCameraDistance,
  clampColonyPolarAngle,
  clampToColonyBounds,
  COLONY_CAMERA_LIMITS,
  COLONY_DEFAULT_POSE,
  COLONY_WORLD_MODULE_IDS,
  COLONY_WORLD_MODULES,
  type ColonyCameraPose,
  type ColonyWorldHandle,
  type ColonyWorldModuleId,
  type ColonyWorldStateOptions,
  computeColonyEvolutionState,
  computeColonyFocusPose,
  computeDynamicSunDirection,
  createSeededPrng,
  DEFAULT_TERRAIN_SEED,
  disposeObject3D,
  findAnomalyId,
  findColonyModuleId,
  formatTerrainSeedBadge,
  generateTurnAnomalies,
  getAnomalyGlossaryTermId,
  getColonyModuleStatus,
  getColonyEvolutionSummary,
  getMaintenanceConfirmation,
  getModuleGlossaryTermId,
  getModulesNeedingMaintenance,
  getWorldAtmosphere,
  isStormShieldDeployed,
  normalizeTerrainSeed,
  resolveColonyModuleGlbUrl,
  sampleWorldTerrainHeight,
  softClampColonyTarget,
  type WorldAnomalySpec,
} from './proceduralModels';
import {
  EMPTY_ROVER_DIRECTIONS,
  mapKeyToRoverDirection,
  mergeRoverDirections,
  resolveDirectionsFromKeys,
  RoverControlsOverlay,
  type RoverDirectionKey,
  type RoverDirectionState,
} from './RoverControlsOverlay';
import '../../styles/viewer3d.css';

export interface ColonyWorld3DProps {
  lang: Language;
  options: ColonyWorldStateOptions;
  selectedModule?: ColonyWorldModuleId | null;
  onSelectModule?: (moduleId: ColonyWorldModuleId) => void;
  /** M03: Modo de cámara 3D activo ('orbital' libre o 'rover' en tercera persona) */
  cameraMode?: 'orbital' | 'rover';
  onCameraModeChange?: (mode: 'orbital' | 'rover') => void;
  /** M03: Callbacks al escanear anomalías con el Rover o realizar mantenimiento en 3D */
  onScanAnomaly?: (anomaly: WorldAnomalySpec) => void | boolean;
  onMaintainModule?: (moduleId: ColonyWorldModuleId) => void | boolean;
  /** M04: Abre el glosario científico NASA centrado en el término de la anomalía o módulo */
  onInspectScienceTerm?: (termId: string) => void;
  /** Mapa opcional de archivos .glb/.gltf en public/models/ por módulo */
  moduleGlbFiles?: Partial<Record<ColonyWorldModuleId, string>>;
  /** Semilla procedural de topografía; si cambia regenera cráteres/dunas/rocas */
  terrainSeed?: number;
  /** Permite regenerar topografía (activo en partida libre, bloqueado en Reto del día) */
  canRegenerateTerrain?: boolean;
  /** Callback del padre para rotar la semilla de terreno en la partida actual */
  onRegenerateTerrain?: () => void;
  height?: number;
  ariaLabel?: string;
  className?: string;
  /** Fuerza respaldo SVG sin WebGL (pruebas JSDOM o accesibilidad) */
  forceFallback?: boolean;
}

export type ColonyKeyAction =
  | { type: 'orbit'; dTheta: number; dPhi: number; zoomScale: number }
  | { type: 'pan'; dx: number; dz: number }
  | { type: 'reset' }
  | { type: 'toggle-pause' }
  | { type: 'toggle-camera' }
  | { type: 'cycle-module'; dir: 1 | -1 }
  | { type: 'activate-module' };

export function resolveColonyKeyCommand(key: string, shiftKey = false): ColonyKeyAction | null {
  switch (key) {
    case 'ArrowLeft':
      return shiftKey
        ? { type: 'pan', dx: -1.8, dz: 0 }
        : { type: 'orbit', dTheta: 0.16, dPhi: 0, zoomScale: 1 };
    case 'ArrowRight':
      return shiftKey
        ? { type: 'pan', dx: 1.8, dz: 0 }
        : { type: 'orbit', dTheta: -0.16, dPhi: 0, zoomScale: 1 };
    case 'ArrowUp':
      return shiftKey
        ? { type: 'pan', dx: 0, dz: -1.8 }
        : { type: 'orbit', dTheta: 0, dPhi: -0.09, zoomScale: 1 };
    case 'ArrowDown':
      return shiftKey
        ? { type: 'pan', dx: 0, dz: 1.8 }
        : { type: 'orbit', dTheta: 0, dPhi: 0.09, zoomScale: 1 };
    case 'a':
    case 'A':
      return { type: 'pan', dx: -1.8, dz: 0 };
    case 'd':
    case 'D':
      return { type: 'pan', dx: 1.8, dz: 0 };
    case 'w':
    case 'W':
      return { type: 'pan', dx: 0, dz: -1.8 };
    case 's':
    case 'S':
      return { type: 'pan', dx: 0, dz: 1.8 };
    case '+':
    case '=':
      return { type: 'orbit', dTheta: 0, dPhi: 0, zoomScale: 0.86 };
    case '-':
    case '_':
      return { type: 'orbit', dTheta: 0, dPhi: 0, zoomScale: 1.16 };
    case 'r':
    case 'R':
      return { type: 'reset' };
    case 'c':
    case 'C':
      return { type: 'toggle-camera' };
    case 'Tab':
      return { type: 'cycle-module', dir: shiftKey ? -1 : 1 };
    case 'Enter':
      return { type: 'activate-module' };
    case ' ':
      return { type: 'toggle-pause' };
    default:
      return null;
  }
}

function normalizeDriveKey(key: string): string {
  return key.length === 1 ? key.toLowerCase() : key;
}

function isEditableOrModalContext(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (el) {
    const tag = el.tagName?.toUpperCase?.();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    if (el.closest?.('[role="dialog"], .science-modal-backdrop, .modal-overlay')) return true;
  }
  if (typeof document !== 'undefined') {
    const activeModal = document.querySelector('[role="dialog"][aria-modal="true"]');
    if (activeModal) return true;
  }
  return false;
}

type FloatingTagState =
  | { kind: 'module'; moduleId: ColonyWorldModuleId; x: number; y: number }
  | { kind: 'anomaly'; anomalyId: string; x: number; y: number };

interface TacticalNotice {
  id: string;
  tone: 'ok' | 'warn' | 'info';
  badge: string;
  text: string;
  glossaryTermId?: string;
}

const SVG_MODULE_COORDS: Record<ColonyWorldModuleId, { x: number; y: number }> = {
  'power-grid': { x: 84, y: 122 },
  'oxygen-module': { x: 185, y: 112 },
  greenhouse: { x: 288, y: 122 },
  'comms-array': { x: 116, y: 66 },
  'rover-moxie': { x: 248, y: 156 },
};

export const ColonyWorld3D: React.FC<ColonyWorld3DProps> = ({
  lang,
  options,
  selectedModule = null,
  onSelectModule,
  cameraMode = 'orbital',
  onCameraModeChange,
  onScanAnomaly,
  onMaintainModule,
  onInspectScienceTerm,
  moduleGlbFiles,
  terrainSeed,
  canRegenerateTerrain = true,
  onRegenerateTerrain,
  height = 310,
  ariaLabel,
  className,
  forceFallback = false,
}) => {
  const es = lang === 'es';
  const siteId = options.siteId ?? 'moon-shackleton';
  const isMars = siteId === 'mars-jezero';
  const atmo = getWorldAtmosphere(siteId);
  const baseSeed = normalizeTerrainSeed(options.terrainSeed ?? terrainSeed ?? DEFAULT_TERRAIN_SEED);
  const [localSeedBump, setLocalSeedBump] = useState(0);
  const effectiveSeed = normalizeTerrainSeed(baseSeed + localSeedBump);

  useEffect(() => {
    setLocalSeedBump(0);
  }, [baseSeed]);

  const latestOptionsRef = useRef<ColonyWorldStateOptions>(options);
  latestOptionsRef.current = { ...options, terrainSeed: effectiveSeed };

  const frameRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const worldRef = useRef<ColonyWorldHandle | null>(null);
  const desiredPoseRef = useRef<ColonyCameraPose | null>(null);

  const pressedKeysRef = useRef<Set<string>>(new Set());
  const pointerDirectionsRef = useRef<RoverDirectionState>({ ...EMPTY_ROVER_DIRECTIONS });
  const roverDirectionsRef = useRef<RoverDirectionState>({ ...EMPTY_ROVER_DIRECTIONS });
  const [roverDirections, setRoverDirections] = useState<RoverDirectionState>(EMPTY_ROVER_DIRECTIONS);
  const [roverSpeedMps, setRoverSpeedMps] = useState(0);
  const lastReportedSpeedRef = useRef(0);
  const autoScannedIdsRef = useRef<Set<string>>(new Set());

  const onSelectModuleRef = useRef(onSelectModule);
  onSelectModuleRef.current = onSelectModule;
  const onScanAnomalyRef = useRef(onScanAnomaly);
  onScanAnomalyRef.current = onScanAnomaly;
  const onMaintainModuleRef = useRef(onMaintainModule);
  onMaintainModuleRef.current = onMaintainModule;
  const onCameraModeChangeRef = useRef(onCameraModeChange);
  onCameraModeChangeRef.current = onCameraModeChange;

  const cameraModeRef = useRef<'orbital' | 'rover'>(cameraMode);
  cameraModeRef.current = cameraMode;

  const [hoveredModule, setHoveredModule] = useState<ColonyWorldModuleId | null>(null);
  const hoveredRef = useRef<ColonyWorldModuleId | null>(null);
  hoveredRef.current = hoveredModule;

  const [hoveredAnomalyId, setHoveredAnomalyId] = useState<string | null>(null);
  const hoveredAnomalyRef = useRef<string | null>(null);
  hoveredAnomalyRef.current = hoveredAnomalyId;

  const [keyboardModule, setKeyboardModule] = useState<ColonyWorldModuleId | null>(null);
  const keyboardRef = useRef<ColonyWorldModuleId | null>(null);
  keyboardRef.current = keyboardModule;

  const [floatingTag, setFloatingTag] = useState<FloatingTagState | null>(null);
  const [tacticalNotice, setTacticalNotice] = useState<TacticalNotice | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const [svgZoom, setSvgZoom] = useState(1);
  const [svgRotDeg, setSvgRotDeg] = useState(0);

  const webglSupported = useMemo(
    () => !forceFallback && isWebGLAvailable(),
    [forceFallback],
  );

  const turnAnomalies = useMemo(
    () => generateTurnAnomalies(siteId, effectiveSeed, options.currentDay ?? 1),
    [siteId, effectiveSeed, options.currentDay],
  );
  const scannedSet = useMemo(
    () => new Set(options.scannedAnomalyIds ?? []),
    [options.scannedAnomalyIds],
  );
  const maintenanceIssues = useMemo(
    () => getModulesNeedingMaintenance(options, options.maintainedModuleIds),
    [options],
  );
  const maintenanceSet = useMemo(
    () => new Set(maintenanceIssues.map((m) => m.moduleId)),
    [maintenanceIssues],
  );

  const titleLabel =
    ariaLabel ??
    (es
      ? `Entorno 3D interactivo de la colonia en ${isMars ? 'Marte' : 'la Luna'}. Usa WASD o flechas para conducir el Rover, arrastrar para orbitar, C para cámara Rover, Tab para módulos y R para centrar.`
      : `Interactive 3D colony environment on ${isMars ? 'Mars' : 'the Moon'}. Use WASD or arrow keys to drive the Rover, drag to orbit, C for Rover camera, Tab for modules, and R to reset.`);

  const syncRoverDriveState = () => {
    if (latestOptionsRef.current.isLowPowerBlackout || isPausedRef.current) {
      pressedKeysRef.current.clear();
      pointerDirectionsRef.current = { ...EMPTY_ROVER_DIRECTIONS };
    }
    const kDirs = resolveDirectionsFromKeys(pressedKeysRef.current);
    const merged = mergeRoverDirections(kDirs, pointerDirectionsRef.current);
    const prev = roverDirectionsRef.current;
    if (
      prev.forward !== merged.forward ||
      prev.backward !== merged.backward ||
      prev.left !== merged.left ||
      prev.right !== merged.right
    ) {
      roverDirectionsRef.current = merged;
      setRoverDirections(merged);
    }
    worldRef.current?.setRoverControlInput(merged);
  };
  const syncRoverDriveStateRef = useRef(syncRoverDriveState);
  syncRoverDriveStateRef.current = syncRoverDriveState;

  const handleDpadDirectionChange = (direction: RoverDirectionKey, pressed: boolean) => {
    if (latestOptionsRef.current.isLowPowerBlackout) {
      pointerDirectionsRef.current = { ...EMPTY_ROVER_DIRECTIONS };
      syncRoverDriveState();
      return;
    }
    if (pointerDirectionsRef.current[direction] === pressed) return;
    pointerDirectionsRef.current = {
      ...pointerDirectionsRef.current,
      [direction]: pressed,
    };
    if (pressed) {
      desiredPoseRef.current = null;
    }
    syncRoverDriveState();
  };

  useEffect(() => {
    autoScannedIdsRef.current = new Set(options.scannedAnomalyIds ?? []);
  }, [siteId, effectiveSeed, options.currentDay, options.scannedAnomalyIds]);

  useEffect(() => {
    if (options.isLowPowerBlackout || isPaused) {
      pressedKeysRef.current.clear();
      pointerDirectionsRef.current = { ...EMPTY_ROVER_DIRECTIONS };
      syncRoverDriveStateRef.current();
    }
  }, [options.isLowPowerBlackout, isPaused]);

  useEffect(() => {
    if (!webglSupported) return;

    const clearAllInputs = () => {
      if (
        pressedKeysRef.current.size === 0 &&
        !pointerDirectionsRef.current.forward &&
        !pointerDirectionsRef.current.backward &&
        !pointerDirectionsRef.current.left &&
        !pointerDirectionsRef.current.right
      ) {
        return;
      }
      pressedKeysRef.current.clear();
      pointerDirectionsRef.current = { ...EMPTY_ROVER_DIRECTIONS };
      syncRoverDriveStateRef.current();
    };

    const handleWindowKeyDown = (ev: KeyboardEvent) => {
      if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) return;
      const dir = mapKeyToRoverDirection(ev.key);
      if (!dir) return;
      if (isEditableOrModalContext(ev.target)) return;

      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const frameContainsFocus = Boolean(frameRef.current && activeEl && frameRef.current.contains(activeEl));
      const viewportActive = frameContainsFocus || cameraModeRef.current === 'rover';
      if (!viewportActive) return;

      ev.preventDefault();
      if (latestOptionsRef.current.isLowPowerBlackout) return;
      desiredPoseRef.current = null;

      const norm = normalizeDriveKey(ev.key);
      if (!pressedKeysRef.current.has(norm)) {
        pressedKeysRef.current.add(norm);
        syncRoverDriveStateRef.current();
      }
    };

    const handleWindowKeyUp = (ev: KeyboardEvent) => {
      const norm = normalizeDriveKey(ev.key);
      const removedNorm = pressedKeysRef.current.delete(norm);
      const removedRaw = pressedKeysRef.current.delete(ev.key);
      if (removedNorm || removedRaw) {
        syncRoverDriveStateRef.current();
      }
    };

    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        clearAllInputs();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown, { passive: false });
    window.addEventListener('keyup', handleWindowKeyUp);
    window.addEventListener('blur', clearAllInputs);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
      window.removeEventListener('keyup', handleWindowKeyUp);
      window.removeEventListener('blur', clearAllInputs);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllInputs();
    };
  }, [webglSupported]);

  const handleRegenerateTerrain = () => {
    missionAudio.playClick();
    setTacticalNotice(null);
    if (onRegenerateTerrain) {
      onRegenerateTerrain();
    } else {
      setLocalSeedBump((prev) => prev + 7919);
    }
  };

  const scannedKey = (options.scannedAnomalyIds ?? []).join(',');
  const maintainedKey = (options.maintainedModuleIds ?? []).join(',');

  const optionsKeyDeps = [
    siteId,
    effectiveSeed,
    options.currentDay,
    options.totalDays,
    options.sciencePoints,
    options.powerPercent,
    options.lifeSupportPercent,
    options.shieldingPercent,
    options.foodPercent,
    options.solarAllocPercent,
    options.lifeSupportAllocPercent,
    options.shieldingAllocPercent,
    options.greenhouseAllocPercent,
    options.scienceAllocPercent,
    options.weatherType,
    options.isDustStorm,
    options.isSolarStorm,
    options.isRimShadowPass,
    options.isLowPowerBlackout,
    options.isGreenhouseWilted,
    options.isEnvironmentalAlert,
    options.commsActive,
    options.commDelaySeconds,
    scannedKey,
    maintainedKey,
  ];

  const getCurrentOffset = (): { x: number; y: number; z: number } | undefined => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return undefined;
    const off = cam.position.clone().sub(ctrl.target);
    return { x: off.x, y: off.y, z: off.z };
  };

  const handleProximityAutoScan = (anomalyId: string) => {
    const curOpts = latestOptionsRef.current;
    if (curOpts.isLowPowerBlackout) return;
    if (curOpts.scannedAnomalyIds?.includes(anomalyId) || autoScannedIdsRef.current.has(anomalyId)) {
      return;
    }
    const list =
      worldRef.current?.getAnomalies() ??
      generateTurnAnomalies(curOpts.siteId, curOpts.terrainSeed, curOpts.currentDay ?? 1);
    const spec = list.find((a) => a.id === anomalyId);
    if (!spec) return;

    autoScannedIdsRef.current.add(anomalyId);
    missionAudio.playSuccess();
    onScanAnomalyRef.current?.(spec);
    setTacticalNotice({
      id: `scan-drive-${spec.id}`,
      tone: 'ok',
      badge: es ? 'MUESTRA +3 CIENCIA' : 'SAMPLE +3 SCIENCE',
      text: spec.finding[lang],
      glossaryTermId: getAnomalyGlossaryTermId(spec.kind),
    });
  };
  const handleProximityAutoScanRef = useRef(handleProximityAutoScan);
  handleProximityAutoScanRef.current = handleProximityAutoScan;

  const handleInspectAnomaly = (anomalyId: string) => {
    const curOpts = latestOptionsRef.current;
    const list =
      worldRef.current?.getAnomalies() ??
      generateTurnAnomalies(curOpts.siteId, curOpts.terrainSeed, curOpts.currentDay ?? 1);
    const spec = list.find((a) => a.id === anomalyId);
    if (!spec) return;

    if (curOpts.isLowPowerBlackout) {
      missionAudio.playAlert();
      setTacticalNotice({
        id: `blackout-${spec.id}`,
        tone: 'warn',
        badge: es ? 'ROVER SIN ENERGÍA' : 'ROVER OFFLINE',
        text: es
          ? 'Batería bajo 15 %. Recarga energía antes de enviar el rover.'
          : 'Power below 15%. Recharge battery before deploying the rover.',
      });
      return;
    }

    worldRef.current?.dispatchRoverToAnomaly(spec.id);
    const glossaryTermId = getAnomalyGlossaryTermId(spec.kind);
    const alreadyScanned = Boolean(curOpts.scannedAnomalyIds?.includes(spec.id));
    if (!alreadyScanned) {
      missionAudio.playSuccess();
      onScanAnomalyRef.current?.(spec);
      setTacticalNotice({
        id: `scan-${spec.id}`,
        tone: 'ok',
        badge: es ? 'MUESTRA +3 CIENCIA' : 'SAMPLE +3 SCIENCE',
        text: spec.finding[lang],
        glossaryTermId,
      });
    } else {
      missionAudio.playClick();
      setTacticalNotice({
        id: `revisit-${spec.id}`,
        tone: 'info',
        badge: spec.title[lang],
        text: spec.finding[lang],
        glossaryTermId,
      });
    }
  };
  const handleInspectAnomalyRef = useRef(handleInspectAnomaly);
  handleInspectAnomalyRef.current = handleInspectAnomaly;

  const activateModuleInteraction = (modId: ColonyWorldModuleId, focusOrbitalCamera: boolean) => {
    const curOpts = latestOptionsRef.current;
    const issues = getModulesNeedingMaintenance(curOpts, curOpts.maintainedModuleIds);
    const needsMaint = issues.some((m) => m.moduleId === modId);
    if (needsMaint) {
      worldRef.current?.triggerMaintenanceAnimation(modId);
      const conf = getMaintenanceConfirmation(modId);
      onMaintainModuleRef.current?.(modId);
      missionAudio.playSuccess();
      if (conf) {
        setTacticalNotice({
          id: `maint-${modId}-${Date.now()}`,
          tone: 'ok',
          badge: es ? 'MANTENIMIENTO OK' : 'MAINTENANCE OK',
          text: conf[lang],
          glossaryTermId: getModuleGlossaryTermId(modId, siteId),
        });
      }
    } else {
      missionAudio.playClick();
    }

    setKeyboardModule(modId);
    worldRef.current?.setHovered(modId);
    if (focusOrbitalCamera && webglSupported && worldRef.current && cameraModeRef.current === 'orbital') {
      const anchor = new THREE.Vector3();
      worldRef.current.getModuleAnchor(modId, anchor);
      desiredPoseRef.current = computeColonyFocusPose(modId, getCurrentOffset(), {
        x: anchor.x,
        z: anchor.z,
      });
    }
    worldRef.current?.pulse(modId);
    onSelectModuleRef.current?.(modId);
  };
  const activateModuleInteractionRef = useRef(activateModuleInteraction);
  activateModuleInteractionRef.current = activateModuleInteraction;

  const focusAndHighlightModule = (modId: ColonyWorldModuleId, triggerSelect: boolean) => {
    if (triggerSelect) {
      activateModuleInteraction(modId, true);
      return;
    }
    setKeyboardModule(modId);
    worldRef.current?.setHovered(modId);
    if (webglSupported && worldRef.current && cameraModeRef.current === 'orbital') {
      const anchor = new THREE.Vector3();
      worldRef.current.getModuleAnchor(modId, anchor);
      desiredPoseRef.current = computeColonyFocusPose(modId, getCurrentOffset(), {
        x: anchor.x,
        z: anchor.z,
      });
    }
  };

  const handleResetView = () => {
    missionAudio.playClick();
    if (cameraModeRef.current === 'rover') {
      onCameraModeChangeRef.current?.('orbital');
    }
    if (!webglSupported) {
      setSvgZoom(1);
      setSvgRotDeg(0);
      return;
    }
    setKeyboardModule(null);
    worldRef.current?.setHovered(hoveredRef.current);
    desiredPoseRef.current = COLONY_DEFAULT_POSE;
  };

  const stepOrbitCamera = (dTheta: number, dPhi: number, zoomScale: number) => {
    if (!webglSupported) {
      if (dTheta !== 0) {
        setSvgRotDeg((prev) => (prev + Math.sign(dTheta) * 12 + 360) % 360);
      }
      if (zoomScale !== 1) {
        setSvgZoom((prev) =>
          Math.max(0.75, Math.min(1.45, Number((prev * (zoomScale < 1 ? 1.12 : 0.9)).toFixed(2)))),
        );
      }
      return;
    }
    if (cameraModeRef.current === 'rover') {
      onCameraModeChangeRef.current?.('orbital');
    }
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    desiredPoseRef.current = null;
    const offset = cam.position.clone().sub(ctrl.target);
    const sph = new THREE.Spherical().setFromVector3(offset);
    sph.theta += dTheta;
    sph.phi = clampColonyPolarAngle(sph.phi + dPhi);
    sph.radius = clampColonyCameraDistance(sph.radius * zoomScale);
    offset.setFromSpherical(sph);
    cam.position.copy(ctrl.target).add(offset);
    ctrl.update();
  };

  const stepPanCamera = (dx: number, dz: number) => {
    if (!webglSupported || cameraModeRef.current === 'rover') return;
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;
    desiredPoseRef.current = null;
    const off = cam.position.clone().sub(ctrl.target);
    const theta = Math.atan2(off.x, off.z);
    const worldDx = Math.cos(theta) * dx + Math.sin(theta) * dz;
    const worldDz = -Math.sin(theta) * dx + Math.cos(theta) * dz;
    const nextX = clampToColonyBounds(ctrl.target.x + worldDx);
    const nextZ = clampToColonyBounds(ctrl.target.z + worldDz);
    const appliedDx = nextX - ctrl.target.x;
    const appliedDz = nextZ - ctrl.target.z;
    ctrl.target.x = nextX;
    ctrl.target.z = nextZ;
    cam.position.x += appliedDx;
    cam.position.z += appliedDz;
    ctrl.update();
  };

  const handleCycleModuleButton = () => {
    missionAudio.playClick();
    const curIdx = keyboardModule ? COLONY_WORLD_MODULE_IDS.indexOf(keyboardModule) : -1;
    const nextMod = COLONY_WORLD_MODULE_IDS[(curIdx + 1) % COLONY_WORLD_MODULE_IDS.length];
    focusAndHighlightModule(nextMod, true);
  };

  const handleViewportKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!e.shiftKey && mapKeyToRoverDirection(e.key)) {
      // Conducción simultánea con Flechas/WASD cuando WebGL está activo (previene scroll de página)
      if (webglSupported) {
        e.preventDefault();
        if (!latestOptionsRef.current.isLowPowerBlackout) {
          desiredPoseRef.current = null;
          const norm = normalizeDriveKey(e.key);
          if (!pressedKeysRef.current.has(norm)) {
            pressedKeysRef.current.add(norm);
            syncRoverDriveState();
          }
        }
        return;
      }
    }

    const cmd = resolveColonyKeyCommand(e.key, e.shiftKey);
    if (!cmd) return;

    if (cmd.type === 'cycle-module') {
      if (e.target !== e.currentTarget) return;
      const curIdx = keyboardModule ? COLONY_WORLD_MODULE_IDS.indexOf(keyboardModule) : -1;
      if (cmd.dir === 1) {
        if (curIdx < COLONY_WORLD_MODULE_IDS.length - 1) {
          e.preventDefault();
          const nextMod = COLONY_WORLD_MODULE_IDS[curIdx + 1];
          missionAudio.playClick();
          focusAndHighlightModule(nextMod, false);
        } else {
          // Termina el recorrido por módulos y permite salir hacia la barra de controles (sin trampa de foco)
          setKeyboardModule(null);
          worldRef.current?.setHovered(null);
        }
      } else {
        if (curIdx > 0) {
          e.preventDefault();
          const prevMod = COLONY_WORLD_MODULE_IDS[curIdx - 1];
          missionAudio.playClick();
          focusAndHighlightModule(prevMod, false);
        } else {
          setKeyboardModule(null);
          worldRef.current?.setHovered(null);
        }
      }
      return;
    }

    if (cmd.type === 'activate-module') {
      if (e.target !== e.currentTarget) return;
      const targetMod = keyboardModule ?? hoveredModule ?? selectedModule;
      if (targetMod) {
        e.preventDefault();
        activateModuleInteraction(targetMod, true);
      }
      return;
    }

    if (cmd.type === 'toggle-camera') {
      e.preventDefault();
      missionAudio.playClick();
      onCameraModeChangeRef.current?.(cameraModeRef.current === 'rover' ? 'orbital' : 'rover');
      return;
    }

    if (cmd.type === 'orbit') {
      e.preventDefault();
      stepOrbitCamera(cmd.dTheta, cmd.dPhi, cmd.zoomScale);
    } else if (cmd.type === 'pan') {
      e.preventDefault();
      stepPanCamera(cmd.dx, cmd.dz);
    } else if (cmd.type === 'reset') {
      e.preventDefault();
      handleResetView();
    } else if (cmd.type === 'toggle-pause' && e.target === e.currentTarget) {
      e.preventDefault();
      const targetMod = keyboardModule;
      if (targetMod) {
        activateModuleInteraction(targetMod, true);
      } else {
        missionAudio.playClick();
        setIsPaused((p) => !p);
      }
    }
  };

  // Montaje y desmontaje limpio del mundo Three.js cuando WebGL está disponible
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !webglSupported) return;

    const width = Math.max(260, host.clientWidth || 640);
    const viewHeight = Math.max(200, height);
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, viewHeight);
    renderer.setClearColor(atmo.skyColor, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);

    desiredPoseRef.current = null;
    const world = buildColonyWorld(latestOptionsRef.current);
    worldRef.current = world;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(atmo.skyColor);
    scene.fog = world.fog;
    scene.add(world.group);

    // Frustum con far = 2600 para abarcar estrellas (1400), Sol/Tierra y terreno 2000x2000
    const camera = new THREE.PerspectiveCamera(50, width / viewHeight, 0.25, 2600);
    camera.position.set(...COLONY_DEFAULT_POSE.cameraPos);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enableRotate = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.screenSpacePanning = false;
    controls.panSpeed = 0.8;
    controls.minDistance = COLONY_CAMERA_LIMITS.minDistance;
    controls.maxDistance = COLONY_CAMERA_LIMITS.maxDistance;
    controls.minPolarAngle = COLONY_CAMERA_LIMITS.minPolarAngle;
    controls.maxPolarAngle = COLONY_CAMERA_LIMITS.maxPolarAngle;
    controls.target.set(...COLONY_DEFAULT_POSE.target);
    controls.update();
    controlsRef.current = controls;

    const roverPosVec = new THREE.Vector3();
    const roverFwdVec = new THREE.Vector3();
    const chaseGoalCam = new THREE.Vector3();
    const chaseGoalTarget = new THREE.Vector3();
    let prevCamMode: 'orbital' | 'rover' = cameraModeRef.current;

    if (prevCamMode === 'rover') {
      world.getRoverPose(roverPosVec, roverFwdVec);
      controls.enabled = false;
      controls.target.copy(roverPosVec).addScaledVector(roverFwdVec, 3.6);
      controls.target.y = roverPosVec.y + 1.35;
      camera.position.copy(roverPosVec).addScaledVector(roverFwdVec, -7.2);
      camera.position.y = roverPosVec.y + 3.8;
      camera.lookAt(controls.target);
    }

    // Carga opcional de archivos .glb/.gltf por módulo usando import.meta.env.BASE_URL (cero 404 por defecto)
    let isDisposed = false;
    const loader = new GLTFLoader();
    for (const id of COLONY_WORLD_MODULE_IDS) {
      const explicitFile = moduleGlbFiles?.[id];
      const url = explicitFile
        ? `${(import.meta.env?.BASE_URL ?? './').replace(/\/?$/, '/')}models/${explicitFile
            .replace(/^\/+/, '')
            .replace(/^models\//, '')}`
        : resolveColonyModuleGlbUrl(id);
      if (!url) continue;
      loader.load(
        url,
        (gltf) => {
          if (isDisposed) {
            disposeObject3D(gltf.scene);
            return;
          }
          world.replaceModuleVisual(id, gltf.scene);
        },
        undefined,
        () => {
          // Respaldo procedural activo; nunca falla en consola si un GLB personalizado no se encuentra
        },
      );
    }

    // Raycaster para anomalías + 5 módulos interactivos (hover cian/ámbar + clic sin arrastre)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let isDragging = false;

    type PickResult =
      | { kind: 'anomaly'; id: string }
      | { kind: 'module'; id: ColonyWorldModuleId }
      | null;

    const pickAtClient = (clientX: number, clientY: number): PickResult => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const targets = [...world.anomalyPickables, ...world.pickables];
      const hits = raycaster.intersectObjects(targets, true);
      for (const hit of hits) {
        const anomId = findAnomalyId(hit.object);
        if (anomId) return { kind: 'anomaly', id: anomId };
        const modId = findColonyModuleId(hit.object);
        if (modId) return { kind: 'module', id: modId };
      }
      return null;
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (isDragging && Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) {
        renderer.domElement.style.cursor = 'grabbing';
        return;
      }
      const hit = pickAtClient(ev.clientX, ev.clientY);
      renderer.domElement.style.cursor = hit
        ? 'pointer'
        : cameraModeRef.current === 'rover'
          ? 'default'
          : 'grab';

      const nextAnom = hit?.kind === 'anomaly' ? hit.id : null;
      const nextMod = hit?.kind === 'module' ? hit.id : null;

      if (nextAnom !== hoveredAnomalyRef.current) {
        setHoveredAnomalyId(nextAnom);
        world.setHoveredAnomaly(nextAnom);
      }
      if (nextMod !== hoveredRef.current) {
        setHoveredModule(nextMod);
        world.setHovered(nextMod ?? keyboardRef.current);
      }
    };

    const handlePointerDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
      isDragging = true;
      desiredPoseRef.current = null;
      hostRef.current?.focus({ preventScroll: true });
    };

    const handlePointerUp = (ev: PointerEvent) => {
      const moved = Math.hypot(ev.clientX - downX, ev.clientY - downY);
      isDragging = false;
      const hit = pickAtClient(ev.clientX, ev.clientY);
      renderer.domElement.style.cursor = hit
        ? 'pointer'
        : cameraModeRef.current === 'rover'
          ? 'default'
          : 'grab';
      if (moved > 6 || !hit) return;

      if (hit.kind === 'anomaly') {
        handleInspectAnomalyRef.current(hit.id);
        return;
      }
      activateModuleInteractionRef.current(hit.id, true);
    };

    const handlePointerLeave = () => {
      isDragging = false;
      renderer.domElement.style.cursor = cameraModeRef.current === 'rover' ? 'default' : 'grab';
      if (hoveredRef.current !== null) {
        setHoveredModule(null);
        world.setHovered(keyboardRef.current);
      }
      if (hoveredAnomalyRef.current !== null) {
        setHoveredAnomalyId(null);
        world.setHoveredAnomaly(null);
      }
    };

    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    const resizeRenderer = () => {
      if (!hostRef.current) return;
      const nextW = Math.max(240, hostRef.current.clientWidth);
      const nextH = Math.max(200, height);
      camera.aspect = nextW / nextH;
      camera.updateProjectionMatrix();
      renderer.setSize(nextW, nextH);
    };

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(() => resizeRenderer());
      ro.observe(host);
    }
    window.addEventListener('resize', resizeRenderer);

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    const anchorVec = new THREE.Vector3();
    let lastTagKey = '';
    world.setRoverControlInput(roverDirectionsRef.current);

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const curTele = world.getRoverTelemetry();
      const activeDrive =
        roverDirectionsRef.current.forward ||
        roverDirectionsRef.current.backward ||
        roverDirectionsRef.current.left ||
        roverDirectionsRef.current.right ||
        curTele.isMoving;

      if (!isPausedRef.current && (!reducedMotion || activeDrive)) {
        elapsed += dt;
        world.animate(elapsed, dt);
      }

      const nextTele = world.getRoverTelemetry();
      const roundedSpeed = Math.round(Math.abs(nextTele.linearVelocity) * 10) / 10;
      if (Math.abs(roundedSpeed - lastReportedSpeedRef.current) >= 0.1) {
        lastReportedSpeedRef.current = roundedSpeed;
        setRoverSpeedMps(roundedSpeed);
      }
      if (
        activeDrive &&
        !latestOptionsRef.current.isLowPowerBlackout &&
        nextTele.nearestAnomalyId &&
        nextTele.nearestAnomalyDistance <= 3.0
      ) {
        handleProximityAutoScanRef.current(nextTele.nearestAnomalyId);
      }

      const activeCamMode = cameraModeRef.current;
      if (activeCamMode !== prevCamMode) {
        prevCamMode = activeCamMode;
        if (activeCamMode === 'rover') {
          controls.enabled = false;
          desiredPoseRef.current = null;
        } else {
          controls.enabled = true;
          desiredPoseRef.current = COLONY_DEFAULT_POSE;
        }
      }

      if (activeCamMode === 'rover') {
        world.getRoverPose(roverPosVec, roverFwdVec);
        chaseGoalCam.copy(roverPosVec).addScaledVector(roverFwdVec, -7.2);
        chaseGoalCam.y = roverPosVec.y + 3.8;
        const camGround = sampleWorldTerrainHeight(
          chaseGoalCam.x,
          chaseGoalCam.z,
          siteId,
          effectiveSeed,
        );
        if (chaseGoalCam.y < camGround + 1.2) {
          chaseGoalCam.y = camGround + 1.2;
        }
        chaseGoalTarget.copy(roverPosVec).addScaledVector(roverFwdVec, 3.6);
        chaseGoalTarget.y = roverPosVec.y + 1.35;

        const blend = reducedMotion ? 1 : Math.min(1, Math.max(0.08, dt * 6.2));
        camera.position.lerp(chaseGoalCam, blend);
        controls.target.lerp(chaseGoalTarget, blend);
        camera.lookAt(controls.target);
      } else {
        if (desiredPoseRef.current) {
          const goalT = new THREE.Vector3(...desiredPoseRef.current.target);
          const goalC = new THREE.Vector3(...desiredPoseRef.current.cameraPos);
          const blend = Math.min(1, dt * 6);
          controls.target.lerp(goalT, blend);
          camera.position.lerp(goalC, blend);
          if (controls.target.distanceTo(goalT) < 0.05 && camera.position.distanceTo(goalC) < 0.08) {
            controls.target.copy(goalT);
            camera.position.copy(goalC);
            desiredPoseRef.current = null;
          }
        }

        controls.update();

        // Límites invisibles con amortiguación suave dentro de [-24, 24] y sobre el suelo
        controls.target.y = Math.max(
          COLONY_CAMERA_LIMITS.minTargetY,
          Math.min(COLONY_CAMERA_LIMITS.maxTargetY, controls.target.y),
        );
        const clamped = softClampColonyTarget(
          controls.target.x,
          controls.target.z,
          1 - Math.exp(-dt * 12),
        );
        if (clamped.wasOutside) {
          const dx = clamped.x - controls.target.x;
          const dz = clamped.z - controls.target.z;
          controls.target.x = clamped.x;
          controls.target.z = clamped.z;
          camera.position.x += dx;
          camera.position.z += dz;
        }

        const groundY = sampleWorldTerrainHeight(
          camera.position.x,
          camera.position.z,
          siteId,
          effectiveSeed,
        );
        if (camera.position.y < groundY + 0.8) {
          camera.position.y = groundY + 0.8;
        }
      }

      renderer.render(scene, camera);

      // Etiqueta táctica flotante proyectada sobre anomalía o módulo activo
      const activeAnom = hoveredAnomalyRef.current;
      const taggedMod = hoveredRef.current ?? keyboardRef.current;
      if (activeAnom && world.getAnomalyAnchor(activeAnom, anchorVec)) {
        anchorVec.project(camera);
        if (anchorVec.z > -1 && anchorVec.z < 1) {
          const cw = host.clientWidth || width;
          const ch = height;
          const px = Math.max(115, Math.min(cw - 115, (anchorVec.x * 0.5 + 0.5) * cw));
          const py = Math.max(54, Math.min(ch - 32, (-anchorVec.y * 0.5 + 0.5) * ch));
          const key = `anom:${activeAnom}:${Math.round(px)}:${Math.round(py)}`;
          if (key !== lastTagKey) {
            lastTagKey = key;
            setFloatingTag({ kind: 'anomaly', anomalyId: activeAnom, x: px, y: py });
          }
        }
      } else if (taggedMod) {
        world.getModuleAnchor(taggedMod, anchorVec);
        anchorVec.project(camera);
        if (anchorVec.z > -1 && anchorVec.z < 1) {
          const cw = host.clientWidth || width;
          const ch = height;
          const px = Math.max(115, Math.min(cw - 115, (anchorVec.x * 0.5 + 0.5) * cw));
          const py = Math.max(54, Math.min(ch - 32, (-anchorVec.y * 0.5 + 0.5) * ch));
          const key = `mod:${taggedMod}:${Math.round(px)}:${Math.round(py)}`;
          if (key !== lastTagKey) {
            lastTagKey = key;
            setFloatingTag({ kind: 'module', moduleId: taggedMod, x: px, y: py });
          }
        }
      } else if (lastTagKey !== '') {
        lastTagKey = '';
        setFloatingTag(null);
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', resizeRenderer);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      worldRef.current = null;
      disposeObject3D(scene);
      renderer.renderLists?.dispose?.();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [siteId, effectiveSeed, height, webglSupported]);

  // Sincronización reactiva de estado en vivo sin recrear la escena WebGL
  useEffect(() => {
    worldRef.current?.updateState(latestOptionsRef.current);
  }, optionsKeyDeps);

  useEffect(() => {
    worldRef.current?.setSelected(selectedModule ?? null);
  }, [selectedModule]);

  const activeAnomalyTag = (() => {
    if (!hoveredAnomalyId) return null;
    const spec = turnAnomalies.find((a) => a.id === hoveredAnomalyId);
    if (!spec) return null;
    const isScanned = scannedSet.has(spec.id);
    return {
      title: spec.title[lang],
      subtitle: isScanned
        ? es
          ? 'Muestra ya analizada (+3 pts)'
          : 'Sample scanned (+3 pts)'
        : es
          ? 'Clic para enviar Rover (+3 ciencia)'
          : 'Click to dispatch Rover (+3 science)',
      tone: isScanned ? 'ok' : 'warn',
    };
  })();

  const activeTagModule = hoveredModule ?? keyboardModule;
  const activeTagMeta = activeTagModule ? COLONY_WORLD_MODULES[activeTagModule] : null;
  const activeTagStatus = activeTagModule
    ? getColonyModuleStatus(activeTagModule, options, lang)
    : null;

  const focusedAnnouncement = (() => {
    const mod = keyboardModule ?? hoveredModule;
    if (!mod) return '';
    const m = COLONY_WORLD_MODULES[mod];
    const st = getColonyModuleStatus(mod, options, lang);
    return `${m.label[lang]}: ${st.text}`;
  })();

  const renderSvgColonyFallback = () => {
    const inkPrimary = isMars ? '#F4C39B' : '#B8D8F8';
    const inkSecondary = isMars ? '#C87D52' : '#6794C1';
    const skyBg = isMars ? '#2D160E' : '#03060C';
    const horizonBg = isMars ? '#4E2417' : '#15273E';
    const shieldDeployed = isStormShieldDeployed(options);
    const evo = computeColonyEvolutionState(options);
    const sunDir = computeDynamicSunDirection(siteId, options);
    const sunX = Math.round(Math.max(24, Math.min(336, 180 + sunDir[0] * 130)));
    const sunY = Math.round(Math.max(16, Math.min(48, 50 - sunDir[1] * 38)));
    const rng = createSeededPrng(effectiveSeed ^ (isMars ? 0x22af : 0x91e3));
    const ridgeY1 = Math.round(62 + rng() * 14);
    const ridgeY2 = Math.round(58 + rng() * 16);
    const ridgeY3 = Math.round(64 + rng() * 12);
    const craterX1 = Math.round(30 + rng() * 120);
    const craterX2 = Math.round(200 + rng() * 120);

    return (
      <div className="viewer3d-fallback-svg-wrap" data-testid="colony-world-svg-fallback">
        <svg
          viewBox="0 0 360 190"
          className="viewer3d-fallback-svg"
          role="img"
          aria-label={titleLabel}
          data-testid="viewer3d-svg-fallback-colony-base"
          style={{
            transform: `scale(${cameraMode === 'rover' ? Math.max(svgZoom, 1.15) : svgZoom}) rotate(${svgRotDeg}deg)`,
            transition: 'transform 120ms ease-out',
          }}
        >
          <rect x="0" y="0" width="360" height="190" fill={skyBg} />
          {!isMars ? (
            <>
              <circle cx="46" cy="24" r="1" fill="#F8FAFC" />
              <circle cx="96" cy="18" r="1.2" fill="#F8FAFC" />
              <circle cx="290" cy="28" r="1" fill="#F8FAFC" />
              <circle cx="62" cy="40" r="10" fill="#3B82F6" stroke="#93C5FD" strokeWidth="1" />
            </>
          ) : (
            <ellipse cx="180" cy="64" rx="180" ry="20" fill="#6E2D18" opacity="0.28" />
          )}
          <circle
            cx={sunX}
            cy={sunY}
            r="6"
            fill={options.isSolarStorm ? '#FFFFFF' : isMars ? '#FFF1DC' : '#FFFBEB'}
            stroke={options.isDustStorm ? '#F59E0B' : inkSecondary}
            strokeWidth="1"
          />
          <path
            d={`M0,76 L55,${ridgeY1} L130,74 L195,${ridgeY2} L285,${ridgeY3} L360,76 L360,190 L0,190 Z`}
            fill={horizonBg}
          />
          <ellipse cx={craterX1} cy="96" rx="16" ry="5" fill="none" stroke={inkSecondary} strokeWidth="0.9" opacity="0.55" />
          <ellipse cx={craterX2} cy="92" rx="14" ry="4.5" fill="none" stroke={inkSecondary} strokeWidth="0.9" opacity="0.55" />

          {evo.tunnelAirlockSpur && (
            <line
              x1={SVG_MODULE_COORDS['oxygen-module'].x}
              y1={SVG_MODULE_COORDS['oxygen-module'].y + 8}
              x2={SVG_MODULE_COORDS['rover-moxie'].x - 16}
              y2={SVG_MODULE_COORDS['rover-moxie'].y - 4}
              stroke={inkPrimary}
              strokeWidth="3"
              data-evo="tunnel-airlock"
            />
          )}
          {evo.tunnelNorthUmbilical && (
            <line
              x1={SVG_MODULE_COORDS['oxygen-module'].x - 10}
              y1={SVG_MODULE_COORDS['oxygen-module'].y - 6}
              x2={SVG_MODULE_COORDS['comms-array'].x + 6}
              y2={SVG_MODULE_COORDS['comms-array'].y + 10}
              stroke={inkPrimary}
              strokeWidth="3"
              data-evo="tunnel-north"
            />
          )}

          {COLONY_WORLD_MODULE_IDS.map((modId) => {
            const c = SVG_MODULE_COORDS[modId];
            const active = selectedModule === modId || keyboardModule === modId;
            const needsMaint = maintenanceSet.has(modId);
            return (
              <g
                key={modId}
                transform={`translate(${c.x}, ${c.y})`}
                role="button"
                tabIndex={0}
                aria-label={`${COLONY_WORLD_MODULES[modId].label[lang]}${
                  needsMaint ? (es ? ' (requiere mantenimiento)' : ' (maintenance needed)') : ''
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => focusAndHighlightModule(modId, true)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    focusAndHighlightModule(modId, true);
                  }
                }}
              >
                <circle
                  cx="0"
                  cy="0"
                  r="22"
                  fill="none"
                  stroke={needsMaint ? '#FFB300' : active ? '#38BDF8' : inkSecondary}
                  strokeWidth={active || needsMaint ? 2 : 1}
                  strokeDasharray={active ? undefined : '4 3'}
                />
                {modId === 'power-grid' && (
                  <>
                    <rect x="-18" y="-12" width="36" height="24" fill="#1E3A8A" stroke={inkPrimary} strokeWidth="1.5" />
                    {evo.solarWingLeft && (
                      <rect x="-32" y="-9" width="12" height="18" fill="#1D4ED8" stroke={inkPrimary} strokeWidth="1.2" data-evo="solar-left" />
                    )}
                    {evo.solarWingRight && (
                      <rect x="-14" y="-24" width="28" height="10" fill="#1D4ED8" stroke={inkPrimary} strokeWidth="1.2" data-evo="solar-right" />
                    )}
                  </>
                )}
                {modId === 'oxygen-module' && (
                  <>
                    {evo.regolithWall && (
                      <path
                        d="M-24,8 L-24,-2 M24,8 L24,-2"
                        stroke={isMars ? '#A0522D' : '#94A3B8'}
                        strokeWidth="3"
                        data-evo="regolith-wall"
                      />
                    )}
                    <path d="M-20,6 A20,18 0 0,1 20,6 Z" fill="#E8E2D5" stroke={inkPrimary} strokeWidth="1.5" />
                    {evo.regolithArches && (
                      <path
                        d="M-21,6 A21,19 0 0,1 21,6"
                        fill="none"
                        stroke={isMars ? '#A0522D' : '#64748B'}
                        strokeWidth="3.5"
                        data-evo="regolith-arches"
                      />
                    )}
                    {shieldDeployed && (
                      <path
                        d="M-26,8 A26,24 0 0,1 26,8"
                        fill="none"
                        stroke={options.isEnvironmentalAlert ? '#FFB300' : '#00E5FF'}
                        strokeWidth="2"
                      />
                    )}
                  </>
                )}
                {modId === 'greenhouse' && (
                  <>
                    <rect x="-18" y="-10" width="36" height="20" fill="#14532D" stroke="#2E7D4F" strokeWidth="1.5" />
                    {evo.greenhouseTier2 && (
                      <rect x="-14" y="12" width="28" height="8" fill="#166534" stroke="#4ADE80" strokeWidth="1.2" data-evo="greenhouse-tier2" />
                    )}
                    {evo.greenhouseTier3 && (
                      <rect x="-14" y="-20" width="28" height="8" fill="#166534" stroke="#F87171" strokeWidth="1.2" data-evo="greenhouse-tier3" />
                    )}
                  </>
                )}
                {modId === 'comms-array' && (
                  <>
                    <line x1="0" y1="12" x2="0" y2="-10" stroke={inkPrimary} strokeWidth="2" />
                    <path d="M-12,-10 Q0,-22 12,-10" fill="none" stroke="#38BDF8" strokeWidth="2" />
                  </>
                )}
                {modId === 'rover-moxie' && (
                  <>
                    {cameraMode === 'rover' && (
                      <polygon points="-24,-14 0,-2 24,-14" fill="none" stroke="#38BDF8" strokeWidth="1.4" strokeDasharray="3 2" />
                    )}
                    <rect x="-14" y="-8" width="28" height="14" fill="#F2EBDD" stroke="#FFB300" strokeWidth="1.5" />
                    <rect x="-6" y="-5" width="12" height="8" fill="#FFB300" />
                  </>
                )}
                {needsMaint && (
                  <polygon
                    points="18,-23 23,-17 18,-11 13,-17"
                    fill="#FFB300"
                    stroke="#1B1F2A"
                    strokeWidth="1"
                    data-testid={`svg-maint-${modId}`}
                  />
                )}
              </g>
            );
          })}

          {turnAnomalies.map((anom) => {
            const sx = Math.max(24, Math.min(336, Math.round(185 + anom.position[0] * 7.6)));
            const sy = Math.max(76, Math.min(172, Math.round(112 + anom.position[2] * 3.0)));
            const scanned = scannedSet.has(anom.id);
            const markerColor = scanned ? '#2E7D4F' : '#FFB300';
            return (
              <g
                key={anom.id}
                transform={`translate(${sx}, ${sy})`}
                role="button"
                tabIndex={0}
                data-testid={`svg-anomaly-${anom.id}`}
                aria-label={`${anom.title[lang]}${
                  scanned
                    ? es
                      ? ' (analizada)'
                      : ' (scanned)'
                    : es
                      ? ' (+3 ciencia)'
                      : ' (+3 science)'
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleInspectAnomaly(anom.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    handleInspectAnomaly(anom.id);
                  }
                }}
              >
                <circle cx="0" cy="0" r="10" fill="none" stroke={markerColor} strokeWidth="1.2" strokeDasharray="2 2" />
                <polygon points="0,-7 6,0 0,7 -6,0" fill={markerColor} stroke="#F8FAFC" strokeWidth="1" />
              </g>
            );
          })}

          <text
            x="180"
            y="184"
            textAnchor="middle"
            fill={inkPrimary}
            fontSize="9"
            fontFamily="IBM Plex Mono, monospace"
          >
            {isMars ? 'JEZERO WORLD // NO WEBGL FALLBACK' : 'LUNAR WORLD // NO WEBGL FALLBACK'}
          </text>
        </svg>
      </div>
    );
  };

  const seedBadgeCode = formatTerrainSeedBadge(effectiveSeed);
  const evoSummary = getColonyEvolutionSummary(computeColonyEvolutionState(options), lang);

  return (
    <div
      ref={frameRef}
      className={`viewer3d-frame ${isMars ? 'viewer3d-mars' : 'viewer3d-lunar'} ${className ?? ''}`.trim()}
      data-testid="colony-world-3d"
    >
      <div
        ref={hostRef}
        className="viewer3d-viewport"
        style={{ height: `${height}px` }}
        tabIndex={0}
        role="region"
        aria-label={titleLabel}
        onKeyDown={handleViewportKeyDown}
      >
        <div className="viewer3d-hud-top">
          <span className="viewer3d-badge">
            <GlobeIcon size={13} />
            <span>
              {webglSupported
                ? cameraMode === 'rover'
                  ? es
                    ? '3D // CÁMARA ROVER'
                    : '3D // ROVER CAM'
                  : isMars
                    ? es
                      ? '3D // MARTE JEZERO'
                      : '3D // MARS JEZERO'
                    : es
                      ? '3D // LUNA SHACKLETON'
                      : '3D // LUNAR SHACKLETON'
                : es
                  ? 'SVG // SIN WEBGL'
                  : 'SVG // NO WEBGL'}
            </span>
          </span>
          <div className="viewer3d-hud-right">
            <span
              className={`viewer3d-badge viewer3d-evo-badge evo-tier-${evoSummary.tier.toLowerCase()}`}
              data-testid="colony-evo-badge"
              title={evoSummary.detailText}
            >
              {evoSummary.badgeLabel}
            </span>
            <span className="viewer3d-badge viewer3d-seed-badge" data-testid="colony-seed-badge">
              {`SEED #${seedBadgeCode}`}
            </span>
          </div>
        </div>

        {webglSupported && floatingTag && floatingTag.kind === 'anomaly' && activeAnomalyTag && (
          <div
            className={`colony3d-floating-tag tone-${activeAnomalyTag.tone}`}
            style={{
              left: `${floatingTag.x}px`,
              top: `${floatingTag.y}px`,
            }}
            data-testid="colony3d-floating-tag"
          >
            <strong>{activeAnomalyTag.title}</strong>
            <span>{activeAnomalyTag.subtitle}</span>
          </div>
        )}

        {webglSupported &&
          floatingTag &&
          floatingTag.kind === 'module' &&
          activeTagMeta &&
          activeTagStatus && (
            <div
              className={`colony3d-floating-tag tone-${activeTagStatus.tone}`}
              style={{
                left: `${floatingTag.x}px`,
                top: `${floatingTag.y}px`,
              }}
              data-testid="colony3d-floating-tag"
            >
              <strong>{activeTagMeta.label[lang]}</strong>
              <span>{activeTagStatus.text}</span>
            </div>
          )}

        {tacticalNotice && (
          <div
            className={`colony3d-tactical-toast tone-${tacticalNotice.tone}`}
            role="status"
            aria-live="polite"
            data-testid="colony3d-tactical-notice"
          >
            <div className="colony3d-tactical-copy">
              <strong>{tacticalNotice.badge}</strong>
              <span>{tacticalNotice.text}</span>
            </div>
            <div className="colony3d-toast-actions">
              {tacticalNotice.glossaryTermId && onInspectScienceTerm && (
                <button
                  type="button"
                  className="colony3d-toast-science-btn"
                  data-testid="colony3d-science-link-btn"
                  onClick={() => {
                    missionAudio.playClick();
                    onInspectScienceTerm(tacticalNotice.glossaryTermId!);
                  }}
                >
                  <ScienceIcon size={14} />
                  <span>{es ? 'Ficha NASA' : 'NASA file'}</span>
                </button>
              )}
              <button
                type="button"
                className="colony3d-toast-close"
                onClick={() => {
                  missionAudio.playClick();
                  setTacticalNotice(null);
                }}
                aria-label={es ? 'Cerrar aviso táctico' : 'Dismiss tactical notice'}
              >
                <CloseIcon size={14} />
              </button>
            </div>
          </div>
        )}

        {webglSupported && (
          <RoverControlsOverlay
            lang={lang}
            activeDirections={roverDirections}
            speedMps={roverSpeedMps}
            disabled={Boolean(options.isLowPowerBlackout || isPaused)}
            onDirectionChange={handleDpadDirectionChange}
          />
        )}

        {!webglSupported && renderSvgColonyFallback()}
      </div>

      <span className="sr-only" aria-live="polite">
        {focusedAnnouncement}
      </span>

      {/* Barra rápida de anomalías escaneables (accesible en mouse y teclado) */}
      <div
        className="colony-anomalies-bar"
        data-testid="colony-anomalies-bar"
        role="group"
        aria-label={es ? 'Expediciones del Rover' : 'Rover expeditions'}
      >
        <span className="colony-anomalies-label">
          <ScienceIcon size={14} />
          <span>{es ? 'Muestras del terreno:' : 'Surface samples:'}</span>
        </span>
        {turnAnomalies.map((anom) => {
          const scanned = scannedSet.has(anom.id);
          return (
            <button
              key={anom.id}
              type="button"
              id={`colony-anomaly-btn-${anom.kind}`}
              className={`viewer3d-btn colony-anomaly-btn ${scanned ? 'colony-anomaly-scanned' : ''}`.trim()}
              onClick={() => handleInspectAnomaly(anom.id)}
              aria-pressed={scanned}
            >
              {scanned ? <CheckIcon size={13} /> : <AlertIcon size={13} />}
              <span>{anom.title[lang]}</span>
              <span className="colony-anomaly-pts">{scanned ? 'OK' : '+3'}</span>
            </button>
          );
        })}
      </div>

      <div className="viewer3d-toolbar">
        <div className="viewer3d-controls-group">
          <button
            type="button"
            className="viewer3d-btn viewer3d-btn-icon"
            onClick={() => {
              missionAudio.playClick();
              stepOrbitCamera(0.24, 0, 1);
            }}
            aria-label={es ? 'Rotar cámara a la izquierda' : 'Orbit camera left'}
          >
            <ArrowIcon size={14} direction="left" />
          </button>
          <button
            type="button"
            className="viewer3d-btn viewer3d-btn-icon"
            onClick={() => {
              missionAudio.playClick();
              stepOrbitCamera(-0.24, 0, 1);
            }}
            aria-label={es ? 'Rotar cámara a la derecha' : 'Orbit camera right'}
          >
            <ArrowIcon size={14} direction="right" />
          </button>
          <button
            type="button"
            className="viewer3d-btn viewer3d-btn-icon"
            onClick={() => {
              missionAudio.playClick();
              stepOrbitCamera(0, 0, 0.85);
            }}
            aria-label={es ? 'Acercar vista 3D' : 'Zoom in 3D view'}
          >
            <span>+</span>
          </button>
          <button
            type="button"
            className="viewer3d-btn viewer3d-btn-icon"
            onClick={() => {
              missionAudio.playClick();
              stepOrbitCamera(0, 0, 1.18);
            }}
            aria-label={es ? 'Alejar vista 3D' : 'Zoom out 3D view'}
          >
            <span>-</span>
          </button>
          <button
            type="button"
            className="viewer3d-btn"
            onClick={handleCycleModuleButton}
            aria-label={es ? 'Cambiar al siguiente módulo (Tab)' : 'Switch to next module (Tab)'}
          >
            <span>{es ? 'Módulo (Tab)' : 'Module (Tab)'}</span>
          </button>
          <button
            type="button"
            className="viewer3d-btn"
            onClick={handleResetView}
            aria-label={es ? 'Centrar vista 3D' : 'Reset 3D view'}
          >
            <SlidersIcon size={14} />
            <span>{es ? 'Centrar vista' : 'Reset view'}</span>
          </button>
          <button
            type="button"
            className={`viewer3d-btn ${isPaused ? 'viewer3d-btn-active' : ''}`}
            aria-pressed={isPaused}
            onClick={() => {
              missionAudio.playClick();
              setIsPaused((prev) => !prev);
            }}
            aria-label={
              isPaused
                ? es
                  ? 'Reanudar simulación 3D'
                  : 'Resume 3D simulation'
                : es
                  ? 'Pausar simulación 3D'
                  : 'Pause 3D simulation'
            }
          >
            {isPaused ? <GlobeIcon size={14} /> : <CloseIcon size={13} />}
            <span>{isPaused ? (es ? 'Reanudar' : 'Resume') : es ? 'Pausar' : 'Pause'}</span>
          </button>
          {canRegenerateTerrain && (
            <button
              type="button"
              id="colony-new-terrain-btn"
              data-testid="colony-new-terrain-btn"
              className="viewer3d-btn"
              onClick={handleRegenerateTerrain}
              aria-label={
                es
                  ? 'Generar nueva topografía por semilla'
                  : 'Generate new procedural terrain seed'
              }
            >
              <GlobeIcon size={14} />
              <span>{es ? 'Nueva topografía' : 'New terrain'}</span>
            </button>
          )}
        </div>

        <span className="viewer3d-hint">
          {es
            ? 'WASD o Flechas conduce el Rover · Arrastra para orbitar · C cámara Rover · R centrar'
            : 'WASD or Arrows drives Rover · Drag to orbit · C Rover cam · R reset'}
        </span>
      </div>
    </div>
  );
};
