import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Language, OutpostSiteId, PowerAllocation, TradeoffChoice } from './types/mission';
import { OUTPOST_SITES } from './data/scenarios';
import { KID_SCIENCE_GLOSSARY, getGlossaryTerm } from './data/nasa-datasets';
import {
  DEFAULT_POWER_ALLOCATION,
  getCommDelaySeconds,
  getCrewReaction,
  getCrewStatus,
} from './engine/simulationEngine';
import { simulateTrainingDrill } from './engine/trainingDrill';
import { buildChallengeUrl, getDailyChallengeSeed, useMission } from './hooks/useMission';
import { useClassBoard } from './hooks/useClassBoard';
import { OutpostMap } from './components/OutpostView/OutpostMap';
import { ResourcePanel } from './components/MissionHUD/ResourcePanel';
import { CommanderCertificate } from './components/MissionHUD/CommanderCertificate';
import { PatchShowcaseModal } from './components/MissionHUD/PatchShowcaseModal';
import { PatchUnlockBanner } from './components/MissionHUD/PatchUnlockBanner';
import { MissionBriefing } from './components/MissionHUD/MissionBriefing';
import { TurnReport } from './components/MissionHUD/TurnReport';
import { ScienceModal } from './components/ScienceTraceability/ScienceModal';
import { SourceStamp } from './components/ScienceTraceability/SourceStamp';
import { CrewRoster } from './components/crew';
import { WorkOrder, inferSource } from './components/Mission/WorkOrder';
import { ClassBoard } from './components/Mission/ClassBoard';
import { TutorialSpotlight } from './components/Tutorial/TutorialSpotlight';
import { OnboardingSpotlight } from './components/Tutorial/OnboardingSpotlight';
import { TUTORIAL_STEPS } from './data/tutorial-steps';
import { useTutorial } from './hooks/useTutorial';
import { useOnboarding } from './hooks/useOnboarding';
import { usePatches } from './hooks/usePatches';
import {
  ArrowIcon,
  HelmetIcon,
  LanguageIcon,
  PatchIcon,
  ScienceIcon,
  SoundIcon,
} from './components/icons';
import { missionAudio } from './utils/sound';

const SOLAR_STORM_TYPES = ['FLR', 'SEP', 'CME'];
/** Tiempo que el sello "EJECUTADA" queda a la vista antes de avanzar el día. */
const STAMP_MS = 650;

const siteShortName = (siteId: OutpostSiteId, lang: Language) =>
  siteId === 'moon-shackleton'
    ? lang === 'es'
      ? 'Luna'
      : 'Moon'
    : lang === 'es'
      ? 'Marte'
      : 'Mars';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('es');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isScienceOpen, setIsScienceOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);
  const [isShowcaseOpen, setIsShowcaseOpen] = useState(false);
  const [focusTermId, setFocusTermId] = useState<string | undefined>(undefined);
  const [linkCopied, setLinkCopied] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [boardName, setBoardName] = useState('');
  const [boardSaved, setBoardSaved] = useState(false);
  const stampTimer = useRef<number | null>(null);
  const processedTurnKeyRef = useRef<string | null>(null);

  const {
    mission,
    weatherStatus,
    projection,
    evaluation: baseEvaluation,
    isBriefing,
    challengeSeed,
    lastTurn,
    dismissTurnReport,
    openBriefing,
    resumeMission,
    startMission,
    restartMission,
    setAllocation,
    previewChoice,
    setPreviewChoice,
    decide,
  } = useMission();
  const classBoard = useClassBoard();
  const patches = usePatches();
  const { unlockPatch, unlockPatches, isUnlocked } = patches;

  useEffect(
    () => () => {
      if (stampTimer.current !== null) window.clearTimeout(stampTimer.current);
    },
    [],
  );

  // P02: Conectar hitos del motor (victoria lunar/marciana, emergencia crítica e insignias)
  useEffect(() => {
    if (!lastTurn?.unlockedPatchIds || lastTurn.unlockedPatchIds.length === 0) return;
    const scenario = lastTurn.scenarioId ?? mission.siteId;
    const turnKey = `${scenario}-${lastTurn.day}-${mission.engine?.history.length ?? 0}`;
    if (processedTurnKeyRef.current === turnKey) return;
    processedTurnKeyRef.current = turnKey;
    unlockPatches(lastTurn.unlockedPatchIds.map((id) => ({ id, scenarioId: scenario })));
  }, [lastTurn, mission.siteId, mission.engine?.history.length, unlockPatches]);

  const es = lang === 'es';
  const quizAce = isUnlocked('quiz-ace');

  // Parches del diploma sincronizados con el historial persistente del dispositivo.
  const evaluation = useMemo(
    () => ({
      ...baseEvaluation,
      badges: [
        ...baseEvaluation.badges,
        {
          id: 'quiz-ace',
          title: { es: 'As del quiz', en: 'Quiz ace' },
          description: {
            es: 'Aprobaste el cuestionario en Ciencia NASA y quiz (≥65% de aciertos).',
            en: 'Passed the quiz in NASA Science & Quiz (≥65% accuracy).',
          },
          earned: quizAce,
        },
      ],
    }),
    [baseEvaluation, quizAce],
  );
  const crew = useMemo(() => getCrewStatus(mission), [mission]);
  const crewReaction = useMemo(
    () => (lastTurn ? getCrewReaction(lastTurn.previous, lastTurn.current) : null),
    [lastTurn],
  );

  const handleQuizComplete = (correct: number, total: number) => {
    if (total > 0 && correct >= Math.ceil(total * 0.65)) {
      unlockPatch('quiz-ace');
    }
  };
  const currentSite = OUTPOST_SITES[mission.siteId];
  const todaySeed = getDailyChallengeSeed();
  const weatherIsLive = mission.currentWeather.isLiveNasaData;

  const tutorialEnabled =
    !isBriefing &&
    mission.status === 'playing' &&
    !lastTurn &&
    !isScienceOpen &&
    !isBadgesOpen &&
    !isShowcaseOpen;

  const onboarding = useOnboarding({
    autoStart: true,
    enabled: tutorialEnabled,
    onCompleteTraining: () => {
      unlockPatch('training-graduate', mission.siteId);
    },
  });

  const tutorial = useTutorial(TUTORIAL_STEPS, {
    autoStart: false,
    enabled: tutorialEnabled,
    siteId: mission.siteId,
  });

  const handleInteractiveAction = (targetOrStepId: string) => {
    onboarding.completeOnboardingTarget(targetOrStepId);
    tutorial.completeActionTrigger(targetOrStepId);
  };

  const savedDrillAllocationRef = useRef<PowerAllocation | null>(null);
  const isEmergencyStepActive = Boolean(
    tutorialEnabled &&
      ((onboarding.isActive && onboarding.currentStep?.isEmergency) ||
        (tutorial.isActive && tutorial.currentStep?.drill)),
  );

  useEffect(() => {
    if (isEmergencyStepActive) {
      if (!savedDrillAllocationRef.current) {
        savedDrillAllocationRef.current = { ...mission.powerAllocation };
        if (mission.powerAllocation.shieldingAlloc >= 40) {
          setAllocation(DEFAULT_POWER_ALLOCATION);
        }
      }
      return;
    }
    if (savedDrillAllocationRef.current) {
      const restored = savedDrillAllocationRef.current;
      savedDrillAllocationRef.current = null;
      setAllocation(restored);
    }
  }, [isEmergencyStepActive, mission.powerAllocation, setAllocation]);

  const drillReadout = useMemo(
    () => (isEmergencyStepActive ? simulateTrainingDrill(mission) : null),
    [isEmergencyStepActive, mission],
  );

  const openScience = (termId?: string) => {
    missionAudio.playClick();
    onboarding.completeOnboardingTarget('nasa-telemetry');
    tutorial.completeActionTrigger('step-science-button');
    setFocusTermId(termId);
    setIsScienceOpen(true);
  };

  const handleLaunchTutorial = () => {
    missionAudio.playClick();
    setIsScienceOpen(false);
    setIsBadgesOpen(false);
    setIsShowcaseOpen(false);
    if (mission.status !== 'playing') {
      startMission(mission.siteId, challengeSeed);
      window.scrollTo({ top: 0 });
    } else if (isBriefing) {
      resumeMission();
    } else if (lastTurn) {
      dismissTurnReport();
    }
    onboarding.startOnboarding();
  };

  const handleStart = (siteId: OutpostSiteId, seed: number | null = null) => {
    missionAudio.playClick();
    setLinkCopied(false);
    setBoardSaved(false);
    startMission(siteId, seed);
    window.scrollTo({ top: 0 });
  };

  const applyDecision = (choice: TradeoffChoice) => {
    const updated = decide(choice);
    setExecutingId(null);
    if (updated.status === 'won') missionAudio.playSuccess();
    else if (updated.status === 'failed') missionAudio.playAlert();
    else if (SOLAR_STORM_TYPES.includes(updated.currentWeather.type))
      missionAudio.playStormWarning();
    else missionAudio.playTurnAdvance();
  };

  /** Firma la orden: muestra el sello un instante y luego avanza el día. */
  const handleExecute = (choice: TradeoffChoice) => {
    if (executingId) return;
    missionAudio.playClick();
    tutorial.completeActionTrigger('step-work-orders');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      applyDecision(choice);
      return;
    }
    setExecutingId(choice.id);
    stampTimer.current = window.setTimeout(() => applyDecision(choice), STAMP_MS);
  };

  /** Cierra el informe del día; si la misión terminó, abre el certificado. */
  const handleContinueAfterReport = () => {
    missionAudio.playClick();
    dismissTurnReport();
    if (mission.status !== 'playing') setIsBadgesOpen(true);
  };

  const handleResetMission = () => {
    missionAudio.playClick();
    setLinkCopied(false);
    setBoardSaved(false);
    restartMission();
  };

  const handleCopyChallengeLink = async () => {
    if (challengeSeed === null) return;
    try {
      await navigator.clipboard.writeText(buildChallengeUrl(mission.siteId, challengeSeed));
      setLinkCopied(true);
    } catch {
      setLinkCopied(false);
    }
  };

  const handleSaveToBoard = () => {
    const name = boardName.trim();
    if (!name || challengeSeed === null || boardSaved) return;
    classBoard.addEntry({
      name: name.slice(0, 24),
      siteId: mission.siteId,
      seed: challengeSeed,
      score: evaluation.score,
      rankTitle: evaluation.rank.title,
      won: mission.status === 'won',
      badges: evaluation.badges.filter((b) => b.earned).length,
    });
    setBoardSaved(true);
  };

  /** Línea de procedencia del clima espacial: en vivo, archivo, o archivo fijo del reto. */
  const weatherProvenance = (() => {
    if (challengeSeed !== null) {
      return es
        ? 'Reto del día: clima del archivo real de la NASA, igual para todos.'
        : 'Daily challenge: weather from the real NASA archive, the same for everyone.';
    }
    if (weatherStatus?.live) {
      const time = new Date(weatherStatus.fetchedAt).toLocaleTimeString(es ? 'es' : 'en', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return es
        ? `Clima espacial: DONKI en vivo, ${weatherStatus.count} registros, actualizado ${time}.`
        : `Space weather: live DONKI, ${weatherStatus.count} records, updated ${time}.`;
    }
    return es
      ? 'Clima espacial: archivo real de la NASA (DONKI en vivo no disponible ahora).'
      : 'Space weather: real NASA archive (live DONKI unavailable right now).';
  })();

  return (
    <div className="app-shell">
      <header className="top-nav">
        <div className="brand-block">
          <h1>Junior Astronaut Mission Trainer</h1>
          <p className="brand-subtitle">
            {es
              ? 'Cuaderno de vuelo del comandante · datos reales de la NASA · 7 a 12 años'
              : 'Commander’s flight notebook · real NASA data · ages 7 to 12'}
          </p>
        </div>

        <div className="nav-controls">
          {!isBriefing && (
            <button
              id="new-mission-btn"
              className="btn-secondary"
              onClick={() => {
                missionAudio.playClick();
                openBriefing();
              }}
            >
              {es ? 'Cambiar de base' : 'Change outpost'}
            </button>
          )}
          <button
            id="start-tutorial-btn"
            data-onboarding-id="training-button"
            className="btn-secondary tutorial-launch-btn"
            onClick={handleLaunchTutorial}
          >
            <HelmetIcon size={16} />{' '}
            <span>{es ? 'Entrenamiento' : 'Training'}</span>
          </button>
          <button
            id="open-science-modal-btn"
            data-tutorial-id="science-button"
            data-onboarding-id="nasa-telemetry"
            className="btn-secondary"
            onClick={() => openScience()}
          >
            <ScienceIcon size={16} /> {es ? 'Ciencia NASA y quiz' : 'NASA science & quiz'}
          </button>
          <button
            id="open-patches-showcase-btn"
            data-testid="open-patches-showcase-btn"
            type="button"
            className="btn-secondary"
            onClick={() => {
              missionAudio.playClick();
              setIsShowcaseOpen(true);
            }}
          >
            <PatchIcon size={16} />{' '}
            <span>
              {es ? 'Vitrina' : 'Patches'} {patches.unlockedCount}/{patches.totalCatalogCount}
            </span>
          </button>
          <button
            id="toggle-mute-btn"
            className="btn-secondary"
            onClick={() => setIsMuted(missionAudio.toggleMute())}
            aria-pressed={isMuted}
          >
            <SoundIcon size={16} />{' '}
            {isMuted ? (es ? 'Sonido: no' : 'Sound: off') : es ? 'Sonido: sí' : 'Sound: on'}
          </button>
          <button
            id="toggle-lang-btn"
            className="btn-secondary"
            onClick={() => {
              missionAudio.playClick();
              setLang((l) => (l === 'es' ? 'en' : 'es'));
            }}
          >
            <LanguageIcon size={16} /> {es ? 'English' : 'Español'}
          </button>
        </div>
      </header>

      {isBriefing ? (
        <>
          <MissionBriefing
            lang={lang}
            sites={Object.values(OUTPOST_SITES)}
            selectedSiteId={mission.siteId}
            onStart={(siteId) => handleStart(siteId)}
          />
          <section
            className="daily-challenge-strip"
            aria-label={es ? 'Reto del día' : 'Daily challenge'}
          >
            <div>
              <strong>{es ? 'Reto del día' : 'Daily challenge'}</strong>
              <span>
                {es
                  ? 'Compite hoy con la misma semilla de clima espacial por el mejor rango.'
                  : 'Compete today with the exact same space weather seed for top rank.'}
              </span>
            </div>
            <div className="daily-challenge-actions">
              {Object.values(OUTPOST_SITES).map((site) => (
                <button
                  key={site.id}
                  id={`daily-challenge-${site.id}`}
                  className="btn-secondary"
                  onClick={() => handleStart(site.id, todaySeed)}
                >
                  {es ? 'Reto en' : 'Challenge on'} {siteShortName(site.id, lang)}{' '}
                  <ArrowIcon size={14} />
                </button>
              ))}
            </div>
          </section>
          <ClassBoard
            lang={lang}
            entries={classBoard.entriesForSeed(todaySeed)}
            onClear={classBoard.clearBoard}
          />
        </>
      ) : (
        <>
          <div
            className="timeline-bar"
            data-tutorial-id="timeline-bar"
            aria-label={es ? 'Progreso de la misión' : 'Mission progress'}
          >
            <div className="timeline-label">
              <strong>
                {currentSite.dayName[lang]} {mission.currentDay} / {mission.totalDays}
                {challengeSeed !== null && (
                  <span className="challenge-tag">
                    {' '}
                    · {es ? 'Reto' : 'Challenge'} {challengeSeed}
                  </span>
                )}
              </strong>
              <span>{weatherProvenance}</span>
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
              projection={projection}
              hoveredChoice={previewChoice}
              pendingEffects={mission.pendingDelayedEffects}
              evaluation={evaluation}
              onChangeAllocation={setAllocation}
              onOpenBadgesModal={() => setIsBadgesOpen(true)}
              crew={crew}
              onTutorialAction={handleInteractiveAction}
              unlockedRecords={patches.unlockedById}
            />

            <div className="mission-center-col">
              {onboarding.isActive && onboarding.currentStep?.isEmergency && (
                <div
                  className="onboarding-thermal-alert-banner"
                  data-testid="onboarding-thermal-alert"
                  role="alert"
                >
                  <span className="onboarding-thermal-tag">
                    {es ? 'ALERTA TÉRMICA' : 'THERMAL ALERT'}
                  </span>
                  <span>
                    {es
                      ? 'Caída nocturna de temperatura detectada en el hábitat.'
                      : 'Night temperature drop detected inside the habitat.'}
                  </span>
                </div>
              )}

              <OutpostMap
                lang={lang}
                site={currentSite}
                currentDay={mission.currentDay}
                resources={mission.resources}
                allocation={mission.powerAllocation}
                weather={mission.currentWeather}
                projection={projection}
                onOpenScienceModal={() => openScience()}
                commDelaySeconds={getCommDelaySeconds(mission.siteId, mission.currentDay)}
                onTutorialAction={handleInteractiveAction}
              />

              {lastTurn && (
                <TurnReport
                  lang={lang}
                  previous={lastTurn.previous}
                  current={lastTurn.current}
                  logs={lastTurn.logs}
                  day={lastTurn.day}
                  siteDayName={currentSite.dayName}
                  onContinue={handleContinueAfterReport}
                  crewLine={crewReaction ?? undefined}
                />
              )}

              {!lastTurn && mission.status === 'playing' && mission.currentDilemma && (
                <section
                  className="dilemma-card"
                  aria-label={es ? 'Decisión del día' : 'Decision of the day'}
                >
                  <div className="dilemma-meta">
                    <span>
                      {es ? 'Decisión de ingeniería' : 'Engineering decision'} ·{' '}
                      {currentSite.dayName[lang]} {mission.currentDay}
                    </span>
                    {mission.currentDilemma.highlightedTermId && (
                      <button
                        type="button"
                        className="term-link-btn"
                        onClick={() => openScience(mission.currentDilemma?.highlightedTermId)}
                      >
                        {es ? '¿Qué es' : 'What is'}{' '}
                        {getGlossaryTerm(mission.currentDilemma.highlightedTermId)?.term[lang] ??
                          mission.currentDilemma.highlightedTermId}
                        ?
                      </button>
                    )}
                  </div>
                  <h2>{mission.currentDilemma.title[lang]}</h2>
                  <p className="dilemma-situation">{mission.currentDilemma.situation[lang]}</p>

                  <div className="dilemma-weather" data-tutorial-id="dilemma-weather">
                    <SourceStamp
                      source={mission.currentWeather.type === 'DUST_STORM' ? 'MARS' : 'DONKI'}
                      live={weatherIsLive}
                      url={mission.currentWeather.sourceUrl}
                      lang={lang}
                    />
                    <span>
                      {es ? 'Clima de hoy' : 'Today’s weather'}:{' '}
                      {mission.currentWeather.title[lang]}
                    </span>
                  </div>

                  <div className="crew-strip" data-tutorial-id="crew-status">
                    <CrewRoster lang={lang} crew={crew} />
                  </div>

                  <div className="choices-grid" data-tutorial-id="work-orders">
                    {mission.currentDilemma.choices.map((choice, i) => (
                      <WorkOrder
                        key={choice.id}
                        lang={lang}
                        choice={choice}
                        code={`OT-${mission.currentDay}${'ABC'[i] ?? i + 1}`}
                        weatherIsLive={weatherIsLive}
                        executed={executingId === choice.id}
                        disabled={executingId !== null}
                        onPreview={setPreviewChoice}
                        onExecute={handleExecute}
                        tutorialId={i === 0 ? 'primary-work-order' : undefined}
                        onTutorialAction={handleInteractiveAction}
                      />
                    ))}
                  </div>
                </section>
              )}

              {!lastTurn && mission.status !== 'playing' && (
                <section
                  className="dilemma-card outcome-banner"
                  aria-label={es ? 'Resultado' : 'Outcome'}
                >
                  <span className="nasa-badge">
                    {mission.status === 'won'
                      ? es
                        ? 'Misión cumplida'
                        : 'Mission accomplished'
                      : es
                        ? 'Misión abortada'
                        : 'Mission aborted'}
                  </span>
                  <h2>
                    {mission.status === 'won'
                      ? `${es ? 'Rango' : 'Rank'}: ${evaluation.rank.title[lang]} · ${evaluation.score}/100`
                      : es
                        ? 'La misión se interrumpió. Esto es lo que enseña'
                        : 'The mission was cut short. Here is the lesson'}
                  </h2>
                  <p className="dilemma-situation">
                    {mission.status === 'won'
                      ? evaluation.rank.message[lang]
                      : mission.failureReason?.[lang]}
                  </p>
                  <div className="outcome-actions">
                    <button
                      id="restart-mission-btn"
                      className="btn-primary"
                      onClick={handleResetMission}
                    >
                      {challengeSeed !== null
                        ? es
                          ? 'Repetir este reto'
                          : 'Replay this challenge'
                        : es
                          ? 'Jugar otra misión'
                          : 'Play another mission'}
                    </button>
                    <button
                      id="view-certificate-btn"
                      className="btn-secondary"
                      onClick={() => {
                        missionAudio.playClick();
                        setIsBadgesOpen(true);
                      }}
                    >
                      <PatchIcon size={16} />{' '}
                      {es ? 'Ver certificado y parches' : 'View certificate & patches'}
                    </button>
                    {challengeSeed !== null && (
                      <button
                        id="copy-challenge-btn"
                        className="btn-secondary"
                        onClick={handleCopyChallengeLink}
                      >
                        {linkCopied
                          ? es
                            ? 'Enlace copiado'
                            : 'Link copied'
                          : es
                            ? 'Copiar enlace del reto'
                            : 'Copy challenge link'}
                      </button>
                    )}
                  </div>

                  {evaluation.rank.id !== 'star-commander' && (
                    <div className="top-rank-checks">
                      <h3>
                        {es
                          ? 'Qué pide el rango máximo, Comandante Estelar'
                          : 'What the top rank, Star Commander, requires'}
                      </h3>
                      <ul>
                        {evaluation.topRankChecks.map((check) => (
                          <li
                            key={check.id}
                            className={check.met ? 'top-rank-met' : 'top-rank-missing'}
                          >
                            <span className="top-rank-mark" aria-hidden="true">
                              {check.met ? '✓' : '·'}
                            </span>
                            <span>
                              {check.label[lang]}
                              <span className="sr-only">
                                {check.met
                                  ? es
                                    ? ' (cumplido)'
                                    : ' (met)'
                                  : es
                                    ? ' (falta)'
                                    : ' (missing)'}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {challengeSeed !== null && (
                    <div className="board-entry">
                      <label htmlFor="board-name-input">
                        {es
                          ? 'Anótate en la tabla del aula'
                          : 'Add yourself to the classroom board'}
                      </label>
                      <div className="board-entry-row">
                        <input
                          id="board-name-input"
                          type="text"
                          maxLength={24}
                          value={boardName}
                          disabled={boardSaved}
                          placeholder={es ? 'Tu nombre' : 'Your name'}
                          onChange={(e) => setBoardName(e.target.value)}
                        />
                        <button
                          id="board-save-btn"
                          className="btn-secondary"
                          disabled={boardSaved || boardName.trim() === ''}
                          onClick={handleSaveToBoard}
                        >
                          {boardSaved ? (es ? 'Anotado' : 'Saved') : es ? 'Anotar' : 'Save'}
                        </button>
                      </div>
                      <ClassBoard lang={lang} entries={classBoard.entriesForSeed(challengeSeed)} />
                    </div>
                  )}
                </section>
              )}

              {!lastTurn && (
                <section className="logs-card" aria-label={es ? 'Bitácora' : 'Mission log'}>
                  <h3>{es ? 'Bitácora de la misión' : 'Mission log'}</h3>
                  {mission.logs.slice(0, 5).map((entry, idx) => {
                    const source = entry.nasaTag ? inferSource(entry.nasaTag) : null;
                    return (
                      <div key={idx} className="log-item">
                        <div className="log-item-head">
                          <strong>
                            {currentSite.dayName[lang]} {entry.day}: {entry.title[lang]}
                          </strong>
                          {source ? (
                            <SourceStamp
                              source={source}
                              live={
                                source === 'DONKI' &&
                                challengeSeed === null &&
                                !!weatherStatus?.live
                              }
                              lang={lang}
                            />
                          ) : (
                            entry.nasaTag &&
                            entry.nasaTag !== 'CHAIN' &&
                            entry.nasaTag !== 'COMMANDER' && (
                              <span className="nasa-tag">{entry.nasaTag}</span>
                            )
                          )}
                        </div>
                        <p>{entry.detail[lang]}</p>
                      </div>
                    );
                  })}
                </section>
              )}
            </div>
          </main>
        </>
      )}

      <ScienceModal
        lang={lang}
        isOpen={isScienceOpen}
        onClose={() => {
          setIsScienceOpen(false);
          onboarding.completeOnboardingTarget('nasa-telemetry');
        }}
        glossary={KID_SCIENCE_GLOSSARY}
        currentWeather={mission.currentWeather}
        focusTermId={focusTermId}
        siteId={mission.siteId}
        onQuizComplete={handleQuizComplete}
        onTutorialAction={handleInteractiveAction}
      />

      <CommanderCertificate
        lang={lang}
        isOpen={isBadgesOpen}
        onClose={() => setIsBadgesOpen(false)}
        evaluation={evaluation}
        site={currentSite}
        currentDay={mission.currentDay}
        totalDays={mission.totalDays}
        missionStatus={mission.status}
        onRestartMission={handleResetMission}
        history={mission.engine?.history}
        crew={crew}
        unlockedRecords={patches.unlockedById}
        onOpenShowcase={() => {
          setIsBadgesOpen(false);
          setIsShowcaseOpen(true);
        }}
      />

      <PatchShowcaseModal
        lang={lang}
        isOpen={isShowcaseOpen}
        onClose={() => setIsShowcaseOpen(false)}
        unlockedById={patches.unlockedById}
        onOpenCertificate={
          !isBriefing
            ? () => {
                setIsShowcaseOpen(false);
                setIsBadgesOpen(true);
              }
            : undefined
        }
      />

      <PatchUnlockBanner
        lang={lang}
        record={patches.activeUnlockBanner}
        onDismiss={patches.dismissUnlockBanner}
        onOpenShowcase={() => {
          missionAudio.playClick();
          patches.dismissUnlockBanner();
          setIsShowcaseOpen(true);
        }}
      />

      <OnboardingSpotlight
        lang={lang}
        isActive={onboarding.isActive && tutorialEnabled}
        step={onboarding.currentStep}
        targetRect={onboarding.targetRect}
        onSkip={() => {
          missionAudio.playClick();
          onboarding.skipOnboarding();
        }}
      />

      <TutorialSpotlight
        lang={lang}
        isActive={tutorial.isActive && tutorialEnabled}
        step={tutorial.currentStep}
        stepIndex={tutorial.currentStepIndex}
        totalSteps={tutorial.totalSteps}
        targetRect={tutorial.targetRect}
        drillReadout={drillReadout}
        onNext={() => {
          missionAudio.playClick();
          tutorial.nextStep();
        }}
        onPrev={() => {
          missionAudio.playClick();
          tutorial.prevStep();
        }}
        onSkip={() => {
          missionAudio.playClick();
          tutorial.skipTutorial();
        }}
      />
    </div>
  );
};
