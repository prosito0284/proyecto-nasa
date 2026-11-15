/**
 * Recuadro Táctico de Instrucción con Ajuste Inteligente de Bordes (T05)
 *
 * Características:
 * - Estética de panel de instrumentos NASA: fondo sólido oscuro de alto contraste (#0B101B),
 *   borde sólido de 2 px (#00E5FF para 'info', #FFB300 para 'caution'), esquinas de 2 px,
 *   cero degradados y cero sombras difusas.
 * - Rótulo superior en mayúsculas de máximo 3 palabras ("PASO X DE Y" / "STEP X OF Y"),
 *   título en tipo oración y cuerpo mínimo de 16 px (máximo 2 frases).
 * - Cálculo inteligente de posición con inversión y ajuste automático al viewport para
 *   que nunca quede cortado en pantallas pequeñas.
 * - Botones táctiles de mínimo 44x44 px ("Anterior", "Siguiente" o indicador de acción, y "Saltar").
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  Language,
  TutorialPlacement,
  TutorialStep,
  TutorialTargetRect,
} from '../../types/tutorial';
import {
  AlertIcon,
  ArrowIcon,
  CheckIcon,
  CloseIcon,
  HelmetIcon,
} from '../icons';

export interface TutorialCalloutProps {
  lang: Language;
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  cutoutRect: TutorialTargetRect;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  /** Callback opcional para reportar la caja y orientación final a TutorialPointer (T06) */
  onPositionChange?: (
    calloutRect: TutorialTargetRect,
    resolvedPlacement: TutorialPlacement,
  ) => void;
}

export interface ComputedCalloutLayout {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
  resolvedPlacement: TutorialPlacement;
}

const VIEWPORT_MARGIN = 12;
const CALLOUT_GAP = 22;
const DEFAULT_CALLOUT_WIDTH = 384;
const DEFAULT_CALLOUT_HEIGHT = 232;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getOppositePlacement(placement: TutorialPlacement): TutorialPlacement {
  switch (placement) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    case 'right':
      return 'left';
  }
}

/**
 * Calcula las coordenadas del recuadro de instrucción respecto al recorte iluminado.
 * Si el recuadro se sale del viewport en la dirección `preferred`, invierte primero al lado
 * opuesto o elige el cuadrante con mayor espacio disponible y ajusta las coordenadas dentro
 * de los márgenes seguros de la pantalla.
 */
export function computeCalloutPosition(
  cutout: TutorialTargetRect,
  preferred: TutorialPlacement,
  cardWidth: number,
  cardHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): ComputedCalloutLayout {
  const safeW = Math.min(
    cardWidth > 0 ? cardWidth : DEFAULT_CALLOUT_WIDTH,
    Math.max(260, viewportWidth - VIEWPORT_MARGIN * 2),
  );
  const safeH = cardHeight > 0 ? cardHeight : DEFAULT_CALLOUT_HEIGHT;

  if (cutout.width <= 0 || cutout.height <= 0) {
    const centeredTop = clamp(
      Math.round((viewportHeight - safeH) / 2),
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, viewportHeight - safeH - VIEWPORT_MARGIN),
    );
    const centeredLeft = clamp(
      Math.round((viewportWidth - safeW) / 2),
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, viewportWidth - safeW - VIEWPORT_MARGIN),
    );
    return {
      top: centeredTop,
      left: centeredLeft,
      width: safeW,
      height: safeH,
      right: centeredLeft + safeW,
      bottom: centeredTop + safeH,
      resolvedPlacement: preferred,
    };
  }

  const spaceTop = cutout.top - VIEWPORT_MARGIN;
  const spaceBottom = viewportHeight - cutout.bottom - VIEWPORT_MARGIN;
  const spaceLeft = cutout.left - VIEWPORT_MARGIN;
  const spaceRight = viewportWidth - cutout.right - VIEWPORT_MARGIN;

  const canPlaceHorizontally = viewportWidth >= 700;
  const fits: Record<TutorialPlacement, boolean> = {
    top: spaceTop >= safeH + CALLOUT_GAP,
    bottom: spaceBottom >= safeH + CALLOUT_GAP,
    left: canPlaceHorizontally && spaceLeft >= safeW + CALLOUT_GAP,
    right: canPlaceHorizontally && spaceRight >= safeW + CALLOUT_GAP,
  };

  let resolved: TutorialPlacement = preferred;
  if (!fits[resolved]) {
    const opposite = getOppositePlacement(preferred);
    if (fits[opposite]) {
      resolved = opposite;
    } else {
      const candidates: Array<{ dir: TutorialPlacement; space: number }> = [
        { dir: 'bottom', space: spaceBottom },
        { dir: 'top', space: spaceTop },
        ...(canPlaceHorizontally
          ? ([
              { dir: 'right', space: spaceRight },
              { dir: 'left', space: spaceLeft },
            ] as Array<{ dir: TutorialPlacement; space: number }>)
          : []),
      ];
      const firstFitting = candidates.find((c) => fits[c.dir]);
      if (firstFitting) {
        resolved = firstFitting.dir;
      } else {
        candidates.sort((a, b) => b.space - a.space);
        resolved = candidates[0].dir;
      }
    }
  }

  const minLeft = VIEWPORT_MARGIN;
  const maxLeft = Math.max(VIEWPORT_MARGIN, viewportWidth - safeW - VIEWPORT_MARGIN);
  const minTop = VIEWPORT_MARGIN;
  const maxTop = Math.max(VIEWPORT_MARGIN, viewportHeight - safeH - VIEWPORT_MARGIN);

  const centerX = cutout.left + cutout.width / 2;
  const centerY = cutout.top + cutout.height / 2;

  let top = minTop;
  let left = minLeft;

  if (resolved === 'bottom') {
    top = clamp(Math.round(cutout.bottom + CALLOUT_GAP), minTop, maxTop);
    left = clamp(Math.round(centerX - safeW / 2), minLeft, maxLeft);
  } else if (resolved === 'top') {
    top = clamp(Math.round(cutout.top - safeH - CALLOUT_GAP), minTop, maxTop);
    left = clamp(Math.round(centerX - safeW / 2), minLeft, maxLeft);
  } else if (resolved === 'right') {
    top = clamp(Math.round(centerY - safeH / 2), minTop, maxTop);
    left = clamp(Math.round(cutout.right + CALLOUT_GAP), minLeft, maxLeft);
  } else {
    top = clamp(Math.round(centerY - safeH / 2), minTop, maxTop);
    left = clamp(Math.round(cutout.left - safeW - CALLOUT_GAP), minLeft, maxLeft);
  }

  return {
    top,
    left,
    width: safeW,
    height: safeH,
    right: left + safeW,
    bottom: top + safeH,
    resolvedPlacement: resolved,
  };
}

export const TutorialCallout: React.FC<TutorialCalloutProps> = ({
  lang,
  step,
  stepIndex,
  totalSteps,
  cutoutRect,
  onNext,
  onPrev,
  onSkip,
  onPositionChange,
}) => {
  const calloutRef = useRef<HTMLElement | null>(null);
  const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number }>({
    width: DEFAULT_CALLOUT_WIDTH,
    height: DEFAULT_CALLOUT_HEIGHT,
  });

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  useEffect(() => {
    if (!calloutRef.current) return;
    const rect = calloutRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setMeasuredSize((prev) =>
        Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1
          ? { width: rect.width, height: rect.height }
          : prev,
      );
    }
  }, [step, stepIndex, lang, cutoutRect]);

  const layout = useMemo(
    () =>
      computeCalloutPosition(
        cutoutRect,
        step.placement,
        measuredSize.width,
        measuredSize.height,
        vw,
        vh,
      ),
    [cutoutRect, step.placement, measuredSize.width, measuredSize.height, vw, vh],
  );

  useEffect(() => {
    onPositionChange?.(
      {
        top: layout.top,
        left: layout.left,
        width: layout.width,
        height: layout.height,
        right: layout.right,
        bottom: layout.bottom,
      },
      layout.resolvedPlacement,
    );
  }, [layout, onPositionChange]);

  const es = lang === 'es';
  const isLastStep = stepIndex >= totalSteps - 1;

  // Rótulo superior en mayúsculas de máximo 3 palabras (Regla tipográfica Ronda 4 + T05)
  const stepEyebrow = es
    ? `PASO ${stepIndex + 1} DE ${totalSteps}`
    : `STEP ${stepIndex + 1} OF ${totalSteps}`;

  return (
    <aside
      ref={calloutRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby="tutorial-callout-title"
      aria-describedby="tutorial-callout-body"
      data-testid="tutorial-callout-box"
      data-placement={layout.resolvedPlacement}
      data-tone={step.tone}
      className={`tutorial-card tutorial-callout tutorial-card-tone-${step.tone}`}
      style={{
        top: `${layout.top}px`,
        left: `${layout.left}px`,
      }}
    >
      <header className="tutorial-card-header">
        <span className="tutorial-step-meta">
          <HelmetIcon size={15} />
          <span>{stepEyebrow}</span>
        </span>

        <span className={`tutorial-tone-pill tutorial-tone-pill-${step.tone}`}>
          {step.tone === 'caution' ? (
            <>
              <AlertIcon size={12} />
              <span>{es ? 'ATENCIÓN' : 'CAUTION'}</span>
            </>
          ) : (
            <>
              <CheckIcon size={12} />
              <span>{es ? 'TELEMETRÍA' : 'TELEMETRY'}</span>
            </>
          )}
        </span>
      </header>

      <h3 id="tutorial-callout-title" className="tutorial-card-title">
        {step.title[lang]}
      </h3>

      <p id="tutorial-callout-body" className="tutorial-card-body">
        {step.body[lang]}
      </p>

      {step.requireAction && (
        <div
          className="tutorial-action-prompt"
          data-testid="tutorial-action-indicator"
          role="status"
        >
          <ArrowIcon size={15} direction="right" />
          <span>
            {step.actionHint
              ? step.actionHint[lang]
              : es
                ? 'Interactúa con el control iluminado para avanzar.'
                : 'Interact with the highlighted control to advance.'}
          </span>
        </div>
      )}

      <footer className="tutorial-card-footer">
        <button
          type="button"
          id="tutorial-skip-btn"
          className="tutorial-btn tutorial-btn-skip"
          onClick={onSkip}
        >
          <CloseIcon size={14} />
          <span>{es ? 'Saltar' : 'Skip'}</span>
        </button>

        <div className="tutorial-nav-btns">
          <button
            type="button"
            id="tutorial-prev-btn"
            className="tutorial-btn tutorial-btn-secondary"
            disabled={stepIndex === 0}
            onClick={onPrev}
          >
            <ArrowIcon size={14} direction="left" />
            <span>{es ? 'Anterior' : 'Back'}</span>
          </button>

          {!step.requireAction && (
            <button
              type="button"
              id="tutorial-next-btn"
              className="tutorial-btn tutorial-btn-primary"
              onClick={onNext}
            >
              <span>
                {isLastStep
                  ? es
                    ? 'Listo'
                    : 'Done'
                  : es
                    ? 'Siguiente'
                    : 'Next'}
              </span>
              <ArrowIcon size={14} direction="right" />
            </button>
          )}
        </div>
      </footer>
    </aside>
  );
};
