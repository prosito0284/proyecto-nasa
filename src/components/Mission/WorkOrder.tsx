/**
 * LÍDER — "Orden de trabajo": cada opción de un dilema es una orden que el comandante firma.
 * Dos columnas (Ganas / Pagas) muestran el trade-off de hoy y de mañana antes de decidir.
 */
import React from 'react';
import { CoreResources, Language, TradeoffChoice } from '../../types/mission';
import {
  BatteryIcon,
  DropletIcon,
  HelmetIcon,
  LeafIcon,
  RadiationIcon,
  ScienceIcon,
  ShieldIcon,
  type IconProps,
} from '../icons';
import { SourceStamp, type NasaProvenanceSource } from '../ScienceTraceability/SourceStamp';

type ResourceKey = keyof CoreResources;

const RESOURCE_META: Record<
  ResourceKey,
  { Icon: React.FC<IconProps>; es: string; en: string; unit: '%' | 'mSv' | 'pts' }
> = {
  power: { Icon: BatteryIcon, es: 'Energía', en: 'Power', unit: '%' },
  lifeSupport: { Icon: DropletIcon, es: 'Aire y agua', en: 'Air & water', unit: '%' },
  food: { Icon: LeafIcon, es: 'Comida', en: 'Food', unit: '%' },
  shielding: { Icon: ShieldIcon, es: 'Blindaje', en: 'Shielding', unit: '%' },
  crewHealth: { Icon: HelmetIcon, es: 'Salud', en: 'Health', unit: '%' },
  radiationDoseMsv: { Icon: RadiationIcon, es: 'Radiación', en: 'Radiation', unit: 'mSv' },
  sciencePoints: { Icon: ScienceIcon, es: 'Ciencia', en: 'Science', unit: 'pts' },
};

const RESOURCE_ORDER: ResourceKey[] = [
  'power',
  'lifeSupport',
  'food',
  'shielding',
  'crewHealth',
  'sciencePoints',
  'radiationDoseMsv',
];

interface LedgerRow {
  key: ResourceKey;
  value: number;
  tomorrow: boolean;
}

/** Separa los efectos de una opción en lo que se gana y lo que se paga (hoy y mañana). */
export function buildLedger(choice: TradeoffChoice): { gains: LedgerRow[]; costs: LedgerRow[] } {
  const gains: LedgerRow[] = [];
  const costs: LedgerRow[] = [];
  const add = (delta: Partial<CoreResources> | undefined, tomorrow: boolean) => {
    if (!delta) return;
    for (const key of RESOURCE_ORDER) {
      const value = delta[key];
      if (!value) continue;
      // Más radiación es un costo; todo lo demás es ganancia cuando sube.
      const isGain = key === 'radiationDoseMsv' ? value < 0 : value > 0;
      (isGain ? gains : costs).push({ key, value, tomorrow });
    }
  };
  add(choice.resourceDelta, false);
  add(choice.nextTurnEffect?.resourceDelta, true);
  return { gains, costs };
}

/** Deduce el sello de procedencia a partir de la referencia NASA de la opción. */
export function inferSource(reference: string): NasaProvenanceSource | null {
  if (/DONKI/i.test(reference)) return 'DONKI';
  if (/OSDR|Veggie|APH|BioSentinel/i.test(reference)) return 'OSDR';
  if (/Mars|MOXIE|Curiosity|Perseverance|InSight|MSL|Opportunity/i.test(reference)) return 'MARS';
  if (/Artemis|LRO|LCROSS|VIPER|Lunar/i.test(reference)) return 'ARTEMIS';
  return null;
}

export interface WorkOrderProps {
  lang: Language;
  choice: TradeoffChoice;
  /** Código corto de la orden, p. ej. "OT-3B" */
  code: string;
  /** true si el clima de hoy viene de DONKI en vivo (solo afecta al sello DONKI) */
  weatherIsLive: boolean;
  executed: boolean;
  disabled: boolean;
  onPreview: (choice: TradeoffChoice | null) => void;
  onExecute: (choice: TradeoffChoice) => void;
}

export const WorkOrder: React.FC<WorkOrderProps> = ({
  lang,
  choice,
  code,
  weatherIsLive,
  executed,
  disabled,
  onPreview,
  onExecute,
}) => {
  const { gains, costs } = buildLedger(choice);
  const source = inferSource(choice.nasaDataReference);

  const renderRows = (rows: LedgerRow[]) => (
    <ul className="wo-rows">
      {rows.map((row, i) => {
        const meta = RESOURCE_META[row.key];
        const sign = row.value > 0 ? '+' : '−';
        const amount = `${sign}${Math.abs(row.value)}${meta.unit === '%' ? '%' : ` ${meta.unit}`}`;
        return (
          <li key={`${row.key}-${i}`} className="wo-row">
            <meta.Icon size={16} />
            <span className="wo-amount">{amount}</span>
            <span className="wo-label">{meta[lang]}</span>
            {row.tomorrow && (
              <span className="wo-tomorrow">{lang === 'es' ? 'mañana' : 'tomorrow'}</span>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <article
      className={`work-order ${executed ? 'work-order-executed' : ''}`}
      onMouseEnter={() => onPreview(choice)}
      onMouseLeave={() => onPreview(null)}
      onFocus={() => onPreview(choice)}
      onTouchStart={() => onPreview(choice)}
    >
      <header className="wo-head">
        <span className="wo-code">
          {lang === 'es' ? 'Orden de trabajo' : 'Work order'} {code}
        </span>
        <h3>{choice.label[lang]}</h3>
        <p>{choice.description[lang]}</p>
      </header>

      <div className="wo-ledger">
        <section className="wo-col wo-col-gain" aria-label={lang === 'es' ? 'Ganas' : 'You gain'}>
          <h4>{lang === 'es' ? 'Ganas' : 'You gain'}</h4>
          {renderRows(gains)}
        </section>
        <section className="wo-col wo-col-cost" aria-label={lang === 'es' ? 'Pagas' : 'You pay'}>
          <h4>{lang === 'es' ? 'Pagas' : 'You pay'}</h4>
          {renderRows(costs)}
        </section>
      </div>

      <footer className="wo-foot">
        <div className="wo-source">
          {source && (
            <SourceStamp source={source} live={source === 'DONKI' && weatherIsLive} lang={lang} />
          )}
          <small>{choice.nasaDataReference}</small>
        </div>
        <button
          id={`choice-btn-${choice.id}`}
          className="btn-primary wo-sign-btn"
          disabled={disabled}
          onClick={() => onExecute(choice)}
        >
          {lang === 'es' ? 'Firmar y ejecutar' : 'Sign and execute'}
        </button>
      </footer>

      {executed && (
        <div className="wo-stamp" role="status">
          {lang === 'es' ? 'Ejecutada' : 'Executed'}
        </div>
      )}
    </article>
  );
};
