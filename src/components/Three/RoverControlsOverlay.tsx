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

export interface RoverControlsOverlayProps {
  lang: Language;
  activeDirections: RoverDirectionState;
  speedMps?: number;
  disabled?: boolean;
  onDirectionChange: (direction: RoverDirectionKey, pressed: boolean) => void;
}

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

export const RoverControlsOverlay: React.FC<RoverControlsOverlayProps> = ({
  lang,
  activeDirections,
  speedMps = 0,
  disabled = false,
  onDirectionChange,
}) => {
  const es = lang === 'es';
  const groupLabel = es ? 'Controles táctiles del rover' : 'Rover drive controls';
  const statusCode = disabled ? 'ROVER OFF' : `${Math.abs(speedMps).toFixed(1)} m/s`;

  return (
    <div
      className={`rover-dpad-overlay ${disabled ? 'is-disabled' : ''}`.trim()}
      data-testid="rover-controls-overlay"
      role="group"
      aria-label={groupLabel}
      onPointerDown={(e) => {
        e.stopPropagation();
        const viewport = e.currentTarget.closest?.('.viewer3d-viewport') as HTMLElement | null;
        viewport?.focus?.({ preventScroll: true });
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
  );
};
