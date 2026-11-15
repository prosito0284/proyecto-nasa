/**
 * Sistema de Señalizaciones Vectoriales y Escuadras Técnicas (T06)
 *
 * Responsabilidades:
 * - Dibuja en SVG una línea conectora ortogonal (ángulos técnicos de 90 grados con punta
 *   de flecha geométrica sólida y `pointer-events: none`) que une dinámicamente el borde del
 *   `TutorialCallout` con el marco iluminado del Spotlight.
 * - Renderiza 4 escuadras técnicas (corner brackets) en las esquinas exteriores del recorte
 *   iluminado para dirigir la atención visual del cadete.
 */

import React from 'react';
import type {
  TutorialPlacement,
  TutorialTargetRect,
  TutorialTone,
} from '../../types/tutorial';

export interface TutorialPointerProps {
  cutoutRect: TutorialTargetRect;
  calloutRect: TutorialTargetRect;
  placement: TutorialPlacement;
  tone: TutorialTone;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface OrthogonalVectorGeometry {
  pathD: string;
  arrowPoints: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
}

const BRACKET_OFFSET = 5;
const BRACKET_ARM = 14;

/**
 * Calcula la ruta SVG ortogonal (ángulos de 90°) y los vértices del triángulo sólido
 * de la punta de flecha que conecta `calloutRect` con `cutoutRect`.
 */
export function buildOrthogonalConnector(
  cutout: TutorialTargetRect,
  callout: TutorialTargetRect,
  placement: TutorialPlacement,
): OrthogonalVectorGeometry {
  const cutoutCenterX = Math.round(cutout.left + cutout.width / 2);
  const cutoutCenterY = Math.round(cutout.top + cutout.height / 2);
  const calloutCenterX = Math.round(callout.left + callout.width / 2);
  const calloutCenterY = Math.round(callout.top + callout.height / 2);

  if (placement === 'bottom') {
    const originX = calloutCenterX;
    const originY = Math.round(callout.top);
    const targetX = cutoutCenterX;
    const targetY = Math.round(cutout.bottom + 6);
    const midY = Math.round((originY + targetY) / 2);
    const pathD = `M ${originX} ${originY} L ${originX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
    const arrowPoints = `${targetX},${targetY - 6} ${targetX - 6},${targetY + 4} ${targetX + 6},${targetY + 4}`;
    return { pathD, arrowPoints, originX, originY, targetX, targetY };
  }

  if (placement === 'top') {
    const originX = calloutCenterX;
    const originY = Math.round(callout.bottom);
    const targetX = cutoutCenterX;
    const targetY = Math.round(cutout.top - 6);
    const midY = Math.round((originY + targetY) / 2);
    const pathD = `M ${originX} ${originY} L ${originX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
    const arrowPoints = `${targetX},${targetY + 6} ${targetX - 6},${targetY - 4} ${targetX + 6},${targetY - 4}`;
    return { pathD, arrowPoints, originX, originY, targetX, targetY };
  }

  if (placement === 'right') {
    const originX = Math.round(callout.left);
    const originY = calloutCenterY;
    const targetX = Math.round(cutout.right + 6);
    const targetY = cutoutCenterY;
    const midX = Math.round((originX + targetX) / 2);
    const pathD = `M ${originX} ${originY} L ${midX} ${originY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
    const arrowPoints = `${targetX - 6},${targetY} ${targetX + 4},${targetY - 6} ${targetX + 4},${targetY + 6}`;
    return { pathD, arrowPoints, originX, originY, targetX, targetY };
  }

  // placement === 'left'
  const originX = Math.round(callout.right);
  const originY = calloutCenterY;
  const targetX = Math.round(cutout.left - 6);
  const targetY = cutoutCenterY;
  const midX = Math.round((originX + targetX) / 2);
  const pathD = `M ${originX} ${originY} L ${midX} ${originY} L ${midX} ${targetY} L ${targetX} ${targetY}`;
  const arrowPoints = `${targetX + 6},${targetY} ${targetX - 4},${targetY - 6} ${targetX - 4},${targetY + 6}`;
  return { pathD, arrowPoints, originX, originY, targetX, targetY };
}

/**
 * Calcula los 4 trazos en L de las escuadras técnicas exteriores del recorte iluminado.
 */
export function buildCornerBrackets(cutout: TutorialTargetRect): Array<{
  id: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  d: string;
}> {
  const x0 = Math.round(cutout.left - BRACKET_OFFSET);
  const y0 = Math.round(cutout.top - BRACKET_OFFSET);
  const x1 = Math.round(cutout.right + BRACKET_OFFSET);
  const y1 = Math.round(cutout.bottom + BRACKET_OFFSET);
  const arm = Math.min(
    BRACKET_ARM,
    Math.max(8, Math.floor(Math.min(cutout.width, cutout.height) / 3)),
  );

  return [
    {
      id: 'top-left',
      d: `M ${x0} ${y0 + arm} L ${x0} ${y0} L ${x0 + arm} ${y0}`,
    },
    {
      id: 'top-right',
      d: `M ${x1 - arm} ${y0} L ${x1} ${y0} L ${x1} ${y0 + arm}`,
    },
    {
      id: 'bottom-left',
      d: `M ${x0} ${y1 - arm} L ${x0} ${y1} L ${x0 + arm} ${y1}`,
    },
    {
      id: 'bottom-right',
      d: `M ${x1 - arm} ${y1} L ${x1} ${y1} L ${x1} ${y1 - arm}`,
    },
  ];
}

export const TutorialPointer: React.FC<TutorialPointerProps> = ({
  cutoutRect,
  calloutRect,
  placement,
  tone,
  viewportWidth,
  viewportHeight,
}) => {
  if (cutoutRect.width <= 0 || cutoutRect.height <= 0) {
    return null;
  }

  const vw =
    viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1280);
  const vh =
    viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 800);

  const strokeColor = tone === 'caution' ? '#FFB300' : '#00E5FF';
  const connector = buildOrthogonalConnector(cutoutRect, calloutRect, placement);
  const brackets = buildCornerBrackets(cutoutRect);

  return (
    <svg
      className="tutorial-pointer-svg"
      data-testid="tutorial-pointer-svg"
      width={vw}
      height={vh}
      viewBox={`0 0 ${vw} ${vh}`}
      fill="none"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9502,
      }}
    >
      {/* 4 escuadras técnicas (corner brackets) en las esquinas exteriores del Spotlight */}
      <g className="tutorial-corner-brackets" data-testid="tutorial-corner-brackets">
        {brackets.map((bracket) => (
          <path
            key={bracket.id}
            data-corner-bracket={bracket.id}
            d={bracket.d}
            stroke={strokeColor}
            strokeWidth={2.5}
            strokeLinecap="square"
            strokeLinejoin="miter"
            fill="none"
          />
        ))}
      </g>

      {/* Línea conectora ortogonal (ángulos de 90 grados) entre Callout y Spotlight */}
      <path
        className="tutorial-connector-path"
        data-testid="tutorial-connector-path"
        d={connector.pathD}
        stroke={strokeColor}
        strokeWidth={2}
        strokeLinecap="square"
        strokeLinejoin="miter"
        fill="none"
      />

      {/* Nodo de anclaje cuadrado en el borde del Callout */}
      <rect
        x={connector.originX - 3}
        y={connector.originY - 3}
        width={6}
        height={6}
        fill={strokeColor}
      />

      {/* Punta de flecha geométrica sólida apuntando al marco iluminado */}
      <polygon
        className="tutorial-connector-arrow"
        data-testid="tutorial-connector-arrow"
        points={connector.arrowPoints}
        fill={strokeColor}
      />
    </svg>
  );
};
