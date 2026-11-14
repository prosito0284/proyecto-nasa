import React from 'react';
import { Language } from '../../types/mission';

export type NasaProvenanceSource = 'DONKI' | 'OSDR' | 'ARTEMIS' | 'MARS';

export interface SourceStampProps {
  source: NasaProvenanceSource;
  live: boolean;
  url?: string;
  lang?: Language;
}

const SOURCE_LABELS: Record<
  NasaProvenanceSource,
  { code: string; agencyEs: string; agencyEn: string }
> = {
  DONKI: {
    code: 'NASA DONKI',
    agencyEs: 'CLIMA ESPACIAL',
    agencyEn: 'SPACE WEATHER',
  },
  OSDR: {
    code: 'NASA OSDR',
    agencyEs: 'BIOLOGIA Y RAD.',
    agencyEn: 'BIOLOGY & RAD.',
  },
  ARTEMIS: {
    code: 'NASA ARTEMIS',
    agencyEs: 'POLO SUR LUNAR',
    agencyEn: 'LUNAR SOUTH POLE',
  },
  MARS: {
    code: 'NASA MARS',
    agencyEs: 'MEDA / RAD / MOXIE',
    agencyEn: 'MEDA / RAD / MOXIE',
  },
};

/**
 * Sello de tinta de procedencia científica ("Cuaderno de Vuelo del Comandante").
 * Indica la fuente oficial de la NASA y si el dato proviene de telemetría EN VIVO
 * o de ARCHIVO REAL NASA verificado. Cero emoji, esquinas de 2 px, sin sombras ni degradados.
 */
export const SourceStamp: React.FC<SourceStampProps> = ({
  source,
  live,
  url,
  lang = 'es',
}) => {
  const meta = SOURCE_LABELS[source] ?? {
    code: `NASA ${source}`,
    agencyEs: 'DATOS VERIFICADOS',
    agencyEn: 'VERIFIED DATA',
  };

  const statusText = live
    ? lang === 'es'
      ? 'EN VIVO'
      : 'LIVE NASA'
    : lang === 'es'
      ? 'ARCHIVO REAL NASA'
      : 'NASA REAL ARCHIVE';

  const subLabel = lang === 'es' ? meta.agencyEs : meta.agencyEn;

  const borderColor = live
    ? 'var(--ok-green, #2E7D4F)'
    : 'var(--nasa-blue, #0B3D91)';

  const stampStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    padding: '0.2rem 0.5rem',
    border: `1.5px solid ${borderColor}`,
    borderRadius: '2px',
    backgroundColor: 'var(--paper, #F2EBDD)',
    color: 'var(--ink, #1B1F2A)',
    fontFamily: "var(--font-mono, 'IBM Plex Mono', monospace)",
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    lineHeight: 1.2,
    textTransform: 'uppercase',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    boxSizing: 'border-box',
  };

  const statusPillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.1rem 0.35rem',
    borderRadius: '2px',
    backgroundColor: live
      ? 'var(--ok-green, #2E7D4F)'
      : 'var(--nasa-blue, #0B3D91)',
    color: 'var(--paper, #F2EBDD)',
    fontSize: '0.64rem',
    fontWeight: 700,
    letterSpacing: '0.07em',
  };

  const dotStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '1px',
    backgroundColor: 'var(--paper, #F2EBDD)',
  };

  const content = (
    <>
      <span style={{ color: borderColor, fontWeight: 700 }}>{meta.code}</span>
      <span
        aria-hidden="true"
        style={{
          color: 'var(--rule, rgba(27,31,42,0.25))',
          fontWeight: 400,
        }}
      >
        |
      </span>
      <span style={{ color: 'var(--ink, #1B1F2A)', fontWeight: 600 }}>
        {subLabel}
      </span>
      <span style={statusPillStyle}>
        <span aria-hidden="true" style={dotStyle} />
        <span>{statusText}</span>
      </span>
      {url && (
        <span
          aria-hidden="true"
          style={{
            color: borderColor,
            fontSize: '0.65rem',
            fontWeight: 700,
            marginLeft: '0.1rem',
          }}
        >
          [REF]
        </span>
      )}
    </>
  );

  const ariaLabel =
    lang === 'es'
      ? `Fuente oficial ${meta.code} (${subLabel}) — Estado: ${statusText}`
      : `Official source ${meta.code} (${subLabel}) — Status: ${statusText}`;

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="nasa-source-stamp nasa-source-stamp--link"
        style={stampStyle}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      className="nasa-source-stamp"
      style={stampStyle}
      role="status"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {content}
    </span>
  );
};

export default SourceStamp;
