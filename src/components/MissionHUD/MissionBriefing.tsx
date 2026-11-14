/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * C1 — Pantalla de Bienvenida y Entrenamiento (MissionBriefing.tsx)
 * Permite a niños de 7 a 12 años entender el ciclo de juego en 3 pasos sencillos
 * ("reparte la energía → elige → mira la consecuencia de mañana") y elegir entre
 * Luna (Cráter Shackleton - Artemis) o Marte (Cráter Jezero - Perseverance).
 */

import React, { useState } from 'react';
import { Language, OutpostSiteConfig, OutpostSiteId } from '../../types/mission';
import { missionAudio } from '../../utils/sound';

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
      icon: '⚡',
      title: {
        es: '1. Reparte la Energía',
        en: '1. Budget Your Power',
      },
      desc: {
        es: 'Elige un modo de energía para el oxígeno, el escudo solar y el invernadero. ¡Si gastas más de 100%, tu batería bajará!',
        en: 'Pick a power mode for oxygen, solar shielding, and the greenhouse. Using over 100% drains your battery!',
      },
    },
    {
      step: '2',
      icon: '🎯',
      title: {
        es: '2. Elige tu Trade-Off',
        en: '2. Make a Trade-Off Choice',
      },
      desc: {
        es: 'En el espacio ninguna decisión es gratis: proteger un sistema hoy siempre cuesta otro recurso.',
        en: 'In deep space no decision is free: protecting one system today always costs another resource.',
      },
    },
    {
      step: '3',
      icon: '⏱️',
      title: {
        es: '3. Mira la Consecuencia de Mañana',
        en: '3. Watch Tomorrow’s Consequence',
      },
      desc: {
        es: 'Lo que decides hoy afecta a tu base mañana. ¡Mantén viva a la tripulación durante los 8 días para graduarte!',
        en: 'What you choose today echoes tomorrow. Keep your crew safe across all 8 days to graduate!',
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
        <span className="nasa-badge">NASA SPACE APPS 2026 • JUNIOR ASTRONAUT TRAINER</span>
        <h2 id="briefing-main-title" className="briefing-title">
          {lang === 'es'
            ? '👨‍🚀 ¡Bienvenido, Comandante Junior!'
            : '👨‍🚀 Welcome, Junior Commander!'}
        </h2>
        <p className="briefing-lead">
          {lang === 'es'
            ? 'Tu misión es dirigir una base espacial real de la NASA durante 8 días. Aprende cómo los ingenieros espaciales toman decisiones difíciles cuando los recursos son limitados.'
            : 'Your mission is to command a real NASA space outpost for 8 days. Experience how flight controllers make tough trade-off decisions when resources are limited.'}
        </p>
      </div>

      {/* Tutorial Visual de 3 Pasos */}
      <div
        className="briefing-tutorial"
        role="region"
        aria-label={lang === 'es' ? 'Tutorial de 3 pasos' : '3-step tutorial'}
      >
        <h3 className="briefing-section-heading">
          {lang === 'es'
            ? '🧭 Cómo Sobrevivir en el Espacio en 3 Pasos'
            : '🧭 How to Survive Deep Space in 3 Steps'}
        </h3>
        <div className="tutorial-steps-grid">
          {tutorialSteps.map((st) => (
            <div key={st.step} className="tutorial-step-card">
              <div className="tutorial-step-badge" aria-hidden="true">
                <span>{st.icon}</span>
              </div>
              <div className="tutorial-step-body">
                <h4>{st.title[lang]}</h4>
                <p>{st.desc[lang]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selección de Destino con Tarjetas Grandes */}
      <div className="briefing-sites-section">
        <h3 className="briefing-section-heading">
          {lang === 'es'
            ? '🚀 Elige tu Base Espacial para Comenzar'
            : '🚀 Choose Your Space Outpost to Launch'}
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
                  <span className="site-planet-emoji" aria-hidden="true">
                    {isLunar ? '🌕' : '🔴'}
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
                      {lang === 'es' ? '📡 Señal a Tierra' : '📡 Signal Delay'}
                    </span>
                    <strong>{site.commDelayDisplay[lang]}</strong>
                  </div>
                  <div className="site-spec-pill">
                    <span className="spec-label">
                      {lang === 'es' ? '🌡️ Temperatura' : '🌡️ Temperature'}
                    </span>
                    <strong>{site.avgTempCelsius}</strong>
                  </div>
                  <div className="site-spec-pill">
                    <span className="spec-label">
                      {lang === 'es' ? '🌍 Gravedad' : '🌍 Gravity'}
                    </span>
                    <strong>{site.gravityG}g</strong>
                  </div>
                  <div className="site-spec-pill">
                    <span className="spec-label">
                      {lang === 'es' ? '🗓️ Duración' : '🗓️ Duration'}
                    </span>
                    <strong>
                      {site.totalMissionDays} {site.dayName[lang]}s
                    </strong>
                  </div>
                </div>

                {/* Recursos Iniciales */}
                <div className="site-initial-resources">
                  <span>⚡ {site.initialResources.power}%</span>
                  <span>🫧 O₂ {site.initialResources.lifeSupport}%</span>
                  <span>🌱 {site.initialResources.food}%</span>
                  <span>🛡️ {site.initialResources.shielding}%</span>
                </div>

                <small className="site-nasa-ref">🛰️ {site.nasaMissionReference[lang]}</small>

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
                      ? '🌕 Despegar a la Luna (Artemis) →'
                      : '🌕 Launch to the Moon (Artemis) →'
                    : lang === 'es'
                      ? '🔴 Despegar a Marte (Jezero) →'
                      : '🔴 Launch to Mars (Jezero) →'}
                </button>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
