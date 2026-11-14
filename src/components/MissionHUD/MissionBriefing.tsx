/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * C1 & C9 — Portada del Cuaderno de Vuelo (MissionBriefing.tsx)
 * Explica el ciclo operativo en 3 pasos y permite elegir entre
 * Luna (Cráter Shackleton - Artemis) o Marte (Cráter Jezero - Perseverance).
 */

import React, { useState } from 'react';
import { Language, OutpostSiteConfig, OutpostSiteId } from '../../types/mission';
import { missionAudio } from '../../utils/sound';
import {
  AntennaIcon,
  ArrowIcon,
  BatteryIcon,
  ClockIcon,
  DropletIcon,
  HelmetIcon,
  LanguageIcon,
  LeafIcon,
  ShieldIcon,
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

export const MissionBriefing: React.FC<MissionBriefingProps> = ({
  lang,
  sites,
  onStart,
  selectedSiteId = 'moon-shackleton',
}) => {
  const [activeSiteId, setActiveSiteId] = useState<OutpostSiteId>(selectedSiteId);

  const tutorialSteps = [
    {
      step: '1',
      icon: <BatteryIcon size={22} />,
      title: {
        es: '1. Reparte la Energía',
        en: '1. Budget Your Power',
      },
      desc: {
        es: 'Asigna energía entre oxígeno, blindaje solar e invernadero. Superar el 100% de carga consume reserva de batería.',
        en: 'Assign power across oxygen, solar shielding, and the greenhouse. Exceeding 100% load drains battery reserves.',
      },
    },
    {
      step: '2',
      icon: <SlidersIcon size={22} />,
      title: {
        es: '2. Firma la Orden del Día',
        en: '2. Sign the Daily Work Order',
      },
      desc: {
        es: 'En el espacio ninguna decisión es gratis: proteger un sistema hoy siempre cuesta otro recurso.',
        en: 'In deep space no decision is free: protecting one system today always costs another resource.',
      },
    },
    {
      step: '3',
      icon: <ClockIcon size={22} />,
      title: {
        es: '3. Revisa la Consecuencia de Mañana',
        en: '3. Review Tomorrow’s Consequence',
      },
      desc: {
        es: 'Cada decisión altera los sistemas del día siguiente. Mantén operativa la base durante los 8 días de misión.',
        en: 'Every decision alters tomorrow’s systems. Keep the outpost operational across all 8 mission days.',
      },
    },
  ];

  const handleLaunch = (siteId: OutpostSiteId) => {
    missionAudio.playSuccess();
    onStart(siteId);
  };

  return (
    <section
      className="briefing-screen"
      aria-labelledby="briefing-main-title"
      id="mission-briefing-screen"
    >
      <div className="briefing-hero">
        <span className="nasa-badge">PLAN DE VUELO</span>
        <h2 id="briefing-main-title" className="briefing-title">
          <HelmetIcon size={24} />{' '}
          {lang === 'es'
            ? 'Manual de operaciones del comandante'
            : 'Commander flight operations manual'}
        </h2>
        <p className="briefing-lead">
          {lang === 'es'
            ? 'Dirige una base espacial de la NASA durante 8 días. Evalúa datos reales de clima espacial y toma decisiones de ingeniería con recursos limitados.'
            : 'Command a NASA space outpost for 8 days. Evaluate real space weather telemetry and make engineering trade-offs with limited resources.'}
        </p>
      </div>

      {/* Procedimiento Operativo de 3 Pasos */}
      <div
        className="briefing-tutorial"
        role="region"
        aria-label={lang === 'es' ? 'Procedimiento en 3 pasos' : '3-step procedure'}
      >
        <h3 className="briefing-section-heading">
          {lang === 'es'
            ? 'Procedimiento de Control de Misión (3 Pasos)'
            : 'Mission Control Procedure (3 Steps)'}
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

      {/* Selección de Destino con Fichas Técnicas */}
      <div className="briefing-sites-section">
        <h3 className="briefing-section-heading">
          {lang === 'es'
            ? 'Selecciona el Destino de tu Misión'
            : 'Select Your Mission Outpost'}
        </h3>

        <div className="briefing-sites-grid">
          {sites.map((site) => {
            const isLunar = site.id === 'moon-shackleton';
            const isSelected = activeSiteId === site.id;

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
                    <LanguageIcon size={22} />
                  </span>
                  <div>
                    <span className="coord-pill">{site.coordinates}</span>
                    <h4>{site.name[lang]}</h4>
                    <p className="site-location-sub">{site.locationName[lang]}</p>
                  </div>
                </div>

                <p className="site-card-desc">{site.description[lang]}</p>

                {/* Datos Físicos Reales de la NASA */}
                <div className="site-specs-grid">
                  <div className="site-spec-pill">
                    <span className="spec-label">
                      <AntennaIcon size={13} />{' '}
                      {lang === 'es' ? 'Señal a Tierra' : 'Signal Delay'}
                    </span>
                    <strong>{site.commDelayDisplay[lang]}</strong>
                  </div>
                  <div className="site-spec-pill">
                    <span className="spec-label">
                      <SunIcon size={13} />{' '}
                      {lang === 'es' ? 'Temperatura' : 'Temperature'}
                    </span>
                    <strong>{site.avgTempCelsius}</strong>
                  </div>
                  <div className="site-spec-pill">
                    <span className="spec-label">
                      <LanguageIcon size={13} />{' '}
                      {lang === 'es' ? 'Gravedad' : 'Gravity'}
                    </span>
                    <strong>{site.gravityG}g</strong>
                  </div>
                  <div className="site-spec-pill">
                    <span className="spec-label">
                      <ClockIcon size={13} />{' '}
                      {lang === 'es' ? 'Duración' : 'Duration'}
                    </span>
                    <strong>
                      {site.totalMissionDays} {site.dayName[lang]}s
                    </strong>
                  </div>
                </div>

                {/* Recursos Iniciales */}
                <div className="site-initial-resources">
                  <span className="site-res-chip">
                    <BatteryIcon size={14} /> {site.initialResources.power}%
                  </span>
                  <span className="site-res-chip">
                    <DropletIcon size={14} /> O₂ {site.initialResources.lifeSupport}%
                  </span>
                  <span className="site-res-chip">
                    <LeafIcon size={14} /> {site.initialResources.food}%
                  </span>
                  <span className="site-res-chip">
                    <ShieldIcon size={14} /> {site.initialResources.shielding}%
                  </span>
                </div>

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
                      ? 'Iniciar Misión en la Luna (Artemis)'
                      : 'Start Moon Mission (Artemis)'
                    : lang === 'es'
                      ? 'Iniciar Misión en Marte (Jezero)'
                      : 'Start Mars Mission (Jezero)'}
                  <ArrowIcon size={16} direction="right" />
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
