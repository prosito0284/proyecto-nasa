/**
 * BLOQUE B (Asignado a: Antigravity del Compañero - Rama: feat/nasa-data-service)
 * Anexo Técnico del Cuaderno de Vuelo del Comandante ("Ciencia Real de la NASA") — Ronda 3 (Tarea B7):
 * 1. ANEXO A: Clima Espacial en Vivo (DONKI FLR/SEP/CME) + Fichas de Biblioteca del Glosario (17 términos con howWeKnow)
 * 2. ANEXO B: Estudios Reales NASA OSDR (BioSentinel, RAD, Veggie OSD-379, APH, MOXIE)
 * 3. ANEXO C: Fotografías Reales de la NASA (images-api.nasa.gov en vivo + archivo verificado)
 * 4. ANEXO D: Verificación de Vuelo (Mini-Quiz de 14 preguntas conectadas a dilemas)
 *
 * Identidad "Cuaderno de Vuelo del Comandante" (B7):
 * - Superficie de papel crema, tinta oscura, líneas de formulario, pestañas de carpeta, fichas de biblioteca.
 * - Esquinas de 2 px, sin degradados ni sombras difusas, cero emoji (usa iconos SVG de trazo de src/components/icons/).
 *
 * Accesibilidad conservada (B6):
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
  GlossaryTermWithEvidence,
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
  getWeatherPoolStatus,
} from '../../services/nasaApi';
import { missionAudio } from '../../utils/sound';
import {
  AlertIcon,
  AntennaIcon,
  ArrowIcon,
  BatteryIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  DropletIcon,
  DustIcon,
  GlobeIcon,
  LeafIcon,
  PatchIcon,
  RadiationIcon,
  ScienceIcon,
  ShieldIcon,
  SunIcon,
} from '../icons';
import { NasaProvenanceSource, SourceStamp } from './SourceStamp';
import './science.css';

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

function mapGlossarySourceToStamp(
  src: GlossaryTerm['nasaSource']
): NasaProvenanceSource {
  if (src === 'DONKI') return 'DONKI';
  if (src === 'OSDR' || src === 'ECLSS') return 'OSDR';
  if (src === 'ARTEMIS') return 'ARTEMIS';
  return 'MARS';
}

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
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossarySourceFilter, setGlossarySourceFilter] = useState<
    'ALL' | GlossaryTerm['nasaSource']
  >('ALL');

  // Estado DONKI en vivo (FLR / SEP / CME)
  const [donkiEvents, setDonkiEvents] = useState<SpaceWeatherEvent[]>(
    VERIFIED_NASA_WEATHER_EVENTS
  );
  const [weatherTypeFilter, setWeatherTypeFilter] = useState<
    'ALL' | SpaceWeatherEvent['type']
  >('ALL');
  const [isLoadingDonki, setIsLoadingDonki] = useState(false);
  const [poolStatus, setPoolStatus] = useState(() => getWeatherPoolStatus());

  // Estado OSDR
  const [osdrCategory, setOsdrCategory] = useState<
    'all' | NasaOsdrStudy['category']
  >('all');

  // Estado Galería NASA (images-api.nasa.gov)
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

  // Estado Mini-Quiz (B5)
  const [quizSiteFilter, setQuizSiteFilter] = useState<OutpostSiteId | 'all'>(
    siteId ?? 'all'
  );
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});

  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (siteId) {
      setQuizSiteFilter(siteId);
    }
  }, [siteId]);

  // B2: Al abrir con focusTermId, abre la pestaña del glosario, limpia filtros y hace scroll al término
  useEffect(() => {
    if (!isOpen || !focusTermId) return;
    setActiveTab('donki-glossary');
    setGlossarySourceFilter('ALL');
    setGlossarySearch('');

    const timer = window.setTimeout(() => {
      const targetEl = document.getElementById(`glossary-term-${focusTermId}`);
      if (targetEl && typeof targetEl.scrollIntoView === 'function') {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);

    return () => window.clearTimeout(timer);
  }, [isOpen, focusTermId]);

  // B6: Trampa de foco (Tab / Shift+Tab), cierre con Escape y restauración de foco
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        missionAudio.playClick();
        onClose();
        return;
      }

      if (event.key === 'Tab' && modalCardRef.current) {
        const focusableNodeList =
          modalCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const focusables = Array.from(focusableNodeList).filter(
          (el) => el.offsetParent !== null || el === document.activeElement
        );

        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        const activeEl = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (
            activeEl === firstEl ||
            !modalCardRef.current.contains(activeEl)
          ) {
            event.preventDefault();
            lastEl.focus();
          }
        } else {
          if (activeEl === lastEl || !modalCardRef.current.contains(activeEl)) {
            event.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (
        previousFocusRef.current &&
        typeof previousFocusRef.current.focus === 'function'
      ) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;

    setIsLoadingDonki(true);
    fetchLiveOrVerifiedSpaceWeather(false)
      .then((events) => {
        if (isMounted && events.length > 0) {
          setDonkiEvents(events);
          setPoolStatus(getWeatherPoolStatus());
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingDonki(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'nasa-photos') return;
    let isMounted = true;

    setIsLoadingPhotos(true);
    fetchNasaGalleryImages(photoQuery, photoCategory, false)
      .then((imgs) => {
        if (isMounted) {
          setGalleryImages(imgs);
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingPhotos(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, photoCategory]);

  if (!isOpen) return null;

  const handleRefreshDonki = async () => {
    missionAudio.playClick();
    setIsLoadingDonki(true);
    const refreshed = await fetchLiveOrVerifiedSpaceWeather(true);
    setDonkiEvents(refreshed);
    setPoolStatus(getWeatherPoolStatus());
    setIsLoadingDonki(false);
  };

  const handlePhotoSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    missionAudio.playClick();
    setIsLoadingPhotos(true);
    const imgs = await fetchNasaGalleryImages(photoQuery, photoCategory, true);
    setGalleryImages(imgs);
    setIsLoadingPhotos(false);
  };

  const handleTabSwitch = (tab: ModalTab) => {
    missionAudio.playClick();
    setActiveTab(tab);
  };

  const handleTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: ModalTab
  ) => {
    const idx = TAB_ORDER.indexOf(currentTab);
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const nextTab = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
      handleTabSwitch(nextTab);
      document.getElementById(`tab-${nextTab}-btn`)?.focus();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const prevTab =
        TAB_ORDER[(idx - 1 + TAB_ORDER.length) % TAB_ORDER.length];
      handleTabSwitch(prevTab);
      document.getElementById(`tab-${prevTab}-btn`)?.focus();
    }
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
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleResetQuiz = () => {
    missionAudio.playClick();
    setSelectedAnswers({});
  };

  const hasLiveDonkiEvents =
    poolStatus.live ||
    donkiEvents.some((ev) => ev.isLiveNasaData) ||
    currentWeather.isLiveNasaData;

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
      const howWeKnowText =
        (item as GlossaryTermWithEvidence).howWeKnow?.[lang] ||
        getGlossaryTerm(item.id)?.howWeKnow?.[lang] ||
        '';
      return (
        matchesSource &&
        (item.term[lang].toLowerCase().includes(q) ||
          item.shortDefinition[lang].toLowerCase().includes(q) ||
          item.kidAnalogy[lang].toLowerCase().includes(q) ||
          howWeKnowText.toLowerCase().includes(q))
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
      className="modal-backdrop science-annex-backdrop"
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
      <div ref={modalCardRef} className="modal-card science-annex-sheet">
        {/* Cabecera del Anexo del Cuaderno de Vuelo */}
        <header className="science-annex-header">
          <div>
            <div className="science-annex-doc-meta">
              <span className="science-annex-doc-code">
                <ScienceIcon size={14} />
                <span>DOC NASA-STD-3001 / ANEXO CIENTÍFICO</span>
              </span>
              <SourceStamp
                source="DONKI"
                live={hasLiveDonkiEvents}
                url="https://kauai.ccmc.gsfc.nasa.gov/DONKI/"
                lang={lang}
              />
              <span>
                {lang === 'es'
                  ? `POOL: ${poolStatus.count} EVENTOS (${poolStatus.fetchedAt.slice(0, 16).replace('T', ' ')} UTC)`
                  : `POOL: ${poolStatus.count} EVENTS (${poolStatus.fetchedAt.slice(0, 16).replace('T', ' ')} UTC)`}
              </span>
            </div>
            <h2 id="science-modal-title" className="science-annex-title">
              {lang === 'es'
                ? 'Anexo del Cuaderno de Vuelo — Trazabilidad Científica NASA'
                : 'Flight Notebook Annex — NASA Science Traceability'}
            </h2>
            <p className="science-annex-subtitle">
              {lang === 'es'
                ? 'Datos verificados de NASA DONKI (FLR, SEP, CME), Repositorio Biológico NASA OSDR (OSD-379, BioSentinel, RAD) y Biblioteca Oficial de Imágenes.'
                : 'Verified data from NASA DONKI (FLR, SEP, CME), NASA OSDR Biological Repository (OSD-379, BioSentinel, RAD), and Official Image Library.'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="science-annex-btn"
            style={MIN_TOUCH_TARGET_STYLE}
            onClick={() => {
              missionAudio.playClick();
              onClose();
            }}
            id="close-science-modal-btn"
            aria-label={
              lang === 'es'
                ? 'Cerrar Anexo de Ciencia Real de la NASA (Esc)'
                : 'Close Real NASA Science Annex (Esc)'
            }
          >
            <CloseIcon size={16} />
            <span>{lang === 'es' ? 'Cerrar [ESC]' : 'Close [ESC]'}</span>
          </button>
        </header>

        {/* Barra de Pestañas de Carpeta (Folder Tabs) */}
        <nav
          role="tablist"
          aria-label={
            lang === 'es'
              ? 'Secciones del Anexo del Cuaderno de Ciencia NASA'
              : 'NASA Science Flight Notebook Annex Sections'
          }
          className="science-folder-tabs"
        >
          <button
            id="tab-donki-glossary-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'donki-glossary'}
            aria-controls="panel-donki-glossary"
            style={MIN_TOUCH_TARGET_STYLE}
            className="science-folder-tab"
            onClick={() => handleTabSwitch('donki-glossary')}
            onKeyDown={(e) => handleTabKeyDown(e, 'donki-glossary')}
          >
            <span className="science-folder-tab-code">A</span>
            <SunIcon size={16} />
            <span>
              {lang === 'es'
                ? 'Clima DONKI & Fichas de Glosario'
                : 'DONKI Weather & Glossary Cards'}
            </span>
          </button>

          <button
            id="tab-osdr-studies-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'osdr-studies'}
            aria-controls="panel-osdr-studies"
            style={MIN_TOUCH_TARGET_STYLE}
            className="science-folder-tab"
            onClick={() => handleTabSwitch('osdr-studies')}
            onKeyDown={(e) => handleTabKeyDown(e, 'osdr-studies')}
          >
            <span className="science-folder-tab-code">B</span>
            <ScienceIcon size={16} />
            <span>
              {lang === 'es'
                ? 'Estudios NASA OSDR (Veggie / RAD)'
                : 'NASA OSDR Studies (Veggie / RAD)'}
            </span>
          </button>

          <button
            id="tab-nasa-photos-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'nasa-photos'}
            aria-controls="panel-nasa-photos"
            style={MIN_TOUCH_TARGET_STYLE}
            className="science-folder-tab"
            onClick={() => handleTabSwitch('nasa-photos')}
            onKeyDown={(e) => handleTabKeyDown(e, 'nasa-photos')}
          >
            <span className="science-folder-tab-code">C</span>
            <GlobeIcon size={16} />
            <span>
              {lang === 'es'
                ? 'Archivo Fotográfico NASA'
                : 'NASA Photographic Archive'}
            </span>
          </button>

          <button
            id="tab-mini-quiz-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'mini-quiz'}
            aria-controls="panel-mini-quiz"
            style={MIN_TOUCH_TARGET_STYLE}
            className="science-folder-tab"
            onClick={() => handleTabSwitch('mini-quiz')}
            onKeyDown={(e) => handleTabKeyDown(e, 'mini-quiz')}
          >
            <span className="science-folder-tab-code">D</span>
            <PatchIcon size={16} />
            <span>
              {lang === 'es'
                ? `Examen de Vuelo (${correctCount}/${totalQuestions})`
                : `Flight Check Quiz (${correctCount}/${totalQuestions})`}
            </span>
          </button>
        </nav>

        {/* PESTAÑA A: CLIMA ESPACIAL EN VIVO (DONKI) Y FICHAS DE BIBLIOTECA DEL GLOSARIO */}
        {activeTab === 'donki-glossary' && (
          <div
            id="panel-donki-glossary"
            role="tabpanel"
            aria-labelledby="tab-donki-glossary-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Parte Meteorológico Activo en la Misión */}
            <section className="science-form-box science-form-box--alert">
              <div className="science-section-bar">
                <h3 className="science-section-title">
                  <AntennaIcon size={18} />
                  <span>
                    {lang === 'es'
                      ? 'Parte Meteorológico Espacial Activo (NASA DONKI)'
                      : 'Active Space Weather Dispatch (NASA DONKI)'}
                  </span>
                </h3>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                  }}
                >
                  <SourceStamp
                    source={
                      currentWeather.type === 'DUST_STORM' ? 'MARS' : 'DONKI'
                    }
                    live={currentWeather.isLiveNasaData}
                    url={currentWeather.sourceUrl}
                    lang={lang}
                  />
                  <button
                    id="refresh-donki-live-btn"
                    type="button"
                    className="science-annex-btn"
                    style={MIN_TOUCH_TARGET_STYLE}
                    onClick={handleRefreshDonki}
                    disabled={isLoadingDonki}
                  >
                    <AntennaIcon size={15} />
                    <span>
                      {isLoadingDonki
                        ? lang === 'es'
                          ? 'Consultando api.nasa.gov/DONKI...'
                          : 'Querying api.nasa.gov/DONKI...'
                        : lang === 'es'
                          ? 'Sincronizar DONKI en Vivo (FLR/SEP/CME)'
                          : 'Sync Live DONKI (FLR/SEP/CME)'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="science-mono-meta">
                ID: {currentWeather.id} | {currentWeather.classOrIntensity}
              </div>

              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.45 }}>
                <strong>{currentWeather.title[lang]}:</strong>{' '}
                {currentWeather.kidFriendlyExplanation[lang]}
              </p>

              <p
                style={{
                  margin: 0,
                  fontSize: '0.84rem',
                  paddingTop: '0.35rem',
                  borderTop: '1px solid var(--rule, rgba(27,31,42,0.25))',
                }}
              >
                <strong>
                  {lang === 'es' ? 'REGISTRO TÉCNICO: ' : 'TECHNICAL RECORD: '}
                </strong>
                {currentWeather.scienceFact[lang]}
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <span className="science-telemetry-pill">
                  <RadiationIcon size={15} />
                  <span>
                    {lang === 'es'
                      ? `Multiplicador Radiación: x${currentWeather.radiationMultiplier.toFixed(1)}`
                      : `Radiation Multiplier: x${currentWeather.radiationMultiplier.toFixed(1)}`}
                  </span>
                </span>
                <span className="science-telemetry-pill">
                  <BatteryIcon size={15} />
                  <span>
                    {lang === 'es'
                      ? `Eficiencia Solar: ${Math.round(currentWeather.solarEfficiencyMultiplier * 100)}%`
                      : `Solar Efficiency: ${Math.round(currentWeather.solarEfficiencyMultiplier * 100)}%`}
                  </span>
                </span>
                {currentWeather.sourceUrl && (
                  <a
                    href={currentWeather.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="science-ref-link"
                  >
                    <span>
                      {lang === 'es'
                        ? 'Registro Oficial NASA DONKI [REF]'
                        : 'Official NASA DONKI Record [REF]'}
                    </span>
                    <ArrowIcon size={13} direction="right" />
                  </a>
                )}
              </div>
            </section>

            {/* Registro de Eventos Solares y Planetarios */}
            <section className="science-form-box science-form-box--blue">
              <div className="science-section-bar">
                <h4 className="science-section-title">
                  <SunIcon size={17} />
                  <span>
                    {lang === 'es'
                      ? 'Bitácora de Eventos Solares y Planetarios (FLR / SEP / CME / MEDA)'
                      : 'Solar & Planetary Event Log (FLR / SEP / CME / MEDA)'}
                  </span>
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                  {(
                    [
                      { id: 'ALL', labelEs: 'Todos', labelEn: 'All' },
                      {
                        id: 'FLR',
                        labelEs: 'FLR (Llamaradas)',
                        labelEn: 'FLR (Flares)',
                      },
                      {
                        id: 'SEP',
                        labelEs: 'SEP (Protones)',
                        labelEn: 'SEP (Protons)',
                      },
                      {
                        id: 'CME',
                        labelEs: 'CME (Plasma)',
                        labelEn: 'CME (Plasma)',
                      },
                      {
                        id: 'DUST_STORM',
                        labelEs: 'MEDA (Polvo Marte)',
                        labelEn: 'MEDA (Mars Dust)',
                      },
                    ] as const
                  ).map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      className={`science-annex-btn ${
                        weatherTypeFilter === btn.id
                          ? 'science-annex-btn--active'
                          : ''
                      }`}
                      style={MIN_TOUCH_TARGET_STYLE}
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

              <div className="science-library-grid">
                {filteredDonkiEvents.slice(0, 6).map((ev) => (
                  <article key={ev.id} className="science-library-card">
                    <div className="science-library-card-header">
                      <span>
                        {ev.type} //{' '}
                        {ev.isLiveNasaData ? 'EN VIVO' : 'ARCHIVO REAL'}
                      </span>
                      <span>{ev.startTime.slice(0, 10)}</span>
                    </div>
                    <div className="science-library-card-body">
                      <h5 className="science-library-card-title">
                        {ev.title[lang]}
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.82rem' }}>
                        {ev.kidFriendlyExplanation[lang]}
                      </p>
                    </div>
                    <div className="science-library-card-footer">
                      <span>RAD: x{ev.radiationMultiplier}</span>
                      <span>
                        SOLAR: {Math.round(ev.solarEfficiencyMultiplier * 100)}%
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Fichas de Término Tipo Tarjeta de Biblioteca (17 Términos + ¿Cómo lo sabemos?) */}
            <section
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div className="science-section-bar">
                <h3 className="science-section-title">
                  <ScienceIcon size={18} />
                  <span>
                    {lang === 'es'
                      ? `Fichas de Biblioteca Científica (${filteredGlossary.length} términos)`
                      : `Science Library Catalog Cards (${filteredGlossary.length} terms)`}
                  </span>
                </h3>
                <input
                  type="search"
                  value={glossarySearch}
                  onChange={(e) => setGlossarySearch(e.target.value)}
                  className="science-search-input"
                  style={MIN_TOUCH_TARGET_STYLE}
                  aria-label={
                    lang === 'es'
                      ? 'Buscar término en el fichero científico'
                      : 'Search term in the science catalog'
                  }
                  placeholder={
                    lang === 'es'
                      ? 'Buscar término o instrumento (ej. mSv, MOXIE, RAD)...'
                      : 'Search term or instrument (e.g. mSv, MOXIE, RAD)...'
                  }
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
                    className={`science-annex-btn ${
                      glossarySourceFilter === src
                        ? 'science-annex-btn--active'
                        : ''
                    }`}
                    style={MIN_TOUCH_TARGET_STYLE}
                    onClick={() => {
                      missionAudio.playClick();
                      setGlossarySourceFilter(src);
                    }}
                  >
                    {src === 'ALL'
                      ? lang === 'es'
                        ? 'Todas las Fuentes'
                        : 'All Sources'
                      : `NASA ${src}`}
                  </button>
                ))}
              </div>

              {focusedTerm && (
                <div
                  id="focused-glossary-banner"
                  className="science-form-box science-form-box--alert"
                >
                  <div className="science-section-bar">
                    <span className="science-annex-doc-code">
                      {lang === 'es'
                        ? 'FICHA VINCULADA AL DILEMA ACTUAL'
                        : 'CATALOG CARD LINKED TO ACTIVE DILEMMA'}
                    </span>
                    <SourceStamp
                      source={mapGlossarySourceToStamp(focusedTerm.nasaSource)}
                      live={false}
                      url={focusedTerm.nasaStudyOrUrl}
                      lang={lang}
                    />
                  </div>
                  <strong
                    style={{
                      fontFamily:
                        "var(--font-display, 'Barlow Condensed', sans-serif)",
                      fontSize: '1.15rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {focusedTerm.term[lang]}
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.88rem' }}>
                    {focusedTerm.shortDefinition[lang]}
                  </p>
                  <p style={{ margin: 0, fontSize: '0.84rem' }}>
                    <strong>
                      {lang === 'es'
                        ? 'Analogía de Vuelo: '
                        : 'Flight Analogy: '}
                    </strong>
                    {focusedTerm.kidAnalogy[lang]}
                  </p>
                  {(focusedTerm as GlossaryTermWithEvidence).howWeKnow && (
                    <p
                      className="glossary-how-we-know"
                      style={{
                        margin: 0,
                        fontSize: '0.82rem',
                        paddingTop: '0.35rem',
                        borderTop: '1px solid var(--rule, rgba(27,31,42,0.25))',
                      }}
                    >
                      <strong>
                        {lang === 'es'
                          ? '¿Cómo lo sabemos? '
                          : 'How do we know? '}
                      </strong>
                      {
                        (focusedTerm as GlossaryTermWithEvidence).howWeKnow?.[
                          lang
                        ]
                      }
                    </p>
                  )}
                </div>
              )}

              <div className="glossary-grid science-library-grid">
                {filteredGlossary.map((item, idx) => {
                  const isFocused = Boolean(
                    focusTermId && item.id === focusTermId
                  );
                  const howWeKnow =
                    (item as GlossaryTermWithEvidence).howWeKnow ||
                    getGlossaryTerm(item.id)?.howWeKnow;
                  const catalogCode = `FICHA-${String(idx + 1).padStart(2, '0')} // ${item.id.toUpperCase()}`;

                  return (
                    <article
                      key={item.id}
                      id={`glossary-term-${item.id}`}
                      data-highlighted={isFocused ? 'true' : 'false'}
                      className="glossary-item science-library-card"
                    >
                      <div className="science-library-card-header">
                        <span>{catalogCode}</span>
                        <span>NASA {item.nasaSource}</span>
                      </div>

                      <div className="science-library-card-body">
                        <h4 className="science-library-card-title">
                          {item.term[lang]}
                        </h4>

                        <div className="science-library-rule-row">
                          <span className="science-library-field-label">
                            {lang === 'es'
                              ? 'Definición Operativa'
                              : 'Operational Definition'}
                          </span>
                          <p style={{ margin: 0 }}>
                            {item.shortDefinition[lang]}
                          </p>
                        </div>

                        <div className="science-library-rule-row">
                          <span className="science-library-field-label">
                            {lang === 'es'
                              ? 'Analogía para Cadetes'
                              : 'Cadet Analogy'}
                          </span>
                          <p style={{ margin: 0 }}>{item.kidAnalogy[lang]}</p>
                        </div>

                        {howWeKnow && (
                          <div className="science-library-rule-row glossary-how-we-know">
                            <span className="science-library-field-label">
                              {lang === 'es'
                                ? '¿Cómo lo sabemos? (Instrumentación NASA)'
                                : 'How do we know? (NASA Instrumentation)'}
                            </span>
                            <p style={{ margin: 0 }}>{howWeKnow[lang]}</p>
                          </div>
                        )}
                      </div>

                      <div className="science-library-card-footer">
                        <SourceStamp
                          source={mapGlossarySourceToStamp(item.nasaSource)}
                          live={false}
                          lang={lang}
                        />
                        <a
                          href={item.nasaStudyOrUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="science-ref-link"
                        >
                          <span>
                            {lang === 'es' ? 'Fuente [REF]' : 'Source [REF]'}
                          </span>
                          <ArrowIcon size={12} direction="right" />
                        </a>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* PESTAÑA B: ESTUDIOS REALES NASA OSDR (BIOLOGÍA Y RADIACIÓN) */}
        {activeTab === 'osdr-studies' && (
          <div
            id="panel-osdr-studies"
            role="tabpanel"
            aria-labelledby="tab-osdr-studies-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            {/* Comparador Técnico de Dosimetría en mSv */}
            <section className="science-form-box science-form-box--blue">
              <div className="science-section-bar">
                <h3 className="science-section-title">
                  <ShieldIcon size={18} />
                  <span>
                    {lang === 'es'
                      ? 'Escala Comparativa de Dosimetría (Milisieverts - mSv) — NASA RAD & Artemis I'
                      : 'Comparative Dosimetry Scale (Millisieverts - mSv) — NASA RAD & Artemis I'}
                  </span>
                </h3>
                <SourceStamp source="OSDR" live={false} lang={lang} />
              </div>

              <p style={{ margin: 0, fontSize: '0.86rem' }}>
                {lang === 'es'
                  ? 'Comparación de dosis de radiación medida por instrumentos de la NASA frente a referencias médicas terrestres:'
                  : 'Comparison of radiation doses measured by NASA instruments against Earth medical baselines:'}
              </p>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.65rem',
                }}
              >
                {[
                  {
                    labelEs: 'Radiografía Dental (Tierra)',
                    labelEn: 'Dental X-Ray (Earth)',
                    msv: '0.01 mSv',
                    pct: 4,
                    color: 'var(--ok-green, #2E7D4F)',
                  },
                  {
                    labelEs: '1 Sol en Marte en Calma (RAD)',
                    labelEn: '1 Calm Martian Sol (RAD)',
                    msv: '0.67 mSv',
                    pct: 22,
                    color: 'var(--ok-green, #2E7D4F)',
                  },
                  {
                    labelEs: '1 Día en Superficie Lunar (LND)',
                    labelEn: '1 Day on Lunar Surface (LND)',
                    msv: '1.37 mSv',
                    pct: 36,
                    color: 'var(--nasa-blue, #0B3D91)',
                  },
                  {
                    labelEs: 'Tormenta Solar CON Muro de Agua',
                    labelEn: 'Solar Storm WITH Water Wall',
                    msv: '4.0 mSv (-50%)',
                    pct: 58,
                    color: 'var(--nasa-blue, #0B3D91)',
                  },
                  {
                    labelEs: 'Tormenta SEP SIN Escudo (Mayo 2024)',
                    labelEn: 'Unshielded SEP Storm (May 2024)',
                    msv: '8.1 mGy (8,100 µGy)',
                    pct: 100,
                    color: 'var(--nasa-red, #FC3D21)',
                  },
                ].map((bar, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.65rem',
                      border: '1.5px solid var(--ink, #1B1F2A)',
                      borderRadius: '2px',
                      backgroundColor: 'var(--paper, #F2EBDD)',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        marginBottom: '0.3rem',
                      }}
                    >
                      {lang === 'es' ? bar.labelEs : bar.labelEn}
                    </div>
                    <div
                      className="science-mono-meta"
                      style={{
                        fontWeight: 700,
                        marginBottom: '0.35rem',
                      }}
                    >
                      {bar.msv}
                    </div>
                    <div
                      style={{
                        height: '8px',
                        width: '100%',
                        border: '1px solid var(--ink, #1B1F2A)',
                        borderRadius: '2px',
                        backgroundColor: 'var(--paper, #F2EBDD)',
                      }}
                    >
                      <div
                        style={{
                          width: `${bar.pct}%`,
                          height: '100%',
                          backgroundColor: bar.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Filtro de Estudios OSDR */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
              {(
                [
                  {
                    id: 'all',
                    labelEs: 'Todos los Estudios OSDR (5)',
                    labelEn: 'All OSDR Studies (5)',
                  },
                  {
                    id: 'plants',
                    labelEs: 'Botánica Espacial (OSD-379 / Veggie / APH)',
                    labelEn: 'Space Botany (OSD-379 / Veggie / APH)',
                  },
                  {
                    id: 'radiation',
                    labelEs: 'Radiación y ADN (BioSentinel / RAD)',
                    labelEn: 'Radiation & DNA (BioSentinel / RAD)',
                  },
                  {
                    id: 'life-support',
                    labelEs: 'Soporte Vital (ECLSS 98% / MOXIE)',
                    labelEn: 'Life Support (ECLSS 98% / MOXIE)',
                  },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`science-annex-btn ${
                    osdrCategory === cat.id ? 'science-annex-btn--active' : ''
                  }`}
                  style={MIN_TOUCH_TARGET_STYLE}
                  onClick={() => {
                    missionAudio.playClick();
                    setOsdrCategory(cat.id);
                  }}
                >
                  {lang === 'es' ? cat.labelEs : cat.labelEn}
                </button>
              ))}
            </div>

            {/* Fichas de Estudios NASA OSDR */}
            <div className="science-library-grid">
              {filteredStudies.map((study) => (
                <article key={study.id} className="science-library-card">
                  <div className="science-library-card-header">
                    <span>{study.osdrAccession}</span>
                    <span>{study.missionOrFacility}</span>
                  </div>

                  <div className="science-library-card-body">
                    <h4 className="science-library-card-title">
                      {study.title[lang]}
                    </h4>

                    <div className="science-library-rule-row">
                      <span className="science-library-field-label">
                        {lang === 'es'
                          ? 'Sujeto / Instrumento'
                          : 'Subject / Instrument'}
                      </span>
                      <p style={{ margin: 0 }}>
                        {study.organismOrInstrument[lang]}
                      </p>
                    </div>

                    <div className="science-library-rule-row">
                      <span className="science-library-field-label">
                        {lang === 'es'
                          ? 'Hallazgo Científico NASA'
                          : 'NASA Scientific Finding'}
                      </span>
                      <p style={{ margin: 0 }}>{study.keyFinding[lang]}</p>
                    </div>

                    <div className="science-library-rule-row">
                      <span className="science-library-field-label">
                        {lang === 'es'
                          ? 'Explicación de Cuaderno'
                          : 'Notebook Explanation'}
                      </span>
                      <p style={{ margin: 0 }}>{study.kidExplanation[lang]}</p>
                    </div>

                    <div className="science-library-rule-row">
                      <span className="science-library-field-label">
                        {lang === 'es'
                          ? 'Impacto en tus Órdenes de Trabajo'
                          : 'Impact on Work Orders'}
                      </span>
                      <p style={{ margin: 0, fontWeight: 600 }}>
                        {study.outpostTradeoffConnection[lang]}
                      </p>
                    </div>
                  </div>

                  <div className="science-library-card-footer">
                    <span>{study.telemetryMetric[lang]}</span>
                    <a
                      href={study.officialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="science-ref-link"
                    >
                      <span>
                        {lang === 'es'
                          ? 'Abrir en NASA OSDR [REF]'
                          : 'Open in NASA OSDR [REF]'}
                      </span>
                      <ArrowIcon size={12} direction="right" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* PESTAÑA C: FOTOGRAFÍAS REALES DE LA NASA (images-api.nasa.gov) */}
        {activeTab === 'nasa-photos' && (
          <div
            id="panel-nasa-photos"
            role="tabpanel"
            aria-labelledby="tab-nasa-photos-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <section className="science-form-box">
              <div className="science-section-bar">
                <div>
                  <h3 className="science-section-title">
                    <GlobeIcon size={18} />
                    <span>
                      {lang === 'es'
                        ? 'Archivo Fotográfico Oficial NASA (images-api.nasa.gov)'
                        : 'Official NASA Photographic Archive (images-api.nasa.gov)'}
                    </span>
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.84rem' }}>
                    {lang === 'es'
                      ? 'Registro visual de las misiones Artemis, Perseverance, SDO y cámaras botánicas Veggie.'
                      : 'Visual record from Artemis, Perseverance, SDO, and Veggie plant chambers.'}
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
                    className="science-search-input"
                    style={MIN_TOUCH_TARGET_STYLE}
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
                  />
                  <button
                    type="submit"
                    className="science-annex-btn science-annex-btn--primary"
                    style={MIN_TOUCH_TARGET_STYLE}
                    disabled={isLoadingPhotos}
                  >
                    <span>
                      {isLoadingPhotos
                        ? lang === 'es'
                          ? 'Buscando...'
                          : 'Searching...'
                        : lang === 'es'
                          ? 'Consultar Archivo NASA'
                          : 'Query NASA Archive'}
                    </span>
                  </button>
                </form>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {(
                  [
                    { id: 'all', labelEs: 'Todas', labelEn: 'All' },
                    {
                      id: 'moon',
                      labelEs: 'Luna (Shackleton / Artemis)',
                      labelEn: 'Moon (Shackleton / Artemis)',
                    },
                    {
                      id: 'mars',
                      labelEs: 'Marte (Jezero / MOXIE)',
                      labelEn: 'Mars (Jezero / MOXIE)',
                    },
                    {
                      id: 'solar',
                      labelEs: 'Sol (Llamaradas SDO)',
                      labelEn: 'Sun (SDO Flares)',
                    },
                    {
                      id: 'plants',
                      labelEs: 'Plantas (Veggie / OSDR)',
                      labelEn: 'Plants (Veggie / OSDR)',
                    },
                    {
                      id: 'radiation',
                      labelEs: 'Radiación (RAD / BioSentinel)',
                      labelEn: 'Radiation (RAD / BioSentinel)',
                    },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`science-annex-btn ${
                      photoCategory === cat.id
                        ? 'science-annex-btn--active'
                        : ''
                    }`}
                    style={MIN_TOUCH_TARGET_STYLE}
                    onClick={() => {
                      missionAudio.playClick();
                      setPhotoCategory(cat.id);
                    }}
                  >
                    {lang === 'es' ? cat.labelEs : cat.labelEn}
                  </button>
                ))}
              </div>
            </section>

            <div className="science-photo-grid">
              {galleryImages.map((img) => {
                const imgFailed = failedImageIds[img.nasaId];
                const descriptiveAlt = `${img.title[lang]} — ${img.kidCaption[lang]} (NASA ID: ${img.nasaId})`;
                return (
                  <article key={img.nasaId} className="science-photo-card">
                    <div className="science-photo-frame">
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
                            color: 'var(--paper, #F2EBDD)',
                            fontFamily:
                              "var(--font-mono, 'IBM Plex Mono', monospace)",
                          }}
                        >
                          <GlobeIcon size={28} />
                          <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>
                            {img.fallbackEmoji}
                          </span>
                          <span style={{ fontSize: '0.72rem' }}>
                            NASA ID: {img.nasaId}
                          </span>
                        </div>
                      )}
                      <span className="science-photo-stamp">
                        {img.isLiveApiResult ? 'LIVE NASA API' : img.center}
                      </span>
                    </div>

                    <div className="science-library-card-body">
                      <div
                        className="science-mono-meta"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>ID: {img.nasaId}</span>
                        <span>{img.dateCreated}</span>
                      </div>

                      <h4 className="science-library-card-title">
                        {img.title[lang]}
                      </h4>

                      <p style={{ margin: 0, fontSize: '0.82rem' }}>
                        {img.kidCaption[lang]}
                      </p>

                      <p
                        className="science-library-rule-row"
                        style={{ margin: 'auto 0 0', fontWeight: 600 }}
                      >
                        {img.scienceConnection[lang]}
                      </p>
                    </div>

                    <div className="science-library-card-footer">
                      <span>{img.center}</span>
                      <a
                        href={img.sourcePageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="science-ref-link"
                      >
                        <span>
                          {lang === 'es'
                            ? 'Ficha images.nasa.gov [REF]'
                            : 'Record images.nasa.gov [REF]'}
                        </span>
                        <ArrowIcon size={12} direction="right" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}

        {/* PESTAÑA D: EXAMEN DE VUELO (MINI-QUIZ DE 14 PREGUNTAS) */}
        {activeTab === 'mini-quiz' && (
          <div
            id="panel-mini-quiz"
            role="tabpanel"
            aria-labelledby="tab-mini-quiz-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <section className="science-form-box science-form-box--green">
              <div className="science-section-bar">
                <div>
                  <h3 className="science-section-title">
                    <PatchIcon size={18} />
                    <span>
                      {lang === 'es'
                        ? 'Verificación de Vuelo del Comandante — Ciencia Real NASA'
                        : 'Commander Flight Verification — Real NASA Science'}
                    </span>
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.86rem' }}>
                    {lang === 'es'
                      ? `Lista de verificación de ${totalQuestions} preguntas basadas en los dilemas reales de ingeniería (MOXIE, RAD, OSD-379, Shackleton, Jezero y DONKI).`
                      : `Checklist of ${totalQuestions} questions drawn from real engineering dilemmas (MOXIE, RAD, OSD-379, Shackleton, Jezero & DONKI).`}
                  </p>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span className="science-telemetry-pill">
                    <CheckIcon size={15} />
                    <span>
                      {lang === 'es'
                        ? `Aciertos: ${correctCount} / ${totalQuestions}`
                        : `Score: ${correctCount} / ${totalQuestions}`}
                    </span>
                  </span>
                  {answeredCount > 0 && (
                    <button
                      type="button"
                      className="science-annex-btn"
                      style={MIN_TOUCH_TARGET_STYLE}
                      onClick={handleResetQuiz}
                      id="reset-quiz-btn"
                    >
                      <span>
                        {lang === 'es'
                          ? 'Reiniciar Verificación'
                          : 'Reset Checklist'}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {(
                  [
                    {
                      id: 'all',
                      labelEs: 'Todas las Preguntas (14)',
                      labelEn: 'All Questions (14)',
                    },
                    {
                      id: 'moon-shackleton',
                      labelEs: 'Base Lunar (Shackleton / Artemis)',
                      labelEn: 'Lunar Base (Shackleton / Artemis)',
                    },
                    {
                      id: 'mars-jezero',
                      labelEs: 'Base Marciana (Jezero / MOXIE)',
                      labelEn: 'Martian Base (Jezero / MOXIE)',
                    },
                  ] as const
                ).map((filterBtn) => (
                  <button
                    key={filterBtn.id}
                    type="button"
                    className={`science-annex-btn ${
                      quizSiteFilter === filterBtn.id
                        ? 'science-annex-btn--active'
                        : ''
                    }`}
                    style={MIN_TOUCH_TARGET_STYLE}
                    onClick={() => {
                      missionAudio.playClick();
                      setQuizSiteFilter(filterBtn.id);
                    }}
                  >
                    {lang === 'es' ? filterBtn.labelEs : filterBtn.labelEn}
                  </button>
                ))}
              </div>
            </section>

            {answeredCount === totalQuestions && totalQuestions > 0 && (
              <div
                className="science-form-box science-form-box--green"
                role="status"
                aria-live="polite"
              >
                <strong>
                  {correctCount === totalQuestions
                    ? lang === 'es'
                      ? 'CERTIFICACIÓN COMPLETA: Comandante Científico Jefe de la NASA. Todas las respuestas verificadas.'
                      : 'CERTIFICATION COMPLETE: Chief NASA Science Commander. All answers verified.'
                    : correctCount >= Math.ceil(totalQuestions * 0.65)
                      ? lang === 'es'
                        ? 'CERTIFICACIÓN APROBADA: Especialista de Misión Artemis & Marte.'
                        : 'CERTIFICATION PASSED: Artemis & Mars Mission Specialist.'
                      : lang === 'es'
                        ? 'REVISIÓN RECOMENDADA: Consulta las notas técnicas de la NASA bajo cada pregunta y vuelve a intentarlo.'
                        : 'REVIEW RECOMMENDED: Check the NASA technical notes below each question and try again.'}
                </strong>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              {filteredQuizQuestions.map((q) => {
                const userChoiceId = selectedAnswers[q.id];
                const isAnswered = Boolean(userChoiceId);
                const chosenRight = q.options.find(
                  (o) => o.id === userChoiceId
                )?.isCorrect;

                return (
                  <article key={q.id} className="science-library-card">
                    <div className="science-library-card-header">
                      <span>{q.badgeSource}</span>
                      {isAnswered && (
                        <span
                          style={{
                            color: chosenRight
                              ? 'var(--ok-green, #2E7D4F)'
                              : 'var(--nasa-red, #FC3D21)',
                          }}
                        >
                          {chosenRight
                            ? lang === 'es'
                              ? '[VERIFICADO: CORRECTO]'
                              : '[VERIFIED: CORRECT]'
                            : lang === 'es'
                              ? '[REVISAR NOTA TÉCNICA]'
                              : '[REVIEW TECHNICAL NOTE]'}
                        </span>
                      )}
                    </div>

                    <div className="science-library-card-body">
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '0.96rem',
                          fontWeight: 700,
                        }}
                      >
                        {q.question[lang]}
                      </h4>

                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.45rem',
                        }}
                      >
                        {q.options.map((opt) => {
                          const isThisSelected = userChoiceId === opt.id;
                          let optionClass = 'science-quiz-option';

                          if (isAnswered) {
                            if (opt.isCorrect) {
                              optionClass += ' science-quiz-option--correct';
                            } else if (isThisSelected && !opt.isCorrect) {
                              optionClass += ' science-quiz-option--wrong';
                            }
                          }

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() =>
                                handleSelectQuizOption(
                                  q.id,
                                  opt.id,
                                  opt.isCorrect
                                )
                              }
                              disabled={isAnswered}
                              className={optionClass}
                              style={MIN_TOUCH_TARGET_STYLE}
                            >
                              <span className="science-quiz-check-box">
                                {opt.id.toUpperCase()}
                              </span>
                              <span>{opt.text[lang]}</span>
                            </button>
                          );
                        })}
                      </div>

                      {isAnswered && (
                        <div className="science-library-rule-row">
                          <span className="science-library-field-label">
                            {lang === 'es'
                              ? 'Nota Técnica de Verificación NASA'
                              : 'NASA Verification Technical Note'}
                          </span>
                          <p style={{ margin: 0 }}>{q.explanation[lang]}</p>
                        </div>
                      )}
                    </div>
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
