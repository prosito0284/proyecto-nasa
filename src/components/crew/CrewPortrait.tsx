/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * C13 — Retratos de la Tripulación (`CrewPortrait.tsx`)
 * 4 personajes diversos y reconocibles por silueta (peinado, casco, gafas, herramienta),
 * dibujados con trazo uniforme a dos tintas (sin degradados) y 4 expresiones (`great`, `ok`, `worried`, `critical`).
 */

import React from 'react';
import { CrewMood } from '../../types/mission';

export interface CrewPortraitProps {
  memberId: string;
  mood: CrewMood;
  size?: number;
  title?: string;
  className?: string;
}

const INK = '#1B1F2A';
const PAPER = '#F2EBDD';

function getMoodAccentColor(mood: CrewMood): string {
  switch (mood) {
    case 'great':
      return '#2E7D4F'; // Verde check NASA
    case 'ok':
      return '#0B3D91'; // Azul datos NASA
    case 'worried':
      return '#8A4F00'; // Ocre precaución
    case 'critical':
      return '#FC3D21'; // Rojo alerta NASA
  }
}

export const CrewPortrait: React.FC<CrewPortraitProps> = ({
  memberId,
  mood,
  size = 48,
  title,
  className,
}) => {
  const accent = getMoodAccentColor(mood);

  /**
   * 1. Expresión facial según `mood` (16 combinaciones junto con las 4 siluetas)
   * Coordenadas de la cara centradas en (32, 33) dentro de viewBox 0 0 64 64.
   */
  const renderExpression = () => {
    const hasRoundGlasses = memberId === 'botanist';

    return (
      <g>
        {/* Gafas redondas distintivas de la Botánica */}
        {hasRoundGlasses && (
          <g stroke={INK} strokeWidth="1.6" fill="none">
            <circle cx="26" cy="31" r="4.8" />
            <circle cx="38" cy="31" r="4.8" />
            <line x1="30.8" y1="31" x2="33.2" y2="31" />
            <line x1="20" y1="30" x2="21.2" y2="30.5" />
            <line x1="42.8" y1="30.5" x2="44" y2="30" />
          </g>
        )}

        {mood === 'great' && (
          <g>
            {/* Cejas elevadas alegres */}
            <path
              d="M23 26.2q3-2 6 0M35 26.2q3-2 6 0"
              stroke={INK}
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
            />
            {/* Ojos brillantes en arco feliz */}
            <path
              d="M24 31q2-2.2 4 0M36 31q2-2.2 4 0"
              stroke={INK}
              strokeWidth="1.8"
              fill="none"
              strokeLinecap="round"
            />
            {/* Sonrisa amplia y confiada */}
            <path
              d="M26.5 36.8h11c0 3.4-2.5 5.4-5.5 5.4s-5.5-2-5.5-5.4z"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </g>
        )}

        {mood === 'ok' && (
          <g>
            {/* Cejas serenas horizontales */}
            <path
              d="M23.5 27h5M35.5 27h5"
              stroke={INK}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            {/* Ojos atentos */}
            <circle cx="26" cy="31" r="1.5" fill={INK} />
            <circle cx="38" cy="31" r="1.5" fill={INK} />
            {/* Sonrisa tranquila de control de misión */}
            <path
              d="M27.5 38q4.5 2.8 9 0"
              stroke={INK}
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
            />
          </g>
        )}

        {mood === 'worried' && (
          <g>
            {/* Cejas arqueadas de preocupación */}
            <path
              d="M23 28.2l5.5-2M41 28.2l-5.5-2"
              stroke={INK}
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            {/* Ojos abiertos alerta */}
            <circle cx="26" cy="31.3" r="1.7" fill={INK} />
            <circle cx="38" cy="31.3" r="1.7" fill={INK} />
            {/* Boca ondulada tensa */}
            <path
              d="M27 39.5q2.5-2.2 5 0t5 0"
              stroke={INK}
              strokeWidth="1.7"
              fill="none"
              strokeLinecap="round"
            />
            {/* Gota de sudor en la sien */}
            <path
              d="M44.5 24.5c0 0-2 2.8-2 4.2a2 2 0 0 0 4 0c0-1.4-2-4.2-2-4.2z"
              fill={PAPER}
              stroke={accent}
              strokeWidth="1.5"
            />
          </g>
        )}

        {mood === 'critical' && (
          <g>
            {/* Cejas fruncidas de emergencia */}
            <path
              d="M23 26l5.8 2.4M41 26l-5.8 2.4"
              stroke={accent}
              strokeWidth="1.9"
              strokeLinecap="round"
            />
            {/* Ojos en tensión máxima */}
            <path
              d="M24 30.5l4 1.2-4 1.2M40 30.5l-4 1.2 4 1.2"
              stroke={INK}
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Boca abierta de alarma */}
            <rect
              x="28"
              y="36.8"
              width="8"
              height="4.8"
              rx="1.5"
              fill={PAPER}
              stroke={accent}
              strokeWidth="1.7"
            />
            <line x1="28.5" y1="39.2" x2="35.5" y2="39.2" stroke={INK} strokeWidth="1.2" />
            {/* Doble gota de sudor / tensión */}
            <path
              d="M45 23c0 0-2 2.8-2 4.2a2 2 0 0 0 4 0c0-1.4-2-4.2-2-4.2z"
              fill={PAPER}
              stroke={accent}
              strokeWidth="1.5"
            />
          </g>
        )}
      </g>
    );
  };

  /**
   * 2. Silueta distintiva por personaje (reconocible sin depender del color):
   * - `commander`: diadema de radio con micrófono boom + cabello rizado alto estructurado + barras de mando
   * - `engineer`: gafas protectoras abatibles sobre la frente + moño técnico asimétrico + llave inglesa en hombro
   * - `botanist`: trenza corona / coleta lateral + gafas ópticas + brote botánico en solapa
   * - `medic`: aro de casco/visera médica con dosímetro frontal + corte bob/pañuelo técnico + cruz de dosimetría
   */
  const renderCharacterSilhouette = () => {
    switch (memberId) {
      case 'commander':
        return (
          <g>
            {/* Hombros y cuello de traje de vuelo con barras de comandante */}
            <path
              d="M12 58c1.5-8.5 8.5-13 20-13s18.5 4.5 20 13"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.8"
            />
            <path d="M24 45.5L32 53l8-7.5" fill="none" stroke={accent} strokeWidth="1.8" />
            {/* Insignia de doble barra de mando */}
            <line x1="18" y1="52" x2="23" y2="52" stroke={accent} strokeWidth="2" />
            <line x1="18" y1="55" x2="23" y2="55" stroke={accent} strokeWidth="2" />

            {/* Silueta de cabello rizado texturizado alto */}
            <path
              d="M19 27c-1-6 2-12 7-13 3-2 9-2 12 0 5 1 8 7 7 13"
              fill={INK}
              stroke={INK}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />

            {/* Contorno de cabeza y orejas */}
            <path
              d="M20 28v6c0 6.8 5.2 12 12 12s12-5.2 12-12v-6c0-5-5-8.5-12-8.5S20 23 20 28z"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.75"
            />

            {/* Diadema de comunicación Houston + auriculares y micrófono boom */}
            <path
              d="M18 30a14 14 0 0 1 28 0"
              fill="none"
              stroke={accent}
              strokeWidth="1.8"
            />
            <rect
              x="16.5"
              y="28"
              width="3.5"
              height="7"
              rx="1"
              fill={accent}
              stroke={INK}
              strokeWidth="1.4"
            />
            <rect
              x="44"
              y="28"
              width="3.5"
              height="7"
              rx="1"
              fill={accent}
              stroke={INK}
              strokeWidth="1.4"
            />
            <path
              d="M46 34c0 4.5-4.5 7-10 7"
              fill="none"
              stroke={INK}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="35.5" cy="41" r="1.6" fill={accent} />
          </g>
        );

      case 'engineer':
        return (
          <g>
            {/* Hombros de overol de ingeniería + llave hexagonal asomando */}
            <path
              d="M12 58c1.5-8.5 8.5-13 20-13s18.5 4.5 20 13"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.8"
            />
            {/* Herramienta: llave inglesa en el hombro derecho */}
            <path
              d="M45 48l5-6m-1.5-2.5a3 3 0 1 1 3.5 3.5"
              fill="none"
              stroke={accent}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {/* Símbolo de rayo eléctrico en el pecho */}
            <path
              d="M33 48l-3 4.5h3.5L31 57"
              fill="none"
              stroke={accent}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Moño técnico superior para silueta inconfundible */}
            <circle cx="32" cy="11.5" r="4.2" fill={INK} stroke={INK} strokeWidth="1.4" />

            {/* Cabeza */}
            <path
              d="M20 28v6c0 6.8 5.2 12 12 12s12-5.2 12-12v-6c0-5-5-8.5-12-8.5S20 23 20 28z"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.75"
            />

            {/* Gafas protectoras de taller (goggles) apoyadas sobre la frente */}
            <path d="M19.5 22h25" stroke={INK} strokeWidth="1.8" />
            <rect
              x="21.5"
              y="17"
              width="9"
              height="6"
              rx="1.5"
              fill={PAPER}
              stroke={accent}
              strokeWidth="1.75"
            />
            <rect
              x="33.5"
              y="17"
              width="9"
              height="6"
              rx="1.5"
              fill={PAPER}
              stroke={accent}
              strokeWidth="1.75"
            />
          </g>
        );

      case 'botanist':
        return (
          <g>
            {/* Hombros con cuello de laboratorio Veggie + hoja botánica en solapa */}
            <path
              d="M12 58c1.5-8.5 8.5-13 20-13s18.5 4.5 20 13"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.8"
            />
            {/* Brote de planta hidropónica en la solapa izquierda */}
            <path
              d="M21 56v-7m0 3c-3.5 0-5-2.2-5-4.5 2.8 0 5 1.8 5 4.5zm0-1.5c3.5 0 5-2.2 5-4.5-2.8 0-5 1.8-5 4.5z"
              fill="none"
              stroke={accent}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Trenzas laterales / silueta de cabello trenzado */}
            <path
              d="M19 26c-2.5 5-2.5 13-1 18M45 26c2.5 5 2.5 13 1 18"
              fill="none"
              stroke={INK}
              strokeWidth="3.2"
              strokeLinecap="round"
            />

            {/* Cabeza */}
            <path
              d="M20 28v6c0 6.8 5.2 12 12 12s12-5.2 12-12v-6c0-5-5-8.5-12-8.5S20 23 20 28z"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.75"
            />

            {/* Corona trenzada / flequillo dividido */}
            <path
              d="M19.5 26c1.5-6.5 6.5-10 12.5-10s11 3.5 12.5 10c-4-2.5-8.5-3.5-12.5-1.5-4-2-8.5-1-12.5 1.5z"
              fill={INK}
              stroke={INK}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </g>
        );

      case 'medic':
      default:
        return (
          <g>
            {/* Hombros con anillo de cuello de traje presurizado + emblema médico/dosímetro */}
            <path
              d="M12 58c1.5-8.5 8.5-13 20-13s18.5 4.5 20 13"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.8"
            />
            <ellipse
              cx="32"
              cy="46.5"
              rx="10"
              ry="2.5"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.6"
            />
            {/* Cruz médica de bioastronáutica */}
            <path
              d="M32 50.5v6M29 53.5h6"
              stroke={accent}
              strokeWidth="2.2"
              strokeLinecap="round"
            />

            {/* Cúpula exterior de casco ligero / visor de dosimetría */}
            <path
              d="M15 34a17 17 0 1 1 34 0"
              fill="none"
              stroke={accent}
              strokeWidth="1.6"
              strokeDasharray="4 2"
            />

            {/* Cabeza y cabello corto asimétrico limpio */}
            <path
              d="M20 28v6c0 6.8 5.2 12 12 12s12-5.2 12-12v-6c0-5-5-8.5-12-8.5S20 23 20 28z"
              fill={PAPER}
              stroke={INK}
              strokeWidth="1.75"
            />
            {/* Banda frontal con espejo/sensor RAD de radiación */}
            <path d="M20 23.5h24" stroke={INK} strokeWidth="2" />
            <circle
              cx="32"
              cy="22.5"
              r="3.2"
              fill={PAPER}
              stroke={accent}
              strokeWidth="1.8"
            />
            <circle cx="32" cy="22.5" r="1" fill={accent} />
          </g>
        );
    }
  };

  /**
   * 3. Indicador de estado en la esquina superior derecha del retrato
   */
  const renderMoodCornerBadge = () => {
    switch (mood) {
      case 'great':
        return (
          <g transform="translate(53, 11)">
            <circle cx="0" cy="0" r="6" fill={accent} />
            <path
              d="M-2.5 0.2l1.7 1.8 3.5-3.6"
              fill="none"
              stroke={PAPER}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );
      case 'ok':
        return (
          <g transform="translate(53, 11)">
            <circle cx="0" cy="0" r="5" fill={PAPER} stroke={accent} strokeWidth="1.8" />
            <circle cx="0" cy="0" r="2" fill={accent} />
          </g>
        );
      case 'worried':
        return (
          <g transform="translate(53, 11)">
            <polygon
              points="0,-6 6,5 -6,5"
              fill={PAPER}
              stroke={accent}
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <line x1="0" y1="-2" x2="0" y2="1.5" stroke={accent} strokeWidth="1.7" />
            <circle cx="0" cy="3.3" r="0.9" fill={accent} />
          </g>
        );
      case 'critical':
        return (
          <g transform="translate(53, 11)">
            <rect
              x="-6"
              y="-6"
              width="12"
              height="12"
              rx="1.5"
              fill={accent}
            />
            <line
              x1="0"
              y1="-3.2"
              x2="0"
              y2="0.8"
              stroke={PAPER}
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="0" cy="3.2" r="1.1" fill={PAPER} />
          </g>
        );
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`crew-portrait-svg crew-member-${memberId} crew-mood-${mood} ${
        className ?? ''
      }`.trim()}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      {/* Marco técnico tipo ficha de cuaderno de vuelo */}
      <rect
        x="2"
        y="2"
        width="60"
        height="60"
        rx="2"
        fill={PAPER}
        stroke={mood === 'critical' ? accent : INK}
        strokeWidth={mood === 'critical' ? '2.4' : '1.8'}
      />

      {/* Borde interior punteado si está en estado crítico o preocupado */}
      {(mood === 'critical' || mood === 'worried') && (
        <rect
          x="5"
          y="5"
          width="54"
          height="54"
          rx="1"
          fill="none"
          stroke={accent}
          strokeWidth="1.2"
          strokeDasharray={mood === 'critical' ? '4 2' : '2 3'}
        />
      )}

      {/* Silueta del personaje + Expresión facial */}
      {renderCharacterSilhouette()}
      {renderExpression()}
      {renderMoodCornerBadge()}
    </svg>
  );
};
