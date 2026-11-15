/**
 * Motor de Iluminación (Spotlight) de 4 Cuadrantes, Señalización Vectorial y Callout (T03, T05, T06)
 *
 * Renderiza:
 * - 4 paneles oscuros independientes (Top, Bottom, Left, Right) con `rgba(6, 10, 18, 0.85)` y `pointer-events: auto`.
 * - Marco técnico de 2px con `pointer-events: none` (cian para 'info', ámbar para 'caution').
 * - `TutorialPointer` (T06): 4 escuadras técnicas exteriores y línea conectora ortogonal SVG de 90°.
 * - `TutorialCallout` (T05): recuadro táctico oscuro NASA con ajuste inteligente al viewport.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  Language,
  TutorialPlacement,
  TutorialStep,
  TutorialTargetRect,
} from '../../types/tutorial';
import type { TrainingDrillReadout } from '../../engine/trainingDrill';
import {
  collectSharedTutorialFocusables,
  getNextSharedFocusIndex,
  resolveTutorialKeyCommand,
} from '../../hooks/useTutorial';
import { computeCalloutPosition, TutorialCallout } from './TutorialCallout';
import { TutorialPointer } from './TutorialPointer';

export interface TutorialSpotlightProps {
  lang: Language;
  isActive: boolean;
  step: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  targetRect: TutorialTargetRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  /** Lectura opcional del simulacro de micro-emergencia (T09) */
  drillReadout?: TrainingDrillReadout | null;
}

export function computeCutoutBox(
  rect: TutorialTargetRect | null,
  padding: number,
  vw: number,
  vh: number,
): TutorialTargetRect {
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

export const TutorialSpotlight: React.FC<TutorialSpotlightProps> = ({
  lang,
  isActive,
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  drillReadout,
}) => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  useEffect(() => {
    if (!isActive || !step) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const targetTag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const isEditableTarget =
        targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select';

      const cmd = resolveTutorialKeyCommand(e.key, {
        requireAction: step.requireAction,
        stepIndex,
        totalSteps,
        isEditableTarget,
      });

      if (cmd === 'skip') {
        e.preventDefault();
        onSkip();
      } else if (cmd === 'next') {
        e.preventDefault();
        onNext();
      } else if (cmd === 'prev') {
        e.preventDefault();
        onPrev();
      } else if (cmd === 'tab' && typeof document !== 'undefined') {
        const calloutEl = document.querySelector<HTMLElement>(
          '[data-testid="tutorial-callout-box"]',
        );
        const shared = collectSharedTutorialFocusables(step.targetSelector, calloutEl);
        if (shared.length > 0) {
          e.preventDefault();
          const activeEl = document.activeElement as HTMLElement | null;
          const currentIdx = activeEl ? shared.indexOf(activeEl) : -1;
          const nextIdx = getNextSharedFocusIndex(shared.length, currentIdx, e.shiftKey);
          shared[nextIdx]?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, step, stepIndex, totalSteps, onNext, onPrev, onSkip]);

  const cutout = useMemo(
    () => computeCutoutBox(targetRect, step?.spotlightPadding ?? 8, vw, vh),
    [targetRect, step?.spotlightPadding, vw, vh],
  );

  const defaultCalloutLayout = useMemo(
    () =>
      computeCalloutPosition(
        cutout,
        step?.placement ?? 'bottom',
        384,
        232,
        vw,
        vh,
      ),
    [cutout, step?.placement, vw, vh],
  );

  const [measuredCallout, setMeasuredCallout] = useState<{
    rect: TutorialTargetRect;
    placement: TutorialPlacement;
  } | null>(null);

  const handleCalloutPositionChange = useCallback(
    (rect: TutorialTargetRect, resolvedPlacement: TutorialPlacement) => {
      setMeasuredCallout({ rect, placement: resolvedPlacement });
    },
    [],
  );

  if (!isActive || !step) return null;

  const es = lang === 'es';
  const frameCode = `TRN-0${stepIndex + 1}`;
  const activeCalloutRect: TutorialTargetRect = measuredCallout?.rect ?? {
    top: defaultCalloutLayout.top,
    left: defaultCalloutLayout.left,
    width: defaultCalloutLayout.width,
    height: defaultCalloutLayout.height,
    right: defaultCalloutLayout.right,
    bottom: defaultCalloutLayout.bottom,
  };
  const activePlacement: TutorialPlacement =
    measuredCallout?.placement ?? defaultCalloutLayout.resolvedPlacement;

  return (
    <div
      className="tutorial-layer"
      data-testid="tutorial-spotlight-layer"
      aria-live="polite"
    >
      {/* Cuadrante 1: Superior (Top) */}
      <div
        className="tutorial-quadrant tutorial-quadrant-top"
        data-quadrant="top"
        style={{
          top: 0,
          left: 0,
          width: '100vw',
          height: `${cutout.top}px`,
        }}
        aria-hidden="true"
      />

      {/* Cuadrante 2: Inferior (Bottom) */}
      <div
        className="tutorial-quadrant tutorial-quadrant-bottom"
        data-quadrant="bottom"
        style={{
          top: `${cutout.bottom}px`,
          left: 0,
          width: '100vw',
          height: `${Math.max(0, vh - cutout.bottom)}px`,
        }}
        aria-hidden="true"
      />

      {/* Cuadrante 3: Izquierdo (Left) */}
      <div
        className="tutorial-quadrant tutorial-quadrant-left"
        data-quadrant="left"
        style={{
          top: `${cutout.top}px`,
          left: 0,
          width: `${cutout.left}px`,
          height: `${cutout.height}px`,
        }}
        aria-hidden="true"
      />

      {/* Cuadrante 4: Derecho (Right) */}
      <div
        className="tutorial-quadrant tutorial-quadrant-right"
        data-quadrant="right"
        style={{
          top: `${cutout.top}px`,
          left: `${cutout.right}px`,
          width: `${Math.max(0, vw - cutout.right)}px`,
          height: `${cutout.height}px`,
        }}
        aria-hidden="true"
      />

      {/* Marco técnico de 2px sobre el borde del recorte (pointer-events: none) */}
      {cutout.width > 0 && cutout.height > 0 && (
        <div
          className={`tutorial-cutout-frame tutorial-tone-${step.tone}`}
          data-testid="tutorial-cutout-frame"
          data-tone={step.tone}
          style={{
            top: `${cutout.top}px`,
            left: `${cutout.left}px`,
            width: `${cutout.width}px`,
            height: `${cutout.height}px`,
          }}
          aria-hidden="true"
        >
          {cutout.top >= 24 && (
            <span className="tutorial-frame-tag">
              {frameCode} ·{' '}
              {step.requireAction
                ? es
                  ? 'HAZ CLIC AQUÍ'
                  : 'CLICK HERE'
                : step.tone === 'caution'
                  ? es
                    ? 'DECISIÓN CLAVE'
                    : 'KEY TRADE-OFF'
                  : es
                    ? 'TELEMETRÍA'
                    : 'TELEMETRY'}
            </span>
          )}
        </div>
      )}

      {/* T06: Señalización vectorial ortogonal de 90° + 4 escuadras técnicas exteriores */}
      <TutorialPointer
        cutoutRect={cutout}
        calloutRect={activeCalloutRect}
        placement={activePlacement}
        tone={step.tone}
        viewportWidth={vw}
        viewportHeight={vh}
      />

      {/* T05: Recuadro táctico de instrucción con ajuste de bordes */}
      <TutorialCallout
        lang={lang}
        step={step}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        cutoutRect={cutout}
        onNext={onNext}
        onPrev={onPrev}
        onSkip={onSkip}
        drillReadout={drillReadout}
        onPositionChange={handleCalloutPositionChange}
      />
    </div>
  );
};
