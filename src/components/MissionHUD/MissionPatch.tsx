/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * C10 & P02 — Parches Bordados de Misión (NASA Flight Patches SVG)
 * Un emblema vectorial distinto para cada uno de los 14 parches persistentes del catálogo.
 * - `earned === true`: parche bordado a color plano (azul NASA, rojo vector, verde misión, tinta y papel) con costura perimetral.
 * - `earned === false`: silueta técnica en contorno punteado sobre el papel del cuaderno de vuelo.
 */

import React from 'react';

export interface MissionPatchProps {
  badgeId: string;
  earned: boolean;
  size?: number;
  title?: string;
  className?: string;
}

const INK = '#1B1F2A';
const PAPER = '#F2EBDD';
const NASA_BLUE = '#0B3D91';
const NASA_RED = '#FC3D21';
const OK_GREEN = '#2E7D4F';
const AMBER_INK = '#8A4F00';

export const MissionPatch: React.FC<MissionPatchProps> = ({
  badgeId,
  earned,
  size = 48,
  title,
  className,
}) => {
  const strokeColor = earned ? PAPER : INK;
  const accentFill = earned ? NASA_RED : 'none';
  const primaryFill = earned ? NASA_BLUE : 'none';
  const greenFill = earned ? OK_GREEN : 'none';
  const amberFill = earned ? AMBER_INK : 'none';
  const dashPattern = earned ? undefined : '2.5 2.5';

  const renderEmblem = () => {
    switch (badgeId) {
      case 'solar-guardian':
        // Sol en erupción arriba + escudo deflector chevron abajo
        return (
          <g>
            {/* Corona solar */}
            <circle
              cx="32"
              cy="21"
              r="6"
              fill={accentFill}
              stroke={earned ? PAPER : INK}
              strokeWidth="1.6"
              strokeDasharray={dashPattern}
            />
            <path
              d="M32 11v3M23 15l2 2M41 15l-2 2M19 22h3M42 22h3"
              stroke={earned ? NASA_RED : INK}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
            {/* Escudo magnético deflector */}
            <path
              d="M20 29l12-4 12 4v9c0 6.5-5.2 11.2-12 13.5C25.2 49.2 20 44.5 20 38v-9z"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            <path
              d="M25 36l7-3 7 3"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'eclss-master':
        // Gota de agua reciclada + ciclo cerrado de soporte vital O2/H2O
        return (
          <g>
            {/* Anillo de reciclaje cerrado */}
            <circle
              cx="32"
              cy="32"
              r="16"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeDasharray={earned ? '6 3' : '2.5 2.5'}
            />
            {/* Gota central */}
            <path
              d="M32 18c0 0-9 10.2-9 16a9 9 0 0 0 18 0c0-5.8-9-16-9-16z"
              fill={greenFill}
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            {/* Burbujas O2 */}
            <circle
              cx="29"
              cy="35"
              r="2.2"
              fill={earned ? PAPER : 'none'}
              stroke={ earned ? PAPER : INK }
              strokeWidth="1.2"
            />
            <circle
              cx="35"
              cy="32"
              r="1.6"
              fill={earned ? PAPER : 'none'}
              stroke={ earned ? PAPER : INK }
              strokeWidth="1.2"
            />
          </g>
        );

      case 'space-farmer':
        // Cúpula hidropónica + brote botánico de tres hojas
        return (
          <g>
            {/* Domo agrícola */}
            <path
              d="M17 42a15 15 0 0 1 30 0Z"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            {/* Surcos de regolito */}
            <path
              d="M15 42h34M19 46h26"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
            {/* Tallo y hojas */}
            <path
              d="M32 42V24"
              stroke={earned ? PAPER : INK}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
            <path
              d="M32 34c-6 0-9-4-9-8 5 0 9 3 9 8z"
              fill={greenFill}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            <path
              d="M32 30c6 0 9-4 9-8-5 0-9 3-9 8z"
              fill={greenFill}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'power-engineer':
        // Alas de paneles solares + rayo de alta tensión en el núcleo
        return (
          <g>
            {/* Alas fotovoltaicas izquierda y derecha */}
            <rect
              x="12"
              y="26"
              width="12"
              height="12"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray={dashPattern}
            />
            <rect
              x="40"
              y="26"
              width="12"
              height="12"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray={dashPattern}
            />
            <path
              d="M18 26v12M12 32h12M46 26v12M40 32h12"
              stroke={strokeColor}
              strokeWidth="1.1"
              strokeDasharray={dashPattern}
            />
            {/* Rayo central */}
            <polygon
              points="35,15 24,33 32,33 29,49 40,31 32,31"
              fill={accentFill}
              stroke={strokeColor}
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'alara-champion':
        // Octágono de blindaje ALARA + trébol de dosimetría controlada
        return (
          <g>
            <polygon
              points="24,15 40,15 49,24 49,40 40,49 24,49 15,40 15,24"
              fill={amberFill}
              stroke={strokeColor}
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            <circle
              cx="32"
              cy="32"
              r="3.2"
              fill={earned ? PAPER : 'none'}
              stroke={strokeColor}
              strokeWidth="1.6"
            />
            <path
              d="M32 20v6M22 38l5.2-3M42 38l-5.2-3"
              stroke={strokeColor}
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'star-scientist':
        // Órbita atómica cruzada + estrella polar de descubrimiento
        return (
          <g>
            <ellipse
              cx="32"
              cy="32"
              rx="17"
              ry="7"
              transform="rotate(-30 32 32)"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeDasharray={dashPattern}
            />
            <ellipse
              cx="32"
              cy="32"
              rx="17"
              ry="7"
              transform="rotate(30 32 32)"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeDasharray={dashPattern}
            />
            <polygon
              points="32,17 35,28 46,32 35,36 32,47 29,36 18,32 29,28"
              fill={accentFill}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'isru-pioneer':
        // Cristal hexagonal de hielo polar + perforadora de regolito ISRU
        return (
          <g>
            {/* Estrato planetario */}
            <path
              d="M15 43h34"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
            {/* Cristal de agua/oxígeno in-situ */}
            <polygon
              points="32,16 43,23 43,37 32,44 21,37 21,23"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            {/* Vetas internas del cristal */}
            <path
              d="M32 16v28M21 23l22 14M43 23L21 37"
              stroke={strokeColor}
              strokeWidth="1.2"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'happy-crew':
        // Casco EVA de comandante + estrellas de bienestar de la tripulación
        return (
          <g>
            <path
              d="M20 35a12 12 0 1 1 24 0v7a3 3 0 0 1-3 3H23a3 3 0 0 1-3-3v-7z"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            {/* Visor dorado/rojo */}
            <rect
              x="24"
              y="27"
              width="16"
              height="10"
              rx="4"
              fill={accentFill}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeDasharray={dashPattern}
            />
            {/* Reflejo del visor */}
            <path
              d="M27 30h5"
              stroke={earned ? PAPER : INK}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </g>
        );

      case 'dust-survivor':
        // Vórtice de tormenta marciana + torre de energía firme
        return (
          <g>
            {/* Ráfagas de polvo */}
            <path
              d="M15 24h24c3 0 3-4 0-4M13 32h32c4 0 4 4 0 4M17 40h22"
              fill="none"
              stroke={earned ? NASA_RED : INK}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
            {/* Torre / mástil resistente */}
            <polygon
              points="32,16 39,46 25,46"
              fill={greenFill}
              stroke={strokeColor}
              strokeWidth="1.7"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            <circle
              cx="32"
              cy="22"
              r="2.5"
              fill={earned ? PAPER : 'none'}
              stroke={strokeColor}
              strokeWidth="1.3"
            />
          </g>
        );

      case 'training-graduate':
        // Consola de encendido con 4 indicadores + vector orbital de despegue
        return (
          <g>
            {/* Panel de secuencia de encendido */}
            <rect
              x="16"
              y="29"
              width="32"
              height="16"
              rx="2"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.7"
              strokeDasharray={dashPattern}
            />
            {/* 4 luces de secuencia activadas */}
            <circle cx="22" cy="37" r="2" fill={greenFill} stroke={strokeColor} strokeWidth="1.2" />
            <circle cx="28.5" cy="37" r="2" fill={greenFill} stroke={strokeColor} strokeWidth="1.2" />
            <circle cx="35.5" cy="37" r="2" fill={greenFill} stroke={strokeColor} strokeWidth="1.2" />
            <circle cx="42" cy="37" r="2" fill={accentFill} stroke={strokeColor} strokeWidth="1.2" />
            {/* Vector de ascenso */}
            <polygon
              points="32,14 40,26 35,26 35,29 29,29 29,26 24,26"
              fill={accentFill}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'lunar-commander':
        // Luna con cráteres + banderín polar Artemis en Shackleton
        return (
          <g>
            {/* Disco lunar */}
            <circle
              cx="30"
              cy="34"
              r="12.5"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeDasharray={dashPattern}
            />
            {/* Cráteres lunares */}
            <circle
              cx="24.5"
              cy="31"
              r="2.6"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeDasharray={dashPattern}
            />
            <circle
              cx="34"
              cy="38.5"
              r="3"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.3"
              strokeDasharray={dashPattern}
            />
            {/* Mástil y banderín polar */}
            <path
              d="M36 22V14"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
            <polygon
              points="36,14 48,18 36,22"
              fill={accentFill}
              stroke={strokeColor}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            {/* Anillo orbital */}
            <path
              d="M15 24c8-5 24-4 34 3"
              fill="none"
              stroke={earned ? PAPER : INK}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'mars-commander':
        // Planeta rojo Marte con órbita + antena de rover en Cráter Jezero
        return (
          <g>
            {/* Horizonte marciano */}
            <circle
              cx="32"
              cy="33"
              r="12"
              fill={accentFill}
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeDasharray={dashPattern}
            />
            {/* Banda ecuatorial del cráter */}
            <path
              d="M21.5 31c6 2.2 15 2.2 21 0"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.4"
              strokeDasharray={dashPattern}
            />
            {/* Mástil científico */}
            <path
              d="M32 21v-5M29 18h6"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
            {/* Trayectoria orbital */}
            <ellipse
              cx="32"
              cy="33"
              rx="18"
              ry="6.5"
              transform="rotate(-20 32 33)"
              fill="none"
              stroke={earned ? PAPER : INK}
              strokeWidth="1.5"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'quiz-ace':
        // Hoja de verificación científica + sello check de aprobación
        return (
          <g>
            {/* Carpeta / hoja de examen */}
            <rect
              x="19"
              y="16"
              width="26"
              height="32"
              rx="2"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.7"
              strokeDasharray={dashPattern}
            />
            {/* Pinza superior */}
            <rect
              x="26"
              y="14"
              width="12"
              height="4"
              rx="1"
              fill={accentFill}
              stroke={strokeColor}
              strokeWidth="1.4"
              strokeDasharray={dashPattern}
            />
            {/* Líneas de ficha + sello de acierto */}
            <path
              d="M24 24h16M24 29h10"
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeDasharray={dashPattern}
            />
            <circle
              cx="33"
              cy="39"
              r="6.5"
              fill={greenFill}
              stroke={strokeColor}
              strokeWidth="1.6"
              strokeDasharray={dashPattern}
            />
            <path
              d="M29.8 39l2.3 2.3 4.3-4.3"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      case 'emergency-responder':
        // Baliza romboidal de alerta + onda de telemetría estabilizada
        return (
          <g>
            <polygon
              points="32,14 49,32 32,50 15,32"
              fill={accentFill}
              stroke={strokeColor}
              strokeWidth="1.8"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
            <rect
              x="21"
              y="25"
              width="22"
              height="14"
              rx="1"
              fill={primaryFill}
              stroke={strokeColor}
              strokeWidth="1.4"
              strokeDasharray={dashPattern}
            />
            {/* Pulso estable */}
            <polyline
              points="23,32 27,32 29.5,27.5 32.5,36.5 35,32 41,32"
              fill="none"
              stroke={earned ? '#FFFFFF' : INK}
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashPattern}
            />
          </g>
        );

      default:
        return (
          <polygon
            points="32,16 36,26 47,27 39,35 41,46 32,40 23,46 25,35 17,27 28,26"
            fill={accentFill}
            stroke={strokeColor}
            strokeWidth="1.7"
            strokeLinejoin="round"
            strokeDasharray={dashPattern}
          />
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
      className={`mission-patch-svg ${earned ? 'patch-is-earned' : 'patch-is-unearned'} ${
        className ?? ''
      }`.trim()}
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}

      {/* Fondo circular del parche bordado */}
      <circle
        cx="32"
        cy="32"
        r="29"
        fill={earned ? INK : 'none'}
        stroke={INK}
        strokeWidth={earned ? '2.2' : '1.6'}
        strokeDasharray={earned ? undefined : '4 3'}
      />

      {/* Anillo de costura bordada (stitched merrow border) */}
      <circle
        cx="32"
        cy="32"
        r="25"
        fill={earned ? '#14233C' : 'none'}
        stroke={earned ? PAPER : INK}
        strokeWidth="1.4"
        strokeDasharray="3 2"
      />

      {/* Estrellas técnicas laterales del parche */}
      <circle cx="10" cy="32" r="1.3" fill={earned ? NASA_RED : INK} />
      <circle cx="54" cy="32" r="1.3" fill={earned ? NASA_RED : INK} />

      {/* Emblema central específico de la insignia */}
      <g opacity={earned ? 1 : 0.65}>{renderEmblem()}</g>
    </svg>
  );
};
