import React, { useEffect, useState } from 'react';
import {
  Language,
  MissionState,
  OutpostSiteId,
  PowerAllocation,
  SpaceWeatherEvent,
  TradeoffChoice,
} from './types/mission';
import { OUTPOST_SITES } from './data/scenarios';
import { KID_SCIENCE_GLOSSARY, VERIFIED_NASA_WEATHER_EVENTS } from './data/nasa-datasets';
import { fetchLiveOrVerifiedSpaceWeather } from './services/nasaApi';
import { advanceMissionTurn, createInitialMissionState } from './engine/simulationEngine';
import { OutpostMap } from './components/OutpostView/OutpostMap';
import { ResourcePanel } from './components/MissionHUD/ResourcePanel';
import { ScienceModal } from './components/ScienceTraceability/ScienceModal';
import { missionAudio } from './utils/sound';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('es');
  const [weatherPool, setWeatherPool] = useState<SpaceWeatherEvent[]>(VERIFIED_NASA_WEATHER_EVENTS);
  const [mission, setMission] = useState<MissionState>(() =>
    createInitialMissionState('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS[0])
  );
  const [isScienceOpen, setIsScienceOpen] = useState(false);

  useEffect(() => {
    fetchLiveOrVerifiedSpaceWeather().then((events) => {
      if (events.length > 0) {
        setWeatherPool(events);
        setMission((prev) => ({
          ...prev,
          currentWeather: events[0],
        }));
      }
    });
  }, []);

  const handleSelectSite = (siteId: OutpostSiteId) => {
    missionAudio.playClick();
    setMission(createInitialMissionState(siteId, weatherPool[0]));
  };

  const handleAllocationChange = (nextAlloc: PowerAllocation) => {
    setMission((prev) => ({
      ...prev,
      powerAllocation: nextAlloc,
    }));
  };

  const handleDecision = (choice: TradeoffChoice) => {
    missionAudio.playClick();
    const nextWeather = weatherPool[mission.currentDay % weatherPool.length];
    const updated = advanceMissionTurn(mission, choice, nextWeather, mission.powerAllocation);
    if (updated.status === 'won') {
      missionAudio.playSuccess();
    } else if (updated.status === 'failed') {
      missionAudio.playAlert();
    }
    setMission(updated);
  };

  const handleResetMission = () => {
    missionAudio.playClick();
    setMission(createInitialMissionState(mission.siteId, weatherPool[0]));
  };

  const currentSite = OUTPOST_SITES[mission.siteId];

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand-block">
          <h1>👨‍🚀 Junior Astronaut Mission Trainer</h1>
          <p className="brand-subtitle">
            {lang === 'es'
              ? 'Simulador de Decisiones y Trade-Offs con Datos Reales de la NASA (Edades 7–12)'
              : 'Real NASA Data Trade-Off & Outpost Survival Simulator (Ages 7–12)'}
          </p>
        </div>

        <div className="nav-controls">
          <button
            id="select-moon-btn"
            className={`site-tab ${mission.siteId === 'moon-shackleton' ? 'active' : ''}`}
            onClick={() => handleSelectSite('moon-shackleton')}
          >
            🌕 {lang === 'es' ? 'Luna (Artemis)' : 'Moon (Artemis)'}
          </button>
          <button
            id="select-mars-btn"
            className={`site-tab ${mission.siteId === 'mars-jezero' ? 'active' : ''}`}
            onClick={() => handleSelectSite('mars-jezero')}
          >
            🔴 {lang === 'es' ? 'Marte (Jezero)' : 'Mars (Jezero)'}
          </button>
          <button
            id="open-science-modal-btn"
            className="btn-secondary"
            onClick={() => {
              missionAudio.playClick();
              setIsScienceOpen(true);
            }}
          >
            🔬 {lang === 'es' ? 'Datos NASA y Glosario' : 'NASA Data & Glossary'}
          </button>
          <button
            id="toggle-lang-btn"
            className="btn-secondary"
            onClick={() => setLang((l) => (l === 'es' ? 'en' : 'es'))}
          >
            🌐 {lang === 'es' ? 'English' : 'Español'}
          </button>
        </div>
      </header>

      <main className="mission-workspace">
        <ResourcePanel
          lang={lang}
          resources={mission.resources}
          allocation={mission.powerAllocation}
          onChangeAllocation={handleAllocationChange}
        />

        <div className="mission-center-col">
          <OutpostMap
            lang={lang}
            site={currentSite}
            resources={mission.resources}
            allocation={mission.powerAllocation}
            weather={mission.currentWeather}
          />

          {mission.status === 'playing' && mission.currentDilemma && (
            <section className="dilemma-card" aria-label="Commander Decision Dilemma">
              <div className="dilemma-meta">
                <span>
                  {currentSite.dayName[lang]} {mission.currentDay} / {mission.totalDays}
                </span>
                <span>{mission.currentWeather.title[lang]}</span>
              </div>
              <h2>{mission.currentDilemma.title[lang]}</h2>
              <p className="dilemma-situation">{mission.currentDilemma.situation[lang]}</p>

              <div className="choices-grid">
                {mission.currentDilemma.choices.map((choice) => (
                  <article key={choice.id} className="choice-box">
                    <div>
                      <h4>{choice.label[lang]}</h4>
                      <p>{choice.description[lang]}</p>
                    </div>
                    <div className="tradeoff-callout">{choice.tradeoffWarning[lang]}</div>
                    <button
                      id={`choice-btn-${choice.id}`}
                      className="btn-primary"
                      onClick={() => handleDecision(choice)}
                    >
                      {lang === 'es'
                        ? 'Ejecutar Decisión y Avanzar Día →'
                        : 'Execute Decision & Advance Day →'}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          {mission.status !== 'playing' && (
            <section className="dilemma-card" aria-label="Mission Outcome">
              <h2>
                {mission.status === 'won'
                  ? lang === 'es'
                    ? '🎉 ¡Misión Completada con Éxito, Comandante Junior!'
                    : '🎉 Mission Accomplished, Junior Commander!'
                  : lang === 'es'
                    ? '🚨 Misión Interrumpida — Aprendizaje de Ingeniería'
                    : '🚨 Mission Aborted — Engineering Lesson Learned'}
              </h2>
              <p className="dilemma-situation">
                {mission.status === 'won'
                  ? lang === 'es'
                    ? `Mantuviste viva la base durante los ${mission.totalDays} días equilibrando energía, oxígeno, comida y blindaje solar con ${mission.resources.sciencePoints} puntos de ciencia.`
                    : `You kept the outpost thriving for all ${mission.totalDays} days by balancing power, oxygen, food, and radiation shielding with ${mission.resources.sciencePoints} science points.`
                  : mission.failureReason?.[lang]}
              </p>
              <div>
                <button id="restart-mission-btn" className="btn-primary" onClick={handleResetMission}>
                  {lang === 'es' ? '🔄 Intentar Nueva Misión' : '🔄 Try Another Mission'}
                </button>
              </div>
            </section>
          )}

          <section className="logs-card" aria-label="Mission Telemetry Log">
            <h3>
              {lang === 'es'
                ? '📜 Bitácora de Consecuencias y Ciencia NASA'
                : '📜 Consequences & NASA Science Log'}
            </h3>
            {mission.logs.slice(0, 4).map((entry, idx) => (
              <div key={idx} className="log-item">
                <div className="log-item-head">
                  <strong>
                    {currentSite.dayName[lang]} {entry.day}: {entry.title[lang]}
                  </strong>
                  {entry.nasaTag && <span className="nasa-tag">{entry.nasaTag}</span>}
                </div>
                <p>{entry.detail[lang]}</p>
              </div>
            ))}
          </section>
        </div>
      </main>

      <ScienceModal
        lang={lang}
        isOpen={isScienceOpen}
        onClose={() => setIsScienceOpen(false)}
        glossary={KID_SCIENCE_GLOSSARY}
        currentWeather={mission.currentWeather}
      />
    </div>
  );
};
