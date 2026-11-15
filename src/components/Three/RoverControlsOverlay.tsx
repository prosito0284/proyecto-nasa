import React from 'react';
import type { Language } from '../../types/mission';
import { ArrowIcon } from '../icons';

export type RoverDirectionKey = 'forward' | 'backward' | 'left' | 'right';

export interface RoverDirectionState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

export const EMPTY_ROVER_DIRECTIONS: RoverDirectionState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
};

export function mapKeyToRoverDirection(key: string): RoverDirectionKey | null {
  switch (key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      return 'forward';
    case 'ArrowDown':
    case 's':
    case 'S':
      return 'backward';
    case 'ArrowLeft':
    case 'a':
    case 'A':
      return 'left';
    case 'ArrowRight':
    case 'd':
    case 'D':
      return 'right';
    default:
      return null;
  }
}

export function resolveDirectionsFromKeys(keys: ReadonlySet<string>): RoverDirectionState {
  let forward = false;
  let backward = false;
  let left = false;
  let right = false;
  for (const key of keys) {
    const dir = mapKeyToRoverDirection(key);
    if (dir === 'forward') forward = true;
    else if (dir === 'backward') backward = true;
    else if (dir === 'left') left = true;
    else if (dir === 'right') right = true;
  }
  return { forward, backward, left, right };
}

export function mergeRoverDirections(
  keyboardDirs: RoverDirectionState,
  pointerDirs: RoverDirectionState,
): RoverDirectionState {
  return {
    forward: keyboardDirs.forward || pointerDirs.forward,
    backward: keyboardDirs.backward || pointerDirs.backward,
    left: keyboardDirs.left || pointerDirs.left,
    right: keyboardDirs.right || pointerDirs.right,
  };
}

export type ColonyCameraMode = 'chase' | 'mastcam' | 'orbital';

export interface RoverControlsOverlayProps {
  lang: Language;
  activeDirections: RoverDirectionState;
  speedMps?: number;
  disabled?: boolean;
  cameraMode?: ColonyCameraMode;
  onCameraModeChange?: (mode: ColonyCameraMode) => void;
  onDirectionChange: (direction: RoverDirectionKey, pressed: boolean) => void;
}

const CAMERA_MODE_SPECS: ReadonlyArray<{
  mode: ColonyCameraMode;
  testId: string;
  label: Record<Language, string>;
  ariaLabel: Record<Language, string>;
}> = [
  {
    mode: 'chase',
    testId: 'rover-cam-chase-btn',
    label: {
      es: 'SEGUIMIENTO',
      en: 'CHASE CAM',
    },
    ariaLabel: {
      es: 'Cámara de seguimiento en tercera persona (atajo C)',
      en: 'Third-person rover chase camera (shortcut C)',
    },
  },
  {
    mode: 'mastcam',
    testId: 'rover-cam-mastcam-btn',
    label: {
      es: 'CABINA MASTCAM',
      en: 'MASTCAM VIEW',
    },
    ariaLabel: {
      es: 'Cámara en primera persona Cabina Mastcam (atajo C)',
      en: 'First-person Mastcam cabin view (shortcut C)',
    },
  },
  {
    mode: 'orbital',
    testId: 'rover-cam-orbital-btn',
    label: {
      es: 'ORBITAL',
      en: 'ORBITAL CAM',
    },
    ariaLabel: {
      es: 'Cámara orbital estratégica de toda la colonia (atajo C)',
      en: 'Strategic orbital colony camera (shortcut C)',
    },
  },
];

const DIRECTION_SPECS: ReadonlyArray<{
  dir: RoverDirectionKey;
  svgDir: 'up' | 'left' | 'down' | 'right';
  slotClass: string;
  label: Record<Language, string>;
}> = [
  {
    dir: 'forward',
    svgDir: 'up',
    slotClass: 'rover-dpad-slot-up',
    label: {
      es: 'Conducir rover adelante (W o Flecha arriba)',
      en: 'Drive rover forward (W or Up arrow)',
    },
  },
  {
    dir: 'left',
    svgDir: 'left',
    slotClass: 'rover-dpad-slot-left',
    label: {
      es: 'Girar rover a la izquierda (A o Flecha izquierda)',
      en: 'Steer rover left (A or Left arrow)',
    },
  },
  {
    dir: 'backward',
    svgDir: 'down',
    slotClass: 'rover-dpad-slot-down',
    label: {
      es: 'Conducir rover atrás (S o Flecha abajo)',
      en: 'Drive rover backward (S or Down arrow)',
    },
  },
  {
    dir: 'right',
    svgDir: 'right',
    slotClass: 'rover-dpad-slot-right',
    label: {
      es: 'Girar rover a la derecha (D o Flecha derecha)',
      en: 'Steer rover right (D or Right arrow)',
    },
  },
];

const focusSiblingViewport = (el: HTMLElement | null) => {
  const shell = el?.closest?.('.viewer3d-canvas-shell') as HTMLElement | null;
  const viewport =
    (shell?.querySelector?.('.viewer3d-viewport') as HTMLElement | null) ??
    (el?.closest?.('.viewer3d-viewport') as HTMLElement | null);
  viewport?.focus?.({ preventScroll: true });
};

export const RoverControlsOverlay: React.FC<RoverControlsOverlayProps> = ({
  lang,
  activeDirections,
  speedMps = 0,
  disabled = false,
  cameraMode,
  onCameraModeChange,
  onDirectionChange,
}) => {
  const es = lang === 'es';
  const groupLabel = es ? 'Controles táctiles del rover' : 'Rover drive controls';
  const statusCode = disabled ? 'ROVER OFF' : `${Math.abs(speedMps).toFixed(1)} m/s`;
  const showCameraSelector = cameraMode !== undefined || onCameraModeChange !== undefined;
  const activeCamera: ColonyCameraMode = cameraMode ?? 'orbital';

  return (
    <div className="rover-hud-layer">
      {showCameraSelector && (
        <div
          className="rover-camera-cluster"
          data-testid="rover-camera-cluster"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          <div
            className="rover-camera-selector"
            data-testid="rover-camera-selector"
            role="group"
            aria-label={es ? 'Selector de cámara 3D' : '3D camera selector'}
          >
            <span className="rover-cam-tag" title={es ? 'Tecla C para rotar cámara' : 'Press C to cycle camera'}>
              CAM [C]
            </span>
            <div className="rover-camera-buttons">
              {CAMERA_MODE_SPECS.map((spec) => {
                const active = activeCamera === spec.mode;
                return (
                  <button
                    key={spec.mode}
                    type="button"
                    data-testid={spec.testId}
                    className={`rover-cam-btn ${active ? 'is-active' : ''}`.trim()}
                    aria-label={spec.ariaLabel[lang]}
                    aria-pressed={active}
                    onClick={() => onCameraModeChange?.(spec.mode)}
                  >
                    {spec.label[lang]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div
        className={`rover-dpad-overlay ${disabled ? 'is-disabled' : ''}`.trim()}
        data-testid="rover-controls-overlay"
        role="group"
        aria-label={groupLabel}
        onPointerDown={(e) => {
          e.stopPropagation();
          focusSiblingViewport(e.currentTarget);
        }}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <div className="rover-dpad-meta">
          <span className="rover-dpad-code">{es ? 'ROVER' : 'ROVER'}</span>
          <span className="rover-dpad-speed" data-testid="rover-speed-readout">
            {statusCode}
          </span>
        </div>

        <div className="rover-dpad-grid">
          {DIRECTION_SPECS.map((spec) => {
            const pressed = activeDirections[spec.dir];
            return (
              <button
                key={spec.dir}
                type="button"
                data-testid={`rover-dpad-${spec.dir}`}
                className={`rover-dpad-btn ${spec.slotClass} ${pressed ? 'is-pressed' : ''}`.trim()}
                aria-label={spec.label[lang]}
                aria-pressed={pressed}
                disabled={disabled}
                onPointerDown={(e) => {
                  if (e.pointerType === 'mouse' && typeof e.button === 'number' && e.button !== 0) {
                    return;
                  }
                  e.stopPropagation();
                  e.preventDefault();
                  if (!disabled) {
                    onDirectionChange(spec.dir, true);
                  }
                }}
                onPointerUp={(e) => {
                  e.stopPropagation();
                  onDirectionChange(spec.dir, false);
                }}
                onPointerCancel={(e) => {
                  e.stopPropagation();
                  onDirectionChange(spec.dir, false);
                }}
                onPointerLeave={() => {
                  if (pressed) {
                    onDirectionChange(spec.dir, false);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.stopPropagation();
                    e.preventDefault();
                    if (!disabled && !pressed) {
                      onDirectionChange(spec.dir, true);
                    }
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.stopPropagation();
                    onDirectionChange(spec.dir, false);
                  }
                }}
                onBlur={() => {
                  if (pressed) {
                    onDirectionChange(spec.dir, false);
                  }
                }}
              >
                <ArrowIcon size={18} direction={spec.svgDir} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

