/**
 * Motor de Iluminación (Spotlight) de 4 Cuadrantes sin Bloqueo de Clics (T03)
 *
 * Renderiza 4 paneles oscuros independientes (Top, Bottom, Left, Right) con
 * `rgba(6, 10, 18, 0.85)` y `pointer-events: auto` alrededor del elemento objetivo,
 * dejando el recorte central libre de obstrucciones cuando `requireAction` es `true`
 * y dibujando un marco técnico de 2px con `pointer-events: none` (cian para 'info',
 * ámbar para 'caution').
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
}

interface CutoutBox {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const VIEWPORT_MARGIN = 12;
const CARD_OFFSET = 14;
const DEFAULT_CARD_WIDTH = 380;
const DEFAULT_CARD_HEIGHT = 236;

function computeCutoutBox(
  rect: TutorialTargetRect | null,
  padding: number,
  vw: number,
  vh: number,
): CutoutBox {
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

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function computeCardCoordinates(
  cutout: CutoutBox,
  preferred: TutorialPlacement,
  cardW: number,
  cardH: number,
  vw: number,
  vh: number,
): { top: number; left: number; resolvedPlacement: TutorialPlacement } {
  if (cutout.width === 0 && cutout.height === 0) {
    return {
      top: Math.max(VIEWPORT_MARGIN, Math.round((vh - cardH) / 2)),
      left: Math.max(VIEWPORT_MARGIN, Math.round((vw - cardW) / 2)),
      resolvedPlacement: preferred,
    };
  }

  const spaceTop = cutout.top - VIEWPORT_MARGIN;
  const spaceBottom = vh - cutout.bottom - VIEWPORT_MARGIN;
  const spaceLeft = cutout.left - VIEWPORT_MARGIN;
  const spaceRight = vw - cutout.right - VIEWPORT_MARGIN;

  const fits: Record<TutorialPlacement, boolean> = {
    top: spaceTop >= cardH + CARD_OFFSET,
    bottom: spaceBottom >= cardH + CARD_OFFSET,
    left: vw >= 720 && spaceLeft >= cardW + CARD_OFFSET,
    right: vw >= 720 && spaceRight >= cardW + CARD_OFFSET,
  };

  let placement: TutorialPlacement = preferred;
  if (!fits[placement]) {
    const candidates: Array<{ dir: TutorialPlacement; space: number }> = [
      { dir: 'bottom', space: spaceBottom },
      { dir: 'top', space: spaceTop },
      ...(vw >= 720
        ? ([
            { dir: 'right', space: spaceRight },
            { dir: 'left', space: spaceLeft },
          ] as Array<{ dir: TutorialPlacement; space: number }>)
        : []),
    ];
    const fitting = candidates.find((c) => fits[c.dir]);
    if (fitting) {
      placement = fitting.dir;
    } else {
      candidates.sort((a, b) => b.space - a.space);
      placement = candidates[0].dir;
    }
  }

  const centerX = cutout.left + cutout.width / 2;
  const centerY = cutout.top + cutout.height / 2;
  const minLeft = VIEWPORT_MARGIN;
  const maxLeft = Math.max(VIEWPORT_MARGIN, vw - cardW - VIEWPORT_MARGIN);
  const minTop = VIEWPORT_MARGIN;
  const maxTop = Math.max(VIEWPORT_MARGIN, vh - cardH - VIEWPORT_MARGIN);

  if (placement === 'bottom') {
    return {
      top: clamp(cutout.bottom + CARD_OFFSET, minTop, maxTop),
      left: clamp(Math.round(centerX - cardW / 2), minLeft, maxLeft),
      resolvedPlacement: 'bottom',
    };
  }
  if (placement === 'top') {
    return {
      top: clamp(cutout.top - cardH - CARD_OFFSET, minTop, maxTop),
      left: clamp(Math.round(centerX - cardW / 2), minLeft, maxLeft),
      resolvedPlacement: 'top',
    };
  }
  if (placement === 'right') {
    return {
      top: clamp(Math.round(centerY - cardH / 2), minTop, maxTop),
      left: clamp(cutout.right + CARD_OFFSET, minLeft, maxLeft),
      resolvedPlacement: 'right',
    };
  }
  return {
    top: clamp(Math.round(centerY - cardH / 2), minTop, maxTop),
    left: clamp(cutout.left - cardW - CARD_OFFSET, minLeft, maxLeft),
    resolvedPlacement: 'left',
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
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [cardSize, setCardSize] = useState<{ width: number; height: number }>({
    width: DEFAULT_CARD_WIDTH,
    height: DEFAULT_CARD_HEIGHT,
  });

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  useEffect(() => {
    if (!isActive || !step || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setCardSize({ width: rect.width, height: rect.height });
    }
  }, [isActive, step, stepIndex, lang, targetRect]);

  useEffect(() => {
    if (!isActive || !step) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onSkip();
      } else if (e.key === 'ArrowRight' && !step.requireAction) {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        e.preventDefault();
        onPrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, step, stepIndex, onNext, onPrev, onSkip]);

  const cutout = useMemo(
    () => computeCutoutBox(targetRect, step?.spotlightPadding ?? 8, vw, vh),
    [targetRect, step?.spotlightPadding, vw, vh],
  );

  const cardCoords = useMemo(
    () =>
      computeCardCoordinates(
        cutout,
        step?.placement ?? 'bottom',
        cardSize.width,
        cardSize.height,
        vw,
        vh,
      ),
    [cutout, step?.placement, cardSize.width, cardSize.height, vw, vh],
  );

  if (!isActive || !step) return null;

  const es = lang === 'es';
  const isLastStep = stepIndex >= totalSteps - 1;
  const frameCode = `TRN-0${stepIndex + 1}`;

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

      {/* Ficha de instrucciones del Cuaderno de Vuelo */}
      <aside
        ref={cardRef}
        role="dialog"
        aria-modal="false"
        aria-labelledby="tutorial-card-title"
        aria-describedby="tutorial-card-body"
        className={`tutorial-card tutorial-card-tone-${step.tone}`}
        data-placement={cardCoords.resolvedPlacement}
        style={{
          top: `${cardCoords.top}px`,
          left: `${cardCoords.left}px`,
        }}
      >
        <header className="tutorial-card-header">
          <span className="tutorial-step-meta">
            <HelmetIcon size={15} />
            {es
              ? `PASO ${stepIndex + 1} DE ${totalSteps}`
              : `STEP ${stepIndex + 1} OF ${totalSteps}`}
          </span>

          <span className={`tutorial-tone-pill tutorial-tone-pill-${step.tone}`}>
            {step.tone === 'caution' ? (
              <>
                <AlertIcon size={12} /> {es ? 'ATENCIÓN' : 'CAUTION'}
              </>
            ) : (
              <>
                <CheckIcon size={12} /> {es ? 'GUÍA NASA' : 'NASA GUIDE'}
              </>
            )}
          </span>
        </header>

        <h3 id="tutorial-card-title" className="tutorial-card-title">
          {step.title[lang]}
        </h3>

        <p id="tutorial-card-body" className="tutorial-card-body">
          {step.body[lang]}
        </p>

        {step.requireAction && (
          <div className="tutorial-action-prompt" role="status">
            <ArrowIcon size={15} direction="right" />
            <span>
              {step.actionHint
                ? step.actionHint[lang]
                : es
                  ? 'Haz clic directamente en el panel iluminado para continuar.'
                  : 'Click directly inside the highlighted panel to continue.'}
            </span>
          </div>
        )}

        <footer className="tutorial-card-footer">
          <div
            className="tutorial-progress-dots"
            aria-label={
              es
                ? `Progreso del entrenamiento: paso ${stepIndex + 1} de ${totalSteps}`
                : `Training progress: step ${stepIndex + 1} of ${totalSteps}`
            }
          >
            {Array.from({ length: totalSteps }, (_, idx) => {
              const stateCls =
                idx < stepIndex
                  ? 'tutorial-progress-dot-done'
                  : idx === stepIndex
                    ? 'tutorial-progress-dot-active'
                    : '';
              return (
                <span
                  key={idx}
                  className={`tutorial-progress-dot ${stateCls}`}
                  aria-hidden="true"
                />
              );
            })}
          </div>

          <div className="tutorial-nav-btns">
            <button
              type="button"
              id="tutorial-skip-btn"
              className="tutorial-btn tutorial-btn-skip"
              onClick={onSkip}
            >
              <CloseIcon size={14} />
              {es ? 'Saltar' : 'Skip'}
            </button>

            {stepIndex > 0 && (
              <button
                type="button"
                id="tutorial-prev-btn"
                className="tutorial-btn tutorial-btn-secondary"
                onClick={onPrev}
              >
                <ArrowIcon size={14} direction="left" />
                {es ? 'Anterior' : 'Back'}
              </button>
            )}

            {!step.requireAction && (
              <button
                type="button"
                id="tutorial-next-btn"
                className="tutorial-btn tutorial-btn-primary"
                onClick={onNext}
              >
                {isLastStep
                  ? es
                    ? 'Listo'
                    : 'Done'
                  : es
                    ? 'Siguiente'
                    : 'Next'}
                <ArrowIcon size={14} direction="right" />
              </button>
            )}
          </div>
        </footer>
      </aside>
    </div>
  );
};
