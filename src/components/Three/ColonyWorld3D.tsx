import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Language } from '../../types/mission';
import { missionAudio } from '../../utils/sound';
import { ArrowIcon, CloseIcon, GlobeIcon, SlidersIcon } from '../icons';
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
  computeColonyFocusPose,
  createSeededPrng,
  DEFAULT_TERRAIN_SEED,
  disposeObject3D,
  findColonyModuleId,
  formatTerrainSeedBadge,
  getColonyModuleStatus,
  getWorldAtmosphere,
  isStormShieldDeployed,
  normalizeTerrainSeed,
  resolveColonyModuleGlbUrl,
  sampleWorldTerrainHeight,
  softClampColonyTarget,
} from './proceduralModels';
import '../../styles/viewer3d.css';

export interface ColonyWorld3DProps {
  lang: Language;
  options: ColonyWorldStateOptions;
  selectedModule?: ColonyWorldModuleId | null;
  onSelectModule?: (moduleId: ColonyWorldModuleId) => void;
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

interface FloatingTagState {
  moduleId: ColonyWorldModuleId;
  x: number;
  y: number;
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

  const hostRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const worldRef = useRef<ColonyWorldHandle | null>(null);
  const desiredPoseRef = useRef<ColonyCameraPose | null>(null);

  const onSelectModuleRef = useRef(onSelectModule);
  onSelectModuleRef.current = onSelectModule;

  const [hoveredModule, setHoveredModule] = useState<ColonyWorldModuleId | null>(null);
  const hoveredRef = useRef<ColonyWorldModuleId | null>(null);
  hoveredRef.current = hoveredModule;

  const [keyboardModule, setKeyboardModule] = useState<ColonyWorldModuleId | null>(null);
  const keyboardRef = useRef<ColonyWorldModuleId | null>(null);
  keyboardRef.current = keyboardModule;

  const [floatingTag, setFloatingTag] = useState<FloatingTagState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const [svgZoom, setSvgZoom] = useState(1);
  const [svgRotDeg, setSvgRotDeg] = useState(0);

  const webglSupported = useMemo(
    () => !forceFallback && isWebGLAvailable(),
    [forceFallback],
  );

  const titleLabel =
    ariaLabel ??
    (es
      ? `Entorno 3D interactivo de la colonia en ${isMars ? 'Marte' : 'la Luna'}. Usa flechas para orbitar, + o - para acercar, Tab para recorrer los módulos y R para centrar.`
      : `Interactive 3D colony environment on ${isMars ? 'Mars' : 'the Moon'}. Use arrow keys to orbit, + or - to zoom, Tab to step through modules, and R to reset.`);

  const handleRegenerateTerrain = () => {
    missionAudio.playClick();
    if (onRegenerateTerrain) {
      onRegenerateTerrain();
    } else {
      setLocalSeedBump((prev) => prev + 7919);
    }
  };

  const optionsKeyDeps = [
    siteId,
    effectiveSeed,
    options.powerPercent,
    options.lifeSupportPercent,
    options.shieldingPercent,
    options.foodPercent,
    options.solarAllocPercent,
    options.shieldingAllocPercent,
    options.weatherType,
    options.isDustStorm,
    options.isSolarStorm,
    options.isRimShadowPass,
    options.isLowPowerBlackout,
    options.isGreenhouseWilted,
    options.isEnvironmentalAlert,
    options.commsActive,
    options.commDelaySeconds,
  ];

  const getCurrentOffset = (): { x: number; y: number; z: number } | undefined => {
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return undefined;
    const off = cam.position.clone().sub(ctrl.target);
    return { x: off.x, y: off.y, z: off.z };
  };

  const focusAndHighlightModule = (modId: ColonyWorldModuleId, triggerSelect: boolean) => {
    setKeyboardModule(modId);
    worldRef.current?.setHovered(modId);
    if (webglSupported && worldRef.current) {
      const anchor = new THREE.Vector3();
      worldRef.current.getModuleAnchor(modId, anchor);
      desiredPoseRef.current = computeColonyFocusPose(modId, getCurrentOffset(), {
        x: anchor.x,
        z: anchor.z,
      });
    }
    if (triggerSelect) {
      worldRef.current?.pulse(modId);
      onSelectModuleRef.current?.(modId);
    }
  };

  const handleResetView = () => {
    missionAudio.playClick();
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
    if (!webglSupported) return;
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
        missionAudio.playClick();
        focusAndHighlightModule(targetMod, true);
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
      const targetMod = keyboardModule;
      if (targetMod) {
        missionAudio.playClick();
        focusAndHighlightModule(targetMod, true);
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
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

    // Raycaster para hover (cursor: pointer + cian + etiqueta) y clic sin arrastre
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let isDragging = false;

    const pickAtClient = (clientX: number, clientY: number): ColonyWorldModuleId | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);
      const hits = raycaster.intersectObjects(world.pickables, true);
      for (const hit of hits) {
        const id = findColonyModuleId(hit.object);
        if (id) return id;
      }
      return null;
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (isDragging && Math.hypot(ev.clientX - downX, ev.clientY - downY) > 6) {
        renderer.domElement.style.cursor = 'grabbing';
        return;
      }
      const modId = pickAtClient(ev.clientX, ev.clientY);
      renderer.domElement.style.cursor = modId ? 'pointer' : 'grab';
      if (modId !== hoveredRef.current) {
        setHoveredModule(modId);
        world.setHovered(modId ?? keyboardRef.current);
      }
    };

    const handlePointerDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
      isDragging = true;
      desiredPoseRef.current = null;
    };

    const handlePointerUp = (ev: PointerEvent) => {
      const moved = Math.hypot(ev.clientX - downX, ev.clientY - downY);
      isDragging = false;
      const modId = pickAtClient(ev.clientX, ev.clientY);
      renderer.domElement.style.cursor = modId ? 'pointer' : 'grab';
      if (moved > 6 || !modId) return;

      missionAudio.playClick();
      const anchor = new THREE.Vector3();
      world.getModuleAnchor(modId, anchor);
      desiredPoseRef.current = computeColonyFocusPose(modId, getCurrentOffset(), {
        x: anchor.x,
        z: anchor.z,
      });
      world.pulse(modId);
      setKeyboardModule(modId);
      onSelectModuleRef.current?.(modId);
    };

    const handlePointerLeave = () => {
      isDragging = false;
      renderer.domElement.style.cursor = 'grab';
      if (hoveredRef.current !== null) {
        setHoveredModule(null);
        world.setHovered(keyboardRef.current);
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

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (!isPausedRef.current && !reducedMotion) {
        elapsed += dt;
        world.animate(elapsed, dt);
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

      // Límites invisibles con amortiguación suave dentro de [-22, 22] y sobre el suelo
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

      renderer.render(scene, camera);

      // Etiqueta táctica flotante proyectada sobre el módulo con cursor o foco por teclado
      const taggedMod = hoveredRef.current ?? keyboardRef.current;
      if (taggedMod) {
        world.getModuleAnchor(taggedMod, anchorVec);
        anchorVec.project(camera);
        if (anchorVec.z > -1 && anchorVec.z < 1) {
          const cw = host.clientWidth || width;
          const ch = height;
          const px = Math.max(115, Math.min(cw - 115, (anchorVec.x * 0.5 + 0.5) * cw));
          const py = Math.max(54, Math.min(ch - 32, (-anchorVec.y * 0.5 + 0.5) * ch));
          const key = `${taggedMod}:${Math.round(px)}:${Math.round(py)}`;
          if (key !== lastTagKey) {
            lastTagKey = key;
            setFloatingTag({ moduleId: taggedMod, x: px, y: py });
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
            transform: `scale(${svgZoom}) rotate(${svgRotDeg}deg)`,
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
          <path
            d={`M0,76 L55,${ridgeY1} L130,74 L195,${ridgeY2} L285,${ridgeY3} L360,76 L360,190 L0,190 Z`}
            fill={horizonBg}
          />
          <ellipse cx={craterX1} cy="96" rx="16" ry="5" fill="none" stroke={inkSecondary} strokeWidth="0.9" opacity="0.55" />
          <ellipse cx={craterX2} cy="92" rx="14" ry="4.5" fill="none" stroke={inkSecondary} strokeWidth="0.9" opacity="0.55" />

          {COLONY_WORLD_MODULE_IDS.map((modId) => {
            const c = SVG_MODULE_COORDS[modId];
            const active = selectedModule === modId || keyboardModule === modId;
            return (
              <g
                key={modId}
                transform={`translate(${c.x}, ${c.y})`}
                role="button"
                tabIndex={0}
                aria-label={COLONY_WORLD_MODULES[modId].label[lang]}
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
                  stroke={active ? '#38BDF8' : inkSecondary}
                  strokeWidth={active ? 2 : 1}
                  strokeDasharray={active ? undefined : '4 3'}
                />
                {modId === 'power-grid' && (
                  <rect x="-18" y="-12" width="36" height="24" fill="#1E3A8A" stroke={inkPrimary} strokeWidth="1.5" />
                )}
                {modId === 'oxygen-module' && (
                  <>
                    <path d="M-20,6 A20,18 0 0,1 20,6 Z" fill="#E8E2D5" stroke={inkPrimary} strokeWidth="1.5" />
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
                  <rect x="-18" y="-10" width="36" height="20" fill="#14532D" stroke="#2E7D4F" strokeWidth="1.5" />
                )}
                {modId === 'comms-array' && (
                  <>
                    <line x1="0" y1="12" x2="0" y2="-10" stroke={inkPrimary} strokeWidth="2" />
                    <path d="M-12,-10 Q0,-22 12,-10" fill="none" stroke="#38BDF8" strokeWidth="2" />
                  </>
                )}
                {modId === 'rover-moxie' && (
                  <>
                    <rect x="-14" y="-8" width="28" height="14" fill="#F2EBDD" stroke="#FFB300" strokeWidth="1.5" />
                    <rect x="-6" y="-5" width="12" height="8" fill="#FFB300" />
                  </>
                )}
              </g>
            );
          })}

          <text
            x="180"
            y="182"
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

  return (
    <div
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
                ? isMars
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
          <span className="viewer3d-badge viewer3d-seed-badge" data-testid="colony-seed-badge">
            {`SEED #${seedBadgeCode}`}
          </span>
        </div>

        {webglSupported && activeTagMeta && activeTagStatus && floatingTag && (
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

      <span className="sr-only" aria-live="polite">
        {focusedAnnouncement}
      </span>

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
            ? 'Arrastra para orbitar · Clic derecho mueve · Tab cambia módulo · R centrar'
            : 'Drag to orbit · Right-drag pans · Tab switches module · R reset'}
        </span>
      </div>
    </div>
  );
};
