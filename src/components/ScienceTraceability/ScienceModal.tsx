/**
 * BLOQUE B (Asignado a: Antigravity del Compañero - Rama: feat/nasa-data-service)
 * Panel interactivo y accesible de "Ciencia Real de la NASA" con 4 pestañas:
 * 1. Clima Espacial en Vivo (DONKI FLR/SEP/CME) + Glosario (7-12 años)
 * 2. Estudios Reales NASA OSDR (BioSentinel, RAD, Veggie OSD-379, APH, MOXIE)
 * 3. Fotografías Reales de la NASA (images-api.nasa.gov en vivo + curadas)
 * 4. Mini-Quiz Interactivo de Astronauta Junior (14 preguntas conectadas a dilemas)
 *
 * Accesibilidad (B6):
 * - role="dialog", aria-modal="true", aria-labelledby="science-modal-title"
 * - Trampa de foco (Tab / Shift+Tab ciclan dentro del modal) y retorno de foco al cerrar
 * - Cierre con tecla Escape (Esc)
 * - Todos los botones y controles interactivos tienen minHeight >= 44px
 * - Todas las fotografías de la NASA incluyen texto alternativo (alt) descriptivo bilingüe
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  GlossaryTerm,
  Language,
  OutpostSiteId,
  SpaceWeatherEvent,
} from '../../types/mission';
import {
  NASA_OSDR_STUDIES,
  NasaGalleryImage,
  NasaOsdrStudy,
  VERIFIED_NASA_GALLERY_IMAGES,
  VERIFIED_NASA_WEATHER_EVENTS,
  getGlossaryTerm,
  getQuizQuestionsForSite,
} from '../../data/nasa-datasets';
import {
  fetchLiveOrVerifiedSpaceWeather,
  fetchNasaGalleryImages,
} from '../../services/nasaApi';
import { missionAudio } from '../../utils/sound';

export interface ScienceModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  glossary: GlossaryTerm[];
  currentWeather: SpaceWeatherEvent;
  /** ID opcional del término científico a resaltar al abrir el modal (B2) */
  focusTermId?: string;
  /** ID opcional de la base actual ('moon-shackleton' | 'mars-jezero') para filtrar el Mini-Quiz (B5) */
  siteId?: OutpostSiteId;
}

type ModalTab = 'donki-glossary' | 'osdr-studies' | 'nasa-photos' | 'mini-quiz';

const TAB_ORDER: ModalTab[] = [
  'donki-glossary',
  'osdr-studies',
  'nasa-photos',
  'mini-quiz',
];

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const MIN_TOUCH_TARGET_STYLE: React.CSSProperties = {
  minHeight: '44px',
  minWidth: '44px',
};

export const ScienceModal: React.FC<ScienceModalProps> = ({
  lang,
  isOpen,
  onClose,
  glossary,
  currentWeather,
  focusTermId,
  siteId,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('donki-glossary');
  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  // Estado Tab 1: DONKI en Vivo y Glosario
  const [donkiEvents, setDonkiEvents] = useState<SpaceWeatherEvent[]>(
    VERIFIED_NASA_WEATHER_EVENTS
  );
  const [isLoadingDonki, setIsLoadingDonki] = useState(false);
  const [weatherTypeFilter, setWeatherTypeFilter] = useState<
    'ALL' | SpaceWeatherEvent['type']
  >('ALL');
  const [glossarySourceFilter, setGlossarySourceFilter] = useState<
    'ALL' | GlossaryTerm['nasaSource']
  >('ALL');
  const [glossarySearch, setGlossarySearch] = useState('');

  // Estado Tab 2: Estudios NASA OSDR
  const [osdrCategory, setOsdrCategory] = useState<
    'all' | NasaOsdrStudy['category']
  >('all');

  // Estado Tab 3: Fotografías Reales de la NASA (images-api.nasa.gov)
  const [galleryImages, setGalleryImages] = useState<NasaGalleryImage[]>(
    VERIFIED_NASA_GALLERY_IMAGES
  );
  const [photoCategory, setPhotoCategory] = useState<
    'all' | NasaGalleryImage['category']
  >('all');
  const [photoQuery, setPhotoQuery] = useState('');
  const [isLoadingPhotos, setIsLoadingPhotos] = useState(false);
  const [failedImageIds, setFailedImageIds] = useState<Record<string, boolean>>(
    {}
  );

  // Estado Tab 4: Mini-Quiz para niños
  const [quizSiteFilter, setQuizSiteFilter] = useState<OutpostSiteId | 'all'>(
    siteId ?? 'all'
  );
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    if (siteId) {
      setQuizSiteFilter(siteId);
    }
  }, [siteId]);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingDonki(true);
    fetchLiveOrVerifiedSpaceWeather(false)
      .then((events) => {
        if (events.length > 0) {
          setDonkiEvents(events);
        }
      })
      .finally(() => setIsLoadingDonki(false));
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !focusTermId) return;
    setActiveTab('donki-glossary');
    setGlossarySourceFilter('ALL');
    setGlossarySearch('');
    const timer = setTimeout(() => {
      if (typeof document !== 'undefined') {
        const el = document.getElementById(`glossary-term-${focusTermId}`);
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen, focusTermId]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'nasa-photos') return;
    setIsLoadingPhotos(true);
    fetchNasaGalleryImages(photoQuery, photoCategory, false)
      .then((imgs) => {
        setGalleryImages(imgs);
      })
      .finally(() => setIsLoadingPhotos(false));
  }, [isOpen, activeTab, photoCategory]);

  // Accesibilidad B6: Trampa de foco, foco inicial, restauración de foco y cierre con Esc
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;

    previouslyFocusedElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusTimer = setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key === 'Tab' && modalCardRef.current) {
        const focusableNodes = Array.from(
          modalCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusableNodes.length === 0) return;

        const firstEl = focusableNodes[0];
        const lastEl = focusableNodes[focusableNodes.length - 1];
        const activeEl = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (
            activeEl === firstEl ||
            !activeEl ||
            !modalCardRef.current.contains(activeEl)
          ) {
            event.preventDefault();
            lastEl.focus();
          }
        } else {
          if (
            activeEl === lastEl ||
            !activeEl ||
            !modalCardRef.current.contains(activeEl)
          ) {
            event.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElementRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleTabSwitch = (tab: ModalTab) => {
    missionAudio.playClick();
    setActiveTab(tab);
  };

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: ModalTab
  ) => {
    const idx = TAB_ORDER.indexOf(currentTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTab = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
      handleTabSwitch(nextTab);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevTab =
        TAB_ORDER[(idx - 1 + TAB_ORDER.length) % TAB_ORDER.length];
      handleTabSwitch(prevTab);
    }
  };

  const handleRefreshDonki = () => {
    missionAudio.playClick();
    setIsLoadingDonki(true);
    fetchLiveOrVerifiedSpaceWeather(true)
      .then((events) => {
        setDonkiEvents(events);
      })
      .finally(() => setIsLoadingDonki(false));
  };

  const handlePhotoSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    missionAudio.playClick();
    setIsLoadingPhotos(true);
    fetchNasaGalleryImages(photoQuery, photoCategory, true)
      .then((imgs) => {
        setGalleryImages(imgs);
      })
      .finally(() => setIsLoadingPhotos(false));
  };

  const handleSelectQuizOption = (
    questionId: string,
    optionId: string,
    isCorrect: boolean
  ) => {
    if (selectedAnswers[questionId]) return;
    if (isCorrect) {
      missionAudio.playSuccess();
    } else {
      missionAudio.playAlert();
    }
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleResetQuiz = () => {
    missionAudio.playClick();
    setSelectedAnswers({});
  };

  const filteredDonkiEvents = donkiEvents.filter(
    (ev) => weatherTypeFilter === 'ALL' || ev.type === weatherTypeFilter
  );

  const focusedTerm =
    getGlossaryTerm(focusTermId) ||
    glossary.find((item) => item.id === focusTermId);

  const filteredGlossary = glossary
    .filter((item) => {
      const matchesSource =
        glossarySourceFilter === 'ALL' ||
        item.nasaSource === glossarySourceFilter;
      if (!glossarySearch.trim()) return matchesSource;
      const q = glossarySearch.toLowerCase();
      return (
        matchesSource &&
        (item.term[lang].toLowerCase().includes(q) ||
          item.shortDefinition[lang].toLowerCase().includes(q) ||
          item.kidAnalogy[lang].toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (focusTermId && a.id === focusTermId) return -1;
      if (focusTermId && b.id === focusTermId) return 1;
      return 0;
    });

  const filteredStudies = NASA_OSDR_STUDIES.filter(
    (st) => osdrCategory === 'all' || st.category === osdrCategory
  );

  const filteredQuizQuestions = getQuizQuestionsForSite(quizSiteFilter);
  const totalQuestions = filteredQuizQuestions.length;
  const answeredCount = filteredQuizQuestions.filter((q) =>
    Boolean(selectedAnswers[q.id])
  ).length;
  const correctCount = filteredQuizQuestions.reduce((acc, q) => {
    const chosenId = selectedAnswers[q.id];
    const chosenOpt = q.options.find((o) => o.id === chosenId);
    return acc + (chosenOpt?.isCorrect ? 1 : 0);
  }, 0);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="science-modal-title"
      id="nasa-science-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <style>{`
        #nasa-science-modal button,
        #nasa-science-modal input[type="search"] {
          min-height: 44px;
          min-width: 44px;
        }
        #nasa-science-modal button:focus-visible,
        #nasa-science-modal a:focus-visible,
        #nasa-science-modal input:focus-visible {
          outline: 2px solid var(--accent-amber);
          outline-offset: 2px;
        }
      `}</style>
      <div
        ref={modalCardRef}
        className="modal-card"
        style={{ maxWidth: '980px', maxHeight: '90vh' }}
      >
        {/* Encabezado Principal */}
        <div className="modal-header">
          <div>
            <span className="nasa-badge">
              NASA OPEN SCIENCE TRACEABILITY • DONKI • OSDR • ARTEMIS • MARS
            </span>
            <h2 id="science-modal-title">
              {lang === 'es'
                ? '🔬 Centro de Ciencia Real de la NASA para Astronautas Junior'
                : '🔬 Real NASA Science Center for Junior Astronauts'}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="btn-secondary"
            style={MIN_TOUCH_TARGET_STYLE}
            onClick={onClose}
            id="close-science-modal-btn"
            aria-label={
              lang === 'es'
                ? 'Cerrar Centro de Ciencia de la NASA (Esc)'
                : 'Close NASA Science Center (Esc)'
            }
          >
            {lang === 'es' ? 'Cerrar ✕' : 'Close ✕'}
          </button>
        </div>

        {/* Barra de Pestañas Interactivas */}
        <nav
          role="tablist"
          aria-label="NASA Science Tabs"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.55rem',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '0.85rem',
          }}
        >
          <button
            id="tab-donki-glossary-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'donki-glossary'}
            aria-controls="panel-donki-glossary"
            style={MIN_TOUCH_TARGET_STYLE}
            className={`site-tab ${activeTab === 'donki-glossary' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('donki-glossary')}
            onKeyDown={(e) => handleTabKeyDown(e, 'donki-glossary')}
          >
            ☀️{' '}
            {lang === 'es'
              ? 'Clima Espacial en Vivo & Glosario'
              : 'Live Space Weather & Glossary'}
          </button>
          <button
            id="tab-osdr-studies-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'osdr-studies'}
            aria-controls="panel-osdr-studies"
            style={MIN_TOUCH_TARGET_STYLE}
            className={`site-tab ${activeTab === 'osdr-studies' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('osdr-studies')}
            onKeyDown={(e) => handleTabKeyDown(e, 'osdr-studies')}
          >
            🧬{' '}
            {lang === 'es'
              ? 'Estudios NASA OSDR (Veggie / RAD)'
              : 'NASA OSDR Studies (Veggie / RAD)'}
          </button>
          <button
            id="tab-nasa-photos-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'nasa-photos'}
            aria-controls="panel-nasa-photos"
            style={MIN_TOUCH_TARGET_STYLE}
            className={`site-tab ${activeTab === 'nasa-photos' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('nasa-photos')}
            onKeyDown={(e) => handleTabKeyDown(e, 'nasa-photos')}
          >
            📸{' '}
            {lang === 'es'
              ? 'Fotografías Reales de la NASA'
              : 'Real NASA Photographs'}
          </button>
          <button
            id="tab-mini-quiz-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'mini-quiz'}
            aria-controls="panel-mini-quiz"
            style={MIN_TOUCH_TARGET_STYLE}
            className={`site-tab ${activeTab === 'mini-quiz' ? 'active' : ''}`}
            onClick={() => handleTabSwitch('mini-quiz')}
            onKeyDown={(e) => handleTabKeyDown(e, 'mini-quiz')}
          >
            🧠{' '}
            {lang === 'es'
              ? `Mini-Quiz Espacial (${correctCount}/${totalQuestions})`
              : `Space Mini-Quiz (${correctCount}/${totalQuestions})`}
          </button>
        </nav>

        {/* PESTAÑA 1: CLIMA ESPACIAL EN VIVO (DONKI) Y GLOSARIO */}
        {activeTab === 'donki-glossary' && (
          <div
            id="panel-donki-glossary"
            role="tabpanel"
            aria-labelledby="tab-donki-glossary-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
          >
            {/* Estado activo de la partida */}
            <div
              className="science-weather-box"
              style={{
                borderLeft: '4px solid var(--accent-amber)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <h3>
                  {lang === 'es'
                    ? '☀️ Telemetría Activa en tu Misión Actual (NASA DONKI)'
                    : '☀️ Active Telemetry in Your Current Mission (NASA DONKI)'}
                </h3>
                <button
                  id="refresh-donki-live-btn"
                  type="button"
                  className="btn-secondary"
                  style={{
                    ...MIN_TOUCH_TARGET_STYLE,
                    fontSize: '0.8rem',
                    padding: '0.45rem 0.85rem',
                  }}
                  onClick={handleRefreshDonki}
                  disabled={isLoadingDonki}
                >
                  {isLoadingDonki
                    ? lang === 'es'
                      ? '📡 Consultando api.nasa.gov/DONKI...'
                      : '📡 Querying api.nasa.gov/DONKI...'
                    : lang === 'es'
                      ? '🔄 Sincronizar DONKI en Vivo (FLR/SEP/CME)'
                      : '🔄 Sync Live DONKI (FLR/SEP/CME)'}
                </button>
              </div>

              <p className="mono-tag">
                ID: {currentWeather.id} | {currentWeather.classOrIntensity} |{' '}
                {currentWeather.isLiveNasaData
                  ? lang === 'es'
                    ? '🟢 TELEMETRÍA EN VIVO (api.nasa.gov)'
                    : '🟢 LIVE TELEMETRY (api.nasa.gov)'
                  : lang === 'es'
                    ? '📘 ARCHIVO HISTÓRICO REAL VERIFICADO NASA'
                    : '📘 VERIFIED HISTORICAL NASA ARCHIVE'}
              </p>
              <p style={{ fontSize: '0.92rem' }}>
                <strong>{currentWeather.title[lang]}:</strong>{' '}
                {currentWeather.kidFriendlyExplanation[lang]}
              </p>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                🔬 {currentWeather.scienceFact[lang]}
              </p>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.65rem',
                  marginTop: '0.3rem',
                }}
              >
                <span className="science-score-badge">
                  ☢️{' '}
                  {lang === 'es'
                    ? `Riesgo de Radiación: x${currentWeather.radiationMultiplier.toFixed(1)}`
                    : `Radiation Risk: x${currentWeather.radiationMultiplier.toFixed(1)}`}
                </span>
                <span className="science-score-badge">
                  ⚡{' '}
                  {lang === 'es'
                    ? `Eficiencia Solar: ${Math.round(currentWeather.solarEfficiencyMultiplier * 100)}%`
                    : `Solar Efficiency: ${Math.round(currentWeather.solarEfficiencyMultiplier * 100)}%`}
                </span>
                {currentWeather.sourceUrl && (
                  <a
                    href={currentWeather.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mono-tag"
                    style={{ textDecoration: 'underline', alignSelf: 'center' }}
                  >
                    {lang === 'es'
                      ? 'Ver Registro Oficial NASA DONKI ↗'
                      : 'View Official NASA DONKI Record ↗'}
                  </a>
                )}
              </div>
            </div>

            {/* Explorador de Eventos DONKI (FLR, SEP, CME) */}
            <div
              style={{
                background: 'var(--bg-panel-subtle)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <h4 style={{ fontFamily: 'var(--font-display)' }}>
                  {lang === 'es'
                    ? '📡 Registro de Eventos Solares y Planetarios (FLR • SEP • CME • MEDA)'
                    : '📡 Solar & Planetary Event Feed (FLR • SEP • CME • MEDA)'}
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {(
                    [
                      { id: 'ALL', labelEs: 'Todos', labelEn: 'All' },
                      {
                        id: 'FLR',
                        labelEs: '⚡ FLR (Llamaradas)',
                        labelEn: '⚡ FLR (Flares)',
                      },
                      {
                        id: 'SEP',
                        labelEs: '☄️ SEP (Protones)',
                        labelEn: '☄️ SEP (Protons)',
                      },
                      {
                        id: 'CME',
                        labelEs: '🌊 CME (Plasma)',
                        labelEn: '🌊 CME (Plasma)',
                      },
                      {
                        id: 'DUST_STORM',
                        labelEs: '🌪️ Polvo Marte',
                        labelEn: '🌪️ Mars Dust',
                      },
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      className="btn-secondary"
                      style={{
                        ...MIN_TOUCH_TARGET_STYLE,
                        fontSize: '0.78rem',
                        padding: '0.4rem 0.75rem',
                        background:
                          weatherTypeFilter === btn.id
                            ? 'var(--accent-orange-nasa)'
                            : 'var(--bg-space-deep)',
                      }}
                      onClick={() => {
                        missionAudio.playClick();
                        setWeatherTypeFilter(btn.id);
                      }}
                    >
                      {lang === 'es' ? btn.labelEs : btn.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                  gap: '0.75rem',
                }}
              >
                {filteredDonkiEvents.slice(0, 6).map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      background: 'var(--bg-space-deep)',
                      padding: '0.8rem',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.35rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <span className="source-tag">
                        {ev.type} •{' '}
                        {ev.isLiveNasaData ? 'LIVE API' : 'NASA ARCHIVE'}
                      </span>
                      <span
                        className="mono-val"
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {ev.startTime.slice(0, 10)}
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.88rem' }}>
                      {ev.title[lang]}
                    </strong>
                    <p
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {ev.kidFriendlyExplanation[lang]}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.74rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-amber)',
                        marginTop: 'auto',
                        paddingTop: '0.3rem',
                      }}
                    >
                      <span>Rad: x{ev.radiationMultiplier}</span>
                      <span>
                        Solar: {Math.round(ev.solarEfficiencyMultiplier * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Glosario Científico para Niños (7-12 años) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.6rem',
                }}
              >
                <h3>
                  {lang === 'es'
                    ? `📘 Diccionario Espacial Junior (${filteredGlossary.length} términos)`
                    : `📘 Junior Space Dictionary (${filteredGlossary.length} terms)`}
                </h3>
                <input
                  type="search"
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  aria-label={
                    lang === 'es'
                      ? 'Buscar término en el diccionario espacial'
                      : 'Search term in the space dictionary'
                  }
                  placeholder={
                    lang === 'es'
                      ? '🔍 Buscar término (ej. mSv, MOXIE, regolito)...'
                      : '🔍 Search term (e.g. mSv, MOXIE, regolith)...'
                  }
                  style={{
                    ...MIN_TOUCH_TARGET_STYLE,
                    background: 'var(--bg-space-deep)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.84rem',
                    minWidth: '240px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {(
                  [
                    'ALL',
                    'DONKI',
                    'OSDR',
                    'ARTEMIS',
                    'MARS_ROVER',
                    'ECLSS',
                  ] as const
                ).map((src) => (
                  <button
                    key={src}
                    type="button"
                    className="btn-secondary"
                    style={{
                      ...MIN_TOUCH_TARGET_STYLE,
                      fontSize: '0.78rem',
                      padding: '0.4rem 0.8rem',
                      background:
                        glossarySourceFilter === src
                          ? 'var(--accent-orange-nasa)'
                          : 'var(--bg-panel-subtle)',
                    }}
                    onClick={() => {
                      missionAudio.playClick();
                      setGlossarySourceFilter(src);
                    }}
                  >
                    {src === 'ALL'
                      ? lang === 'es'
                        ? 'Todos'
                        : 'All'
                      : `NASA ${src}`}
                  </button>
                ))}
              </div>

              {focusedTerm && (
                <div
                  id="focused-glossary-banner"
                  className="tradeoff-callout"
                  style={{
                    border: '2px solid var(--accent-amber)',
                    background: 'var(--bg-space-deep)',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                    }}
                  >
                    <span className="nasa-badge">
                      🎯{' '}
                      {lang === 'es'
                        ? 'TÉRMINO CIENTÍFICO DESTACADO DEL DILEMA'
                        : 'HIGHLIGHTED DILEMMA SCIENCE TERM'}
                    </span>
                    <span className="source-tag">
                      NASA {focusedTerm.nasaSource}
                    </span>
                  </div>
                  <strong
                    style={{ fontSize: '1rem', color: 'var(--text-primary)' }}
                  >
                    {focusedTerm.term[lang]}
                  </strong>
                  <p
                    style={{
                      fontSize: '0.86rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {focusedTerm.shortDefinition[lang]}
                  </p>
                  <p className="glossary-analogy">
                    💡 {focusedTerm.kidAnalogy[lang]}
                  </p>
                </div>
              )}

              <div className="glossary-grid">
                {filteredGlossary.map((item) => {
                  const isFocused = Boolean(
                    focusTermId && item.id === focusTermId
                  );
                  return (
                    <article
                      key={item.id}
                      id={`glossary-term-${item.id}`}
                      data-highlighted={isFocused ? 'true' : 'false'}
                      className="glossary-item"
                      style={
                        isFocused
                          ? {
                              border: '2px solid var(--accent-amber)',
                              boxShadow: '0 0 0 3px hsla(38, 95%, 56%, 0.22)',
                            }
                          : undefined
                      }
                    >
                      <div className="glossary-item-header">
                        <h4>
                          {isFocused ? '🎯 ' : ''}
                          {item.term[lang]}
                        </h4>
                        <span className="source-tag">
                          NASA {item.nasaSource}
                        </span>
                      </div>
                      <p className="glossary-def" style={{ fontSize: '0.86rem' }}>
                        {item.shortDefinition[lang]}
                      </p>
                      <p className="glossary-analogy">
                        💡 {item.kidAnalogy[lang]}
                      </p>
                      <a
                        href={item.nasaStudyOrUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mono-tag"
                        style={{
                          fontSize: '0.73rem',
                          textDecoration: 'underline',
                          marginTop: 'auto',
                        }}
                      >
                        {lang === 'es'
                          ? 'Fuente Oficial de la NASA ↗'
                          : 'Official NASA Source ↗'}
                      </a>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: ESTUDIOS REALES NASA OSDR (BIOLOGÍA Y RADIACIÓN) */}
        {activeTab === 'osdr-studies' && (
          <div
            id="panel-osdr-studies"
            role="tabpanel"
            aria-labelledby="tab-osdr-studies-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}
          >
            {/* Comparador visual de Radiación en mSv para niños */}
            <div className="science-weather-box">
              <h3>
                {lang === 'es'
                  ? '🛡️ Comparador Real de Radiación (Milisieverts - mSv) — Datos NASA RAD & Artemis I'
                  : '🛡️ Real Radiation Dose Comparator (Millisieverts - mSv) — NASA RAD & Artemis I Data'}
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
                {lang === 'es'
                  ? '¿Cuánto es 1 milisievert (mSv)? Compara la radiación de la Tierra con lo que midieron los detectores de la NASA en la Luna y Marte:'
                  : 'How much is 1 millisievert (mSv)? Compare Earth radiation with what NASA detectors measured on the Moon and Mars:'}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                  gap: '0.65rem',
                  marginTop: '0.4rem',
                }}
              >
                {[
                  {
                    labelEs: '🦷 Radiografía Dental',
                    labelEn: '🦷 Dental X-Ray',
                    msv: '0.01 mSv',
                    pct: 4,
                    color: 'var(--status-nominal)',
                  },
                  {
                    labelEs: '🔴 1 Sol Tranquilo en Marte (RAD)',
                    labelEn: '🔴 1 Calm Martian Sol (RAD)',
                    msv: '0.67 mSv',
                    pct: 22,
                    color: 'var(--status-nominal)',
                  },
                  {
                    labelEs: '🌕 1 Día en la Superficie Lunar (LND)',
                    labelEn: '🌕 1 Day on Lunar Surface (LND)',
                    msv: '1.37 mSv',
                    pct: 36,
                    color: 'var(--status-warning)',
                  },
                  {
                    labelEs: '💧 Tormenta Solar CON Refugio de Agua',
                    labelEn: '💧 Solar Storm WITH Water Shelter',
                    msv: '4.0 mSv (-50%)',
                    pct: 58,
                    color: 'var(--status-warning)',
                  },
                  {
                    labelEs: '☄️ Tormenta SEP SIN Blindaje (Mayo 2024)',
                    labelEn: '☄️ Unshielded SEP Storm (May 2024)',
                    msv: '8.1+ mSv/día',
                    pct: 100,
                    color: 'var(--status-critical)',
                  },
                ].map((bar, i) => (
                  <div
                    key={i}
                    style={{
                      background: 'var(--bg-space-deep)',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <span>{lang === 'es' ? bar.labelEs : bar.labelEn}</span>
                    </div>
                    <div
                      className="mono-val"
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--accent-amber)',
                        marginBottom: '0.3rem',
                      }}
                    >
                      {bar.msv}
                    </div>
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${bar.pct}%`, background: bar.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filtro de estudios OSDR */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {(
                [
                  {
                    id: 'all',
                    labelEs: '🔬 Todos los Estudios OSDR (5)',
                    labelEn: '🔬 All OSDR Studies (5)',
                  },
                  {
                    id: 'plants',
                    labelEs: '🌱 Botánica Espacial (OSD-379 / Veggie / APH)',
                    labelEn: '🌱 Space Botany (OSD-379 / Veggie / APH)',
                  },
                  {
                    id: 'radiation',
                    labelEs: '🛡️ Radiación y ADN (BioSentinel / Curiosity RAD)',
                    labelEn: '🛡️ Radiation & DNA (BioSentinel / Curiosity RAD)',
                  },
                  {
                    id: 'life-support',
                    labelEs: '⚙️ Soporte Vital (ECLSS 98% / MOXIE)',
                    labelEn: '⚙️ Life Support (ECLSS 98% / MOXIE)',
                  },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className="btn-secondary"
                  style={{
                    ...MIN_TOUCH_TARGET_STYLE,
                    fontSize: '0.8rem',
                    padding: '0.45rem 0.85rem',
                    background:
                      osdrCategory === cat.id
                        ? 'var(--accent-orange-nasa)'
                        : 'var(--bg-panel-subtle)',
                  }}
                  onClick={() => {
                    missionAudio.playClick();
                    setOsdrCategory(cat.id);
                  }}
                >
                  {lang === 'es' ? cat.labelEs : cat.labelEn}
                </button>
              ))}
            </div>

            {/* Tarjetas de Estudios NASA OSDR */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
                gap: '1rem',
              }}
            >
              {filteredStudies.map((study) => (
                <article
                  key={study.id}
                  className="glossary-item"
                  style={{
                    border: '1px solid var(--border-subtle)',
                    gap: '0.55rem',
                  }}
                >
                  <div className="glossary-item-header">
                    <span className="source-tag">{study.osdrAccession}</span>
                    <span
                      className="mono-val"
                      style={{
                        fontSize: '0.73rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {study.missionOrFacility}
                    </span>
                  </div>

                  <h4
                    style={{
                      fontSize: '1rem',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {study.title[lang]}
                  </h4>

                  <p style={{ fontSize: '0.8rem', color: 'var(--accent-amber)' }}>
                    🧪{' '}
                    <strong>
                      {lang === 'es'
                        ? ' Sujeto / Instrumento: '
                        : ' Subject / Instrument: '}
                    </strong>
                    {study.organismOrInstrument[lang]}
                  </p>

                  <p style={{ fontSize: '0.85rem' }}>
                    <strong>
                      {lang === 'es' ? 'Hallazgo NASA: ' : 'NASA Finding: '}
                    </strong>
                    {study.keyFinding[lang]}
                  </p>

                  <p className="glossary-analogy">
                    🧒{' '}
                    <strong>
                      {lang === 'es' ? 'En sencillo: ' : 'Kid-Friendly: '}
                    </strong>
                    {study.kidExplanation[lang]}
                  </p>

                  <div className="tradeoff-callout">
                    ⚡ {study.outpostTradeoffConnection[lang]}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginTop: 'auto',
                      paddingTop: '0.35rem',
                    }}
                  >
                    <span
                      className="mono-val"
                      style={{
                        fontSize: '0.74rem',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      📊 {study.telemetryMetric[lang]}
                    </span>
                    <a
                      href={study.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mono-tag"
                      style={{ fontSize: '0.76rem', textDecoration: 'underline' }}
                    >
                      {lang === 'es'
                        ? 'Abrir en NASA OSDR ↗'
                        : 'Open in NASA OSDR ↗'}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA 3: FOTOGRAFÍAS REALES DE LA NASA (images-api.nasa.gov) */}
        {activeTab === 'nasa-photos' && (
          <div
            id="panel-nasa-photos"
            role="tabpanel"
            aria-labelledby="tab-nasa-photos-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
          >
            <div className="science-weather-box">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <h3>
                    {lang === 'es'
                      ? '📸 Biblioteca Oficial de Imágenes de la NASA (images-api.nasa.gov)'
                      : '📸 Official NASA Image & Video Library (images-api.nasa.gov)'}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.84rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {lang === 'es'
                      ? 'Explora fotografías reales de las misiones Artemis, Perseverance, SDO y el invernadero Veggie.'
                      : 'Explore real photographs from Artemis, Perseverance, SDO, and the Veggie space greenhouse.'}
                  </p>
                </div>

                <form
                  onSubmit={handlePhotoSearchSubmit}
                  style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}
                >
                  <input
                    type="search"
                    value={photoQuery}
                    onChange={(e) => setPhotoQuery(e.target.value)}
                    aria-label={
                      lang === 'es'
                        ? 'Buscar fotografías reales en la biblioteca de la NASA'
                        : 'Search real photographs in the NASA image library'
                    }
                    placeholder={
                      lang === 'es'
                        ? 'Buscar en NASA (ej. Orion, Perseverance)...'
                        : 'Search NASA (e.g. Orion, Perseverance)...'
                    }
                    style={{
                      ...MIN_TOUCH_TARGET_STYLE,
                      background: 'var(--bg-space-deep)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '0.45rem 0.75rem',
                      fontSize: '0.84rem',
                      minWidth: '220px',
                    }}
                  />
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{
                      ...MIN_TOUCH_TARGET_STYLE,
                      padding: '0.45rem 0.9rem',
                      fontSize: '0.84rem',
                    }}
                    disabled={isLoadingPhotos}
                  >
                    {isLoadingPhotos
                      ? lang === 'es'
                        ? 'Buscando...'
                        : 'Searching...'
                      : lang === 'es'
                        ? '🔍 Buscar en NASA'
                        : '🔍 Search NASA'}
                  </button>
                </form>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.4rem',
                  marginTop: '0.4rem',
                }}
              >
                {(
                  [
                    { id: 'all', labelEs: '🌟 Todas', labelEn: '🌟 All' },
                    {
                      id: 'moon',
                      labelEs: '🌕 Luna (Shackleton / Artemis)',
                      labelEn: '🌕 Moon (Shackleton / Artemis)',
                    },
                    {
                      id: 'mars',
                      labelEs: '🔴 Marte (Jezero / MOXIE)',
                      labelEn: '🔴 Mars (Jezero / MOXIE)',
                    },
                    {
                      id: 'solar',
                      labelEs: '☀️ Sol (Llamaradas SDO)',
                      labelEn: '☀️ Sun (SDO Flares)',
                    },
                    {
                      id: 'plants',
                      labelEs: '🌱 Plantas (Veggie / OSDR)',
                      labelEn: '🌱 Plants (Veggie / OSDR)',
                    },
                    {
                      id: 'radiation',
                      labelEs: '🛡️ Radiación (RAD / BioSentinel)',
                      labelEn: '🛡️ Radiation (RAD / BioSentinel)',
                    },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className="btn-secondary"
                    style={{
                      ...MIN_TOUCH_TARGET_STYLE,
                      fontSize: '0.78rem',
                      padding: '0.4rem 0.75rem',
                      background:
                        photoCategory === cat.id
                          ? 'var(--accent-orange-nasa)'
                          : 'var(--bg-space-deep)',
                    }}
                    onClick={() => {
                      missionAudio.playClick();
                      setPhotoCategory(cat.id);
                    }}
                  >
                    {lang === 'es' ? cat.labelEs : cat.labelEn}
                  </button>
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {galleryImages.map((img) => {
                const imgFailed = failedImageIds[img.nasaId];
                const descriptiveAlt = `${img.title[lang]} — ${img.kidCaption[lang]} (NASA ID: ${img.nasaId})`;
                return (
                  <article
                    key={img.nasaId}
                    className="glossary-item"
                    style={{
                      padding: 0,
                      overflow: 'hidden',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      style={{
                        height: '175px',
                        background: 'var(--bg-space-deep)',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                      }}
                    >
                      {!imgFailed ? (
                        <img
                          src={img.imageUrl}
                          alt={descriptiveAlt}
                          loading="lazy"
                          onError={() =>
                            setFailedImageIds((prev) => ({
                              ...prev,
                              [img.nasaId]: true,
                            }))
                          }
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      ) : (
                        <div
                          role="img"
                          aria-label={descriptiveAlt}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '1rem',
                            textAlign: 'center',
                          }}
                        >
                          <span style={{ fontSize: '2.6rem' }}>
                            {img.fallbackEmoji}
                          </span>
                          <span
                            className="mono-tag"
                            style={{ fontSize: '0.72rem' }}
                          >
                            NASA ID: {img.nasaId}
                          </span>
                        </div>
                      )}
                      <span
                        className="source-tag"
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(8, 12, 22, 0.85)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '6px',
                        }}
                      >
                        {img.isLiveApiResult ? '🟢 LIVE NASA API' : img.center}
                      </span>
                    </div>

                    <div
                      style={{
                        padding: '0.95rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.73rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <span>ID: {img.nasaId}</span>
                        <span>{img.dateCreated}</span>
                      </div>

                      <h4
                        style={{
                          fontSize: '0.95rem',
                          fontFamily: 'var(--font-display)',
                        }}
                      >
                        {img.title[lang]}
                      </h4>

                      <p
                        style={{
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {img.kidCaption[lang]}
                      </p>

                      <p
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--accent-amber)',
                          marginTop: 'auto',
                        }}
                      >
                        🔗 {img.scienceConnection[lang]}
                      </p>

                      <a
                        href={img.sourcePageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mono-tag"
                        style={{
                          fontSize: '0.74rem',
                          textDecoration: 'underline',
                        }}
                      >
                        {lang === 'es'
                          ? 'Ver Ficha en images.nasa.gov ↗'
                          : 'View Record on images.nasa.gov ↗'}
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* PESTAÑA 4: MINI-QUIZ INTERACTIVO PARA NIÑOS (7-12 AÑOS) */}
        {activeTab === 'mini-quiz' && (
          <div
            id="panel-mini-quiz"
            role="tabpanel"
            aria-labelledby="tab-mini-quiz-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}
          >
            <div
              className="science-weather-box"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}
              >
                <div>
                  <h3>
                    {lang === 'es'
                      ? '🧠 Mini-Quiz de Entrenamiento: ¿Cuánto sabes de Ciencia Real de la NASA?'
                      : '🧠 Training Mini-Quiz: How Much Real NASA Science Do You Know?'}
                  </h3>
                  <p
                    style={{
                      fontSize: '0.86rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {lang === 'es'
                      ? `Responde las ${totalQuestions} preguntas sacadas de los dilemas reales de la misión (MOXIE, RAD, OSD-379, Shackleton, Jezero y DONKI).`
                      : `Answer the ${totalQuestions} questions drawn from real mission dilemmas (MOXIE, RAD, OSD-379, Shackleton, Jezero & DONKI).`}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                  }}
                >
                  <span
                    className="science-score-badge"
                    style={{ fontSize: '0.92rem' }}
                  >
                    🏆{' '}
                    {lang === 'es'
                      ? `Aciertos: ${correctCount} / ${totalQuestions}`
                      : `Score: ${correctCount} / ${totalQuestions}`}
                  </span>
                  {answeredCount > 0 && (
                    <button
                      type="button"
                      className="btn-secondary"
                      style={MIN_TOUCH_TARGET_STYLE}
                      onClick={handleResetQuiz}
                      id="reset-quiz-btn"
                    >
                      {lang === 'es' ? '🔄 Reiniciar Quiz' : '🔄 Reset Quiz'}
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {(
                  [
                    {
                      id: 'all',
                      labelEs: '🌌 Todas las Preguntas (14)',
                      labelEn: '🌌 All Questions (14)',
                    },
                    {
                      id: 'moon-shackleton',
                      labelEs: '🌕 Base Lunar (Shackleton / Artemis)',
                      labelEn: '🌕 Lunar Base (Shackleton / Artemis)',
                    },
                    {
                      id: 'mars-jezero',
                      labelEs: '🔴 Base Marciana (Jezero / MOXIE)',
                      labelEn: '🔴 Martian Base (Jezero / MOXIE)',
                    },
                  ] as const
                ).map((filterBtn) => (
                  <button
                    key={filterBtn.id}
                    type="button"
                    className="btn-secondary"
                    style={{
                      ...MIN_TOUCH_TARGET_STYLE,
                      fontSize: '0.78rem',
                      padding: '0.4rem 0.8rem',
                      background:
                        quizSiteFilter === filterBtn.id
                          ? 'var(--accent-orange-nasa)'
                          : 'var(--bg-space-deep)',
                    }}
                    onClick={() => {
                      missionAudio.playClick();
                      setQuizSiteFilter(filterBtn.id);
                    }}
                  >
                    {lang === 'es' ? filterBtn.labelEs : filterBtn.labelEn}
                  </button>
                ))}
              </div>
            </div>

            {answeredCount === totalQuestions && totalQuestions > 0 && (
              <div
                className="tradeoff-callout"
                role="status"
                aria-live="polite"
                style={{
                  border: '1px solid var(--accent-amber)',
                  padding: '1rem',
                  fontSize: '0.95rem',
                }}
              >
                <strong>
                  {correctCount === totalQuestions
                    ? lang === 'es'
                      ? '🌟 ¡INSIGNIA DESBLOQUEADA: Comandante Científico Jefe de la NASA! ¡Respondiste todo perfectamente!'
                      : '🌟 BADGE UNLOCKED: Chief NASA Science Commander! You answered every question perfectly!'
                    : correctCount >= Math.ceil(totalQuestions * 0.65)
                      ? lang === 'es'
                        ? '🚀 ¡INSIGNIA DESBLOQUEADA: Especialista de Misión Artemis & Marte! ¡Gran dominio de los trade-offs!'
                        : '🚀 BADGE UNLOCKED: Artemis & Mars Mission Specialist! Great mastery of engineering trade-offs!'
                      : lang === 'es'
                        ? '🛰️ ¡Buen intento, Cadete Espacial! Revisa las explicaciones de la NASA abajo y vuelve a intentarlo.'
                        : '🛰️ Good try, Space Cadet! Review the NASA explanations below and try again.'}
                </strong>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredQuizQuestions.map((q) => {
                const userChoiceId = selectedAnswers[q.id];
                const isAnswered = Boolean(userChoiceId);

                return (
                  <article
                    key={q.id}
                    className="glossary-item"
                    style={{
                      border: '1px solid var(--border-subtle)',
                      gap: '0.7rem',
                    }}
                  >
                    <div className="glossary-item-header">
                      <span className="source-tag">{q.badgeSource}</span>
                      {isAnswered && (
                        <span
                          className="mono-val"
                          style={{
                            fontSize: '0.78rem',
                            color: q.options.find((o) => o.id === userChoiceId)
                              ?.isCorrect
                              ? 'var(--status-nominal)'
                              : 'var(--status-critical)',
                          }}
                        >
                          {q.options.find((o) => o.id === userChoiceId)
                            ?.isCorrect
                            ? lang === 'es'
                              ? '✔ ¡Correcto!'
                              : '✔ Correct!'
                            : lang === 'es'
                              ? '✘ Respuesta de aprendizaje'
                              : '✘ Learning opportunity'}
                        </span>
                      )}
                    </div>

                    <h4 style={{ fontSize: '0.98rem' }}>{q.question[lang]}</h4>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.45rem',
                      }}
                    >
                      {q.options.map((opt) => {
                        const isThisSelected = userChoiceId === opt.id;
                        let bg = 'var(--bg-space-deep)';
                        let borderColor = 'var(--border-subtle)';

                        if (isAnswered) {
                          if (opt.isCorrect) {
                            bg = 'hsla(152, 68%, 46%, 0.18)';
                            borderColor = 'var(--status-nominal)';
                          } else if (isThisSelected && !opt.isCorrect) {
                            bg = 'hsla(4, 82%, 56%, 0.2)';
                            borderColor = 'var(--status-critical)';
                          }
                        }

                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() =>
                              handleSelectQuizOption(q.id, opt.id, opt.isCorrect)
                            }
                            disabled={isAnswered}
                            style={{
                              ...MIN_TOUCH_TARGET_STYLE,
                              textAlign: 'left',
                              padding: '0.65rem 0.9rem',
                              borderRadius: '8px',
                              background: bg,
                              border: `1px solid ${borderColor}`,
                              color: 'var(--text-primary)',
                              cursor: isAnswered ? 'default' : 'pointer',
                              fontSize: '0.86rem',
                              fontFamily: 'var(--font-sans)',
                            }}
                          >
                            <strong>{opt.id.toUpperCase()}.</strong>{' '}
                            {opt.text[lang]}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div
                        className="tradeoff-callout"
                        style={{ marginTop: '0.2rem' }}
                      >
                        🔬 {q.explanation[lang]}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
