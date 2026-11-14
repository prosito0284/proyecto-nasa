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
  HelmetIcon,
  LanguageIcon,
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
      icon: <BatteryIcon size={20} />,
      title: {
        es: '1. Reparte la energía',
        en: '1. Budget your power',
      },
      desc: {
        es: 'Divide la electricidad entre oxígeno, escudo solar e invernadero.',
        en: 'Split power across oxygen, solar shielding, and the greenhouse.',
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
        es: 'Ninguna decisión es gratis: proteger un sistema hoy cuesta otro recurso.',
        en: 'No decision is free: protecting one system today costs another resource.',
      },
    },
    {
      step: '3',
      icon: <ClockIcon size={20} />,
      title: {
        es: '3. Cuida a tu tripulación 8 días',
        en: '3. Keep your crew safe for 8 days',
      },
      desc: {
        es: 'Revisa las consecuencias de cada turno y mantén la base a salvo.',
        en: 'Review each turn’s consequences and keep the outpost operational.',
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
            ? 'Dirige una base de la NASA durante 8 días con datos reales de clima espacial y recursos limitados.'
            : 'Command a NASA outpost for 8 days using real space weather telemetry and limited resources.'}
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
            ? 'Procedimiento de control de misión (3 pasos)'
            : 'Mission control procedure (3 steps)'}
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

      {/* Selección de Destino con Fichas Técnicas (máximo 3 datos por base) */}
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

                {/* C17: Máximo 3 datos físicos reales por base */}
                <div className="site-specs-grid">
                  <div className="site-spec-pill">
                    <span className="spec-label">
                      <AntennaIcon size={13} />{' '}
                      {lang === 'es' ? 'Señal a Tierra' : 'Signal delay'}
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
