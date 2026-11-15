import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Language } from '../../types/mission';
import { missionAudio } from '../../utils/sound';
import { CloseIcon, GlobeIcon, SlidersIcon } from '../icons';
import {
  buildProceduralModel,
  type ColonyModule3DId,
  disposeObject3D,
  getModelTitle,
  type Model3DId,
  type Model3DStateOptions,
  resolveExternalModelUrl,
} from './proceduralModels';
import '../../styles/viewer3d.css';

export interface ModelFocusPose {
  target: [number, number, number];
  cameraPos: [number, number, number];
}

export interface ModelViewer3DProps {
  lang: Language;
  modelId: Model3DId;
  options?: Model3DStateOptions;
  /** Ruta opcional de archivo .glb en public/models/ (sobreescribe catálogo) */
  glbFile?: string;
  height?: number;
  compact?: boolean;
  focusPose?: ModelFocusPose | null;
  onSelectModule?: (moduleId: ColonyModule3DId) => void;
  ariaLabel?: string;
  className?: string;
  /** Permite forzar el modo sin WebGL en tests unitarios o navegadores antiguos */
  forceFallback?: boolean;
}

/**
 * M04: Detector seguro de soporte WebGL antes de instanciar `THREE.WebGLRenderer`.
 * Nunca lanza excepciones ni emite advertencias en JSDOM / SSR / navegadores sin GPU.
 */
export function isWebGLAvailable(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  try {
    const testCanvas = document.createElement('canvas');
    if (typeof testCanvas.getContext !== 'function') {
      return false;
    }
    const gl =
      testCanvas.getContext('webgl2') ||
      testCanvas.getContext('webgl') ||
      testCanvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}

export type ViewerKeyAction =
  | { type: 'orbit'; dTheta: number; dPhi: number; zoomScale: number }
  | { type: 'reset' }
  | { type: 'toggle-pause' };

/**
 * M04: Traduce atajos de teclado estándar del visor 3D (flechas, +/-, R, Espacio).
 */
export function resolveViewerKeyCommand(key: string): ViewerKeyAction | null {
  switch (key) {
    case 'ArrowLeft':
      return { type: 'orbit', dTheta: 0.16, dPhi: 0, zoomScale: 1 };
    case 'ArrowRight':
      return { type: 'orbit', dTheta: -0.16, dPhi: 0, zoomScale: 1 };
    case 'ArrowUp':
      return { type: 'orbit', dTheta: 0, dPhi: -0.1, zoomScale: 1 };
    case 'ArrowDown':
      return { type: 'orbit', dTheta: 0, dPhi: 0.1, zoomScale: 1 };
    case '+':
    case '=':
      return { type: 'orbit', dTheta: 0, dPhi: 0, zoomScale: 0.88 };
    case '-':
    case '_':
      return { type: 'orbit', dTheta: 0, dPhi: 0, zoomScale: 1.14 };
    case 'r':
    case 'R':
      return { type: 'reset' };
    case ' ':
      return { type: 'toggle-pause' };
    default:
      return null;
  }
}

export const ModelViewer3D: React.FC<ModelViewer3DProps> = ({
  lang,
  modelId,
  options,
  glbFile,
  height = 310,
  compact = false,
  focusPose,
  onSelectModule,
  ariaLabel,
  className,
  forceFallback = false,
}) => {
  const es = lang === 'es';
  const hostRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const modelHandleRef = useRef<ReturnType<typeof buildProceduralModel> | null>(null);
  const desiredCameraRef = useRef<ModelFocusPose | null>(null);
  const onSelectModuleRef = useRef(onSelectModule);
  onSelectModuleRef.current = onSelectModule;

  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const [svgRotationDeg, setSvgRotationDeg] = useState(0);
  const [svgZoom, setSvgZoom] = useState(1);

  const webglSupported = useMemo(
    () => !forceFallback && isWebGLAvailable(),
    [forceFallback],
  );
  const [usingExternalGlb, setUsingExternalGlb] = useState(false);

  const siteId = options?.siteId;
  const isMars = siteId === 'mars-jezero';
  const modelTitle = getModelTitle(modelId, lang, siteId);
  const computedAriaLabel =
    ariaLabel ??
    (es
      ? `Visor 3D interactivo: ${modelTitle}. Usa flechas para rotar, + o - para acercar y R para centrar.`
      : `Interactive 3D viewer: ${modelTitle}. Use arrow keys to rotate, + or - to zoom, and R to reset.`);

  const resetCamera = () => {
    missionAudio.playClick();
    if (!webglSupported) {
      setSvgRotationDeg(0);
      setSvgZoom(1);
      return;
    }
    const handle = modelHandleRef.current;
    if (handle) {
      desiredCameraRef.current = {
        target: handle.defaultTarget,
        cameraPos: handle.defaultCameraPos,
      };
    }
  };

  const handleTogglePause = () => {
    missionAudio.playClick();
    setIsPaused((prev) => !prev);
  };

  const stepOrbitCamera = (dTheta: number, dPhi: number, zoomScale: number) => {
    if (!webglSupported) {
      if (dTheta !== 0) {
        setSvgRotationDeg((prev) => (prev + Math.sign(dTheta) * 15 + 360) % 360);
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

    desiredCameraRef.current = null;
    const offset = cam.position.clone().sub(ctrl.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);
    spherical.theta += dTheta;
    spherical.phi = Math.max(0.28, Math.min(Math.PI * 0.49, spherical.phi + dPhi));
    spherical.radius = Math.max(1.8, Math.min(16, spherical.radius * zoomScale));
    offset.setFromSpherical(spherical);
    cam.position.copy(ctrl.target).add(offset);
    ctrl.update();
  };

  const handleViewerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const cmd = resolveViewerKeyCommand(e.key);
    if (!cmd) return;
    if (cmd.type === 'orbit') {
      e.preventDefault();
      stepOrbitCamera(cmd.dTheta, cmd.dPhi, cmd.zoomScale);
    } else if (cmd.type === 'reset') {
      e.preventDefault();
      resetCamera();
    } else if (cmd.type === 'toggle-pause' && e.target === e.currentTarget) {
      e.preventDefault();
      handleTogglePause();
    }
  };

  // Actualizar poses focales solicitadas por hotspots
  useEffect(() => {
    if (focusPose) {
      desiredCameraRef.current = focusPose;
    }
  }, [focusPose]);

  // Montaje / desmontaje estricto de escena Three.js cuando WebGL está disponible
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !webglSupported) return;

    const width = Math.max(240, host.clientWidth || 640);
    const viewHeight = Math.max(160, height);
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
    renderer.setClearColor(isMars ? 0x180c08 : 0x08121e, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / viewHeight, 0.1, 80);
    cameraRef.current = camera;

    // Iluminación direccional limpia estilo NASA CAD
    const ambient = new THREE.AmbientLight(isMars ? 0xffe4d0 : 0xdbeafe, 0.65);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(6.5, 9.5, 5.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(isMars ? 0xfdba74 : 0x6794c1, 0.6);
    rimLight.position.set(-7, 4, -6);
    scene.add(rimLight);

    const handle = buildProceduralModel(modelId, options);
    modelHandleRef.current = handle;
    scene.add(handle.group);

    camera.position.set(...handle.defaultCameraPos);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = modelId === 'colony-base' ? 4.0 : 2.1;
    controls.maxDistance = modelId === 'colony-base' ? 15.0 : 8.5;
    controls.maxPolarAngle = modelId === 'planet-globe' ? Math.PI - 0.15 : Math.PI * 0.48;
    controls.minPolarAngle = modelId === 'planet-globe' ? 0.15 : 0.25;
    controls.target.set(...handle.defaultTarget);
    controls.update();
    controlsRef.current = controls;

    // Carga opcional de .glb/.gltf real desde public/models/ usando import.meta.env.BASE_URL
    let isDisposed = false;
    let loadedExternalRoot: THREE.Object3D | null = null;
    const glbUrl = resolveExternalModelUrl(modelId, glbFile);
    if (glbUrl) {
      const loader = new GLTFLoader();
      loader.load(
        glbUrl,
        (gltf) => {
          if (isDisposed) {
            disposeObject3D(gltf.scene);
            return;
          }
          // Normalizar escala y centro al volumen del visor
          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          const maxDim = Math.max(size.x, size.y, size.z, 0.001);
          const normScale = (modelId === 'colony-base' ? 7.0 : 2.8) / maxDim;
          gltf.scene.scale.setScalar(normScale);
          gltf.scene.position.sub(center.multiplyScalar(normScale));

          scene.remove(handle.group);
          disposeObject3D(handle.group);
          loadedExternalRoot = gltf.scene;
          scene.add(loadedExternalRoot);
          setUsingExternalGlb(true);
        },
        undefined,
        () => {
          // Respaldo procedural ya montado; fallo silencioso si el archivo aún no existe
          setUsingExternalGlb(false);
        },
      );
    } else {
      setUsingExternalGlb(false);
    }

    // Raycaster para seleccionar módulos al hacer clic (distinguiendo del arrastre de cámara)
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    const handlePointerDown = (ev: PointerEvent) => {
      downX = ev.clientX;
      downY = ev.clientY;
      // Si el usuario toca controles de órbita, cancelamos interpolación automática
      desiredCameraRef.current = null;
    };

    const handlePointerUp = (ev: PointerEvent) => {
      if (!onSelectModuleRef.current) return;
      const moveDist = Math.hypot(ev.clientX - downX, ev.clientY - downY);
      if (moveDist > 6) return;

      const rect = renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      pointerNdc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);
      const rootTarget = loadedExternalRoot ?? handle.group;
      const hits = raycaster.intersectObjects(rootTarget.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          const modId = obj.userData?.moduleId as ColonyModule3DId | undefined;
          if (modId) {
            onSelectModuleRef.current(modId);
            return;
          }
          obj = obj.parent;
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // ResizeObserver para redimensionado responsivo fluido
    const resizeRenderer = () => {
      if (!hostRef.current) return;
      const nextW = Math.max(200, hostRef.current.clientWidth);
      const nextH = Math.max(150, height);
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

    // Bucle de animación
    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      if (!isPausedRef.current && !reducedMotion) {
        elapsed += dt;
        handle.animate?.(elapsed, dt);
        if (modelId !== 'colony-base' || compact) {
          controls.autoRotate = !desiredCameraRef.current;
          controls.autoRotateSpeed = modelId === 'planet-globe' ? 1.15 : 0.85;
        } else {
          controls.autoRotate = false;
        }
      } else {
        controls.autoRotate = false;
      }

      if (desiredCameraRef.current) {
        const goalTarget = new THREE.Vector3(...desiredCameraRef.current.target);
        const goalCam = new THREE.Vector3(...desiredCameraRef.current.cameraPos);
        controls.target.lerp(goalTarget, Math.min(1, dt * 6));
        camera.position.lerp(goalCam, Math.min(1, dt * 6));
        if (
          controls.target.distanceTo(goalTarget) < 0.03 &&
          camera.position.distanceTo(goalCam) < 0.05
        ) {
          controls.target.copy(goalTarget);
          camera.position.copy(goalCam);
          desiredCameraRef.current = null;
        }
      }

      controls.update();
      renderer.render(scene, camera);
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      isDisposed = true;
      window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      window.removeEventListener('resize', resizeRenderer);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      controlsRef.current = null;
      cameraRef.current = null;
      modelHandleRef.current = null;
      if (loadedExternalRoot) {
        disposeObject3D(loadedExternalRoot);
      }
      disposeObject3D(scene);
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [modelId, glbFile, height, compact, webglSupported, isMars]);

  // Sincronización reactiva de estado en vivo sin recrear la escena WebGL
  useEffect(() => {
    if (!options) return;
    modelHandleRef.current?.updateState?.(options);
  }, [
    options?.siteId,
    options?.powerPercent,
    options?.lifeSupportPercent,
    options?.shieldingPercent,
    options?.foodPercent,
    options?.solarAllocPercent,
    options?.shieldingAllocPercent,
    options?.weatherType,
    options?.isDustStorm,
    options?.isSolarStorm,
    options?.isRimShadowPass,
    options?.isLowPowerBlackout,
    options?.isGreenhouseWilted,
    options?.selectedModule,
  ]);

  const inkPrimary = isMars ? '#F4C39B' : '#B8D8F8';
  const inkSecondary = isMars ? '#C87D52' : '#6794C1';
  const skyBg = isMars ? '#180C08' : '#08121E';

  const renderSvgBlueprintFallback = () => (
    <div className="viewer3d-fallback-svg-wrap" data-testid={`viewer3d-svg-fallback-${modelId}`}>
      <svg
        viewBox="0 0 360 190"
        className="viewer3d-fallback-svg"
        role="img"
        aria-label={computedAriaLabel}
        style={{
          transform: `scale(${svgZoom}) rotate(${svgRotationDeg}deg)`,
          transition: 'transform 120ms ease-out',
        }}
      >
        <rect x="0" y="0" width="360" height="190" fill={skyBg} />
        <g stroke={inkSecondary} strokeWidth="0.6" opacity="0.25">
          <line x1="0" y1="48" x2="360" y2="48" />
          <line x1="0" y1="95" x2="360" y2="95" />
          <line x1="0" y1="142" x2="360" y2="142" />
          <line x1="90" y1="0" x2="90" y2="190" />
          <line x1="180" y1="0" x2="180" y2="190" />
          <line x1="270" y1="0" x2="270" y2="190" />
        </g>

        {modelId === 'planet-globe' && (
          <g transform="translate(180, 95)">
            <circle cx="0" cy="0" r="62" fill={isMars ? '#4E2417' : '#15273E'} stroke={inkPrimary} strokeWidth="1.8" />
            <ellipse cx="0" cy="0" rx="62" ry="20" fill="none" stroke={inkSecondary} strokeWidth="1" strokeDasharray="4 3" />
            <ellipse cx="0" cy="0" rx="22" ry="62" fill="none" stroke={inkSecondary} strokeWidth="1" strokeDasharray="4 3" />
            <circle cx={isMars ? 14 : 4} cy={isMars ? -14 : 46} r="7" fill="none" stroke="#00E5FF" strokeWidth="1.6" />
            <circle cx={isMars ? 14 : 4} cy={isMars ? -14 : 46} r="3" fill="#FC3D21" />
            <text
              x="0"
              y="80"
              textAnchor="middle"
              fill={inkPrimary}
              fontSize="10"
              fontFamily="IBM Plex Mono, monospace"
            >
              {isMars ? 'JEZERO // 18.38N 77.58E' : 'SHACKLETON // 89.9S 0.0E'}
            </text>
          </g>
        )}

        {modelId === 'rover-moxie' && (
          <g transform="translate(180, 102)">
            <line x1="-130" y1="44" x2="130" y2="44" stroke={inkSecondary} strokeWidth="1.2" />
            <rect x="-56" y="-22" width="112" height="36" fill="#263850" stroke={inkPrimary} strokeWidth="1.6" />
            <rect x="-20" y="-16" width="40" height="24" fill="#FFB300" stroke="#00E5FF" strokeWidth="1.4" />
            <line x1="42" y1="-22" x2="46" y2="-62" stroke={inkPrimary} strokeWidth="2.5" />
            <rect x="34" y="-76" width="26" height="16" fill="#F2EBDD" stroke="#00E5FF" strokeWidth="1.5" />
            <circle cx="-42" cy="28" r="14" fill="#1B1F2A" stroke={inkPrimary} strokeWidth="1.8" />
            <circle cx="0" cy="28" r="14" fill="#1B1F2A" stroke={inkPrimary} strokeWidth="1.8" />
            <circle cx="42" cy="28" r="14" fill="#1B1F2A" stroke={inkPrimary} strokeWidth="1.8" />
            <polyline points="54,-12 90,-26 108,-4" fill="none" stroke={inkPrimary} strokeWidth="2" />
            <circle cx="108" cy="-4" r="6" fill="#FC3D21" stroke={inkPrimary} strokeWidth="1.4" />
            <text x="0" y="-56" textAnchor="middle" fill="#FFB300" fontSize="9.5" fontFamily="IBM Plex Mono, monospace">
              CAD // PERSEVERANCE + MOXIE O2
            </text>
          </g>
        )}

        {modelId === 'habitat-shield' && (
          <g transform="translate(180, 134)">
            <path d="M-112,0 A112,96 0 0,1 112,0 Z" fill="#5D4B3B" stroke="#FDBA74" strokeWidth="1.8" />
            <path d="M-90,0 A90,76 0 0,1 90,0 Z" fill="#0B3D91" stroke="#00E5FF" strokeWidth="1.6" />
            <path d="M-68,0 A68,56 0 0,1 68,0 Z" fill="#F2EBDD" stroke="#1B1F2A" strokeWidth="1.6" />
            <rect x="-26" y="-22" width="24" height="22" fill="#0B3D91" stroke="#00E5FF" strokeWidth="1.2" />
            <rect x="10" y="-28" width="14" height="28" fill="#2E7D4F" stroke="#1B1F2A" strokeWidth="1.2" />
            <path d="M-45,-118 L-28,-98 M0,-122 L0,-100 M45,-118 L28,-98" stroke="#FC3D21" strokeWidth="2" />
            <text x="0" y="22" textAnchor="middle" fill={inkPrimary} fontSize="9.5" fontFamily="IBM Plex Mono, monospace">
              SECTION // REGOLITH + H2O WALL + ECLSS
            </text>
          </g>
        )}

        {modelId === 'colony-base' && (
          <g transform="translate(180, 128)">
            <rect x="-125" y="-52" width="44" height="36" fill="#1E3A8A" stroke={inkPrimary} strokeWidth="1.5" />
            <path d="M-48,0 A48,40 0 0,1 48,0 Z" fill="#263850" stroke={inkPrimary} strokeWidth="1.8" />
            <path d="M-64,0 A64,56 0 0,1 64,0" fill="none" stroke={options?.isSolarStorm ? '#FFB300' : '#00E5FF'} strokeWidth="2" strokeDasharray="5 3" />
            <rect x="78" y="-26" width="56" height="26" fill="#14532D" stroke="#2E7D4F" strokeWidth="1.6" />
            <line x1="-81" y1="-16" x2="-48" y2="-4" stroke={inkSecondary} strokeWidth="2" />
            <line x1="48" y1="-4" x2="78" y2="-4" stroke={inkSecondary} strokeWidth="2" />
            <text x="0" y="24" textAnchor="middle" fill={inkPrimary} fontSize="9.5" fontFamily="IBM Plex Mono, monospace">
              CAD SVG // {isMars ? 'MARS JEZERO BASE' : 'LUNAR ARTEMIS BASE'}
            </text>
          </g>
        )}
      </svg>
    </div>
  );

  return (
    <div
      className={`viewer3d-frame ${isMars ? 'viewer3d-mars' : 'viewer3d-lunar'} ${
        compact ? 'viewer3d-compact' : ''
      } ${className ?? ''}`.trim()}
      data-testid={`model-viewer-${modelId}`}
    >
      <div
        ref={hostRef}
        className="viewer3d-viewport"
        style={{ height: `${height}px` }}
        tabIndex={0}
        role="region"
        aria-label={computedAriaLabel}
        onKeyDown={handleViewerKeyDown}
      >
        <div className="viewer3d-hud-top">
          <span className="viewer3d-badge">
            <GlobeIcon size={13} />
            <span>
              {webglSupported
                ? usingExternalGlb
                  ? 'GLB // 3D CAD'
                  : 'CAD // WEBGL'
                : es
                  ? 'SVG // SIN WEBGL'
                  : 'SVG // NO WEBGL'}
            </span>
          </span>
        </div>

        {!webglSupported && renderSvgBlueprintFallback()}
      </div>

      <div className="viewer3d-toolbar">
        <div className="viewer3d-controls-group">
          <button
            type="button"
            className="viewer3d-btn"
            onClick={resetCamera}
            aria-label={es ? 'Centrar vista 3D' : 'Reset 3D view'}
          >
            <SlidersIcon size={14} />
            <span>{es ? 'Centrar vista' : 'Reset view'}</span>
          </button>
          <button
            type="button"
            className={`viewer3d-btn ${isPaused ? 'viewer3d-btn-active' : ''}`}
            aria-pressed={isPaused}
            onClick={handleTogglePause}
            aria-label={
              isPaused
                ? es
                  ? 'Reanudar rotación'
                  : 'Resume rotation'
                : es
                  ? 'Pausar rotación'
                  : 'Pause rotation'
            }
          >
            {isPaused ? <GlobeIcon size={14} /> : <CloseIcon size={13} />}
            <span>
              {isPaused
                ? es
                  ? 'Reanudar'
                  : 'Resume'
                : es
                  ? 'Pausar rotación'
                  : 'Pause rotation'}
            </span>
          </button>
        </div>

        {!compact && (
          <span className="viewer3d-hint">
            {es
              ? 'Arrastra / flechas para rotar · +/- zoom · R centrar'
              : 'Drag / arrows to orbit · +/- zoom · R reset'}
          </span>
        )}
      </div>
    </div>
  );
};
