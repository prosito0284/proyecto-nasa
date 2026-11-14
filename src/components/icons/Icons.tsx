import React from 'react';

export interface IconProps {
  size?: number;
  title?: string;
  className?: string;
}

const BaseSvg: React.FC<
  IconProps & { children: React.ReactNode }
> = ({ size = 18, title, className = 'ui-icon', children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    role={title ? 'img' : undefined}
    aria-label={title}
    aria-hidden={title ? undefined : true}
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
);

/** 1. Batería / Energía (kWh) */
export const BatteryIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <rect x="2" y="6" width="18" height="12" rx="1.5" />
    <line x1="22" y1="10" x2="22" y2="14" />
    <polyline points="11 9 8.5 12 11.5 12 9 15" />
  </BaseSvg>
);

/** 2. Gota / Soporte Vital (O2 + H2O reciclada) */
export const DropletIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <path d="M12 2.5C12 2.5 5 10.2 5 15a7 7 0 0 0 14 0c0-4.8-7-12.5-7-12.5Z" />
    <path d="M9.5 15.5a2.5 2.5 0 0 0 2.5 2.5" />
  </BaseSvg>
);

/** 3. Hoja / Invernadero Hidropónico y Alimentos */
export const LeafIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 20 3c-1 4-1.5 7.5-4.1 13A7 7 0 0 1 11 20Z" />
    <path d="M4 21c3-3 6.5-5.5 12-8" />
  </BaseSvg>
);

/** 4. Escudo / Blindaje contra Radiación */
export const ShieldIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <path d="M12 2.5 4 5.8v5.7c0 5.2 3.4 9.2 8 10.5 4.6-1.3 8-5.3 8-10.5V5.8L12 2.5Z" />
    <path d="M12 7v9" />
    <path d="M8.5 11.5h7" />
  </BaseSvg>
);

/** 5. Casco de Astronauta / Tripulación y Salud */
export const HelmetIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <path d="M4 14a8 8 0 1 1 16 0v3.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5V14Z" />
    <rect x="7" y="10" width="10" height="5.5" rx="1.5" />
    <line x1="8" y1="21" x2="16" y2="21" />
  </BaseSvg>
);

/** 6. Antena / Comunicaciones y Red de Espacio Profundo */
export const AntennaIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <path d="M4.5 9.5a9.5 9.5 0 0 1 13.5 0" />
    <path d="M7.5 12.5a5 5 0 0 1 7.5 0" />
    <circle cx="11.25" cy="15.25" r="1.25" />
    <path d="M11.25 16.5 8 21.5h6.5l-3.25-5Z" />
  </BaseSvg>
);

/** 7. Sol / Clima Espacial y Paneles Solares */
export const SunIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <circle cx="12" cy="12" r="4.2" />
    <line x1="12" y1="2" x2="12" y2="4.5" />
    <line x1="12" y1="19.5" x2="12" y2="22" />
    <line x1="4.9" y1="4.9" x2="6.7" y2="6.7" />
    <line x1="17.3" y1="17.3" x2="19.1" y2="19.1" />
    <line x1="2" y1="12" x2="4.5" y2="12" />
    <line x1="19.5" y1="12" x2="22" y2="12" />
    <line x1="4.9" y1="19.1" x2="6.7" y2="17.3" />
    <line x1="17.3" y1="6.7" x2="19.1" y2="4.9" />
  </BaseSvg>
);

/** 8. Polvo / Tormenta de Polvo Marciano */
export const DustIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <path d="M3 8h13a2.5 2.5 0 1 0-2.5-2.5" />
    <path d="M2 12h16.5a2.5 2.5 0 1 1-2.5 2.5" />
    <path d="M4 16h9.5a2 2 0 1 1-2 2" />
    <circle cx="5" cy="5" r="0.7" />
    <circle cx="19" cy="7" r="0.7" />
  </BaseSvg>
);

/** 9. Radiación / Dosimetría (mSv) */
export const RadiationIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <circle cx="12" cy="12" r="9.5" />
    <circle cx="12" cy="12" r="2" />
    <path d="M10.5 10.2 7.5 5.2a7.5 7.5 0 0 1 9 0l-3 5" />
    <path d="M13.8 12.6 19.5 13a7.5 7.5 0 0 1-4.5 7.2l-2.2-5.4" />
    <path d="M10.2 12.6 4.5 13a7.5 7.5 0 0 0 4.5 7.2l2.2-5.4" />
  </BaseSvg>
);

/** 10. Ciencia / Laboratorio e Investigación (OSDR) */
export const ScienceIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <path d="M9 3h6" />
    <path d="M10 3v5.2L4.8 18.2A1.8 1.8 0 0 0 6.4 21h11.2a1.8 1.8 0 0 0 1.6-2.8L14 8.2V3" />
    <line x1="7.5" y1="15" x2="16.5" y2="15" />
  </BaseSvg>
);

/** 11. Reloj / Día-Sol y Retraso de Luz */
export const ClockIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <circle cx="12" cy="12" r="9.5" />
    <polyline points="12 6.5 12 12 16 14" />
  </BaseSvg>
);

/** 12. Parche / Insignia de Misión */
export const PatchIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <circle cx="12" cy="10" r="6.5" />
    <polygon points="12 6.5 13.3 9.2 16.2 9.5 14 11.5 14.6 14.3 12 12.9 9.4 14.3 10 11.5 7.8 9.5 10.7 9.2 12 6.5" />
    <path d="M9 15.8 7.5 21.5 12 19.3l4.5 2.2-1.5-5.7" />
  </BaseSvg>
);

/** 13. Sonido / Audio de Consola */
export const SoundIcon: React.FC<IconProps & { muted?: boolean }> = ({
  muted = false,
  ...props
}) => (
  <BaseSvg {...props}>
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    {muted ? (
      <>
        <line x1="22" y1="9" x2="16" y2="15" />
        <line x1="16" y1="9" x2="22" y2="15" />
      </>
    ) : (
      <>
        <path d="M15.5 8.5a5 5 0 0 1 0 7" />
        <path d="M18.8 5.5a9 9 0 0 1 0 13" />
      </>
    )}
  </BaseSvg>
);

/** 14. Idioma / Globo Planetario */
export const LanguageIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <circle cx="12" cy="12" r="9.5" />
    <line x1="2.5" y1="12" x2="21.5" y2="12" />
    <path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z" />
  </BaseSvg>
);

/** 15. Flecha Direccional */
export const ArrowIcon: React.FC<
  IconProps & { direction?: 'right' | 'left' | 'up' | 'down' }
> = ({ direction = 'right', ...props }) => {
  const rotation =
    direction === 'down'
      ? 90
      : direction === 'left'
      ? 180
      : direction === 'up'
      ? -90
      : 0;
  return (
    <BaseSvg {...props}>
      <g transform={`rotate(${rotation} 12 12)`}>
        <line x1="4" y1="12" x2="20" y2="12" />
        <polyline points="14 6 20 12 14 18" />
      </g>
    </BaseSvg>
  );
};

/** 16. Alerta / Advertencia Técnica */
export const AlertIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <path d="M10.3 3.6 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14.4a2 2 0 0 0-3.4 0Z" />
    <line x1="12" y1="9" x2="12" y2="13.5" />
    <circle cx="12" cy="17" r="0.6" />
  </BaseSvg>
);

/** Iconos complementarios del mismo set de trazo (24x24, 1.75px) */
export const CheckIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <rect x="3" y="3" width="18" height="18" rx="1.5" />
    <polyline points="7.5 12.5 10.5 15.5 16.5 9" />
  </BaseSvg>
);

export const SlidersIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <line x1="4" y1="18" x2="20" y2="18" />
    <circle cx="9" cy="6" r="2" />
    <circle cx="15" cy="12" r="2" />
    <circle cx="10" cy="18" r="2" />
  </BaseSvg>
);

export const PrintIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </BaseSvg>
);

export const CloseIcon: React.FC<IconProps> = (props) => (
  <BaseSvg {...props}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </BaseSvg>
);
