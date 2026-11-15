import React, { useEffect, useState } from 'react';
import { getCrewMemberName } from '../../data/crew';
import {
  CoreResources,
  CrewStatus,
  Language,
  LocalizedText,
  MissionLogEntry,
} from '../../types/mission';
import { missionAudio } from '../../utils/sound';
import { CrewPortrait } from '../crew';
import {
  AlertIcon,
  AntennaIcon,
  ArrowIcon,
  BatteryIcon,
  CheckIcon,
  DropletIcon,
  HelmetIcon,
  LeafIcon,
  RadiationIcon,
  ScienceIcon,
  ShieldIcon,
} from '../icons';

export interface TurnReportProps {
  lang: Language;
  previous: CoreResources;
  current: CoreResources;
  logs: MissionLogEntry[];
  onContinue: () => void;
  day?: number;
  siteDayName?: LocalizedText;
  /** C16: Tripulante más afectado que comenta lo ocurrido en el turno */
  crewLine?: CrewStatus;
}

interface BarMetricConfig {
  key: keyof Pick<CoreResources, 'power' | 'lifeSupport' | 'shielding' | 'food' | 'crewHealth'>;
  icon: React.ReactNode;
  label: LocalizedText;
}

const BAR_METRICS: BarMetricConfig[] = [
  {
    key: 'power',
    icon: <BatteryIcon size={16} />,
    label: { es: 'Energía (Baterías / Solar)', en: 'Power (Batteries / Solar)' },
  },
  {
    key: 'lifeSupport',
    icon: <DropletIcon size={16} />,
    label: { es: 'Soporte Vital (O₂ + H₂O)', en: 'Life Support (O₂ + H₂O)' },
  },
  {
    key: 'shielding',
    icon: <ShieldIcon size={16} />,
    label: { es: 'Blindaje Antirradiación', en: 'Radiation Shielding' },
  },
  {
    key: 'food',
    icon: <LeafIcon size={16} />,
    label: { es: 'Alimentos y Cosechas', en: 'Food & Greenhouse Crops' },
  },
  {
    key: 'crewHealth',
    icon: <HelmetIcon size={16} />,
    label: { es: 'Salud de la Tripulación', en: 'Crew Health' },
  },
];

export const TurnReport: React.FC<TurnReportProps> = ({
  lang,
  previous,
  current,
  logs,
  onContinue,
  day,
  siteDayName,
  crewLine,
}) => {
  const [animateToCurrent, setAnimateToCurrent] = useState(false);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      const timerId = window.setTimeout(() => {
        setAnimateToCurrent(true);
      }, 60);
      return () => window.clearTimeout(timerId);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [previous, current]);

  const reportDay = day ?? logs[0]?.day ?? 1;
  const dayLabel = siteDayName ? siteDayName[lang] : lang === 'es' ? 'Día / Sol' : 'Day / Sol';

  const latestLogs = React.useMemo(() => {
    if (!logs || logs.length === 0) return [];
    const targetDay = day ?? logs[0].day;
    const sameDay = logs.filter((entry) => entry.day === targetDay);
    return sameDay.length > 0 ? sameDay.slice(0, 5) : logs.slice(0, 4);
  }, [logs, day]);

  const radDelta = Number((current.radiationDoseMsv - previous.radiationDoseMsv).toFixed(1));
  const sciDelta = Math.round(current.sciencePoints - previous.sciencePoints);

  const getBarTone = (val: number) => {
    if (val <= 25) return 'bar-critical';
    if (val <= 50) return 'bar-warning';
    return 'bar-nominal';
  };

  const getSeverityBadge = (severity: MissionLogEntry['severity']) => {
    switch (severity) {
      case 'critical':
        return { icon: <AlertIcon size={15} />, className: 'turn-log-critical' };
      case 'warning':
        return { icon: <AlertIcon size={15} />, className: 'turn-log-warning' };
      default:
        return { icon: <AntennaIcon size={15} />, className: 'turn-log-info' };
    }
  };

  return (
    <section
      className="turn-report-card"
      aria-labelledby="turn-report-heading"
      aria-live="polite"
    >
      <div className="turn-report-header">
        <div>
          <span className="section-tag">
            {lang === 'es'
              ? `REPORTE · ${dayLabel.toUpperCase()} ${reportDay}`
              : `REPORT · ${dayLabel.toUpperCase()} ${reportDay}`}
          </span>
          <h3 id="turn-report-heading" className="turn-report-title">
            {lang === 'es'
              ? 'Cambios en la base y consecuencias'
              : 'Outpost changes and mission consequences'}
          </h3>
        </div>
        <div className="turn-secondary-deltas">
          <span
            className={`turn-pill-metric ${radDelta > 5 ? 'turn-delta-neg' : 'turn-delta-neutral'}`}
          >
            <RadiationIcon size={14} /> {previous.radiationDoseMsv.toFixed(1)} →{' '}
            {current.radiationDoseMsv.toFixed(1)} mSv (
            {radDelta >= 0 ? `+${radDelta}` : radDelta} mSv)
          </span>
          <span
            className={`turn-pill-metric ${sciDelta > 0 ? 'turn-delta-pos' : 'turn-delta-neutral'}`}
          >
            <ScienceIcon size={14} /> {previous.sciencePoints} → {current.sciencePoints} pts (
            {sciDelta >= 0 ? `+${sciDelta}` : sciDelta})
          </span>
        </div>
      </div>

      {/* C16: Voz de la tripulación (el tripulante más afectado comenta lo que pasó) */}
      {crewLine && (
        <div className={`turn-crew-voice mood-${crewLine.mood}`}>
          <div className="turn-crew-voice-header">
            <CrewPortrait memberId={crewLine.member.id} mood={crewLine.mood} size={52} />
            <div className="crew-card-meta">
              <strong className="crew-name">
                {getCrewMemberName(crewLine.member, lang)}
              </strong>{' '}
              <span className="crew-role">{crewLine.member.role[lang]}</span>
            </div>
          </div>
          <blockquote className="crew-speech-bubble">
            <p>“{crewLine.line[lang]}”</p>
          </blockquote>
        </div>
      )}

      {/* Animated Before -> After Resource Bars */}
      <div className="turn-bars-grid">
        {BAR_METRICS.map((metric) => {
          const prevVal = Math.max(0, Math.min(100, Math.round(previous[metric.key])));
          const currVal = Math.max(0, Math.min(100, Math.round(current[metric.key])));
          const delta = currVal - prevVal;
          const displayWidth = animateToCurrent ? currVal : prevVal;

          return (
            <div key={metric.key} className="turn-bar-row">
              <div className="turn-bar-labels">
                <span className="turn-bar-name">
                  <span aria-hidden="true">{metric.icon}</span> {metric.label[lang]}
                </span>
                <span className="turn-bar-numbers">
                  <span className="turn-prev-num">{prevVal}%</span>
                  <span className="turn-arrow" aria-hidden="true">
                    →
                  </span>
                  <strong className="turn-curr-num">{currVal}%</strong>
                  <span
                    className={`turn-delta-badge ${
                      delta > 0
                        ? 'turn-delta-pos'
                        : delta < 0
                        ? 'turn-delta-neg'
                        : 'turn-delta-neutral'
                    }`}
                  >
                    {delta > 0 ? `+${delta}%` : `${delta}%`}
                  </span>
                </span>
              </div>
              <div
                className="turn-bar-track"
                role="img"
                aria-label={`${metric.label[lang]}: ${prevVal}% -> ${currVal}%`}
              >
                <div
                  className={`turn-bar-fill ${getBarTone(currVal)}`}
                  style={{ width: `${displayWidth}%` }}
                />
                <div
                  className="turn-bar-prev-marker"
                  style={{ left: `${prevVal}%` }}
                  title={
                    lang === 'es'
                      ? `Valor anterior: ${prevVal}%`
                      : `Previous value: ${prevVal}%`
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Consequences List */}
      <div className="turn-consequences-section">
        <h4 className="turn-consequences-heading">
          <CheckIcon size={16} />{' '}
          {lang === 'es'
            ? 'Consecuencias Registradas en Bitácora'
            : 'Consequences Recorded in Mission Log'}
        </h4>
        {latestLogs.length === 0 ? (
          <p className="helper-note">
            {lang === 'es'
              ? 'Sistemas estables sin incidentes adicionales en este turno.'
              : 'Systems stable with no additional incidents this turn.'}
          </p>
        ) : (
          <ul className="turn-consequences-list">
            {latestLogs.map((entry, idx) => {
              const badge = getSeverityBadge(entry.severity);
              return (
                <li
                  key={`${entry.day}-${idx}-${entry.title.en}`}
                  className={`turn-consequence-item ${badge.className}`}
                >
                  <div className="turn-consequence-top">
                    <strong className="resource-label-inline">
                      <span aria-hidden="true">{badge.icon}</span> {entry.title[lang]}
                    </strong>
                    {entry.nasaTag && <span className="nasa-tag">REF: {entry.nasaTag}</span>}
                  </div>
                  <p>{entry.detail[lang]}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="turn-report-footer">
        <button
          type="button"
          className="btn-primary turn-continue-btn"
          onClick={() => {
            missionAudio.playClick();
            onContinue();
          }}
        >
          {lang === 'es' ? 'Continuar al Siguiente Día' : 'Continue to Next Day'}
          <ArrowIcon size={16} direction="right" />
        </button>
      </div>
    </section>
  );
};
