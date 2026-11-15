/**
 * Portada del Cuaderno de Vuelo (MissionBriefing.tsx) — T01 Dieta radical de texto
 *
 * - Cero muros de texto: cada bloque tiene como máximo 1 frase de impacto (<= 15 palabras).
 * - Reemplaza explicaciones largas por indicadores visuales de telemetría (Gravedad,
 *   Temperatura, Radiación) con barra medidora que responden al pasar el cursor o hacer clic.
 */

import React, { useState } from 'react';
import { Language, OutpostSiteConfig, OutpostSiteId } from '../../types/mission';
import { missionAudio } from '../../utils/sound';
import {
  ArrowIcon,
  BatteryIcon,
  ClockIcon,
  HelmetIcon,
  LanguageIcon,
  RadiationIcon,
  SlidersIcon,
  SunIcon,
} from '../icons';

export interface MissionBriefingProps {
  lang: Language;
  sites: OutpostSiteConfig[];
  onStart: (siteId: OutpostSiteId) => void;
  /** Sitio preseleccionado opcional */
  selectedSiteId?: OutpostSiteId;
}

export type TelemetryMetricKey = 'gravity' | 'temperature' | 'radiation';

interface TelemetryIndicatorSpec {
  key: TelemetryMetricKey;
  label: { es: string; en: string };
  value: { es: string; en: string };
  /** Porcentaje visual de la barra técnica (0-100) */
  levelPercent: number;
  tone: 'blue' | 'amber' | 'red';
  insight: { es: string; en: string };
}

const SITE_TELEMETRY_INDICATORS: Record<OutpostSiteId, TelemetryIndicatorSpec[]> = {
  'moon-shackleton': [
    {
      key: 'gravity',
      label: { es: 'GRAVEDAD', en: 'GRAVITY' },
      value: { es: '0.166 g', en: '0.166 g' },
      levelPercent: 17,
      tone: 'blue',
      insight: {
        es: 'Un sexto de gravedad terrestre: exige dos horas diarias de ejercicio.',
        en: 'One-sixth Earth gravity: requires two hours of daily crew exercise.',
      },
    },
    {
      key: 'temperature',
      label: { es: 'TEMPERATURA', en: 'TEMPERATURE' },
      value: { es: '-180 °C / -50 °C', en: '-180 °C / -50 °C' },
      levelPercent: 88,
      tone: 'amber',
      insight: {
        es: 'Sombra lunar helada: la calefacción consume gran parte de tu batería.',
        en: 'Freezing lunar shadow: heating consumes a major share of battery power.',
      },
    },
    {
      key: 'radiation',
      label: { es: 'RADIACIÓN', en: 'RADIATION' },
      value: { es: '1.37 mSv/día', en: '1.37 mSv/day' },
      levelPercent: 92,
      tone: 'red',
      insight: {
        es: 'Medido por Chang’e-4 LND: activa el refugio de agua en tormentas solares.',
        en: 'Measured by Chang’e-4 LND: activate the water shelter during solar storms.',
      },
    },
  ],
  'mars-jezero': [
    {
      key: 'gravity',
      label: { es: 'GRAVEDAD', en: 'GRAVITY' },
      value: { es: '0.378 g', en: '0.378 g' },
      levelPercent: 38,
      tone: 'blue',
      insight: {
        es: 'Un tercio de gravedad terrestre: facilita caminar con trajes presurizados.',
        en: 'One-third Earth gravity: makes walking in pressurized suits easier.',
      },
    },
    {
      key: 'temperature',
      label: { es: 'TEMPERATURA', en: 'TEMPERATURE' },
      value: { es: '-65 °C prom.', en: '-65 °C avg.' },
      levelPercent: 58,
      tone: 'amber',
      insight: {
        es: 'Noches marcianas bajo cero: mantén encendidos los calefactores del hábitat.',
        en: 'Subzero Martian nights: keep the habitat heaters running.',
      },
    },
    {
      key: 'radiation',
      label: { es: 'RADIACIÓN', en: 'RADIATION' },
      value: { es: '0.67 mSv/sol', en: '0.67 mSv/sol' },
      levelPercent: 52,
      tone: 'red',
      insight: {
        es: 'Medido por Curiosity RAD: la delgada atmósfera filtra parte del flujo.',
        en: 'Measured by Curiosity RAD: the thin atmosphere blocks part of radiation.',
      },
    },
  ],
};

export const MissionBriefing: React.FC<MissionBriefingProps> = ({
  lang,
  sites,
  onStart,
  selectedSiteId = 'moon-shackleton',
}) => {
  const [activeSiteId, setActiveSiteId] = useState<OutpostSiteId>(selectedSiteId);
  const [activeMetricBySite, setActiveMetricBySite] = useState<
    Record<OutpostSiteId, TelemetryMetricKey>
  >({
    'moon-shackleton': 'radiation',
    'mars-jezero': 'radiation',
  });

  const tutorialSteps = [
    {
      step: '1',
      icon: <BatteryIcon size={20} />,
      title: {
        es: '1. Reparte la energía',
        en: '1. Budget your power',
      },
      desc: {
        es: 'Divide electricidad entre oxígeno, escudo solar e invernadero.',
        en: 'Split power across oxygen, solar shielding, and greenhouse.',
      },
    },
    {
      step: '2',
      icon: <SlidersIcon size={20} />,
      title: {
        es: '2. Firma la orden del día',
        en: '2. Sign the daily work order',
      },
      desc: {
        es: 'Cada decisión protege un sistema a cambio de otro recurso.',
        en: 'Every decision protects one system at the cost of another.',
      },
    },
    {
      step: '3',
      icon: <ClockIcon size={20} />,
      title: {
        es: '3. Sobrevive 8 días',
        en: '3. Survive 8 days',
      },
      desc: {
        es: 'Mantén todos los vitales sobre cero hasta completar la misión.',
        en: 'Keep every vital above zero until mission completion.',
      },
    },
  ];

  const handleLaunch = (siteId: OutpostSiteId) => {
    missionAudio.playSuccess();
    onStart(siteId);
  };

  const selectTelemetryMetric = (siteId: OutpostSiteId, metric: TelemetryMetricKey) => {
    setActiveMetricBySite((prev) =>
      prev[siteId] === metric ? prev : { ...prev, [siteId]: metric },
    );
  };

  const renderMetricIcon = (key: TelemetryMetricKey) => {
    if (key === 'gravity') return <LanguageIcon size={13} />;
    if (key === 'temperature') return <SunIcon size={13} />;
    return <RadiationIcon size={13} />;
  };

  return (
    <section
      className="briefing-screen"
      aria-labelledby="briefing-main-title"
      id="mission-briefing-screen"
    >
      <div className="briefing-hero">
        <div className="briefing-hero-title-row">
          <span className="nasa-badge">PLAN DE VUELO</span>
          <h2 id="briefing-main-title" className="briefing-title">
            <HelmetIcon size={22} />{' '}
            {lang === 'es'
              ? 'Manual de operaciones del comandante'
              : 'Commander flight operations manual'}
          </h2>
        </div>
        <p className="briefing-lead">
          {lang === 'es'
            ? 'Mantén viva tu base espacial 8 días equilibrando energía, oxígeno y escudo.'
            : 'Keep your space outpost alive for 8 days balancing power, oxygen, and shielding.'}
        </p>
      </div>

      {/* Procedimiento Operativo Compacto */}
      <div
        className="briefing-tutorial"
        role="region"
        aria-label={lang === 'es' ? 'Procedimiento en 3 pasos' : '3-step procedure'}
      >
        <h3 className="briefing-section-heading">
          {lang === 'es'
            ? 'Procedimiento de control de misión'
            : 'Mission control procedure'}
        </h3>
        <div className="tutorial-steps-grid">
          {tutorialSteps.map((st) => (
            <div key={st.step} className="tutorial-step-card">
              <div className="tutorial-step-badge" aria-hidden="true">
                {st.icon}
              </div>
              <div className="tutorial-step-body">
                <h4>{st.title[lang]}</h4>
                <p>{st.desc[lang]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selección de Destino con Indicadores Visuales Interactivos de Telemetría (T01) */}
      <div className="briefing-sites-section">
        <h3 className="briefing-section-heading">
          {lang === 'es'
            ? 'Selecciona el destino de tu misión'
            : 'Select your mission outpost'}
        </h3>

        <div className="briefing-sites-grid">
          {sites.map((site) => {
            const isLunar = site.id === 'moon-shackleton';
            const isSelected = activeSiteId === site.id;
            const indicators = SITE_TELEMETRY_INDICATORS[site.id];
            const activeMetricKey = activeMetricBySite[site.id] ?? 'radiation';
            const activeIndicator =
              indicators.find((ind) => ind.key === activeMetricKey) ?? indicators[0];

            return (
              <article
                key={site.id}
                className={`briefing-site-card ${isLunar ? 'site-card-lunar' : 'site-card-mars'} ${
                  isSelected ? 'site-card-selected' : ''
                }`}
                onClick={() => {
                  missionAudio.playClick();
                  setActiveSiteId(site.id);
                }}
              >
                <div className="site-card-header">
                  <span className="site-planet-badge" aria-hidden="true">
                    <LanguageIcon size={20} />
                  </span>
                  <div>
                    <span className="coord-pill">{site.coordinates}</span>
                    <h4>{site.name[lang]}</h4>
                    <p className="site-location-sub">{site.locationName[lang]}</p>
                  </div>
                </div>

                <p className="site-card-desc">{site.description[lang]}</p>

                {/* T01: Indicadores visuales interactivos (Gravedad, Temperatura, Radiación) */}
                <div
                  className="site-specs-grid"
                  role="group"
                  aria-label={
                    lang === 'es'
                      ? 'Indicadores de telemetría ambiental'
                      : 'Environmental telemetry indicators'
                  }
                >
                  {indicators.map((ind) => {
                    const isMetricActive = ind.key === activeIndicator.key;
                    return (
                      <button
                        key={ind.key}
                        type="button"
                        data-telemetry-metric={ind.key}
                        aria-pressed={isMetricActive}
                        className={`site-spec-pill site-spec-interactive ${
                          isMetricActive ? 'site-spec-active' : ''
                        }`}
                        onMouseEnter={() => selectTelemetryMetric(site.id, ind.key)}
                        onFocus={() => selectTelemetryMetric(site.id, ind.key)}
                        onClick={(e) => {
                          e.stopPropagation();
                          missionAudio.playClick();
                          selectTelemetryMetric(site.id, ind.key);
                        }}
                      >
                        <span className="spec-label">
                          {renderMetricIcon(ind.key)} {ind.label[lang]}
                        </span>
                        <strong>{ind.value[lang]}</strong>
                        <span className="telemetry-meter-track" aria-hidden="true">
                          <span
                            className={`telemetry-meter-fill telemetry-meter-${ind.tone}`}
                            style={{ width: `${ind.levelPercent}%` }}
                          />
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Lectura instantánea de 1 frase al pasar el cursor o hacer clic */}
                <div
                  className="site-telemetry-readout"
                  data-testid={`telemetry-readout-${site.id}`}
                  aria-live="polite"
                >
                  <span className="telemetry-readout-tag">
                    {activeIndicator.label[lang]}
                  </span>{' '}
                  <span>{activeIndicator.insight[lang]}</span>
                </div>

                <div className="site-card-footer">
                  <small className="site-nasa-ref">
                    REF: {site.nasaMissionReference[lang]}
                  </small>

                  <button
                    type="button"
                    id={`start-mission-${site.id}-btn`}
                    className="btn-primary briefing-launch-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLaunch(site.id);
                    }}
                  >
                    {isLunar
                      ? lang === 'es'
                        ? 'Iniciar misión en la Luna (Artemis)'
                        : 'Start Moon mission (Artemis)'
                      : lang === 'es'
                        ? 'Iniciar misión en Marte (Jezero)'
                        : 'Start Mars mission (Jezero)'}
                    <ArrowIcon size={16} direction="right" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
