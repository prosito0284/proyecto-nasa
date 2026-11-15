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
  findSampleId,
  formatTerrainSeedBadge,
  generateTurnAnomalies,
  generateTurnSamples,
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
  SAMPLE_COLLECT_RADIUS,
  SAMPLE_MANUAL_RADIUS,
  sampleWorldTerrainHeight,
  softClampColonyTarget,
  type SurfaceSampleSpec,
  type WorldAnomalySpec,
} from './proceduralModels';
import { formatSampleBadge } from './sampleManager';
import {
  type ColonyCameraMode,
  EMPTY_ROVER_DIRECTIONS,
  mapKeyToRoverDirection,
  mergeRoverDirections,
  type NearbySamplePrompt,
  resolveDirectionsFromKeys,
  RoverControlsOverlay,
  type RoverDirectionKey,
  type RoverDirectionState,
} from './RoverControlsOverlay';
import '../../styles/viewer3d.css';

export type { ColonyCameraMode };
export type ColonyCameraModeInput = ColonyCameraMode | 'rover';

export function normalizeCameraMode(mode?: ColonyCameraModeInput): ColonyCameraMode {
  if (mode === 'rover' || mode === 'chase') return 'chase';
  if (mode === 'mastcam') return 'mastcam';
  return 'orbital';
}

export function getNextCameraMode(mode: ColonyCameraModeInput): ColonyCameraMode {
  const norm = normalizeCameraMode(mode);
  if (norm === 'orbital') return 'chase';
  if (norm === 'chase') return 'mastcam';
  return 'orbital';
}

export interface ColonyWorld3DProps {
  lang: Language;
  options: ColonyWorldStateOptions;
  selectedModule?: ColonyWorldModuleId | null;
  onSelectModule?: (moduleId: ColonyWorldModuleId) => void;
  /** R04: Modo de cámara 3D activo ('orbital' libre, 'chase' 3ra persona, 'mastcam' 1ra persona; acepta 'rover' por compatibilidad) */
  cameraMode?: ColonyCameraModeInput;
  onCameraModeChange?: (mode: ColonyCameraMode) => void;
  /** M03: Callbacks al escanear anomalías con el Rover o realizar mantenimiento en 3D */
  onScanAnomaly?: (anomaly: WorldAnomalySpec) => void | boolean;
  /** R05: Callback al recolectar muestras científicas 3D con el brazo del Rover */
  onCollectSample?: (sample: SurfaceSampleSpec) => void | boolean;
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

export function isEditableOrModalContext(target: EventTarget | null = null): boolean {
  const el = target as HTMLElement | null;
  if (el) {
    const tag = el.tagName?.toUpperCase?.();
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    if (
      el.closest?.(
        '[role="dialog"], .science-modal-backdrop, .modal-overlay, .modal-backdrop, .turn-report-card',
      )
    ) {
      return true;
    }
  }
  if (typeof document !== 'undefined' && typeof document.querySelector === 'function') {
    const activeModal = document.querySelector(
      '[role="dialog"], .science-modal-backdrop, .modal-overlay, .modal-backdrop, .turn-report-card',
    );
    if (activeModal) return true;
  }
  return false;
}

type FloatingTagState =
  | { kind: 'module'; moduleId: ColonyWorldModuleId; x: number; y: number }
  | { kind: 'anomaly'; anomalyId: string; x: number; y: number }
  | { kind: 'sample'; sampleId: string; x: number; y: number };

interface TacticalNotice {
  id: string;
  tone: 'ok' | 'warn' | 'info';
  title?: string;
  badge: string;
  text: string;
  glossaryTermId?: string;
  autoDismissMs?: number;
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
  cameraMode,
  onCameraModeChange,
  onScanAnomaly,
  onCollectSample,
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
  const [roverHeadingDeg, setRoverHeadingDeg] = useState(180);
  const lastReportedHeadingRef = useRef(180);
  const [telemetryHud, setTelemetryHud] = useState<{
    x: number;
    z: number;
    nearestSampleDistance: number | null;
  }>({ x: 11.4, z: 12.5, nearestSampleDistance: null });
  const lastTelemetryHudRef = useRef<{
    x: number;
    z: number;
    nearestSampleDistance: number | null;
  }>({ x: 11.4, z: 12.5, nearestSampleDistance: null });
  const autoScannedIdsRef = useRef<Set<string>>(new Set());
  const collectedLocalIdsRef = useRef<Set<string>>(new Set(options.collectedSampleIds ?? []));
  const [localCollectedIds, setLocalCollectedIds] = useState<string[]>(
    options.collectedSampleIds ?? [],
  );
  const [nearbySample, setNearbySample] = useState<NearbySamplePrompt | null>(null);
  const nearbySampleRef = useRef<NearbySamplePrompt | null>(null);

  const onSelectModuleRef = useRef(onSelectModule);
  onSelectModuleRef.current = onSelectModule;
  const onScanAnomalyRef = useRef(onScanAnomaly);
  onScanAnomalyRef.current = onScanAnomaly;
  const onCollectSampleRef = useRef(onCollectSample);
  onCollectSampleRef.current = onCollectSample;
  const onMaintainModuleRef = useRef(onMaintainModule);
  onMaintainModuleRef.current = onMaintainModule;
  const onCameraModeChangeRef = useRef(onCameraModeChange);
  onCameraModeChangeRef.current = onCameraModeChange;

  const isControlledCam = cameraMode !== undefined;
  const isControlledCamRef = useRef(isControlledCam);
  isControlledCamRef.current = isControlledCam;
  const [internalCameraMode, setInternalCameraMode] = useState<ColonyCameraMode>('orbital');
  const resolvedCameraMode: ColonyCameraMode = isControlledCam
    ? normalizeCameraMode(cameraMode)
    : internalCameraMode;

  const cameraModeRef = useRef<ColonyCameraMode>(resolvedCameraMode);
  cameraModeRef.current = resolvedCameraMode;

  const selectCameraMode = (nextMode: ColonyCameraMode) => {
    missionAudio.playClick();
    if (!isControlledCamRef.current) {
      setInternalCameraMode(nextMode);
    }
    onCameraModeChangeRef.current?.(nextMode);
    hostRef.current?.focus({ preventScroll: true });
  };
  const selectCameraModeRef = useRef(selectCameraMode);
  selectCameraModeRef.current = selectCameraMode;

  const [hoveredModule, setHoveredModule] = useState<ColonyWorldModuleId | null>(null);
  const hoveredRef = useRef<ColonyWorldModuleId | null>(null);
  hoveredRef.current = hoveredModule;

  const [hoveredAnomalyId, setHoveredAnomalyId] = useState<string | null>(null);
  const hoveredAnomalyRef = useRef<string | null>(null);
  hoveredAnomalyRef.current = hoveredAnomalyId;

  const [hoveredSampleId, setHoveredSampleId] = useState<string | null>(null);
  const hoveredSampleRef = useRef<string | null>(null);
  hoveredSampleRef.current = hoveredSampleId;

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
  const turnSamples = useMemo(
    () =>
      generateTurnSamples(siteId, effectiveSeed, options.currentDay ?? 1, {
        getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, siteId, effectiveSeed),
        avoidPositions: turnAnomalies.map((a) => ({
          x: a.position[0],
          z: a.position[2],
          minDist: 4.6,
        })),
      }),
    [siteId, effectiveSeed, options.currentDay, turnAnomalies],
  );
  const turnSamplesRef = useRef(turnSamples);
  turnSamplesRef.current = turnSamples;

  const collectedKey = (options.collectedSampleIds ?? []).join(',');
  const scannedSet = useMemo(
    () => new Set(options.scannedAnomalyIds ?? []),
    [options.scannedAnomalyIds],
  );
  const collectedSamplesSet = useMemo(() => {
    const merged = new Set(options.collectedSampleIds ?? []);
    for (const sid of localCollectedIds) merged.add(sid);
    return merged;
  }, [options.collectedSampleIds, localCollectedIds]);

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
      ? `Entorno 3D interactivo de la colonia en ${isMars ? 'Marte' : 'la Luna'}. Usa WASD o flechas para conducir el Rover, arrastrar para orbitar, C para rotar cámaras, Tab para módulos y R para centrar.`
      : `Interactive 3D colony environment on ${isMars ? 'Mars' : 'the Moon'}. Use WASD or arrow keys to drive the Rover, drag to orbit, C to cycle cameras, Tab for modules, and R to reset.`);

  const syncRoverDriveState = () => {
    if (
      latestOptionsRef.current.isLowPowerBlackout ||
      isPausedRef.current ||
      isEditableOrModalContext()
    ) {
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

  const clearAllInputs = () => {
    const hadAny =
      pressedKeysRef.current.size > 0 ||
      pointerDirectionsRef.current.forward ||
      pointerDirectionsRef.current.backward ||
      pointerDirectionsRef.current.left ||
      pointerDirectionsRef.current.right ||
      roverDirectionsRef.current.forward ||
      roverDirectionsRef.current.backward ||
      roverDirectionsRef.current.left ||
      roverDirectionsRef.current.right;
    pressedKeysRef.current.clear();
    pointerDirectionsRef.current = { ...EMPTY_ROVER_DIRECTIONS };
    if (hadAny) {
      syncRoverDriveStateRef.current();
    } else {
      worldRef.current?.setRoverControlInput(EMPTY_ROVER_DIRECTIONS);
    }
  };
  const clearAllInputsRef = useRef(clearAllInputs);
  clearAllInputsRef.current = clearAllInputs;

  useEffect(() => {
    clearAllInputsRef.current();
    worldRef.current?.stopRover();
  }, [options.currentDay]);

  const handleDpadDirectionChange = (direction: RoverDirectionKey, pressed: boolean) => {
    if (latestOptionsRef.current.isLowPowerBlackout || (pressed && isEditableOrModalContext())) {
      clearAllInputsRef.current();
      worldRef.current?.stopRover();
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

  const handleReturnToBase = () => {
    pressedKeysRef.current.clear();
    pointerDirectionsRef.current = { ...EMPTY_ROVER_DIRECTIONS };
    syncRoverDriveState();
    desiredPoseRef.current = null;
    if (latestOptionsRef.current.isLowPowerBlackout) {
      missionAudio.playAlert();
      setTacticalNotice({
        id: 'blackout-return-base',
        tone: 'warn',
        badge: es ? 'ROVER SIN ENERGÍA' : 'ROVER OFFLINE',
        text: es
          ? 'Batería bajo 15 %. Recarga energía antes de mover el rover.'
          : 'Power below 15%. Recharge battery before moving the rover.',
        autoDismissMs: 3500,
      });
      return;
    }
    if (isPausedRef.current) {
      setIsPaused(false);
    }
    missionAudio.playClick();
    const engaged = worldRef.current?.returnRoverToBase() ?? true;
    if (engaged) {
      setTacticalNotice({
        id: 'return-base-active',
        tone: 'info',
        badge: es ? 'RETORNO A BASE' : 'RETURN TO BASE',
        text: es
          ? 'Rover regresando junto al domo central de la colonia.'
          : 'Rover returning smoothly beside central colony dome.',
        autoDismissMs: 2800,
      });
    }
  };

  useEffect(() => {
    autoScannedIdsRef.current = new Set(options.scannedAnomalyIds ?? []);
  }, [siteId, effectiveSeed, options.currentDay, options.scannedAnomalyIds]);

  const prevMissionCtxRef = useRef<string>('');
  const prevCollectedPropKeyRef = useRef<string>(collectedKey);
  useEffect(() => {
    const ctxKey = `${siteId}:${effectiveSeed}:${options.currentDay ?? 1}`;
    const ctxChanged = prevMissionCtxRef.current !== ctxKey;
    const propChanged = prevCollectedPropKeyRef.current !== collectedKey;
    prevMissionCtxRef.current = ctxKey;
    prevCollectedPropKeyRef.current = collectedKey;

    if (ctxChanged || (propChanged && options.collectedSampleIds !== undefined)) {
      const nextList = options.collectedSampleIds ?? [];
      collectedLocalIdsRef.current = new Set(nextList);
      setLocalCollectedIds(nextList);
      if (ctxChanged || (nextList.length === 0 && nearbySampleRef.current !== null)) {
        nearbySampleRef.current = null;
        setNearbySample(null);
      }
    }
  }, [siteId, effectiveSeed, options.currentDay, collectedKey]);

  useEffect(() => {
    if (options.isLowPowerBlackout || isPaused) {
      pressedKeysRef.current.clear();
      pointerDirectionsRef.current = { ...EMPTY_ROVER_DIRECTIONS };
      syncRoverDriveStateRef.current();
    }
  }, [options.isLowPowerBlackout, isPaused]);

  useEffect(() => {
    if (!tacticalNotice?.autoDismissMs) return;
    const timer = window.setTimeout(() => {
      setTacticalNotice((prev) => (prev?.id === tacticalNotice.id ? null : prev));
    }, tacticalNotice.autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [tacticalNotice?.id, tacticalNotice?.autoDismissMs]);

  const notifySampleCollected = (sampleId: string) => {
    if (collectedLocalIdsRef.current.has(sampleId)) return;
    const curOpts = latestOptionsRef.current;
    if (curOpts.isLowPowerBlackout) return;
    const list = worldRef.current?.getSamples() ?? turnSamplesRef.current;
    const spec = list.find((s) => s.id === sampleId);
    if (!spec) return;

    collectedLocalIdsRef.current.add(sampleId);
    setLocalCollectedIds((prev) => (prev.includes(sampleId) ? prev : [...prev, sampleId]));
    if (nearbySampleRef.current?.id === sampleId) {
      nearbySampleRef.current = null;
      setNearbySample(null);
    }
    missionAudio.playSampleCollect();
    onCollectSampleRef.current?.(spec);
    setTacticalNotice({
      id: `sample-${spec.id}`,
      tone: 'ok',
      title: spec.title[lang],
      badge: formatSampleBadge(spec, lang),
      text: spec.finding[lang],
      glossaryTermId: spec.glossaryTermId,
      autoDismissMs: 4000,
    });
  };
  const notifySampleCollectedRef = useRef(notifySampleCollected);
  notifySampleCollectedRef.current = notifySampleCollected;

  const collectSampleById = (sampleId: string): boolean => {
    const curOpts = latestOptionsRef.current;
    if (curOpts.isLowPowerBlackout) {
      missionAudio.playAlert();
      setTacticalNotice({
        id: `blackout-smp-${sampleId}`,
        tone: 'warn',
        badge: es ? 'ROVER SIN ENERGÍA' : 'ROVER OFFLINE',
        text: es
          ? 'Batería bajo 15 %. Recarga energía antes de usar el brazo.'
          : 'Power below 15%. Recharge battery before deploying the arm.',
      });
      return false;
    }
    if (collectedLocalIdsRef.current.has(sampleId)) return false;
    if (worldRef.current) {
      const started = worldRef.current.collectSample(sampleId);
      if (!started) return false;
    }
    notifySampleCollected(sampleId);
    return true;
  };
  const collectSampleByIdRef = useRef(collectSampleById);
  collectSampleByIdRef.current = collectSampleById;

  useEffect(() => {
    if (!webglSupported) return;

    const haltAndClearInputs = () => {
      clearAllInputsRef.current();
      worldRef.current?.stopRover();
      if (lastReportedSpeedRef.current !== 0) {
        lastReportedSpeedRef.current = 0;
        setRoverSpeedMps(0);
      }
    };

    const handleWindowKeyDown = (ev: KeyboardEvent) => {
      if (isEditableOrModalContext(ev.target)) {
        haltAndClearInputs();
        return;
      }
      if (ev.ctrlKey || ev.metaKey || ev.altKey || ev.shiftKey) return;

      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
      const frameContainsFocus = Boolean(frameRef.current && activeEl && frameRef.current.contains(activeEl));
      const viewportActive = frameContainsFocus || cameraModeRef.current !== 'orbital';

      if (
        ev.key === ' ' &&
        !ev.repeat &&
        !ev.defaultPrevented &&
        viewportActive &&
        nearbySampleRef.current &&
        !latestOptionsRef.current.isLowPowerBlackout
      ) {
        const tag = (activeEl as HTMLElement | null)?.tagName?.toUpperCase?.();
        const isOtherControl = tag === 'BUTTON' || tag === 'A' || tag === 'SELECT';
        if (!isOtherControl || activeEl === hostRef.current) {
          ev.preventDefault();
          ev.stopPropagation();
          collectSampleByIdRef.current(nearbySampleRef.current.id);
          return;
        }
      }

      if ((ev.key === 'c' || ev.key === 'C') && !ev.repeat && !ev.defaultPrevented && viewportActive) {
        ev.preventDefault();
        selectCameraModeRef.current(getNextCameraMode(cameraModeRef.current));
        return;
      }

      const dir = mapKeyToRoverDirection(ev.key);
      if (!dir || !viewportActive) return;

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

    const handleWindowPointerUp = () => {
      if (
        pointerDirectionsRef.current.forward ||
        pointerDirectionsRef.current.backward ||
        pointerDirectionsRef.current.left ||
        pointerDirectionsRef.current.right
      ) {
        pointerDirectionsRef.current = { ...EMPTY_ROVER_DIRECTIONS };
        syncRoverDriveStateRef.current();
      }
    };

    const handleFocusIn = (ev: FocusEvent) => {
      if (isEditableOrModalContext(ev.target)) {
        haltAndClearInputs();
      }
    };

    const handleVisibilityChange = () => {
      if (
        typeof document !== 'undefined' &&
        (document.hidden || document.visibilityState === 'hidden')
      ) {
        haltAndClearInputs();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown, { passive: false });
    window.addEventListener('keyup', handleWindowKeyUp);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('mouseup', handleWindowPointerUp);
    window.addEventListener('blur', haltAndClearInputs);
    window.addEventListener('focusin', handleFocusIn);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
      window.removeEventListener('keyup', handleWindowKeyUp);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('mouseup', handleWindowPointerUp);
      window.removeEventListener('blur', haltAndClearInputs);
      window.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      haltAndClearInputs();
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
    collectedKey,
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

  const handleInspectSample = (sampleId: string) => {
    const curOpts = latestOptionsRef.current;
    const list = worldRef.current?.getSamples() ?? turnSamplesRef.current;
    const spec = list.find((s) => s.id === sampleId);
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

    const alreadyCollected =
      collectedLocalIdsRef.current.has(spec.id) ||
      Boolean(curOpts.collectedSampleIds?.includes(spec.id));
    if (alreadyCollected) {
      missionAudio.playClick();
      setTacticalNotice({
        id: `revisit-${spec.id}`,
        tone: 'info',
        badge: spec.title[lang],
        text: spec.finding[lang],
        glossaryTermId: spec.glossaryTermId,
      });
      return;
    }

    if (!worldRef.current) {
      collectSampleById(spec.id);
      return;
    }

    const tele = worldRef.current.getRoverTelemetry();
    const dist = Math.hypot(spec.position[0] - tele.x, spec.position[2] - tele.z);
    if (dist <= SAMPLE_MANUAL_RADIUS) {
      collectSampleById(spec.id);
      return;
    }

    worldRef.current.dispatchRoverToSample(spec.id);
    missionAudio.playClick();
    setTacticalNotice({
      id: `route-${spec.id}`,
      tone: 'info',
      badge: es ? 'ROVER EN RUTA' : 'ROVER EN ROUTE',
      text: es
        ? `Navegando hacia ${spec.title.es} (+${spec.points} ciencia).`
        : `Driving toward ${spec.title.en} (+${spec.points} science).`,
      glossaryTermId: spec.glossaryTermId,
    });
  };
  const handleInspectSampleRef = useRef(handleInspectSample);
  handleInspectSampleRef.current = handleInspectSample;

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
    if (cameraModeRef.current !== 'orbital') {
      selectCameraMode('orbital');
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
    if (cameraModeRef.current !== 'orbital') {
      selectCameraMode('orbital');
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
    if (!webglSupported || cameraModeRef.current !== 'orbital') return;
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
      if (!e.repeat) {
        e.preventDefault();
        e.stopPropagation();
        selectCameraMode(getNextCameraMode(cameraModeRef.current));
      }
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
      if (nearbySampleRef.current && !latestOptionsRef.current.isLowPowerBlackout) {
        e.stopPropagation();
        collectSampleById(nearbySampleRef.current.id);
        return;
      }
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
    const viewHeight = Math.max(200, host.clientHeight || height);
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
    const mastGoalPos = new THREE.Vector3();
    const mastGoalTarget = new THREE.Vector3();
    const mastGoalUp = new THREE.Vector3(0, 1, 0);
    const worldUpVec = new THREE.Vector3(0, 1, 0);
    let prevCamMode: ColonyCameraMode = cameraModeRef.current;
    let mastSettleElapsed = prevCamMode === 'mastcam' ? 1 : 0;

    if (prevCamMode === 'chase') {
      world.setFirstPersonMastcam(false);
      world.getRoverPose(roverPosVec, roverFwdVec);
      controls.enabled = false;
      controls.target.copy(roverPosVec).addScaledVector(roverFwdVec, 3.6);
      controls.target.y = roverPosVec.y + 1.35;
      camera.position.copy(roverPosVec).addScaledVector(roverFwdVec, -7.2);
      camera.position.y = roverPosVec.y + 3.8;
      camera.lookAt(controls.target);
    } else if (prevCamMode === 'mastcam') {
      world.setFirstPersonMastcam(true);
      world.getMastcamPose(mastGoalPos, mastGoalTarget, mastGoalUp);
      controls.enabled = false;
      camera.fov = 62;
      camera.updateProjectionMatrix();
      camera.position.copy(mastGoalPos);
      controls.target.copy(mastGoalTarget);
      camera.up.copy(mastGoalUp);
      camera.lookAt(controls.target);
    } else {
      world.setFirstPersonMastcam(false);
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
      | { kind: 'sample'; id: string }
      | { kind: 'anomaly'; id: string }
      | { kind: 'module'; id: ColonyWorldModuleId }
      | null;

    const pickAtClient = (clientX: number, clientY: number): PickResult => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const targets = [...world.samplePickables, ...world.anomalyPickables, ...world.pickables];
      const hits = raycaster.intersectObjects(targets, true);
      for (const hit of hits) {
        const sampleId = findSampleId(hit.object);
        if (sampleId) return { kind: 'sample', id: sampleId };
        const anomId = findAnomalyId(hit.object);
        if (anomId) return { kind: 'anomaly', id: anomId };
        const modId = findColonyModuleId(hit.object);
        if (modId) return { kind: 'module', id: modId };
      }
      return null;
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (isDragging && Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) {
        renderer.domElement.style.cursor = cameraModeRef.current === 'orbital' ? 'grabbing' : 'default';
        return;
      }
      const hit = pickAtClient(ev.clientX, ev.clientY);
      renderer.domElement.style.cursor = hit
        ? 'pointer'
        : cameraModeRef.current !== 'orbital'
          ? 'default'
          : 'grab';

      const nextSample = hit?.kind === 'sample' ? hit.id : null;
      const nextAnom = hit?.kind === 'anomaly' ? hit.id : null;
      const nextMod = hit?.kind === 'module' ? hit.id : null;

      if (nextSample !== hoveredSampleRef.current) {
        setHoveredSampleId(nextSample);
        world.setHoveredSample(nextSample);
      }
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
        : cameraModeRef.current !== 'orbital'
          ? 'default'
          : 'grab';
      if (moved > 6 || !hit) return;

      if (hit.kind === 'sample') {
        handleInspectSampleRef.current(hit.id);
        return;
      }
      if (hit.kind === 'anomaly') {
        handleInspectAnomalyRef.current(hit.id);
        return;
      }
      activateModuleInteractionRef.current(hit.id, true);
    };

    const handlePointerLeave = () => {
      isDragging = false;
      renderer.domElement.style.cursor = cameraModeRef.current !== 'orbital' ? 'default' : 'grab';
      if (hoveredRef.current !== null) {
        setHoveredModule(null);
        world.setHovered(keyboardRef.current);
      }
      if (hoveredAnomalyRef.current !== null) {
        setHoveredAnomalyId(null);
        world.setHoveredAnomaly(null);
      }
      if (hoveredSampleRef.current !== null) {
        setHoveredSampleId(null);
        world.setHoveredSample(null);
      }
    };

    renderer.domElement.style.cursor = cameraModeRef.current !== 'orbital' ? 'default' : 'grab';
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);

    const resizeRenderer = () => {
      if (!hostRef.current) return;
      const nextW = Math.max(240, hostRef.current.clientWidth);
      const nextH = Math.max(200, hostRef.current.clientHeight || height);
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

    const initTele = world.getRoverTelemetry();
    const initHud = {
      x: Math.round(initTele.x * 10) / 10,
      z: Math.round(initTele.z * 10) / 10,
      nearestSampleDistance:
        initTele.nearestSampleId &&
        !initTele.nearestSampleCollected &&
        !collectedLocalIdsRef.current.has(initTele.nearestSampleId) &&
        Number.isFinite(initTele.nearestSampleDistance)
          ? Math.round(initTele.nearestSampleDistance * 10) / 10
          : null,
    };
    lastTelemetryHudRef.current = initHud;
    setTelemetryHud(initHud);

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const docHidden =
        typeof document !== 'undefined' &&
        (document.hidden || document.visibilityState === 'hidden');
      const modalBlocked =
        docHidden ||
        isEditableOrModalContext(
          typeof document !== 'undefined' ? document.activeElement : null,
        );

      if (modalBlocked) {
        clearAllInputsRef.current();
        world.stopRover();
      }

      const curTele = world.getRoverTelemetry();
      const activeDrive =
        !modalBlocked &&
        (roverDirectionsRef.current.forward ||
          roverDirectionsRef.current.backward ||
          roverDirectionsRef.current.left ||
          roverDirectionsRef.current.right ||
          curTele.isMoving);

      if (!isPausedRef.current && !modalBlocked && (!reducedMotion || activeDrive)) {
        elapsed += dt;
        world.animate(elapsed, dt);
      }

      const nextTele = world.getRoverTelemetry();
      const roundedSpeed = Math.round(Math.abs(nextTele.linearVelocity) * 10) / 10;
      if (Math.abs(roundedSpeed - lastReportedSpeedRef.current) >= 0.1) {
        lastReportedSpeedRef.current = roundedSpeed;
        setRoverSpeedMps(roundedSpeed);
      }
      const compassDeg =
        ((Math.round(90 - (nextTele.heading * 180) / Math.PI) % 360) + 360) % 360;
      if (Math.abs(compassDeg - lastReportedHeadingRef.current) >= 2) {
        lastReportedHeadingRef.current = compassDeg;
        setRoverHeadingDeg(compassDeg);
      }

      const roundedX = Math.round(nextTele.x * 10) / 10;
      const roundedZ = Math.round(nextTele.z * 10) / 10;
      const rawNearest =
        nextTele.nearestSampleId &&
        !nextTele.nearestSampleCollected &&
        !collectedLocalIdsRef.current.has(nextTele.nearestSampleId) &&
        Number.isFinite(nextTele.nearestSampleDistance)
          ? Math.round(nextTele.nearestSampleDistance * 10) / 10
          : null;
      const prevHud = lastTelemetryHudRef.current;
      if (
        prevHud.x !== roundedX ||
        prevHud.z !== roundedZ ||
        prevHud.nearestSampleDistance !== rawNearest
      ) {
        const nextHud = {
          x: roundedX,
          z: roundedZ,
          nearestSampleDistance: rawNearest,
        };
        lastTelemetryHudRef.current = nextHud;
        setTelemetryHud(nextHud);
      }

      if (nextTele.collectingSampleId && !latestOptionsRef.current.isLowPowerBlackout) {
        notifySampleCollectedRef.current(nextTele.collectingSampleId);
      }

      if (
        activeDrive &&
        !latestOptionsRef.current.isLowPowerBlackout &&
        nextTele.nearestSampleId &&
        !nextTele.nearestSampleCollected &&
        nextTele.nearestSampleDistance < SAMPLE_COLLECT_RADIUS
      ) {
        collectSampleByIdRef.current(nextTele.nearestSampleId);
      }

      if (
        !latestOptionsRef.current.isLowPowerBlackout &&
        nextTele.nearestSampleId &&
        !nextTele.nearestSampleCollected &&
        !collectedLocalIdsRef.current.has(nextTele.nearestSampleId) &&
        nextTele.nearestSampleDistance <= SAMPLE_MANUAL_RADIUS
      ) {
        if (nearbySampleRef.current?.id !== nextTele.nearestSampleId) {
          const smp = turnSamplesRef.current.find((s) => s.id === nextTele.nearestSampleId);
          if (smp) {
            const nextPrompt: NearbySamplePrompt = {
              id: smp.id,
              code: smp.code,
              label: smp.title[lang],
              points: smp.points,
              distance: nextTele.nearestSampleDistance,
            };
            nearbySampleRef.current = nextPrompt;
            setNearbySample(nextPrompt);
          }
        }
      } else if (nearbySampleRef.current !== null) {
        nearbySampleRef.current = null;
        setNearbySample(null);
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
        const wasOrbital = prevCamMode === 'orbital';
        prevCamMode = activeCamMode;
        if (activeCamMode === 'orbital') {
          world.setFirstPersonMastcam(false);
          controls.enabled = true;
          desiredPoseRef.current = COLONY_DEFAULT_POSE;
        } else {
          controls.enabled = false;
          desiredPoseRef.current = null;
          world.setFirstPersonMastcam(activeCamMode === 'mastcam');
          if (activeCamMode === 'mastcam') {
            world.getRoverPose(roverPosVec, roverFwdVec);
            mastSettleElapsed =
              wasOrbital || camera.position.distanceTo(roverPosVec) > 3.5 ? 0 : 0.35;
          }
        }
      }

      const targetFov = activeCamMode === 'mastcam' ? 62 : 50;
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        const fovBlend = reducedMotion ? 1 : Math.min(1, Math.max(0.1, dt * 8));
        camera.fov += (targetFov - camera.fov) * fovBlend;
        if (Math.abs(camera.fov - targetFov) <= 0.05) {
          camera.fov = targetFov;
        }
        camera.updateProjectionMatrix();
      }

      if (activeCamMode === 'chase') {
        world.getRoverPose(roverPosVec, roverFwdVec);
        chaseGoalCam.copy(roverPosVec).addScaledVector(roverFwdVec, -7.2);
        chaseGoalCam.y = roverPosVec.y + 3.8;
        const camGround = sampleWorldTerrainHeight(
          chaseGoalCam.x,
          chaseGoalCam.z,
          siteId,
          effectiveSeed,
        );
        if (chaseGoalCam.y < camGround + 1.25) {
          chaseGoalCam.y = camGround + 1.25;
        }
        chaseGoalTarget.copy(roverPosVec).addScaledVector(roverFwdVec, 3.6);
        chaseGoalTarget.y = roverPosVec.y + 1.35;

        const blend = reducedMotion ? 1 : Math.min(1, Math.max(0.08, dt * 6.5));
        camera.up.lerp(worldUpVec, reducedMotion ? 1 : Math.min(1, dt * 8)).normalize();
        camera.position.lerp(chaseGoalCam, blend);
        controls.target.lerp(chaseGoalTarget, blend);
        camera.lookAt(controls.target);
      } else if (activeCamMode === 'mastcam') {
        world.getMastcamPose(mastGoalPos, mastGoalTarget, mastGoalUp);
        mastSettleElapsed = Math.min(1, mastSettleElapsed + dt * 2.2);
        const mastDist = camera.position.distanceTo(mastGoalPos);
        const blend =
          reducedMotion || (mastSettleElapsed >= 0.98 && mastDist < 0.14)
            ? 1
            : Math.min(1, Math.max(0.14, dt * (8.5 + mastSettleElapsed * 10)));
        camera.up.lerp(mastGoalUp, blend).normalize();
        camera.position.lerp(mastGoalPos, blend);
        controls.target.lerp(mastGoalTarget, blend);
        camera.lookAt(controls.target);
      } else {
        if (camera.up.distanceTo(worldUpVec) > 0.002) {
          camera.up.lerp(worldUpVec, reducedMotion ? 1 : Math.min(1, dt * 8)).normalize();
        }
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

      // Etiqueta táctica flotante proyectada sobre muestra, anomalía o módulo activo
      const activeSample = hoveredSampleRef.current;
      const activeAnom = hoveredAnomalyRef.current;
      const taggedMod = hoveredRef.current ?? keyboardRef.current;
      if (activeSample && world.getSampleAnchor(activeSample, anchorVec)) {
        anchorVec.project(camera);
        if (anchorVec.z > -1 && anchorVec.z < 1) {
          const cw = host.clientWidth || width;
          const ch = host.clientHeight || height;
          const px = Math.max(115, Math.min(cw - 115, (anchorVec.x * 0.5 + 0.5) * cw));
          const py = Math.max(54, Math.min(ch - 32, (-anchorVec.y * 0.5 + 0.5) * ch));
          const key = `smp:${activeSample}:${Math.round(px)}:${Math.round(py)}`;
          if (key !== lastTagKey) {
            lastTagKey = key;
            setFloatingTag({ kind: 'sample', sampleId: activeSample, x: px, y: py });
          }
        }
      } else if (activeAnom && world.getAnomalyAnchor(activeAnom, anchorVec)) {
        anchorVec.project(camera);
        if (anchorVec.z > -1 && anchorVec.z < 1) {
          const cw = host.clientWidth || width;
          const ch = host.clientHeight || height;
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
          const ch = host.clientHeight || height;
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

  const activeSampleTag = (() => {
    if (!hoveredSampleId) return null;
    const spec = turnSamples.find((s) => s.id === hoveredSampleId);
    if (!spec) return null;
    const isCollected = collectedSamplesSet.has(spec.id);
    return {
      title: spec.title[lang],
      subtitle: isCollected
        ? es
          ? `Muestra guardada (+${spec.points} pts)`
          : `Sample stored (+${spec.points} pts)`
        : es
          ? `Clic o acercar Rover (+${spec.points} ciencia)`
          : `Click or drive near (+${spec.points} science)`,
      tone: isCollected ? 'ok' : 'warn',
    };
  })();

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
            transform: `scale(${resolvedCameraMode !== 'orbital' ? Math.max(svgZoom, 1.15) : svgZoom}) rotate(${svgRotDeg}deg)`,
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
                    {resolvedCameraMode !== 'orbital' && (
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

          {turnSamples.map((smp) => {
            const sx = Math.max(20, Math.min(340, Math.round(185 + smp.position[0] * 7.6)));
            const sy = Math.max(72, Math.min(174, Math.round(112 + smp.position[2] * 3.0)));
            const collected = collectedSamplesSet.has(smp.id);
            const sampleHex = collected ? '#2E7D4F' : smp.accentHex === 0x00e5ff ? '#00E5FF' : '#FFB300';
            return (
              <g
                key={smp.id}
                transform={`translate(${sx}, ${sy})`}
                role="button"
                tabIndex={0}
                data-testid={`svg-sample-${smp.id}`}
                aria-label={`${smp.title[lang]}${
                  collected
                    ? es
                      ? ' (recolectada)'
                      : ' (collected)'
                    : es
                      ? ` (+${smp.points} pts)`
                      : ` (+${smp.points} pts)`
                }`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleInspectSample(smp.id)}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter' || ev.key === ' ') {
                    ev.preventDefault();
                    ev.stopPropagation();
                    handleInspectSample(smp.id);
                  }
                }}
              >
                <circle
                  cx="0"
                  cy="0"
                  r="8.5"
                  fill="none"
                  stroke={sampleHex}
                  strokeWidth="1.2"
                  strokeDasharray="3 2"
                />
                <polygon
                  points="0,-6 5.5,4.5 -5.5,4.5"
                  fill={sampleHex}
                  stroke="#0F172A"
                  strokeWidth="0.9"
                />
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
  const collectedSampleCount = turnSamples.filter((s) => collectedSamplesSet.has(s.id)).length;

  return (
    <div
      ref={frameRef}
      className={`viewer3d-frame ${isMars ? 'viewer3d-mars' : 'viewer3d-lunar'} ${className ?? ''}`.trim()}
      data-testid="colony-world-3d"
    >
      <div className="viewer3d-stage-wrap">
        <div
          className="viewer3d-canvas-shell"
          style={{ '--viewer-h': `${height}px` } as React.CSSProperties}
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
              <span className="viewer3d-badge" data-testid="colony-cam-mode-badge">
                <GlobeIcon size={13} />
                <span>
                  {webglSupported
                    ? resolvedCameraMode === 'mastcam'
                      ? es
                        ? '3D // CABINA MASTCAM'
                        : '3D // MASTCAM VIEW'
                      : resolvedCameraMode === 'chase'
                        ? es
                          ? '3D // SEGUIMIENTO'
                          : '3D // CHASE CAM'
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

            {webglSupported && resolvedCameraMode === 'mastcam' && (
              <div
                className="mastcam-reticle-overlay"
                data-testid="mastcam-reticle-overlay"
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 140 140"
                  className="mastcam-reticle-svg"
                  focusable="false"
                >
                  <polyline points="16,38 16,16 38,16" fill="none" stroke="#00E5FF" strokeWidth="1.75" />
                  <polyline points="102,16 124,16 124,38" fill="none" stroke="#00E5FF" strokeWidth="1.75" />
                  <polyline points="16,102 16,124 38,124" fill="none" stroke="#00E5FF" strokeWidth="1.75" />
                  <polyline points="102,124 124,124 124,102" fill="none" stroke="#00E5FF" strokeWidth="1.75" />
                  <circle cx="70" cy="70" r="26" fill="none" stroke="#F8F3E8" strokeWidth="1.15" strokeDasharray="4 4" />
                  <polygon points="70,56 84,70 70,84 56,70" fill="none" stroke="#00E5FF" strokeWidth="1.4" />
                  <line x1="28" y1="70" x2="52" y2="70" stroke="#00E5FF" strokeWidth="1.4" />
                  <line x1="88" y1="70" x2="112" y2="70" stroke="#00E5FF" strokeWidth="1.4" />
                  <line x1="70" y1="28" x2="70" y2="52" stroke="#00E5FF" strokeWidth="1.4" />
                  <line x1="70" y1="88" x2="70" y2="112" stroke="#00E5FF" strokeWidth="1.4" />
                  <circle cx="70" cy="70" r="2.2" fill="#FFB300" />
                </svg>
                <span className="mastcam-reticle-readout">
                  {`MASTCAM // HDG ${String(roverHeadingDeg).padStart(3, '0')}°`}
                </span>
              </div>
            )}

            {webglSupported && floatingTag && floatingTag.kind === 'sample' && activeSampleTag && (
              <div
                className={`colony3d-floating-tag tone-${activeSampleTag.tone}`}
                style={{
                  left: `${floatingTag.x}px`,
                  top: `${floatingTag.y}px`,
                }}
                data-testid="colony3d-floating-tag"
              >
                <strong>{activeSampleTag.title}</strong>
                <span>{activeSampleTag.subtitle}</span>
              </div>
            )}

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

            {!webglSupported && renderSvgColonyFallback()}
          </div>

          {webglSupported && (
            <RoverControlsOverlay
              lang={lang}
              activeDirections={roverDirections}
              speedMps={roverSpeedMps}
              disabled={Boolean(options.isLowPowerBlackout || isPaused)}
              cameraMode={resolvedCameraMode}
              onCameraModeChange={selectCameraMode}
              nearbySample={nearbySample}
              onCollectSample={(id) => collectSampleById(id)}
              onReturnToBase={handleReturnToBase}
              telemetry={{
                sciencePoints:
                  options.sciencePoints ??
                  turnSamples.reduce(
                    (sum, smp) => (collectedSamplesSet.has(smp.id) ? sum + smp.points : sum),
                    0,
                  ),
                collectedCount: collectedSampleCount,
                totalSamples: turnSamples.length,
                x: telemetryHud.x,
                z: telemetryHud.z,
                nearestSampleDistance: telemetryHud.nearestSampleDistance,
              }}
              onDirectionChange={handleDpadDirectionChange}
            />
          )}
        </div>

        {tacticalNotice && (
          <div
            className={`colony3d-tactical-toast tone-${tacticalNotice.tone}`}
            role="status"
            aria-live="polite"
            data-testid="colony3d-tactical-notice"
          >
            <div className="colony3d-tactical-copy">
              <div className="colony3d-tactical-head">
                {tacticalNotice.title && (
                  <span className="colony3d-tactical-title">{tacticalNotice.title}</span>
                )}
                <strong className="colony3d-tactical-badge">{tacticalNotice.badge}</strong>
              </div>
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
      </div>

      <span className="sr-only" aria-live="polite">
        {focusedAnnouncement}
      </span>

      {/* R05: Muestras científicas 3D del día/sol recolectables con el Rover */}
      <div
        className="colony-samples-bar"
        data-testid="colony-samples-bar"
        role="group"
        aria-label={es ? 'Muestras científicas recolectables' : 'Collectible science samples'}
      >
        <span className="colony-samples-label">
          <ScienceIcon size={14} />
          <span>{es ? 'Muestras del terreno:' : 'Surface samples:'}</span>
          <span className="colony-samples-counter" data-testid="colony-samples-counter">
            {`${collectedSampleCount}/${turnSamples.length}`}
          </span>
        </span>
        {turnSamples.map((smp) => {
          const collected = collectedSamplesSet.has(smp.id);
          return (
            <button
              key={smp.id}
              type="button"
              data-testid={`colony-sample-btn-${smp.id}`}
              className={`viewer3d-btn colony-sample-btn ${collected ? 'colony-sample-collected' : ''}`.trim()}
              onClick={() => handleInspectSample(smp.id)}
              aria-pressed={collected}
            >
              {collected ? <CheckIcon size={13} /> : <ScienceIcon size={13} />}
              <span>{smp.title[lang]}</span>
              <span className="colony-sample-pts">{collected ? 'OK' : `+${smp.points}`}</span>
            </button>
          );
        })}
      </div>

      {/* Barra rápida de anomalías escaneables (accesible en mouse y teclado) */}
      <div
        className="colony-anomalies-bar"
        data-testid="colony-anomalies-bar"
        role="group"
        aria-label={es ? 'Expediciones del Rover' : 'Rover expeditions'}
      >
        <span className="colony-anomalies-label">
          <AlertIcon size={14} />
          <span>{es ? 'Sensores rápidos:' : 'Quick sensors:'}</span>
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
            ? 'WASD o Flechas conduce el Rover · Arrastra para orbitar · C rotar cámara · R centrar'
            : 'WASD or Arrows drives Rover · Drag to orbit · C cycle cam · R reset'}
        </span>
      </div>
    </div>
  );
};
