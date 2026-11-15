/**
 * Motor Spotlight de 4 Paneles, Señalización Vectorial y Recuadro Micro-Táctico
 * (OnboardingSpotlight.tsx — T02, T03 & T05)
 *
 * Reglas estrictas:
 * - 4 paneles oscuros (Arriba, Abajo, Izquierda, Derecha) con `rgba(6, 10, 18, 0.85)`
 *   alrededor de las coordenadas del elemento activo, dejando el hueco central 100% libre
 *   para hacer clic directo en el control real del HUD.
 * - Marco técnico de 2 px (cian `#00E5FF` para acción normal, ámbar `#FFB300` para alerta),
 *   4 escuadras en las esquinas y flecha conectora ortogonal en SVG que apunta al botón.
 * - Recuadro micro-táctico SIN párrafos largos NI botones de "Siguiente/Anterior":
 *   solo rótulo superior ("SISTEMA 1/4"), orden directa de 1 frase (<= 15 palabras) con
 *   `aria-live="polite"`, y botón discreto "Saltar" / "Skip" (o tecla Esc).
 */

import React, { useEffect, useMemo } from 'react';
import type {
  Language,
  OnboardingPlacement,
  OnboardingRect,
  OnboardingStep,
} from '../../hooks/useOnboarding';
import { AlertIcon, CloseIcon, HelmetIcon } from '../icons';

export interface OnboardingSpotlightProps {
  lang: Language;
  isActive: boolean;
  step: OnboardingStep | null;
  targetRect: OnboardingRect | null;
  onSkip: () => void;
}

const CALLOUT_WIDTH = 336;
const CALLOUT_HEIGHT = 128;
const CALLOUT_GAP = 20;
const VIEWPORT_MARGIN = 12;

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function computeOnboardingCutout(
  rect: OnboardingRect | null,
  padding: number,
  vw: number,
  vh: number,
): OnboardingRect {
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    const cx = Math.round(vw / 2);
    const cy = Math.round(vh / 2);
    return { top: cy, left: cx, right: cx, bottom: cy, width: 0, height: 0 };
  }
  const pad = Math.max(0, padding);
  const top = Math.max(0, Math.round(rect.top - pad));
  const left = Math.max(0, Math.round(rect.left - pad));
  const right = Math.min(vw, Math.round(rect.right + pad));
  const bottom = Math.min(vh, Math.round(rect.bottom + pad));
  return {
    top,
    left,
    right,
    bottom,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

export function computeMicroCalloutBox(
  cutout: OnboardingRect,
  preferred: OnboardingPlacement,
  vw: number,
  vh: number,
): { box: OnboardingRect; placement: OnboardingPlacement } {
  const width = Math.min(CALLOUT_WIDTH, Math.max(250, vw - VIEWPORT_MARGIN * 2));
  const height = CALLOUT_HEIGHT;

  if (cutout.width <= 0 || cutout.height <= 0) {
    const top = clamp(
      Math.round((vh - height) / 2),
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, vh - height - VIEWPORT_MARGIN),
    );
    const left = clamp(
      Math.round((vw - width) / 2),
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN),
    );
    return {
      box: { top, left, width, height, right: left + width, bottom: top + height },
      placement: preferred,
    };
  }

  const spaceTop = cutout.top - VIEWPORT_MARGIN;
  const spaceBottom = vh - cutout.bottom - VIEWPORT_MARGIN;
  const spaceLeft = cutout.left - VIEWPORT_MARGIN;
  const spaceRight = vw - cutout.right - VIEWPORT_MARGIN;

  const canHorizontal = vw >= 680;
  const fits: Record<OnboardingPlacement, boolean> = {
    top: spaceTop >= height + CALLOUT_GAP,
    bottom: spaceBottom >= height + CALLOUT_GAP,
    left: canHorizontal && spaceLeft >= width + CALLOUT_GAP,
    right: canHorizontal && spaceRight >= width + CALLOUT_GAP,
  };

  let placement: OnboardingPlacement = preferred;
  if (!fits[placement]) {
    const order: OnboardingPlacement[] = ['bottom', 'top', 'right', 'left'];
    const found = order.find((dir) => fits[dir]);
    placement = found ?? (spaceBottom >= spaceTop ? 'bottom' : 'top');
  }

  const minLeft = VIEWPORT_MARGIN;
  const maxLeft = Math.max(VIEWPORT_MARGIN, vw - width - VIEWPORT_MARGIN);
  const minTop = VIEWPORT_MARGIN;
  const maxTop = Math.max(VIEWPORT_MARGIN, vh - height - VIEWPORT_MARGIN);

  const cx = cutout.left + cutout.width / 2;
  const cy = cutout.top + cutout.height / 2;

  let top = minTop;
  let left = minLeft;

  if (placement === 'bottom') {
    top = clamp(Math.round(cutout.bottom + CALLOUT_GAP), minTop, maxTop);
    left = clamp(Math.round(cx - width / 2), minLeft, maxLeft);
  } else if (placement === 'top') {
    top = clamp(Math.round(cutout.top - height - CALLOUT_GAP), minTop, maxTop);
    left = clamp(Math.round(cx - width / 2), minLeft, maxLeft);
  } else if (placement === 'right') {
    top = clamp(Math.round(cy - height / 2), minTop, maxTop);
    left = clamp(Math.round(cutout.right + CALLOUT_GAP), minLeft, maxLeft);
  } else {
    top = clamp(Math.round(cy - height / 2), minTop, maxTop);
    left = clamp(Math.round(cutout.left - width - CALLOUT_GAP), minLeft, maxLeft);
  }

  return {
    box: { top, left, width, height, right: left + width, bottom: top + height },
    placement,
  };
}

export function buildOrthogonalArrow(
  cutout: OnboardingRect,
  callout: OnboardingRect,
  placement: OnboardingPlacement,
): { pathD: string; arrowPoints: string } {
  const arrowSize = 7;
  const half = 4.5;
  const r = (n: number) => Math.round(n);

  if (placement === 'bottom') {
    const sx = r(callout.left + callout.width / 2);
    const sy = r(callout.top);
    const tx = r(cutout.left + cutout.width / 2);
    const ty = r(cutout.bottom + 3);
    const my = r((sy + ty) / 2);
    return {
      pathD: `M ${sx} ${sy} L ${sx} ${my} L ${tx} ${my} L ${tx} ${ty + arrowSize}`,
      arrowPoints: `${tx},${ty} ${tx - half},${ty + arrowSize} ${tx + half},${ty + arrowSize}`,
    };
  }
  if (placement === 'top') {
    const sx = r(callout.left + callout.width / 2);
    const sy = r(callout.bottom);
    const tx = r(cutout.left + cutout.width / 2);
    const ty = r(cutout.top - 3);
    const my = r((sy + ty) / 2);
    return {
      pathD: `M ${sx} ${sy} L ${sx} ${my} L ${tx} ${my} L ${tx} ${ty - arrowSize}`,
      arrowPoints: `${tx},${ty} ${tx - half},${ty - arrowSize} ${tx + half},${ty - arrowSize}`,
    };
  }
  if (placement === 'right') {
    const sx = r(callout.left);
    const sy = r(callout.top + callout.height / 2);
    const tx = r(cutout.right + 3);
    const ty = r(cutout.top + cutout.height / 2);
    const mx = r((sx + tx) / 2);
    return {
      pathD: `M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ty} L ${tx + arrowSize} ${ty}`,
      arrowPoints: `${tx},${ty} ${tx + arrowSize},${ty - half} ${tx + arrowSize},${ty + half}`,
    };
  }

  const sx = r(callout.right);
  const sy = r(callout.top + callout.height / 2);
  const tx = r(cutout.left - 3);
  const ty = r(cutout.top + cutout.height / 2);
  const mx = r((sx + tx) / 2);
  return {
    pathD: `M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ty} L ${tx - arrowSize} ${ty}`,
    arrowPoints: `${tx},${ty} ${tx - arrowSize},${ty - half} ${tx - arrowSize},${ty + half}`,
  };
}

export function buildOnboardingBrackets(cutout: OnboardingRect): Array<{
  id: 'tl' | 'tr' | 'bl' | 'br';
  d: string;
}> {
  const o = 4;
  const arm = 12;
  const l = Math.round(cutout.left - o);
  const r = Math.round(cutout.right + o);
  const t = Math.round(cutout.top - o);
  const b = Math.round(cutout.bottom + o);
  return [
    { id: 'tl', d: `M ${l} ${t + arm} L ${l} ${t} L ${l + arm} ${t}` },
    { id: 'tr', d: `M ${r - arm} ${t} L ${r} ${t} L ${r} ${t + arm}` },
    { id: 'bl', d: `M ${l} ${b - arm} L ${l} ${b} L ${l + arm} ${b}` },
    { id: 'br', d: `M ${r - arm} ${b} L ${r} ${b} L ${r} ${b - arm}` },
  ];
}

export interface OnboardingMicroCalloutProps {
  lang: Language;
  step: OnboardingStep;
  top: number;
  left: number;
  onSkip: () => void;
}

export function countCommandWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function countCommandSentences(text: string): number {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 0).length;
}

/**
 * T03: Recuadro micro-táctico sin párrafos largos ni botones "Siguiente/Anterior".
 * Solo muestra rótulo superior ("SISTEMA 1/4"), orden directa de 1 frase (<= 15 palabras)
 * y botón discreto "Saltar" / "Skip".
 */
export const OnboardingMicroCallout: React.FC<OnboardingMicroCalloutProps> = ({
  lang,
  step,
  top,
  left,
  onSkip,
}) => {
  const es = lang === 'es';
  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-label={step.eyebrow[lang]}
      data-testid="onboarding-micro-callout"
      data-tone={step.tone}
      className={`onboarding-micro-callout onboarding-callout-${step.tone}`}
      style={{
        top: `${top}px`,
        left: `${left}px`,
      }}
    >
      <div className="onboarding-callout-top">
        <span className="onboarding-eyebrow" data-testid="onboarding-eyebrow">
          {step.tone === 'caution' ? <AlertIcon size={14} /> : <HelmetIcon size={14} />}
          <span>{step.eyebrow[lang]}</span>
        </span>

        <button
          type="button"
          id="onboarding-skip-btn"
          data-testid="onboarding-skip-btn"
          className="onboarding-skip-btn"
          onClick={onSkip}
        >
          <CloseIcon size={12} />
          <span>{es ? 'Saltar' : 'Skip'}</span>
        </button>
      </div>

      <p
        id="onboarding-command-text"
        data-testid="onboarding-command-text"
        className="onboarding-command"
        aria-live="polite"
        aria-atomic="true"
      >
        {step.command[lang]}
      </p>
    </aside>
  );
};

export const OnboardingSpotlight: React.FC<OnboardingSpotlightProps> = ({
  lang,
  isActive,
  step,
  targetRect,
  onSkip,
}) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  // T05: Cerrar de inmediato con tecla Escape
  useEffect(() => {
    if (!isActive || !step) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, step, onSkip]);

  const cutout = useMemo(
    () => computeOnboardingCutout(targetRect, step?.padding ?? 6, vw, vh),
    [targetRect, step?.padding, vw, vh],
  );

  const calloutLayout = useMemo(
    () => computeMicroCalloutBox(cutout, step?.placement ?? 'right', vw, vh),
    [cutout, step?.placement, vw, vh],
  );

  if (!isActive || !step) return null;

  const strokeColor = step.tone === 'caution' ? '#FFB300' : '#00E5FF';
  const hasCutout = cutout.width > 0 && cutout.height > 0;
  const arrow = hasCutout
    ? buildOrthogonalArrow(cutout, calloutLayout.box, calloutLayout.placement)
    : null;
  const brackets = hasCutout ? buildOnboardingBrackets(cutout) : [];

  return (
    <div
      className="onboarding-layer"
      data-testid="onboarding-spotlight-layer"
      data-step-id={step.id}
    >
      {/* 4 paneles oscuros independientes con rgba(6, 10, 18, 0.85) */}
      <div
        className="onboarding-quadrant onboarding-quadrant-top"
        data-onboarding-quadrant="top"
        style={{
          top: 0,
          left: 0,
          width: '100vw',
          height: `${cutout.top}px`,
        }}
        aria-hidden="true"
      />
      <div
        className="onboarding-quadrant onboarding-quadrant-bottom"
        data-onboarding-quadrant="bottom"
        style={{
          top: `${cutout.bottom}px`,
          left: 0,
          width: '100vw',
          height: `${Math.max(0, vh - cutout.bottom)}px`,
        }}
        aria-hidden="true"
      />
      <div
        className="onboarding-quadrant onboarding-quadrant-left"
        data-onboarding-quadrant="left"
        style={{
          top: `${cutout.top}px`,
          left: 0,
          width: `${cutout.left}px`,
          height: `${cutout.height}px`,
        }}
        aria-hidden="true"
      />
      <div
        className="onboarding-quadrant onboarding-quadrant-right"
        data-onboarding-quadrant="right"
        style={{
          top: `${cutout.top}px`,
          left: `${cutout.right}px`,
          width: `${Math.max(0, vw - cutout.right)}px`,
          height: `${cutout.height}px`,
        }}
        aria-hidden="true"
      />

      {/* Marco técnico de 2 px sobre el hueco iluminado (pointer-events: none) */}
      {hasCutout && (
        <div
          className={`onboarding-cutout-frame onboarding-tone-${step.tone}`}
          data-testid="onboarding-cutout-frame"
          data-tone={step.tone}
          style={{
            top: `${cutout.top}px`,
            left: `${cutout.left}px`,
            width: `${cutout.width}px`,
            height: `${cutout.height}px`,
          }}
          aria-hidden="true"
        />
      )}

      {/* 4 escuadras técnicas + flecha conectora ortogonal en SVG */}
      {hasCutout && arrow && (
        <svg
          className="onboarding-vector-svg"
          data-testid="onboarding-connector-svg"
          width={vw}
          height={vh}
          viewBox={`0 0 ${vw} ${vh}`}
          aria-hidden="true"
        >
          {brackets.map((b) => (
            <path
              key={b.id}
              d={b.d}
              data-onboarding-bracket={b.id}
              fill="none"
              stroke={strokeColor}
              strokeWidth={2.5}
              strokeLinecap="square"
            />
          ))}
          <path
            d={arrow.pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="square"
          />
          <polygon points={arrow.arrowPoints} fill={strokeColor} />
        </svg>
      )}

      {/* T03: Recuadro micro-táctico SIN párrafos largos NI botones Siguiente/Anterior */}
      <OnboardingMicroCallout
        lang={lang}
        step={step}
        top={calloutLayout.box.top}
        left={calloutLayout.box.left}
        onSkip={onSkip}
      />
    </div>
  );
};
