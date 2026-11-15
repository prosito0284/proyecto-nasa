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
  computeQuizProgress,
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
import { ModelFocusPose, ModelViewer3D } from '../Three/ModelViewer3D';
import { HARDWARE_MODEL_HOTSPOTS } from '../Three/proceduralModels';
import './science.css';

export type ScienceModalTab =
  | 'donki-glossary'
  | 'osdr-studies'
  | 'nasa-photos'
  | 'mini-quiz'
  | 'model-3d';

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
  /** Callback opcional invocado una sola vez al completar todas las preguntas del quiz activo (B13) */
  onQuizComplete?: (correct: number, total: number) => void;
  /** T08: Callback opcional para notificar interacción con el anexo de ciencia durante el tutorial */
  onTutorialAction?: (stepId: string) => void;
  /** M04: Pestaña inicial opcional (por defecto 'donki-glossary') */
  initialTab?: ScienceModalTab;
}

type ModalTab = ScienceModalTab;

const TAB_ORDER: ModalTab[] = [
  'donki-glossary',
  'osdr-studies',
  'nasa-photos',
  'mini-quiz',
  'model-3d',
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

function getFirstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : text.trim();
}

export const ScienceModal: React.FC<ScienceModalProps> = ({
  lang,
  isOpen,
  onClose,
  glossary,
  currentWeather,
  focusTermId,
  siteId,
  onQuizComplete,
  onTutorialAction,
  initialTab = 'donki-glossary',
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab);
  const [glossarySearch, setGlossarySearch] = useState('');
  const [glossarySourceFilter, setGlossarySourceFilter] = useState<
    'ALL' | GlossaryTerm['nasaSource']
  >('ALL');

  // B12: Dieta de texto — fichas contraídas por defecto (máximo 2 frases) con botón "Leer más"
  const [expandedCardIds, setExpandedCardIds] = useState<
    Record<string, boolean>
  >({});

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

  // Estado Mini-Quiz (B5 + B13)
  const [quizSiteFilter, setQuizSiteFilter] = useState<OutpostSiteId | 'all'>(
    siteId ?? 'all'
  );
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<string, string>
  >({});
  const quizCompletedByFilterRef = useRef<Record<string, boolean>>({});

  // M03: Estado del inspector de hardware NASA en 3D
  const [selectedHardwareModel, setSelectedHardwareModel] = useState<
    'rover-moxie' | 'habitat-shield'
  >('rover-moxie');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);

  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const toggleCardExpanded = (cardKey: string) => {
    missionAudio.playClick();
    setExpandedCardIds((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  };

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
    onTutorialAction?.('step-science-button');
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

  const filteredQuizQuestions = getQuizQuestionsForSite(quizSiteFilter);
  const { answeredCount, correctCount, totalQuestions } = computeQuizProgress(
    filteredQuizQuestions,
    selectedAnswers
  );

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
    const nextAnswers = { ...selectedAnswers, [questionId]: optionId };
    setSelectedAnswers(nextAnswers);

    const nextProgress = computeQuizProgress(
      filteredQuizQuestions,
      nextAnswers
    );
    if (
      nextProgress.isComplete &&
      !quizCompletedByFilterRef.current[quizSiteFilter]
    ) {
      quizCompletedByFilterRef.current[quizSiteFilter] = true;
      onQuizComplete?.(nextProgress.correctCount, nextProgress.totalQuestions);
    }
  };

  const handleResetQuiz = () => {
    missionAudio.playClick();
    quizCompletedByFilterRef.current = {};
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
      <div
        ref={modalCardRef}
        className="modal-card science-annex-sheet"
        data-tutorial-id="science-modal-sheet"
        data-onboarding-id="science-modal-sheet"
      >
        {/* Cabecera del Anexo del Cuaderno de Vuelo */}
        <header className="science-annex-header">
          <div>
            <div className="science-annex-doc-meta">
              <span className="science-annex-doc-code">
                <ScienceIcon size={14} />
                <span>{lang === 'es' ? 'ANEXO NASA' : 'NASA ANNEX'}</span>
              </span>
              <SourceStamp
                source="DONKI"
                live={hasLiveDonkiEvents}
                url="https://kauai.ccmc.gsfc.nasa.gov/DONKI/"
                lang={lang}
              />
              <span>
                {lang === 'es'
                  ? `Pool: ${poolStatus.count} eventos (${poolStatus.fetchedAt.slice(0, 16).replace('T', ' ')} UTC)`
                  : `Pool: ${poolStatus.count} events (${poolStatus.fetchedAt.slice(0, 16).replace('T', ' ')} UTC)`}
              </span>
            </div>
            <h2 id="science-modal-title" className="science-annex-title">
              {lang === 'es'
                ? 'Anexo del cuaderno de vuelo — Trazabilidad científica NASA'
                : 'Flight notebook annex — NASA science traceability'}
            </h2>
            <p className="science-annex-subtitle">
              {lang === 'es'
                ? 'Datos verificados de NASA DONKI, el repositorio biológico OSDR y la biblioteca oficial de imágenes.'
                : 'Verified data from NASA DONKI, the OSDR biological repository, and the official image library.'}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            data-onboarding-id="science-modal-close"
            className="science-annex-btn"
            style={MIN_TOUCH_TARGET_STYLE}
            onClick={() => {
              missionAudio.playClick();
              onClose();
            }}
            id="close-science-modal-btn"
            aria-label={
              lang === 'es'
                ? 'Cerrar anexo de ciencia real de la NASA (Esc)'
                : 'Close real NASA science annex (Esc)'
            }
          >
            <CloseIcon size={16} />
            <span>{lang === 'es' ? 'Cerrar [Esc]' : 'Close [Esc]'}</span>
          </button>
        </header>

        {/* Barra de Pestañas de Carpeta (Folder Tabs) */}
        <nav
          role="tablist"
          aria-label={
            lang === 'es'
              ? 'Secciones del anexo del cuaderno de ciencia NASA'
              : 'NASA science flight notebook annex sections'
          }
          className="science-folder-tabs"
          data-tutorial-id="science-folder-tabs"
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
                ? 'Clima DONKI y fichas de glosario'
                : 'DONKI weather & glossary cards'}
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
                : 'NASA OSDR studies (Veggie / RAD)'}
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
                ? 'Archivo fotográfico NASA'
                : 'NASA photographic archive'}
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
                ? `Examen de vuelo (${correctCount}/${totalQuestions})`
                : `Flight check quiz (${correctCount}/${totalQuestions})`}
            </span>
          </button>

          <button
            id="tab-model-3d-btn"
            type="button"
            role="tab"
            aria-selected={activeTab === 'model-3d'}
            aria-controls="panel-model-3d"
            style={MIN_TOUCH_TARGET_STYLE}
            className="science-folder-tab"
            onClick={() => handleTabSwitch('model-3d')}
            onKeyDown={(e) => handleTabKeyDown(e, 'model-3d')}
          >
            <span className="science-folder-tab-code">E</span>
            <ShieldIcon size={16} />
            <span>{lang === 'es' ? 'MODELO 3D' : '3D MODEL'}</span>
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
                      ? 'Parte meteorológico espacial activo (NASA DONKI)'
                      : 'Active space weather dispatch (NASA DONKI)'}
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
                          ? 'Sincronizar DONKI en vivo'
                          : 'Sync live DONKI'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="science-mono-meta">
                ID: {currentWeather.id} | {currentWeather.classOrIntensity}
              </div>

              <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5 }}>
                <strong>{currentWeather.title[lang]}:</strong>{' '}
                {getFirstSentence(currentWeather.kidFriendlyExplanation[lang])}{' '}
                {getFirstSentence(currentWeather.scienceFact[lang])}
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
                      ? `Multiplicador radiación: x${currentWeather.radiationMultiplier.toFixed(1)}`
                      : `Radiation multiplier: x${currentWeather.radiationMultiplier.toFixed(1)}`}
                  </span>
                </span>
                <span className="science-telemetry-pill">
                  <BatteryIcon size={15} />
                  <span>
                    {lang === 'es'
                      ? `Eficiencia solar: ${Math.round(currentWeather.solarEfficiencyMultiplier * 100)}%`
                      : `Solar efficiency: ${Math.round(currentWeather.solarEfficiencyMultiplier * 100)}%`}
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
                        ? 'Registro oficial NASA DONKI [REF]'
                        : 'Official NASA DONKI record [REF]'}
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
                      ? 'Bitácora de eventos solares y planetarios (FLR / SEP / CME / MEDA)'
                      : 'Solar & planetary event log (FLR / SEP / CME / MEDA)'}
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
                {filteredDonkiEvents.slice(0, 6).map((ev) => {
                  const cardKey = `donki-${ev.id}`;
                  const isExpanded = Boolean(expandedCardIds[cardKey]);
                  return (
                    <article key={ev.id} className="science-library-card">
                      <div className="science-library-card-header">
                        <span>
                          {ev.type} //{' '}
                          {ev.isLiveNasaData
                            ? lang === 'es'
                              ? 'EN VIVO'
                              : 'LIVE'
                            : lang === 'es'
                              ? 'ARCHIVO'
                              : 'ARCHIVE'}
                        </span>
                        <span>{ev.startTime.slice(0, 10)}</span>
                      </div>
                      <div className="science-library-card-body">
                        <h5 className="science-library-card-title">
                          {ev.title[lang]}
                        </h5>
                        {!isExpanded ? (
                          <p style={{ margin: 0 }}>
                            {getFirstSentence(ev.kidFriendlyExplanation[lang])}{' '}
                            {getFirstSentence(ev.scienceFact[lang])}
                          </p>
                        ) : (
                          <>
                            <p style={{ margin: 0 }}>
                              {ev.kidFriendlyExplanation[lang]}
                            </p>
                            <div className="science-library-rule-row">
                              <span className="science-library-field-label">
                                {lang === 'es' ? 'DATO NASA' : 'NASA FACT'}
                              </span>
                              <p style={{ margin: 0 }}>
                                {ev.scienceFact[lang]}
                              </p>
                            </div>
                          </>
                        )}
                        <button
                          type="button"
                          className="science-read-more-btn"
                          style={MIN_TOUCH_TARGET_STYLE}
                          aria-expanded={isExpanded}
                          onClick={() => toggleCardExpanded(cardKey)}
                        >
                          <span>
                            {isExpanded
                              ? lang === 'es'
                                ? 'Leer menos'
                                : 'Show less'
                              : lang === 'es'
                                ? 'Leer más'
                                : 'Read more'}
                          </span>
                        </button>
                      </div>
                      <div className="science-library-card-footer">
                        <span>RAD: x{ev.radiationMultiplier}</span>
                        <span>
                          SOLAR:{' '}
                          {Math.round(ev.solarEfficiencyMultiplier * 100)}%
                        </span>
                      </div>
                    </article>
                  );
                })}
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
                      ? `Fichas de biblioteca científica (${filteredGlossary.length} términos)`
                      : `Science library catalog cards (${filteredGlossary.length} terms)`}
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
                        ? 'Todas las fuentes'
                        : 'All sources'
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
                      {lang === 'es' ? 'FICHA ACTIVA' : 'ACTIVE CARD'}
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
                      fontSize: '1.2rem',
                    }}
                  >
                    {focusedTerm.term[lang]}
                  </strong>
                  <p style={{ margin: 0 }}>
                    {getFirstSentence(focusedTerm.shortDefinition[lang])}{' '}
                    {getFirstSentence(focusedTerm.kidAnalogy[lang])}
                  </p>
                  {expandedCardIds[`focused-${focusedTerm.id}`] && (
                    <>
                      <p style={{ margin: 0 }}>
                        {focusedTerm.shortDefinition[lang]}
                      </p>
                      <p style={{ margin: 0 }}>
                        <strong>
                          {lang === 'es' ? 'Analogía: ' : 'Analogy: '}
                        </strong>
                        {focusedTerm.kidAnalogy[lang]}
                      </p>
                      {(focusedTerm as GlossaryTermWithEvidence).howWeKnow && (
                        <p
                          className="glossary-how-we-know"
                          style={{
                            margin: 0,
                            paddingTop: '0.35rem',
                            borderTop:
                              '1px solid var(--rule, rgba(27,31,42,0.25))',
                          }}
                        >
                          <strong>
                            {lang === 'es'
                              ? '¿Cómo lo sabemos? '
                              : 'How do we know? '}
                          </strong>
                          {
                            (focusedTerm as GlossaryTermWithEvidence)
                              .howWeKnow?.[lang]
                          }
                        </p>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    className="science-read-more-btn"
                    style={MIN_TOUCH_TARGET_STYLE}
                    aria-expanded={Boolean(
                      expandedCardIds[`focused-${focusedTerm.id}`]
                    )}
                    onClick={() =>
                      toggleCardExpanded(`focused-${focusedTerm.id}`)
                    }
                  >
                    <span>
                      {expandedCardIds[`focused-${focusedTerm.id}`]
                        ? lang === 'es'
                          ? 'Leer menos'
                          : 'Show less'
                        : lang === 'es'
                          ? 'Leer más'
                          : 'Read more'}
                    </span>
                  </button>
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
                  const cardKey = `glossary-${item.id}`;
                  const isExpanded = Boolean(expandedCardIds[cardKey]);

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

                        {!isExpanded ? (
                          <div className="science-library-rule-row">
                            <span className="science-library-field-label">
                              {lang === 'es' ? 'RESUMEN' : 'SUMMARY'}
                            </span>
                            <p style={{ margin: 0 }}>
                              {getFirstSentence(item.shortDefinition[lang])}{' '}
                              {getFirstSentence(item.kidAnalogy[lang])}
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="science-library-rule-row">
                              <span className="science-library-field-label">
                                {lang === 'es' ? 'DEFINICIÓN' : 'DEFINITION'}
                              </span>
                              <p style={{ margin: 0 }}>
                                {item.shortDefinition[lang]}
                              </p>
                            </div>

                            <div className="science-library-rule-row">
                              <span className="science-library-field-label">
                                {lang === 'es' ? 'ANALOGÍA' : 'ANALOGY'}
                              </span>
                              <p style={{ margin: 0 }}>
                                {item.kidAnalogy[lang]}
                              </p>
                            </div>

                            {howWeKnow && (
                              <div className="science-library-rule-row glossary-how-we-know">
                                <span className="science-library-field-label">
                                  {lang === 'es'
                                    ? 'INSTRUMENTO NASA'
                                    : 'NASA INSTRUMENT'}
                                </span>
                                <p style={{ margin: 0 }}>{howWeKnow[lang]}</p>
                              </div>
                            )}
                          </>
                        )}

                        <button
                          type="button"
                          className="science-read-more-btn"
                          style={MIN_TOUCH_TARGET_STYLE}
                          aria-expanded={isExpanded}
                          onClick={() => toggleCardExpanded(cardKey)}
                        >
                          <span>
                            {isExpanded
                              ? lang === 'es'
                                ? 'Leer menos'
                                : 'Show less'
                              : lang === 'es'
                                ? 'Leer más'
                                : 'Read more'}
                          </span>
                        </button>
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
                      ? 'Escala comparativa de dosimetría (mSv) — NASA RAD y Artemis I'
                      : 'Comparative dosimetry scale (mSv) — NASA RAD & Artemis I'}
                  </span>
                </h3>
                <SourceStamp source="OSDR" live={false} lang={lang} />
              </div>

              <p style={{ margin: 0 }}>
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
                    labelEs: 'Radiografía dental (Tierra)',
                    labelEn: 'Dental X-ray (Earth)',
                    msv: '0.01 mSv',
                    pct: 4,
                    color: 'var(--ok-green, #2E7D4F)',
                  },
                  {
                    labelEs: '1 Sol en Marte en calma (RAD)',
                    labelEn: '1 calm Martian Sol (RAD)',
                    msv: '0.67 mSv',
                    pct: 22,
                    color: 'var(--ok-green, #2E7D4F)',
                  },
                  {
                    labelEs: '1 día en superficie lunar (LND)',
                    labelEn: '1 day on lunar surface (LND)',
                    msv: '1.37 mSv',
                    pct: 36,
                    color: 'var(--nasa-blue, #0B3D91)',
                  },
                  {
                    labelEs: 'Tormenta solar con muro de agua',
                    labelEn: 'Solar storm with water wall',
                    msv: '4.0 mSv (-50%)',
                    pct: 58,
                    color: 'var(--nasa-blue, #0B3D91)',
                  },
                  {
                    labelEs: 'Tormenta SEP sin escudo (Mayo 2024)',
                    labelEn: 'Unshielded SEP storm (May 2024)',
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
                        fontSize: '0.9rem',
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
                    labelEs: 'Todos los estudios OSDR (5)',
                    labelEn: 'All OSDR studies (5)',
                  },
                  {
                    id: 'plants',
                    labelEs: 'Botánica espacial (OSD-379 / Veggie / APH)',
                    labelEn: 'Space botany (OSD-379 / Veggie / APH)',
                  },
                  {
                    id: 'radiation',
                    labelEs: 'Radiación y ADN (BioSentinel / RAD)',
                    labelEn: 'Radiation & DNA (BioSentinel / RAD)',
                  },
                  {
                    id: 'life-support',
                    labelEs: 'Soporte vital (ECLSS 98% / MOXIE)',
                    labelEn: 'Life support (ECLSS 98% / MOXIE)',
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
              {filteredStudies.map((study) => {
                const cardKey = `osdr-${study.id}`;
                const isExpanded = Boolean(expandedCardIds[cardKey]);

                return (
                  <article key={study.id} className="science-library-card">
                    <div className="science-library-card-header">
                      <span>{study.osdrAccession}</span>
                      <span>{study.missionOrFacility}</span>
                    </div>

                    <div className="science-library-card-body">
                      <h4 className="science-library-card-title">
                        {study.title[lang]}
                      </h4>

                      {!isExpanded ? (
                        <div className="science-library-rule-row">
                          <span className="science-library-field-label">
                            {lang === 'es' ? 'HALLAZGO CLAVE' : 'KEY FINDING'}
                          </span>
                          <p style={{ margin: 0 }}>
                            {getFirstSentence(study.keyFinding[lang])}{' '}
                            {getFirstSentence(study.kidExplanation[lang])}
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="science-library-rule-row">
                            <span className="science-library-field-label">
                              {lang === 'es' ? 'INSTRUMENTO' : 'INSTRUMENT'}
                            </span>
                            <p style={{ margin: 0 }}>
                              {study.organismOrInstrument[lang]}
                            </p>
                          </div>

                          <div className="science-library-rule-row">
                            <span className="science-library-field-label">
                              {lang === 'es' ? 'HALLAZGO CLAVE' : 'KEY FINDING'}
                            </span>
                            <p style={{ margin: 0 }}>
                              {study.keyFinding[lang]}
                            </p>
                          </div>

                          <div className="science-library-rule-row">
                            <span className="science-library-field-label">
                              {lang === 'es' ? 'EXPLICACIÓN' : 'EXPLANATION'}
                            </span>
                            <p style={{ margin: 0 }}>
                              {study.kidExplanation[lang]}
                            </p>
                          </div>

                          <div className="science-library-rule-row">
                            <span className="science-library-field-label">
                              {lang === 'es' ? 'EN TU BASE' : 'AT YOUR BASE'}
                            </span>
                            <p style={{ margin: 0, fontWeight: 600 }}>
                              {study.outpostTradeoffConnection[lang]}
                            </p>
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        className="science-read-more-btn"
                        style={MIN_TOUCH_TARGET_STYLE}
                        aria-expanded={isExpanded}
                        onClick={() => toggleCardExpanded(cardKey)}
                      >
                        <span>
                          {isExpanded
                            ? lang === 'es'
                              ? 'Leer menos'
                              : 'Show less'
                            : lang === 'es'
                              ? 'Leer más'
                              : 'Read more'}
                        </span>
                      </button>
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
                );
              })}
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
                        ? 'Archivo fotográfico oficial NASA (images-api.nasa.gov)'
                        : 'Official NASA photographic archive (images-api.nasa.gov)'}
                    </span>
                  </h3>
                  <p style={{ margin: '0.2rem 0 0' }}>
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
                          ? 'Consultar archivo NASA'
                          : 'Query NASA archive'}
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
                      labelEn: 'Sun (SDO flares)',
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
                const cardKey = `photo-${img.nasaId}`;
                const isExpanded = Boolean(expandedCardIds[cardKey]);

                return (
                  <article key={img.nasaId} className="science-photo-card">
                    <div className="science-photo-frame">
                      {!imgFailed ? (
                        <img
                          src={img.imageUrl}
                          alt={descriptiveAlt}
                          loading="lazy"
                          decoding="async"
                          width={480}
                          height={300}
                          className="science-photo-img"
                          onError={() =>
                            setFailedImageIds((prev) => ({
                              ...prev,
                              [img.nasaId]: true,
                            }))
                          }
                        />
                      ) : (
                        <div
                          role="img"
                          aria-label={descriptiveAlt}
                          className="science-photo-fallback"
                        >
                          <p className="science-photo-fallback-title">
                            {img.title[lang]}
                          </p>
                          <p className="science-photo-fallback-credit">
                            {lang === 'es'
                              ? `Crédito: ${img.center} · NASA ID: ${img.nasaId} (${img.dateCreated})`
                              : `Credit: ${img.center} · NASA ID: ${img.nasaId} (${img.dateCreated})`}
                          </p>
                        </div>
                      )}
                      <span className="science-photo-stamp">
                        {img.isLiveApiResult ? 'NASA API' : img.center}
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

                      {!isExpanded ? (
                        <p style={{ margin: 0 }}>
                          {getFirstSentence(img.kidCaption[lang])}{' '}
                          {getFirstSentence(img.scienceConnection[lang])}
                        </p>
                      ) : (
                        <>
                          <p style={{ margin: 0 }}>{img.kidCaption[lang]}</p>
                          <div className="science-library-rule-row">
                            <span className="science-library-field-label">
                              {lang === 'es' ? 'CONEXIÓN NASA' : 'NASA LINK'}
                            </span>
                            <p style={{ margin: 0, fontWeight: 600 }}>
                              {img.scienceConnection[lang]}
                            </p>
                          </div>
                        </>
                      )}

                      <button
                        type="button"
                        className="science-read-more-btn"
                        style={MIN_TOUCH_TARGET_STYLE}
                        aria-expanded={isExpanded}
                        onClick={() => toggleCardExpanded(cardKey)}
                      >
                        <span>
                          {isExpanded
                            ? lang === 'es'
                              ? 'Leer menos'
                              : 'Show less'
                            : lang === 'es'
                              ? 'Leer más'
                              : 'Read more'}
                        </span>
                      </button>
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
                        ? 'Verificación de vuelo del comandante'
                        : 'Commander flight verification'}
                    </span>
                  </h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '1rem' }}>
                    {lang === 'es'
                      ? `${totalQuestions} preguntas basadas en los dilemas reales de ingeniería de la NASA.`
                      : `${totalQuestions} questions drawn from real NASA engineering dilemmas.`}
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
                          ? 'Reiniciar verificación'
                          : 'Reset checklist'}
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
                      labelEs: 'Todas las preguntas (14)',
                      labelEn: 'All questions (14)',
                    },
                    {
                      id: 'moon-shackleton',
                      labelEs: 'Base lunar (Shackleton)',
                      labelEn: 'Lunar base (Shackleton)',
                    },
                    {
                      id: 'mars-jezero',
                      labelEs: 'Base marciana (Jezero)',
                      labelEn: 'Martian base (Jezero)',
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
                      ? 'Certificación completa: Comandante científico jefe de la NASA. Todas las respuestas verificadas.'
                      : 'Certification complete: Chief NASA science commander. All answers verified.'
                    : correctCount >= Math.ceil(totalQuestions * 0.65)
                      ? lang === 'es'
                        ? 'Certificación aprobada: Especialista de misión Artemis y Marte.'
                        : 'Certification passed: Artemis & Mars mission specialist.'
                      : lang === 'es'
                        ? 'Revisión recomendada: Consulta las notas de la NASA bajo cada pregunta y vuelve a intentarlo.'
                        : 'Review recommended: Check the NASA notes below each question and try again.'}
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
                              ? '[VERIFICADO]'
                              : '[VERIFIED]'
                            : lang === 'es'
                              ? '[REVISAR NOTA]'
                              : '[REVIEW NOTE]'}
                        </span>
                      )}
                    </div>

                    <div className="science-library-card-body">
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '1.05rem',
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
                            {lang === 'es' ? 'NOTA NASA' : 'NASA NOTE'}
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

        {/* PESTAÑA E: INSPECTOR DE HARDWARE REAL NASA EN 3D (M03) */}
        {activeTab === 'model-3d' && (
          <div
            id="panel-model-3d"
            role="tabpanel"
            aria-labelledby="tab-model-3d-btn"
            style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
          >
            {(() => {
              const hotspots = HARDWARE_MODEL_HOTSPOTS[selectedHardwareModel];
              const activeSpot =
                hotspots.find((h) => h.id === selectedHotspotId) ?? null;
              const activeFocusPose: ModelFocusPose | null = activeSpot
                ? {
                    target: activeSpot.focusTarget,
                    cameraPos: activeSpot.cameraPos,
                  }
                : null;

              return (
                <>
                  <section className="science-form-box">
                    <div className="science-section-bar">
                      <h3 className="science-section-title">
                        <ShieldIcon size={18} />
                        <span>
                          {lang === 'es'
                            ? 'Inspector CAD de hardware real de la NASA'
                            : 'Real NASA hardware 3D CAD inspector'}
                        </span>
                      </h3>
                      <SourceStamp
                        source={selectedHardwareModel === 'rover-moxie' ? 'MARS' : 'ARTEMIS'}
                        live={false}
                        url={
                          selectedHardwareModel === 'rover-moxie'
                            ? 'https://science.nasa.gov/mission/mars-2020-perseverance/'
                            : 'https://www.nasa.gov/missions/artemis/'
                        }
                        lang={lang}
                      />
                    </div>

                    <div className="science-3d-controls">
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}
                        role="group"
                        aria-label={
                          lang === 'es'
                            ? 'Seleccionar modelo NASA 3D'
                            : 'Select NASA 3D hardware model'
                        }
                      >
                        <button
                          type="button"
                          id="hw-select-rover-moxie"
                          className={`science-annex-btn ${
                            selectedHardwareModel === 'rover-moxie'
                              ? 'science-annex-btn--active'
                              : ''
                          }`}
                          aria-pressed={selectedHardwareModel === 'rover-moxie'}
                          style={MIN_TOUCH_TARGET_STYLE}
                          onClick={() => {
                            missionAudio.playClick();
                            setSelectedHardwareModel('rover-moxie');
                            setSelectedHotspotId(null);
                          }}
                        >
                          {lang === 'es'
                            ? 'Rover Perseverance + MOXIE'
                            : 'Perseverance Rover + MOXIE'}
                        </button>

                        <button
                          type="button"
                          id="hw-select-habitat-shield"
                          className={`science-annex-btn ${
                            selectedHardwareModel === 'habitat-shield'
                              ? 'science-annex-btn--active'
                              : ''
                          }`}
                          aria-pressed={selectedHardwareModel === 'habitat-shield'}
                          style={MIN_TOUCH_TARGET_STYLE}
                          onClick={() => {
                            missionAudio.playClick();
                            setSelectedHardwareModel('habitat-shield');
                            setSelectedHotspotId(null);
                          }}
                        >
                          {lang === 'es'
                            ? 'Hábitat con Blindaje de Regolito'
                            : 'Regolith-Shielded Habitat'}
                        </button>
                      </div>
                    </div>
                  </section>

                  <ModelViewer3D
                    lang={lang}
                    modelId={selectedHardwareModel}
                    options={{
                      siteId:
                        selectedHardwareModel === 'rover-moxie'
                          ? 'mars-jezero'
                          : 'moon-shackleton',
                    }}
                    height={295}
                    focusPose={activeFocusPose}
                  />

                  <div
                    className="science-3d-hotspots"
                    role="group"
                    aria-label={
                      lang === 'es'
                        ? 'Puntos de inspección del modelo 3D'
                        : '3D model inspection hotspots'
                    }
                  >
                    {hotspots.map((spot) => {
                      const isSpotActive = selectedHotspotId === spot.id;
                      return (
                        <button
                          key={spot.id}
                          type="button"
                          id={`hotspot-${spot.id}`}
                          className="science-3d-hotspot-btn"
                          aria-pressed={isSpotActive}
                          onClick={() => {
                            missionAudio.playClick();
                            setSelectedHotspotId(spot.id);
                          }}
                        >
                          <strong>{spot.label[lang]}</strong>
                          <span>{spot.explanation[lang]}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
