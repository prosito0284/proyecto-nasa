/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * C3, C5 & C9 — Mapa visual interactivo del Hábitat Espacial con detalles de módulos
 * y simulador de retraso de señal plegados por defecto, usando iconos SVG de trazo (cero emoji).
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  CoreResources,
  Language,
  OutpostSiteConfig,
  PowerAllocation,
  SpaceWeatherEvent,
} from '../../types/mission';
import type { TurnProjection } from '../../engine/simulationEngine';
import { missionAudio } from '../../utils/sound';
import {
  AlertIcon,
  AntennaIcon,
  ArrowIcon,
  BatteryIcon,
  DropletIcon,
  DustIcon,
  HelmetIcon,
  LanguageIcon,
  LeafIcon,
  ScienceIcon,
  ShieldIcon,
  SlidersIcon,
  SunIcon,
} from '../icons';
import { isWebGLAvailable } from '../Three/ModelViewer3D';
import { ColonyWorld3D } from '../Three/ColonyWorld3D';
import type { ColonyWorldModuleId } from '../Three/proceduralModels';

export interface OutpostMapProps {
  lang: Language;
  site: OutpostSiteConfig;
  currentDay: number;
  resources: CoreResources;
  allocation: PowerAllocation;
  weather: SpaceWeatherEvent;
  projection: TurnProjection;
  onOpenScienceModal?: () => void;
  /** Retraso orbital opcional en segundos (si no se envía, se calcula a partir de site.commDelaySeconds) */
  commDelaySeconds?: number;
  /** T08: Callback opcional para disparar avance del tutorial al interactuar con la colonia */
  onTutorialAction?: (stepId: string) => void;
  /** M02: Modo inicial opcional ('2d' | '3d'); por defecto usa '3d' si WebGL está disponible */
  defaultViewMode?: '2d' | '3d';
  /** M02: Marca si hay alerta ambiental de entrenamiento (ej. caída térmica nocturna) */
  isEnvironmentalAlert?: boolean;
  /** M01: Semilla procedural de topografía */
  terrainSeed?: number;
  /** M01: Permite regenerar topografía en partida libre */
  canRegenerateTerrain?: boolean;
  onRegenerateTerrain?: () => void;
}

type ModuleKey = 'solar' | 'eclss' | 'shielding' | 'greenhouse' | 'rover';

function moduleKeyToWorldId(key: ModuleKey): ColonyWorldModuleId {
  switch (key) {
    case 'solar':
      return 'power-grid';
    case 'greenhouse':
      return 'greenhouse';
    case 'rover':
      return 'rover-moxie';
    case 'eclss':
    case 'shielding':
      return 'oxygen-module';
  }
}

interface RadioMessagePreset {
  id: string;
  label: { es: string; en: string };
  houstonReplyLunar: { es: string; en: string };
  houstonReplyMars: { es: string; en: string };
}

const RADIO_PRESETS: RadioMessagePreset[] = [
  {
    id: 'weather-check',
    label: {
      es: 'Solicitar reporte solar DONKI a Houston',
      en: 'Request DONKI solar forecast from Houston',
    },
    houstonReplyLunar: {
      es: 'HOUSTON (1.3s): "Copiado, Base Artemis. Telemetría DONKI recibida casi al instante. Mantengan el escudo de agua listo si sube el flujo de protones."',
      en: 'HOUSTON (1.3s): "Copy that, Artemis Base. DONKI telemetry received almost instantly. Keep water walls ready if proton flux rises."',
    },
    houstonReplyMars: {
      es: 'HOUSTON (tras ~12 min reales): "Recibido, Jezero. Recuerden que nuestra voz tardó minutos en llegar a la velocidad de la luz. Si ocurre una llamarada solar, activen el refugio sin esperar nuestra orden."',
      en: 'HOUSTON (after ~12 real min): "Copy, Jezero. Remember our voice took minutes to arrive at light speed. If a solar flare hits, trigger the shelter without waiting for us."',
    },
  },
  {
    id: 'medical-dosimetry',
    label: {
      es: 'Enviar lectura de dosímetros RAD / OSDR',
      en: 'Transmit RAD / OSDR dosimeter readings',
    },
    houstonReplyLunar: {
      es: 'Cirujano de vuelo NASA (1.3s): "Datos biomédicos OSDR en rango seguro. Con solo 1.3 segundos de retraso podemos guiarlos en vivo desde la Tierra."',
      en: 'NASA flight surgeon (1.3s): "OSDR biomedical data within safe limits. With only a 1.3-second delay we can guide you live from Earth."',
    },
    houstonReplyMars: {
      es: 'Cirujano de vuelo NASA (tras ~12 min reales): "Lectura RAD recibida. En Marte una consulta tarda hasta 24 minutos en ir y volver. Su autonomía médica a bordo es clave."',
      en: 'NASA flight surgeon (after ~12 real min): "RAD reading received. On Mars a query takes up to 24 minutes round-trip. Onboard medical autonomy is essential."',
    },
  },
  {
    id: 'greenhouse-status',
    label: {
      es: 'Reportar humedad del invernadero Veggie',
      en: 'Report Veggie greenhouse humidity',
    },
    houstonReplyLunar: {
      es: 'Botánica NASA Kennedy (1.3s): "Humedad nominal en las cámaras Veggie. Reciclar el agua en el ECLSS mantiene vivo el cultivo sin gastar reservas."',
      en: 'NASA Kennedy botany (1.3s): "Nominal humidity in Veggie chambers. Recycling water in the ECLSS keeps crops thriving without draining reserves."',
    },
    houstonReplyMars: {
      es: 'Botánica NASA Kennedy (tras ~12 min reales): "Telemetría Veggie confirmada. Si una tormenta de polvo oscurece el Cráter Jezero, equilibren las lámparas LED con el generador MOXIE."',
      en: 'NASA Kennedy botany (after ~12 real min): "Veggie telemetry confirmed. If a dust storm darkens Jezero Crater, balance LED grow lamps with the MOXIE generator."',
    },
  },
];

export function cancelCommIntervalRef(
  ref: { current: ReturnType<typeof setInterval> | null },
  cancelFn: (id: ReturnType<typeof setInterval>) => void = clearInterval,
): boolean {
  if (ref.current === null) return false;
  cancelFn(ref.current);
  ref.current = null;
  return true;
}

export const OutpostMap: React.FC<OutpostMapProps> = ({
  lang,
  site,
  currentDay,
  resources,
  allocation,
  weather,
  projection,
  onOpenScienceModal,
  commDelaySeconds,
  onTutorialAction,
  defaultViewMode,
  isEnvironmentalAlert = false,
  terrainSeed,
  canRegenerateTerrain = true,
  onRegenerateTerrain,
}) => {
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('shielding');
  const [selectedWorldModule, setSelectedWorldModule] =
    useState<ColonyWorldModuleId>('oxygen-module');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>(
    () => defaultViewMode ?? (isWebGLAvailable() ? '3d' : '2d'),
  );
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [showCommSimulator, setShowCommSimulator] = useState(false);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [commState, setCommState] = useState<'idle' | 'transmitting' | 'received'>('idle');
  const [commProgress, setCommProgress] = useState(0);
  const commIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCommInterval = () => {
    cancelCommIntervalRef(commIntervalRef);
  };

  const isLunar = site.id === 'moon-shackleton';
  const isSolarStorm =
    weather.type === 'FLR' || weather.type === 'SEP' || weather.type === 'CME';
  const isDustStorm = weather.type === 'DUST_STORM';
  const isRimShadowPass = weather.id === 'MOON-RIM-SHADOW-PASS';
  const isLowPowerBlackout = resources.power < 15;
  const isGreenhouseWilted = resources.food < 25;

  const realDelaySec =
    commDelaySeconds ??
    (isLunar
      ? site.commDelaySeconds
      : Math.round(site.commDelaySeconds + Math.sin(currentDay * 0.7) * 120));
  const realDelayMin = (realDelaySec / 60).toFixed(1);

  useEffect(() => {
    clearCommInterval();
    setCommState('idle');
    setCommProgress(0);
    return () => {
      clearCommInterval();
    };
  }, [site.id, currentDay]);

  const handleTestComms = () => {
    if (commState === 'transmitting' || commIntervalRef.current !== null) return;
    missionAudio.playCommPing(true);
    setCommState('transmitting');
    setCommProgress(0);
    onTutorialAction?.('step-outpost-map');

    const totalSimMs = isLunar ? 1300 : 3600;
    const stepMs = 60;
    let elapsed = 0;

    clearCommInterval();
    commIntervalRef.current = setInterval(() => {
      elapsed += stepMs;
      const pct = Math.min(100, Math.round((elapsed / totalSimMs) * 100));
      setCommProgress(pct);
      if (elapsed >= totalSimMs) {
        clearCommInterval();
        missionAudio.playCommPing(false);
        setCommState('received');
      }
    }, stepMs);
  };

  const handleSelectModuleFromSvg = (mod: 'solar' | 'eclss' | 'shielding' | 'greenhouse') => {
    missionAudio.playClick();
    setSelectedModule(mod);
    setSelectedWorldModule(moduleKeyToWorldId(mod));
    setShowSystemDetails(true);
    onTutorialAction?.('step-outpost-map');
    onTutorialAction?.(moduleKeyToWorldId(mod));
  };

  const handleSelect3DModule = (mod: ColonyWorldModuleId) => {
    missionAudio.playClick();
    setSelectedWorldModule(mod);
    if (mod === 'comms-array') {
      setShowCommSimulator(true);
      handleTestComms();
    } else {
      const nextKey: ModuleKey =
        mod === 'power-grid'
          ? 'solar'
          : mod === 'greenhouse'
            ? 'greenhouse'
            : mod === 'rover-moxie'
              ? 'rover'
              : allocation.shieldingAlloc >= 35 || isSolarStorm || isEnvironmentalAlert
                ? 'shielding'
                : 'eclss';
      setSelectedModule(nextKey);
      setShowSystemDetails(true);
    }
    onTutorialAction?.('step-outpost-map');
    onTutorialAction?.(mod);
  };

  const handleSvgKeyDown = (
    e: React.KeyboardEvent,
    mod: 'solar' | 'eclss' | 'shielding' | 'greenhouse',
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectModuleFromSvg(mod);
    }
  };

  const formatDelta = (val: number, suffix = '%') => {
    const sign = val > 0 ? '+' : '';
    return `${sign}${val}${suffix}`;
  };

  const moduleDetails: Record<
    ModuleKey,
    {
      icon: React.ReactNode;
      title: { es: string; en: string };
      allocLabel: string;
      statusText: { es: string; en: string };
      nasaEngineeringNote: { es: string; en: string };
      deltaLabel: string;
      isPositive: boolean;
    }
  > = {
    solar: {
      icon: <SunIcon size={18} />,
      title: {
        es: 'Granja Solar y Banco de Baterías',
        en: 'Solar Array & Battery Bank',
      },
      allocLabel: `${Math.round(weather.solarEfficiencyMultiplier * 100)}% Sol`,
      statusText: {
        es: `Batería: ${resources.power}% | Generación solar hoy: +${projection.solarGain}% | Carga total: ${projection.load}%`,
        en: `Battery: ${resources.power}% | Solar gain today: +${projection.solarGain}% | Grid load: ${projection.load}%`,
      },
      nasaEngineeringNote: {
        es: isLunar
          ? 'En el borde del Cráter Shackleton, las torres solares verticales captan la luz rasante del Polo Sur Lunar casi todo el año.'
          : 'En el Cráter Jezero, el polvo fino marciano se pega por electricidad estática a los paneles solares reduciendo los watts disponibles.',
        en: isLunar
          ? 'Along Shackleton Crater’s rim, vertical solar towers catch low-angle Lunar South Pole sunlight nearly year-round.'
          : 'In Jezero Crater, fine Martian dust clings electrostatically to solar panels, cutting available wattage.',
      },
      deltaLabel: `${formatDelta(projection.delta.power)} / ${site.dayName[lang]}`,
      isPositive: projection.delta.power >= 0,
    },
    eclss: {
      icon: <DropletIcon size={18} />,
      title: {
        es: isLunar ? 'Domo ECLSS (Oxígeno y Agua)' : 'Domo ECLSS + Reactor MOXIE (O₂)',
        en: isLunar ? 'ECLSS Dome (Oxygen & Water)' : 'ECLSS Dome + MOXIE Reactor (O₂)',
      },
      allocLabel: `${allocation.lifeSupportAlloc}% Watts`,
      statusText: {
        es: `Soporte Vital: ${resources.lifeSupport}% | Cambio proyectado por energía: ${formatDelta(projection.delta.lifeSupport)}`,
        en: `Life Support: ${resources.lifeSupport}% | Projected change from power: ${formatDelta(projection.delta.lifeSupport)}`,
      },
      nasaEngineeringNote: {
        es: isLunar
          ? 'El sistema ECLSS de la NASA recicla el 98% del agua de los astronautas y divide moléculas de H₂O con electricidad (electrólisis) para crear oxígeno respirable.'
          : 'El experimento MOXIE de la NASA en el rover Perseverance demostró que se puede extraer oxígeno directamente del aire de CO₂ de Marte, exigiendo alta potencia.',
        en: isLunar
          ? 'NASA’s ECLSS recycles 98% of astronaut water and splits H₂O molecules with electricity (electrolysis) into breathable oxygen.'
          : 'NASA’s MOXIE experiment on Perseverance proved we can extract breathable oxygen right out of Mars’s CO₂ atmosphere at a high power cost.',
      },
      deltaLabel: `${formatDelta(projection.delta.lifeSupport)} / ${site.dayName[lang]}`,
      isPositive: projection.delta.lifeSupport >= 0,
    },
    shielding: {
      icon: <ShieldIcon size={18} />,
      title: {
        es: 'Refugio de Agua y Blindaje Anti-Radiación',
        en: 'Water-Wall Shelter & Radiation Shielding',
      },
      allocLabel: `${allocation.shieldingAlloc}% Watts`,
      statusText: {
        es: `Blindaje efectivo: ${projection.effectiveShielding}% | Dosis acumulada: ${resources.radiationDoseMsv} mSv (+${projection.delta.radiationDoseMsv} mSv hoy)`,
        en: `Effective shielding: ${projection.effectiveShielding}% | Cumulative dose: ${resources.radiationDoseMsv} mSv (+${projection.delta.radiationDoseMsv} mSv today)`,
      },
      nasaEngineeringNote: {
        es: 'Los átomos de hidrógeno en el agua potable y en los sacos de regolito frenan las partículas energéticas solares (DONKI SEP) mejor que el metal pesado.',
        en: 'Hydrogen atoms in drinking water walls and regolith bags stop solar energetic particles (DONKI SEP) more effectively than heavy metal.',
      },
      deltaLabel: `${formatDelta(projection.delta.shielding)} (${projection.effectiveShielding}% eff)`,
      isPositive: projection.effectiveShielding >= 60,
    },
    greenhouse: {
      icon: <LeafIcon size={18} />,
      title: {
        es: 'Invernadero Hidropónico Veggie y Rover',
        en: 'Veggie Hydroponic Greenhouse & Rover',
      },
      allocLabel: `${allocation.greenhouseAlloc}% Watts`,
      statusText: {
        es: `Comida: ${resources.food}% (${formatDelta(projection.delta.food)}) | Ciencia hoy: +${projection.delta.sciencePoints} pts`,
        en: `Food: ${resources.food}% (${formatDelta(projection.delta.food)}) | Science today: +${projection.delta.sciencePoints} pts`,
      },
      nasaEngineeringNote: {
        es: 'Basado en los experimentos Veggie y APH del repositorio NASA OSDR: las luces LED rojas y azules permiten cultivar lechugas, rábanos y chiles en el espacio.',
        en: 'Grounded in NASA OSDR Veggie and APH studies: red and blue LED arrays grow fresh lettuce, radishes, and peppers in space.',
      },
      deltaLabel: `${formatDelta(projection.delta.food)} / +${projection.delta.sciencePoints} PTS`,
      isPositive: projection.delta.food >= 0,
    },
    rover: {
      icon: <ScienceIcon size={18} />,
      title: {
        es: isLunar ? 'Rover de Prospección Artemis' : 'Rover Perseverance + Unidad MOXIE',
        en: isLunar ? 'Artemis Regolith Prospecting Rover' : 'Perseverance Rover + MOXIE Unit',
      },
      allocLabel: `${allocation.scienceAndCommsAlloc}% Watts`,
      statusText: {
        es: isLowPowerBlackout
          ? 'Rover en reposo (Energía crítica < 15%)'
          : isLunar
            ? `Exploración lunar activa | Ciencia hoy: +${projection.delta.sciencePoints} pts`
            : `MOXIE sintetizando O₂ | Ciencia hoy: +${projection.delta.sciencePoints} pts`,
        en: isLowPowerBlackout
          ? 'Rover parked (Critical power < 15%)'
          : isLunar
            ? `Lunar survey active | Science today: +${projection.delta.sciencePoints} pts`
            : `MOXIE producing O₂ | Science today: +${projection.delta.sciencePoints} pts`,
      },
      nasaEngineeringNote: {
        es: isLunar
          ? 'Los rovers autónomos inspeccionan hielo de agua en cráteres en sombra permanente del Polo Sur lunar y alimentan experimentos científicos.'
          : 'En Perseverance, MOXIE produjo 122 g de oxígeno en Marte rompiendo moléculas de CO₂ con electrólisis cerámica de óxido sólido.',
        en: isLunar
          ? 'Autonomous rovers prospect water ice inside permanently shadowed Lunar South Pole craters and power science payloads.'
          : 'On Perseverance, MOXIE generated 122 g of Mars oxygen by splitting CO₂ molecules via solid-oxide electrolysis.',
      },
      deltaLabel: `+${projection.delta.sciencePoints} PTS`,
      isPositive: !isLowPowerBlackout,
    },
  };

  const activeDetail = moduleDetails[selectedModule];
  const currentPreset = RADIO_PRESETS[selectedPresetIdx];

  return (
    <section
      className="outpost-stage"
      data-tutorial-id="outpost-map"
      aria-label="Outpost Interactive Schematic"
    >
      <div className={`surface-canvas ${isLunar ? 'surface-lunar' : 'surface-mars'}`}>
        {/* Cabecera del Mapa Planetario + Clima de Hoy */}
        <div className="surface-header">
          <div>
            <div className="coord-row">
              <span className="coord-pill">{site.coordinates}</span>
              <span className="gravity-pill">
                <LanguageIcon size={13} /> {site.gravityG}g | {site.avgTempCelsius}
              </span>
            </div>
            <h3>{site.name[lang]}</h3>
            <p className="surface-subtitle">{site.nasaMissionReference[lang]}</p>
          </div>

          <div className="surface-header-actions">
            <div
              className="view-mode-switch"
              role="group"
              aria-label={lang === 'es' ? 'Modo de vista de la colonia' : 'Colony view mode'}
            >
              <button
                type="button"
                id="outpost-view-2d-btn"
                className="view-mode-btn"
                aria-pressed={viewMode === '2d'}
                onClick={() => {
                  missionAudio.playClick();
                  setViewMode('2d');
                }}
              >
                {lang === 'es' ? 'VISTA 2D' : '2D VIEW'}
              </button>
              <button
                type="button"
                id="outpost-view-3d-btn"
                className="view-mode-btn"
                aria-pressed={viewMode === '3d'}
                onClick={() => {
                  missionAudio.playClick();
                  setViewMode('3d');
                }}
              >
                {lang === 'es' ? 'VISTA 3D' : '3D VIEW'}
              </button>
            </div>

            <button
              type="button"
              className={`weather-pill severity-${weather.severity}`}
              aria-live="polite"
              onClick={() => {
                missionAudio.playClick();
                onOpenScienceModal?.();
              }}
              title={
                lang === 'es'
                  ? 'Haz clic para ver la telemetría científica NASA DONKI'
                  : 'Click to inspect NASA DONKI science telemetry'
              }
            >
              <span className="weather-icon" aria-hidden="true">
                {isSolarStorm ? (
                  <AlertIcon size={20} />
                ) : isDustStorm ? (
                  <DustIcon size={20} />
                ) : (
                  <SunIcon size={20} />
                )}
              </span>
              <div>
                <strong>{weather.classOrIntensity}</strong>
                <small>
                  {weather.isLiveNasaData
                    ? lang === 'es'
                      ? 'DONKI EN VIVO'
                      : 'DONKI LIVE'
                    : lang === 'es'
                      ? 'ARCHIVO DONKI'
                      : 'DONKI ARCHIVE'}
                </small>
              </div>
            </button>
          </div>
        </div>

        {/* C5: Indicadores visuales de estado activo en el mapa */}
        {(isDustStorm || isRimShadowPass || isLowPowerBlackout || isGreenhouseWilted) && (
          <div className="outpost-state-badges" role="status" aria-live="polite">
            {isDustStorm && (
              <span className="state-alert-chip state-chip-dust">
                <DustIcon size={14} />{' '}
                {lang === 'es' ? 'Velo de Polvo Marciano Activo' : 'Martian Dust Veil Active'}
              </span>
            )}
            {isRimShadowPass && (
              <span className="state-alert-chip state-chip-shadow">
                <SunIcon size={14} />{' '}
                {lang === 'es'
                  ? 'Sombra del Cráter Cubriendo Paneles'
                  : 'Crater Rim Shadow Over Solar Panels'}
              </span>
            )}
            {isLowPowerBlackout && (
              <span className="state-alert-chip state-chip-blackout">
                <BatteryIcon size={14} />{' '}
                {lang === 'es'
                  ? 'Luces del Hábitat Apagadas (Energía < 15%)'
                  : 'Habitat Lights Off (Power < 15%)'}
              </span>
            )}
            {isGreenhouseWilted && (
              <span className="state-alert-chip state-chip-wilted">
                <LeafIcon size={14} />{' '}
                {lang === 'es'
                  ? 'Invernadero Marchito (Comida < 25%)'
                  : 'Greenhouse Wilted (Food < 25%)'}
              </span>
            )}
          </div>
        )}

        {/* M02: Mundo 3D interactivo de horizonte infinito por defecto + acceso rápido a módulos */}
        {viewMode === '3d' ? (
          <div className="outpost-3d-stage" data-testid="outpost-3d-stage">
            <ColonyWorld3D
              lang={lang}
              height={308}
              selectedModule={selectedWorldModule}
              onSelectModule={handleSelect3DModule}
              terrainSeed={terrainSeed}
              canRegenerateTerrain={canRegenerateTerrain}
              onRegenerateTerrain={onRegenerateTerrain}
              options={{
                siteId: site.id,
                terrainSeed,
                currentDay,
                totalDays: site.totalMissionDays,
                sciencePoints: resources.sciencePoints,
                powerPercent: resources.power,
                lifeSupportPercent: resources.lifeSupport,
                shieldingPercent: projection.effectiveShielding,
                foodPercent: resources.food,
                solarAllocPercent: Math.min(
                  100,
                  Math.round(
                    (allocation.greenhouseAlloc + allocation.scienceAndCommsAlloc * 0.5) *
                      weather.solarEfficiencyMultiplier +
                      resources.power * 0.3,
                  ),
                ),
                lifeSupportAllocPercent: allocation.lifeSupportAlloc,
                shieldingAllocPercent: allocation.shieldingAlloc,
                greenhouseAllocPercent: allocation.greenhouseAlloc,
                scienceAllocPercent: allocation.scienceAndCommsAlloc,
                weatherType: weather.type,
                isDustStorm,
                isSolarStorm,
                isRimShadowPass,
                isLowPowerBlackout,
                isGreenhouseWilted,
                isEnvironmentalAlert,
                commsActive: commState === 'transmitting',
                commDelaySeconds: realDelaySec,
              }}
            />

            <div
              className="colony-3d-module-bar"
              role="group"
              aria-label={
                lang === 'es'
                  ? 'Inspección rápida de módulos 3D'
                  : 'Quick 3D module selector'
              }
            >
              {(
                [
                  {
                    id: 'power-grid',
                    icon: <SunIcon size={15} />,
                    es: 'Paneles Solares',
                    en: 'Solar Array',
                  },
                  {
                    id: 'oxygen-module',
                    icon: <ShieldIcon size={15} />,
                    es: 'Hábitat ECLSS',
                    en: 'Habitat ECLSS',
                  },
                  {
                    id: 'greenhouse',
                    icon: <LeafIcon size={15} />,
                    es: 'Invernadero',
                    en: 'Greenhouse',
                  },
                  {
                    id: 'comms-array',
                    icon: <AntennaIcon size={15} />,
                    es: 'Antena',
                    en: 'Antenna',
                  },
                  {
                    id: 'rover-moxie',
                    icon: <ScienceIcon size={15} />,
                    es: 'Rover MOXIE',
                    en: 'Rover MOXIE',
                  },
                ] as Array<{
                  id: ColonyWorldModuleId;
                  icon: React.ReactNode;
                  es: string;
                  en: string;
                }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  id={`colony-3d-btn-${item.id}`}
                  className="colony-3d-module-btn"
                  aria-pressed={selectedWorldModule === item.id}
                  onClick={() => handleSelect3DModule(item.id)}
                >
                  {item.icon}
                  <span>{item[lang]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
        <div
          className={`svg-outpost-wrapper ${isLunar ? 'svg-env-lunar' : 'svg-env-mars'} ${
            isDustStorm ? 'svg-env-dust-storm' : ''
          } ${isLowPowerBlackout ? 'svg-env-blackout' : ''}`}
        >
          {(() => {
            // Dos tintas técnicas por sitio: gris-azul lunar vs óxido marciano
            const skyBg = isLunar ? '#0C1828' : '#24110B';
            const terrainMid = isLunar ? '#15273E' : '#3A1B11';
            const terrainFg = isLunar ? '#1E3552' : '#4E2417';
            const inkPrimary = isLunar ? '#B8D8F8' : '#F4C39B';
            const inkSecondary = isLunar ? '#6794C1' : '#C87D52';
            const gridStroke = isLunar
              ? 'rgba(184, 216, 248, 0.12)'
              : 'rgba(244, 195, 155, 0.12)';
            const calloutStroke = isLunar ? '#93C5FD' : '#FDBA74';

            return (
              <svg
                viewBox="0 0 860 280"
                className="outpost-svg"
                role="img"
                aria-label={
                  isLunar
                    ? 'Technical blueprint diagram of Artemis Lunar South Pole Outpost'
                    : 'Technical blueprint diagram of Martian Jezero Crater Outpost'
                }
              >
                {/* 1. Fondo Técnico Plano a Dos Tintas */}
                <rect x="0" y="0" width="860" height="280" fill={skyBg} />

                {/* 2. Retícula de Plano de Ingeniería (Blueprint Grid) */}
                <g stroke={gridStroke} strokeWidth="1" pointerEvents="none">
                  <line x1="0" y1="56" x2="860" y2="56" />
                  <line x1="0" y1="112" x2="860" y2="112" />
                  <line x1="0" y1="168" x2="860" y2="168" />
                  <line x1="0" y1="224" x2="860" y2="224" />
                  <line x1="120" y1="0" x2="120" y2="280" />
                  <line x1="260" y1="0" x2="260" y2="280" />
                  <line x1="415" y1="0" x2="415" y2="280" />
                  <line x1="575" y1="0" x2="575" y2="280" />
                  <line x1="725" y1="0" x2="725" y2="280" />
                </g>

                {/* Marcas de registro técnico (+) y cartela de plano */}
                <g
                  stroke={inkSecondary}
                  strokeWidth="1"
                  opacity="0.7"
                  pointerEvents="none"
                >
                  <path d="M12 16h8M16 12v8M840 16h8M844 12v8M12 264h8M16 260v8M840 264h8M844 260v8" />
                </g>
                <text
                  x="28"
                  y="19"
                  fill={inkSecondary}
                  fontSize="9.5"
                  fontFamily="IBM Plex Mono, monospace"
                  letterSpacing="0.8"
                >
                  {isLunar
                    ? `DWG // ARTEMIS-SHACKLETON-89.9S — DAY ${currentDay}`
                    : `DWG // MARS-JEZERO-18.3N — SOL ${currentDay}`}
                </text>

                {/* Estrellas de referencia astrométrica */}
                <g fill={inkPrimary} opacity={isDustStorm ? 0.1 : isLunar ? 0.85 : 0.4}>
                  <circle cx="150" cy="30" r="1.3" />
                  <circle cx="220" cy="18" r="1.1" />
                  <circle cx="320" cy="24" r="1.4" />
                  <circle cx="490" cy="20" r="1.2" />
                  <circle cx="610" cy="28" r="1.3" />
                  <circle cx="685" cy="16" r="1.1" />
                </g>

                {/* 3. Astro en el Cielo: Tierra (Luna) vs Fobos y Deimos (Marte) */}
                {isLunar ? (
                  <g transform="translate(772, 48)">
                    <circle
                      cx="0"
                      cy="0"
                      r="18"
                      fill={terrainMid}
                      stroke={inkPrimary}
                      strokeWidth="1.6"
                    />
                    <path
                      d="M-8,-6 L2,-10 L9,-2 L4,9 L-7,6 Z"
                      fill="none"
                      stroke={inkPrimary}
                      strokeWidth="1.2"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r="22"
                      fill="none"
                      stroke={inkSecondary}
                      strokeWidth="1"
                      strokeDasharray="3 2"
                    />
                    <text
                      x="0"
                      y="33"
                      textAnchor="middle"
                      fill={inkPrimary}
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      TERRA // 1.3s
                    </text>
                  </g>
                ) : (
                  <g transform="translate(765, 48)">
                    <ellipse
                      cx="-14"
                      cy="-2"
                      rx="9"
                      ry="6.5"
                      fill={terrainMid}
                      stroke={inkPrimary}
                      strokeWidth="1.5"
                    />
                    <circle cx="-17" cy="-3" r="1.8" fill={inkPrimary} />
                    <circle
                      cx="14"
                      cy="7"
                      r="4.5"
                      fill={terrainMid}
                      stroke={inkPrimary}
                      strokeWidth="1.3"
                    />
                    <text
                      x="0"
                      y="28"
                      textAnchor="middle"
                      fill={inkPrimary}
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      PHOBOS / DEIMOS
                    </text>
                  </g>
                )}

                {/* 4. Vector Solar y Clima Espacial DONKI */}
                <g
                  transform="translate(64, 54)"
                  opacity={isRimShadowPass ? 0.45 : isDustStorm ? 0.55 : 1}
                >
                  <circle
                    cx="0"
                    cy="0"
                    r={isSolarStorm ? 20 : 15}
                    fill={isSolarStorm ? '#FC3D21' : terrainMid}
                    stroke={isSolarStorm ? '#FC3D21' : inkPrimary}
                    strokeWidth="1.8"
                  />
                  <circle
                    cx="0"
                    cy="0"
                    r={isSolarStorm ? 28 : 21}
                    fill="none"
                    stroke={isSolarStorm ? '#FC3D21' : inkSecondary}
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                  />
                  <text
                    x="0"
                    y="39"
                    textAnchor="middle"
                    fill={isSolarStorm ? '#FC3D21' : inkPrimary}
                    fontSize="9.5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                  >
                    {isRimShadowPass
                      ? 'LOW HORIZON SUN'
                      : weather.type === 'NOMINAL'
                        ? 'SOL // NOMINAL'
                        : `DONKI // ${weather.type}`}
                  </text>
                </g>

                {/* Vectores de radiación solar durante tormenta DONKI (FLR / SEP / CME) */}
                {isSolarStorm && (
                  <g
                    stroke="#FC3D21"
                    strokeWidth="1.6"
                    strokeDasharray="7 5"
                    opacity="0.9"
                    pointerEvents="none"
                  >
                    <line x1="94" y1="62" x2="365" y2="142" className="solar-ray-anim" />
                    <line x1="88" y1="76" x2="345" y2="172" className="solar-ray-anim" />
                    <line x1="100" y1="48" x2="435" y2="122" className="solar-ray-anim" />
                  </g>
                )}

                {/* 5. Relieve Planetario (Cráter Shackleton Lunar vs Mesetas del Delta Jezero) */}
                {isLunar ? (
                  <path
                    d="M0,186 L88,124 L185,172 L310,128 L455,174 L615,132 L750,168 L860,152 L860,280 L0,280 Z"
                    fill={terrainMid}
                    stroke={inkSecondary}
                    strokeWidth="1.4"
                  />
                ) : (
                  <path
                    d="M0,180 L95,146 L215,146 L265,172 L395,138 L515,138 L575,169 L710,142 L860,166 L860,280 L0,280 Z"
                    fill={terrainMid}
                    stroke={inkSecondary}
                    strokeWidth="1.4"
                  />
                )}

                {/* Plano de suelo de ingeniería y cota de nivel */}
                <path
                  d="M0,198 L860,198 L860,280 L0,280 Z"
                  fill={terrainFg}
                  stroke={inkPrimary}
                  strokeWidth="1.5"
                />
                {/* Achurado técnico del subsuelo (regolito) */}
                <g stroke={gridStroke} strokeWidth="1" pointerEvents="none">
                  <line x1="40" y1="198" x2="10" y2="280" />
                  <line x1="140" y1="198" x2="110" y2="280" />
                  <line x1="240" y1="198" x2="210" y2="280" />
                  <line x1="340" y1="198" x2="310" y2="280" />
                  <line x1="440" y1="198" x2="410" y2="280" />
                  <line x1="540" y1="198" x2="510" y2="280" />
                  <line x1="640" y1="198" x2="610" y2="280" />
                  <line x1="740" y1="198" x2="710" y2="280" />
                  <line x1="840" y1="198" x2="810" y2="280" />
                </g>

                {/* 6. Depósito ISRU: Trampa Fría de Hielo Shackleton (Luna) vs Sedimentos Delta Jezero (Marte) */}
                {isLunar ? (
                  <g transform="translate(755, 224)">
                    <rect
                      x="-64"
                      y="-10"
                      width="128"
                      height="22"
                      fill={skyBg}
                      stroke={inkPrimary}
                      strokeWidth="1.5"
                    />
                    <path
                      d="M-48,8 L-30,-4 L-12,8 L8,-5 L28,8 L46,-3"
                      fill="none"
                      stroke={inkPrimary}
                      strokeWidth="1.5"
                    />
                    {/* Rótulo con línea guía */}
                    <polyline
                      points="0,-10 12,-24 62,-24"
                      fill="none"
                      stroke={calloutStroke}
                      strokeWidth="1.2"
                    />
                    <circle cx="0" cy="-10" r="2.2" fill={calloutStroke} />
                    <text
                      x="0"
                      y="25"
                      textAnchor="middle"
                      fill={inkPrimary}
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      ISRU // H2O ICE TRAP
                    </text>
                  </g>
                ) : (
                  <g transform="translate(755, 224)">
                    <rect
                      x="-64"
                      y="-10"
                      width="128"
                      height="22"
                      fill={skyBg}
                      stroke={inkPrimary}
                      strokeWidth="1.5"
                    />
                    <path
                      d="M-50,-2 H50 M-42,4 H42"
                      stroke={inkPrimary}
                      strokeWidth="1.3"
                      strokeDasharray="6 3"
                    />
                    <circle cx="0" cy="-10" r="2.2" fill={calloutStroke} />
                    <text
                      x="0"
                      y="25"
                      textAnchor="middle"
                      fill={inkPrimary}
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                    >
                      ISRU // JEZERO DELTA
                    </text>
                  </g>
                )}

                {/* 7. MÓDULO 1: Granja Solar y Banco de Baterías (con línea guía de plano) */}
                <g
                  transform="translate(142, 146)"
                  className={`svg-module-node ${
                    selectedModule === 'solar' ? 'svg-node-selected' : ''
                  }`}
                  onClick={() => handleSelectModuleFromSvg('solar')}
                  onKeyDown={(e) => handleSvgKeyDown(e, 'solar')}
                  tabIndex={0}
                  role="button"
                  aria-label={
                    lang === 'es'
                      ? `Granja Solar y Baterías: ${resources.power}% de energía`
                      : `Solar Array and Batteries: ${resources.power}% power`
                  }
                >
                  {/* Rótulo Técnico con Línea Guía: SOLAR ARRAY */}
                  <polyline
                    points="-27,0 -42,-26 58,-26"
                    fill="none"
                    stroke={calloutStroke}
                    strokeWidth="1.2"
                  />
                  <circle cx="-27" cy="0" r="2.5" fill={calloutStroke} />
                  <text
                    x="-38"
                    y="-31"
                    fill={inkPrimary}
                    fontSize="9.5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                  >
                    ARRAY 01 — SOLAR PV
                  </text>

                  {/* Panel izquierdo */}
                  <rect
                    x="-48"
                    y="0"
                    width="42"
                    height="52"
                    fill={isRimShadowPass ? '#070E17' : isDustStorm ? '#4E2417' : terrainMid}
                    stroke={inkPrimary}
                    strokeWidth="1.8"
                  />
                  <line
                    x1="-27"
                    y1="0"
                    x2="-27"
                    y2="52"
                    stroke={inkSecondary}
                    strokeWidth="1"
                  />
                  <line
                    x1="-48"
                    y1="17"
                    x2="-6"
                    y2="17"
                    stroke={inkSecondary}
                    strokeWidth="1"
                  />
                  <line
                    x1="-48"
                    y1="34"
                    x2="-6"
                    y2="34"
                    stroke={inkSecondary}
                    strokeWidth="1"
                  />

                  {/* Panel derecho */}
                  <rect
                    x="6"
                    y="0"
                    width="42"
                    height="52"
                    fill={isRimShadowPass ? '#070E17' : isDustStorm ? '#4E2417' : terrainMid}
                    stroke={inkPrimary}
                    strokeWidth="1.8"
                  />
                  <line x1="27" y1="0" x2="27" y2="52" stroke={inkSecondary} strokeWidth="1" />
                  <line x1="6" y1="17" x2="48" y2="17" stroke={inkSecondary} strokeWidth="1" />
                  <line x1="6" y1="34" x2="48" y2="34" stroke={inkSecondary} strokeWidth="1" />

                  {/* C5: Sombra proyectada sobre los paneles cuando weather.id === 'MOON-RIM-SHADOW-PASS' */}
                  {isRimShadowPass && (
                    <g pointerEvents="none">
                      <polygon
                        points="-58,-12 58,-2 54,54 -58,54"
                        fill="rgba(5, 10, 20, 0.76)"
                        stroke="#FC3D21"
                        strokeDasharray="4 3"
                        strokeWidth="1.5"
                      />
                      <text
                        x="0"
                        y="-14"
                        textAnchor="middle"
                        fill="#FC3D21"
                        fontSize="9.5"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="bold"
                      >
                        {lang === 'es' ? 'SOMBRA DEL CRÁTER' : 'CRATER RIM SHADOW'}
                      </text>
                    </g>
                  )}

                  {/* Banco de baterías */}
                  <rect
                    x="-36"
                    y="54"
                    width="72"
                    height="18"
                    fill={skyBg}
                    stroke={inkPrimary}
                    strokeWidth="1.6"
                  />
                  <rect
                    x="-32"
                    y="58"
                    width={Math.max(4, Math.round((resources.power / 100) * 64))}
                    height="10"
                    fill={
                      resources.power >= 30
                        ? '#2E7D4F'
                        : resources.power >= 15
                          ? inkPrimary
                          : '#FC3D21'
                    }
                  />
                  <text
                    x="0"
                    y="88"
                    textAnchor="middle"
                    fill={inkPrimary}
                    fontSize="10.5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                  >
                    BATT // {resources.power}% kWh
                  </text>
                </g>

                {/* 8. Antena de Espacio Profundo DSN (con línea guía) */}
                <g transform="translate(274, 156)">
                  <line x1="0" y1="42" x2="0" y2="12" stroke={inkPrimary} strokeWidth="2.2" />
                  <line x1="-10" y1="42" x2="10" y2="42" stroke={inkPrimary} strokeWidth="2" />
                  <path
                    d="M-16,4 Q0,22 16,4"
                    fill="none"
                    stroke={inkPrimary}
                    strokeWidth="2"
                  />
                  <circle
                    cx="0"
                    cy="2"
                    r="3.2"
                    fill={commState === 'transmitting' ? '#2E7D4F' : '#FC3D21'}
                  />
                  <polyline
                    points="0,2 -14,-18 -64,-18"
                    fill="none"
                    stroke={calloutStroke}
                    strokeWidth="1"
                  />
                  <text
                    x="-64"
                    y="-22"
                    fill={inkSecondary}
                    fontSize="8.5"
                    fontFamily="IBM Plex Mono, monospace"
                  >
                    DSN RELAY
                  </text>
                </g>

                {/* 9. MÓDULO 2 y 3: Domo Hábitat ECLSS/MOXIE + Escudo de Agua Anti-Radiación */}
                <g transform="translate(415, 162)">
                  {/* Rótulo con línea guía para el Escudo de Agua */}
                  <polyline
                    points="-68,-38 -92,-64 18,-64"
                    fill="none"
                    stroke={calloutStroke}
                    strokeWidth="1.2"
                  />
                  <circle cx="-68" cy="-38" r="2.5" fill={calloutStroke} />
                  <text
                    x="-90"
                    y="-69"
                    fill={inkPrimary}
                    fontSize="9.5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                  >
                    SHIELD 02 — H2O WALL ({projection.effectiveShielding}%)
                  </text>

                  {/* Arco exterior de blindaje contra radiación */}
                  <path
                    d="M-104,36 A108,92 0 0,1 104,36"
                    fill="none"
                    stroke={projection.effectiveShielding >= 60 ? inkPrimary : '#FC3D21'}
                    strokeWidth={projection.effectiveShielding >= 60 ? '2.8' : '1.8'}
                    strokeDasharray={projection.effectiveShielding >= 60 ? 'none' : '6 4'}
                    onClick={() => handleSelectModuleFromSvg('shielding')}
                    onKeyDown={(e) => handleSvgKeyDown(e, 'shielding')}
                    tabIndex={0}
                    role="button"
                    aria-label={
                      lang === 'es'
                        ? `Escudo de Radiación: ${projection.effectiveShielding}% efectivo`
                        : `Radiation Shielding: ${projection.effectiveShielding}% effective`
                    }
                    className="svg-module-node"
                  />

                  {/* Domo central presurizado ECLSS / MOXIE */}
                  <g
                    className={`svg-module-node ${
                      selectedModule === 'eclss' ? 'svg-node-selected' : ''
                    }`}
                    onClick={() => handleSelectModuleFromSvg('eclss')}
                    onKeyDown={(e) => handleSvgKeyDown(e, 'eclss')}
                    tabIndex={0}
                    role="button"
                    aria-label={
                      lang === 'es'
                        ? `Domo Hábitat y Soporte Vital: ${resources.lifeSupport}%`
                        : `Habitat Dome and Life Support: ${resources.lifeSupport}%`
                    }
                  >
                    {/* Rótulo con línea guía: HABITAT — ECLSS */}
                    <polyline
                      points="28,-22 52,-44 156,-44"
                      fill="none"
                      stroke={calloutStroke}
                      strokeWidth="1.2"
                    />
                    <circle cx="28" cy="-22" r="2.5" fill={calloutStroke} />
                    <text
                      x="54"
                      y="-49"
                      fill={inkPrimary}
                      fontSize="9.5"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight="bold"
                    >
                      {isLunar ? 'HABITAT — ECLSS' : 'HABITAT — ECLSS + MOXIE'}
                    </text>

                    {/* Casco estructural del hábitat */}
                    <path
                      d="M-72,36 A72,62 0 0,1 72,36 Z"
                      fill={isLowPowerBlackout ? '#090F18' : terrainMid}
                      stroke={inkPrimary}
                      strokeWidth="2.2"
                    />
                    {/* Costillas estructurales geodésicas del plano */}
                    <line
                      x1="0"
                      y1="-26"
                      x2="0"
                      y2="36"
                      stroke={inkSecondary}
                      strokeWidth="1"
                      strokeDasharray="3 2"
                    />
                    <path
                      d="M-62,34 A62,52 0 0,1 62,34"
                      fill="none"
                      stroke={inkSecondary}
                      strokeWidth={Math.max(1.5, Math.round((projection.effectiveShielding / 100) * 5))}
                    />

                    {/* Esclusa EVA central */}
                    <rect
                      x="-15"
                      y="10"
                      width="30"
                      height="26"
                      fill={skyBg}
                      stroke={inkPrimary}
                      strokeWidth="1.8"
                    />

                    {/* Escotillas iluminadas (C5: se apagan si power < 15) */}
                    <rect
                      x="-46"
                      y="10"
                      width="16"
                      height="12"
                      fill={isLowPowerBlackout ? '#05080D' : '#F2EBDD'}
                      stroke={inkPrimary}
                      strokeWidth="1.5"
                    />
                    <rect
                      x="30"
                      y="10"
                      width="16"
                      height="12"
                      fill={isLowPowerBlackout ? '#05080D' : '#F2EBDD'}
                      stroke={inkPrimary}
                      strokeWidth="1.5"
                    />

                    {/* C5: Alerta de apagón cuando power < 15 */}
                    {isLowPowerBlackout && (
                      <g pointerEvents="none">
                        <circle cx="0" cy="-12" r="4.5" fill="#FC3D21" />
                        <text
                          x="0"
                          y="-28"
                          textAnchor="middle"
                          fill="#FC3D21"
                          fontSize="9.5"
                          fontFamily="IBM Plex Mono, monospace"
                          fontWeight="bold"
                        >
                          {lang === 'es' ? 'APAGÓN (<15% PWR)' : 'BLACKOUT (<15% PWR)'}
                        </text>
                      </g>
                    )}

                    <text
                      x="0"
                      y="54"
                      textAnchor="middle"
                      fill={inkPrimary}
                      fontSize="10.5"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight="bold"
                    >
                      ECLSS O2 {resources.lifeSupport}% // SHD {projection.effectiveShielding}%
                    </text>
                  </g>
                </g>

                {/* 10. MÓDULO 4: Invernadero Hidropónico Veggie (con línea guía y estado marchito C5) */}
                <g
                  transform="translate(622, 162)"
                  className={`svg-module-node ${
                    selectedModule === 'greenhouse' ? 'svg-node-selected' : ''
                  }`}
                  onClick={() => handleSelectModuleFromSvg('greenhouse')}
                  onKeyDown={(e) => handleSvgKeyDown(e, 'greenhouse')}
                  tabIndex={0}
                  role="button"
                  aria-label={
                    lang === 'es'
                      ? `Invernadero Hidropónico Veggie: ${resources.food}% alimentos`
                      : `Veggie Hydroponic Greenhouse: ${resources.food}% food`
                  }
                >
                  {/* Rótulo con línea guía: AGR 04 — VEGGIE */}
                  <polyline
                    points="0,0 16,-24 118,-24"
                    fill="none"
                    stroke={calloutStroke}
                    strokeWidth="1.2"
                  />
                  <circle cx="0" cy="0" r="2.5" fill={calloutStroke} />
                  <text
                    x="20"
                    y="-29"
                    fill={inkPrimary}
                    fontSize="9.5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                  >
                    AGR 04 — VEGGIE DOME
                  </text>

                  {/* Cilindro técnico de invernadero */}
                  <rect
                    x="-58"
                    y="0"
                    width="116"
                    height="36"
                    rx="2"
                    fill={skyBg}
                    stroke={isGreenhouseWilted ? '#FC3D21' : inkPrimary}
                    strokeWidth="1.8"
                  />
                  {/* Divisiones estructurales del módulo agrícola */}
                  <line x1="-20" y1="0" x2="-20" y2="36" stroke={inkSecondary} strokeWidth="1" />
                  <line x1="20" y1="0" x2="20" y2="36" stroke={inkSecondary} strokeWidth="1" />

                  {/* C5: Cultivos marchitos si food < 25 vs brotes sanos */}
                  {isGreenhouseWilted ? (
                    <g>
                      <path
                        d="M-38,30 L-38,20 L-45,25 M-2,30 L-2,20 L6,25 M34,30 L34,20 L27,25"
                        fill="none"
                        stroke="#FC3D21"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <text
                        x="0"
                        y="-7"
                        textAnchor="middle"
                        fill="#FC3D21"
                        fontSize="9.5"
                        fontFamily="IBM Plex Mono, monospace"
                        fontWeight="bold"
                      >
                        {lang === 'es' ? 'CULTIVO MARCHITO (<25%)' : 'WILTED CROPS (<25%)'}
                      </text>
                    </g>
                  ) : (
                    <g>
                      {/* Tres cámaras de brotes hidropónicos sanos */}
                      <path
                        d="M-38,30 V14 M-38,22 L-45,16 M-38,20 L-31,14"
                        stroke="#2E7D4F"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M0,30 V12 M0,21 L-7,15 M0,19 L7,13"
                        stroke="#2E7D4F"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M38,30 V14 M38,22 L31,16 M38,20 L45,14"
                        stroke="#2E7D4F"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </g>
                  )}

                  <text
                    x="0"
                    y="54"
                    textAnchor="middle"
                    fill={inkPrimary}
                    fontSize="10.5"
                    fontFamily="IBM Plex Mono, monospace"
                    fontWeight="bold"
                  >
                    VEGGIE // FOOD {resources.food}%
                  </text>
                </g>

                {/* Conductos de potencia e interconexión sobre superficie */}
                <g
                  stroke={inkSecondary}
                  strokeWidth="1.5"
                  strokeDasharray="4 2"
                  pointerEvents="none"
                >
                  <line x1="190" y1="198" x2="340" y2="198" />
                  <line x1="490" y1="198" x2="564" y2="198" />
                </g>

                {/* 11. C5: Velo de Polvo Marciano y Vectores de Viento en DUST_STORM */}
                {isDustStorm && (
                  <g pointerEvents="none">
                    <rect
                      x="0"
                      y="0"
                      width="860"
                      height="280"
                      fill="rgba(194, 65, 12, 0.38)"
                    />
                    <g stroke="#FDBA74" strokeWidth="1.8" strokeDasharray="16 8">
                      <line x1="35" y1="84" x2="825" y2="66" />
                      <line x1="20" y1="142" x2="840" y2="122" />
                      <line x1="55" y1="212" x2="830" y2="192" />
                    </g>
                    <text
                      x="430"
                      y="104"
                      textAnchor="middle"
                      fill="#F2EBDD"
                      fontSize="10.5"
                      fontFamily="IBM Plex Mono, monospace"
                      fontWeight="bold"
                    >
                      ALERT // Martian dust veil active — solar output reduced
                    </text>
                  </g>
                )}
              </svg>
            );
          })()}
        </div>
        )}

        {/* C3: Botones plegables para Detalles de Módulos y Simulador de Retraso (plegados por defecto) */}
        <div className="map-drawers-bar">
          <button
            type="button"
            id="toggle-system-details-btn"
            className={`btn-secondary map-drawer-toggle ${
              showSystemDetails ? 'map-drawer-active' : ''
            }`}
            aria-expanded={showSystemDetails}
            onClick={() => {
              missionAudio.playClick();
              setShowSystemDetails((prev) => !prev);
            }}
          >
            <SlidersIcon size={16} />{' '}
            {showSystemDetails
              ? lang === 'es'
                ? 'Ocultar Detalles de Sistemas'
                : 'Hide System Details'
              : lang === 'es'
                ? 'Ver Detalles de los 5 Módulos'
                : 'Inspect 5 Outpost Modules'}
            <ArrowIcon size={14} direction={showSystemDetails ? 'up' : 'down'} />
          </button>

          <button
            type="button"
            id="toggle-comm-simulator-btn"
            className={`btn-secondary map-drawer-toggle ${
              showCommSimulator ? 'map-drawer-active' : ''
            }`}
            aria-expanded={showCommSimulator}
            onClick={() => {
              missionAudio.playClick();
              setShowCommSimulator((prev) => !prev);
            }}
          >
            <AntennaIcon size={16} />{' '}
            {showCommSimulator
              ? lang === 'es'
                ? 'Ocultar Radio con Houston'
                : 'Hide Houston Radio'
              : lang === 'es'
                ? `Retraso de Señal (${isLunar ? '1.3 s' : realDelayMin + ' min'})`
                : `Signal Delay (${isLunar ? '1.3 s' : realDelayMin + ' min'})`}
            <ArrowIcon size={14} direction={showCommSimulator ? 'up' : 'down'} />
          </button>
        </div>

        {/* Cajón Plegable 1: Tarjetas de los 5 Módulos + Inspector de Ingeniería */}
        {showSystemDetails && (
          <div className="system-details-drawer">
            <div className="modules-grid">
              {(Object.keys(moduleDetails) as ModuleKey[]).map((key) => {
                const mod = moduleDetails[key];
                const isSelected = selectedModule === key;
                return (
                  <button
                    key={key}
                    type="button"
                    id={`module-card-${key}`}
                    className={`outpost-module ${isSelected ? 'module-selected' : ''}`}
                    onClick={() => {
                      missionAudio.playClick();
                      setSelectedModule(key);
                      const worldModId = moduleKeyToWorldId(key);
                      setSelectedWorldModule(worldModId);
                      onTutorialAction?.('step-outpost-map');
                      onTutorialAction?.(worldModId);
                    }}
                  >
                    <div className="module-top">
                      <span className="module-icon">{mod.icon}</span>
                      <span className="module-alloc">{mod.allocLabel}</span>
                    </div>
                    <h4>{mod.title[lang]}</h4>
                    <div
                      className={`module-delta-pill ${mod.isPositive ? 'delta-pos' : 'delta-neg'}`}
                    >
                      {mod.deltaLabel}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="module-inspector" role="region" aria-live="polite">
              <div className="inspector-header">
                <strong className="resource-label-inline">
                  {activeDetail.icon} {activeDetail.title[lang]}
                </strong>
                <span className="inspector-telemetry">{activeDetail.statusText[lang]}</span>
              </div>
              <p className="inspector-note">
                <ScienceIcon size={14} /> {activeDetail.nasaEngineeringNote[lang]}
              </p>
            </div>
          </div>
        )}

        {/* Cajón Plegable 2: Simulador de Retraso de Señal Tierra-Base */}
        {showCommSimulator && (
          <div className="comm-delay-bar">
            <div className="comm-info-col">
              <div className="comm-header-line">
                <strong className="resource-label-inline">
                  <AntennaIcon size={16} />{' '}
                  {lang === 'es'
                    ? 'Simulador de Retraso de Luz Tierra - Base:'
                    : 'Earth - Outpost Light-Time Delay Simulator:'}{' '}
                  <span className="comm-highlight">
                    {isLunar
                      ? `${realDelaySec} s (${lang === 'es' ? 'Luna' : 'Moon'})`
                      : `${realDelayMin} min / ${realDelaySec} s (${
                          lang === 'es' ? 'Marte Día ' + currentDay : 'Mars Sol ' + currentDay
                        })`}
                  </span>
                </strong>
              </div>

              <div className="comm-preset-row">
                <label htmlFor="comm-preset-select" className="sr-only">
                  {lang === 'es' ? 'Mensaje para Control de Misión' : 'Message for Mission Control'}
                </label>
                <select
                  id="comm-preset-select"
                  className="comm-select"
                  value={selectedPresetIdx}
                  onChange={(e) => {
                    missionAudio.playClick();
                    clearCommInterval();
                    setSelectedPresetIdx(Number(e.target.value));
                    setCommProgress(0);
                    setCommState('idle');
                  }}
                >
                  {RADIO_PRESETS.map((p, idx) => (
                    <option key={p.id} value={idx}>
                      {p.label[lang]}
                    </option>
                  ))}
                </select>

                <button
                  className="btn-secondary"
                  onClick={handleTestComms}
                  disabled={commState === 'transmitting'}
                  id="test-comm-delay-btn"
                >
                  {commState === 'transmitting'
                    ? lang === 'es'
                      ? `Viajando por el espacio (${commProgress}%)...`
                      : `Traveling in deep space (${commProgress}%)...`
                    : lang === 'es'
                      ? 'Enviar Radio a Houston'
                      : 'Transmit to Houston'}
                </button>
              </div>

              {commState === 'transmitting' && (
                <div className="comm-wave-track" aria-label="Radio signal progress">
                  <span className="resource-label-inline">
                    <HelmetIcon size={14} /> {isLunar ? 'Artemis' : 'Jezero'}
                  </span>
                  <div className="comm-track-bar">
                    <div className="comm-track-fill" style={{ width: `${commProgress}%` }} />
                  </div>
                  <span className="resource-label-inline">
                    <LanguageIcon size={14} /> Houston
                  </span>
                </div>
              )}

              {commState === 'received' && (
                <p className="comm-reply-box" role="status" aria-live="polite">
                  {isLunar
                    ? currentPreset.houstonReplyLunar[lang]
                    : currentPreset.houstonReplyMars[lang]}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
