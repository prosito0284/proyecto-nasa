import React, { useEffect, useState } from 'react';
import {
  CoreResources,
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
import {
  advanceMissionTurn,
  createInitialMissionState,
  evaluateCommanderPerformance,
  projectSystemsTurn,
  selectNextWeather,
} from './engine/simulationEngine';
import { OutpostMap } from './components/OutpostView/OutpostMap';
import { ResourcePanel } from './components/MissionHUD/ResourcePanel';
import { CommanderCertificate } from './components/MissionHUD/CommanderCertificate';
import { ScienceModal } from './components/ScienceTraceability/ScienceModal';
import { missionAudio } from './utils/sound';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('es');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [weatherPool, setWeatherPool] = useState<SpaceWeatherEvent[]>(VERIFIED_NASA_WEATHER_EVENTS);
  const [mission, setMission] = useState<MissionState>(() =>
    createInitialMissionState('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS[0])
  );
  const [hoveredChoice, setHoveredChoice] = useState<TradeoffChoice | null>(null);
  const [isScienceOpen, setIsScienceOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);

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
    setHoveredChoice(null);
    setMission(createInitialMissionState(siteId, weatherPool[0]));
  };

  const handleAllocationChange = (nextAlloc: PowerAllocation) => {
    setMission((prev) => ({
      ...prev,
      powerAllocation: nextAlloc,
    }));
  };

  const handleDecision = (choice: TradeoffChoice) => {
    setHoveredChoice(null);
    const nextWeather = selectNextWeather(mission, weatherPool);
    const updated = advanceMissionTurn(mission, choice, nextWeather, mission.powerAllocation);

    if (updated.status === 'won') {
      missionAudio.playSuccess();
      setIsBadgesOpen(true);
    } else if (updated.status === 'failed') {
      missionAudio.playAlert();
      setIsBadgesOpen(true);
    } else if (
      updated.currentWeather.type === 'FLR' ||
      updated.currentWeather.type === 'SEP' ||
      updated.currentWeather.type === 'CME'
    ) {
      missionAudio.playStormWarning();
    } else {
      missionAudio.playTurnAdvance();
    }

    setMission(updated);
  };

  const handleResetMission = () => {
    missionAudio.playClick();
    setHoveredChoice(null);
    setMission(createInitialMissionState(mission.siteId, weatherPool[0]));
  };

  const handleToggleMute = () => {
    const nextMuted = missionAudio.toggleMute();
    setIsMuted(nextMuted);
  };

  const currentSite = OUTPOST_SITES[mission.siteId];
  const liveProjection = projectSystemsTurn(
    mission,
    mission.powerAllocation,
    hoveredChoice?.resourceDelta.shielding ?? 0
  );
  const commanderEval = evaluateCommanderPerformance(mission);

  const renderChoiceDeltaTags = (delta: Partial<CoreResources>) => {
    const items: Array<{ icon: string; label: string; val: number; invertGood?: boolean }> = [];
    if (delta.power) items.push({ icon: '⚡', label: 'kWh', val: delta.power });
    if (delta.lifeSupport) items.push({ icon: '🫧', label: 'O₂/H₂O', val: delta.lifeSupport });
    if (delta.shielding) items.push({ icon: '🛡️', label: lang === 'es' ? 'Escudo' : 'Shield', val: delta.shielding });
    if (delta.food) items.push({ icon: '🌱', label: lang === 'es' ? 'Comida' : 'Food', val: delta.food });
    if (delta.crewHealth) items.push({ icon: '❤️', label: lang === 'es' ? 'Salud' : 'Health', val: delta.crewHealth });
    if (delta.sciencePoints) items.push({ icon: '🔬', label: lang === 'es' ? 'Ciencia' : 'Science', val: delta.sciencePoints });
    if (delta.radiationDoseMsv) {
      items.push({
        icon: '☢️',
        label: 'mSv',
        val: delta.radiationDoseMsv,
        invertGood: true,
      });
    }

    return (
      <div className="choice-deltas-row">
        {items.map((it, i) => {
          const isGood = it.invertGood ? it.val <= 0 : it.val > 0;
          const sign = it.val > 0 ? '+' : '';
          return (
            <span key={i} className={`delta-chip ${isGood ? 'chip-good' : 'chip-cost'}`}>
              {it.icon} {sign}
              {it.val}
              {it.label === 'mSv' || it.label === 'Ciencia' || it.label === 'Science' ? ` ${it.label}` : `% ${it.label}`}
            </span>
          );
        })}
      </div>
    );
  };

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
            🔬 {lang === 'es' ? 'Ciencia NASA y Quiz' : 'NASA Science & Quiz'}
          </button>
          <button
            id="toggle-mute-btn"
            className="btn-secondary"
            onClick={handleToggleMute}
            title={lang === 'es' ? 'Activar/Silenciar efectos de sonido' : 'Toggle sound effects'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <button
            id="toggle-lang-btn"
            className="btn-secondary"
            onClick={() => {
              missionAudio.playClick();
              setLang((l) => (l === 'es' ? 'en' : 'es'));
            }}
          >
            🌐 {lang === 'es' ? 'English' : 'Español'}
          </button>
        </div>
      </header>

      {/* Línea de tiempo visual de los 8 Días / Soles de Misión */}
      <div className="timeline-bar" aria-label="Mission Day Progress">
        <div className="timeline-label">
          <strong>
            🗓️ {currentSite.dayName[lang]} {mission.currentDay} / {mission.totalDays}
          </strong>
          <span>{currentSite.description[lang]}</span>
        </div>
        <div className="timeline-steps">
          {Array.from({ length: mission.totalDays }, (_, i) => i + 1).map((dayNum) => {
            const stateClass =
              dayNum < mission.currentDay
                ? 'step-done'
                : dayNum === mission.currentDay
                  ? 'step-current'
                  : 'step-upcoming';
            return (
              <div key={dayNum} className={`timeline-step ${stateClass}`}>
                {dayNum}
              </div>
            );
          })}
        </div>
      </div>

      <main className="mission-workspace">
        <ResourcePanel
          lang={lang}
          resources={mission.resources}
          allocation={mission.powerAllocation}
          projection={liveProjection}
          hoveredChoice={hoveredChoice}
          pendingEffects={mission.pendingDelayedEffects}
          evaluation={commanderEval}
          onChangeAllocation={handleAllocationChange}
          onOpenBadgesModal={() => setIsBadgesOpen(true)}
        />

        <div className="mission-center-col">
          <OutpostMap
            lang={lang}
            site={currentSite}
            currentDay={mission.currentDay}
            resources={mission.resources}
            allocation={mission.powerAllocation}
            weather={mission.currentWeather}
            projection={liveProjection}
            onOpenScienceModal={() => setIsScienceOpen(true)}
          />

          {mission.status === 'playing' && mission.currentDilemma && (
            <section className="dilemma-card" aria-label="Commander Decision Dilemma">
              <div className="dilemma-meta">
                <span>
                  🎯 {lang === 'es' ? 'DECISIÓN DE INGENIERÍA —' : 'ENGINEERING DECISION —'}{' '}
                  {currentSite.dayName[lang]} {mission.currentDay}
                </span>
                {mission.currentDilemma.highlightedTermId && (
                  <button
                    type="button"
                    className="term-link-btn"
                    onClick={() => {
                      missionAudio.playClick();
                      setIsScienceOpen(true);
                    }}
                  >
                    📘{' '}
                    {lang === 'es'
                      ? `Término NASA: ${mission.currentDilemma.highlightedTermId.toUpperCase()} (Ver Glosario)`
                      : `NASA Term: ${mission.currentDilemma.highlightedTermId.toUpperCase()} (Open Glossary)`}
                  </button>
                )}
              </div>
              <h2>{mission.currentDilemma.title[lang]}</h2>
              <p className="dilemma-situation">{mission.currentDilemma.situation[lang]}</p>

              <div className="choices-grid">
                {mission.currentDilemma.choices.map((choice) => (
                  <article
                    key={choice.id}
                    className="choice-box"
                    onMouseEnter={() => setHoveredChoice(choice)}
                    onMouseLeave={() => setHoveredChoice(null)}
                  >
                    <div className="choice-top-content">
                      <h4>{choice.label[lang]}</h4>
                      <p>{choice.description[lang]}</p>
                      {renderChoiceDeltaTags(choice.resourceDelta)}
                    </div>

                    <div className="tradeoff-callout">
                      <div>{choice.tradeoffWarning[lang]}</div>
                      {choice.nextTurnEffect && (
                        <div className="delayed-callout-line">
                          ⏱️{' '}
                          {lang === 'es'
                            ? `Efecto mañana: ${choice.nextTurnEffect.description.es}`
                            : `Tomorrow’s effect: ${choice.nextTurnEffect.description.en}`}
                        </div>
                      )}
                    </div>

                    <div className="choice-footer">
                      <small className="choice-nasa-ref">🛰️ {choice.nasaDataReference}</small>
                      <button
                        id={`choice-btn-${choice.id}`}
                        className="btn-primary"
                        onClick={() => handleDecision(choice)}
                      >
                        {lang === 'es'
                          ? 'Ejecutar Decisión y Avanzar Día →'
                          : 'Execute Decision & Advance Day →'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {mission.status !== 'playing' && (
            <section className="dilemma-card outcome-banner" aria-label="Mission Outcome">
              <div className="outcome-header-row">
                <div>
                  <span className="nasa-badge">
                    {mission.status === 'won' ? 'MISSION SUCCESS' : 'MISSION ABORTED'}
                  </span>
                  <h2>
                    {mission.status === 'won'
                      ? lang === 'es'
                        ? `🎉 ¡Misión Completada! Rango: ${commanderEval.rank.emoji} ${commanderEval.rank.title.es} (${commanderEval.score}/100)`
                        : `🎉 Mission Accomplished! Rank: ${commanderEval.rank.emoji} ${commanderEval.rank.title.en} (${commanderEval.score}/100)`
                      : lang === 'es'
                        ? '🚨 Misión Interrumpida — Aprendizaje de Ingeniería'
                        : '🚨 Mission Aborted — Engineering Lesson Learned'}
                  </h2>
                </div>
              </div>
              <p className="dilemma-situation">
                {mission.status === 'won'
                  ? commanderEval.rank.message[lang]
                  : mission.failureReason?.[lang]}
              </p>
              <div className="outcome-actions">
                <button
                  id="restart-mission-btn"
                  className="btn-primary"
                  onClick={handleResetMission}
                >
                  {lang === 'es' ? '🔄 Jugar Nueva Misión' : '🔄 Play Another Mission'}
                </button>
                <button
                  id="view-certificate-btn"
                  className="btn-secondary"
                  onClick={() => {
                    missionAudio.playClick();
                    setIsBadgesOpen(true);
                  }}
                >
                  🏅{' '}
                  {lang === 'es'
                    ? 'Ver Certificado e Insignias NASA'
                    : 'View NASA Certificate & Badges'}
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
            {mission.logs.slice(0, 5).map((entry, idx) => (
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

      <CommanderCertificate
        lang={lang}
        isOpen={isBadgesOpen}
        onClose={() => setIsBadgesOpen(false)}
        evaluation={commanderEval}
        site={currentSite}
        currentDay={mission.currentDay}
        totalDays={mission.totalDays}
        missionStatus={mission.status}
        onRestartMission={handleResetMission}
      />
    </div>
  );
};
