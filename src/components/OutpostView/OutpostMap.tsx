/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * C3, C5 & C9 — Mapa visual interactivo del Hábitat Espacial con detalles de módulos
 * y simulador de retraso de señal plegados por defecto, usando iconos SVG de trazo (cero emoji).
 */

import React, { useEffect, useState } from 'react';
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
}

type ModuleKey = 'solar' | 'eclss' | 'shielding' | 'greenhouse';

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
      es: 'CIRUJANO DE VUELO NASA (1.3s): "Datos biomédicos OSDR en rango seguro. Con solo 1.3 segundos de retraso podemos guiarlos en vivo desde la Tierra."',
      en: 'NASA FLIGHT SURGEON (1.3s): "OSDR biomedical data within safe limits. With only a 1.3-second delay we can guide you live from Earth."',
    },
    houstonReplyMars: {
      es: 'CIRUJANO DE VUELO NASA (tras ~12 min reales): "Lectura RAD recibida. En Marte una consulta tarda hasta 24 minutos en ir y volver. Su autonomía médica a bordo es clave."',
      en: 'NASA FLIGHT SURGEON (after ~12 real min): "RAD reading received. On Mars a query takes up to 24 minutes round-trip. Onboard medical autonomy is essential."',
    },
  },
  {
    id: 'greenhouse-status',
    label: {
      es: 'Reportar humedad del invernadero Veggie',
      en: 'Report Veggie greenhouse humidity',
    },
    houstonReplyLunar: {
      es: 'BOTÁNICA NASA KENNEDY (1.3s): "Humedad nominal en las cámaras Veggie. Reciclar el agua en el ECLSS mantiene vivo el cultivo sin gastar reservas."',
      en: 'NASA KENNEDY BOTANY (1.3s): "Nominal humidity in Veggie chambers. Recycling water in the ECLSS keeps crops thriving without draining reserves."',
    },
    houstonReplyMars: {
      es: 'BOTÁNICA NASA KENNEDY (tras ~12 min reales): "Telemetría Veggie confirmada. Si una tormenta de polvo oscurece el Cráter Jezero, equilibren las lámparas LED con el generador MOXIE."',
      en: 'NASA KENNEDY BOTANY (after ~12 real min): "Veggie telemetry confirmed. If a dust storm darkens Jezero Crater, balance LED grow lamps with the MOXIE generator."',
    },
  },
];

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
}) => {
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('shielding');
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [showCommSimulator, setShowCommSimulator] = useState(false);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [commState, setCommState] = useState<'idle' | 'transmitting' | 'received'>('idle');
  const [commProgress, setCommProgress] = useState(0);

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
    setCommState('idle');
    setCommProgress(0);
  }, [site.id, currentDay]);

  const handleSelectModuleFromSvg = (mod: ModuleKey) => {
    missionAudio.playClick();
    setSelectedModule(mod);
    setShowSystemDetails(true);
  };

  const handleSvgKeyDown = (e: React.KeyboardEvent, mod: ModuleKey) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectModuleFromSvg(mod);
    }
  };

  const handleTestComms = () => {
    if (commState === 'transmitting') return;
    missionAudio.playCommPing(true);
    setCommState('transmitting');
    setCommProgress(0);

    const totalSimMs = isLunar ? 1300 : 3600;
    const stepMs = 60;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += stepMs;
      const pct = Math.min(100, Math.round((elapsed / totalSimMs) * 100));
      setCommProgress(pct);
      if (elapsed >= totalSimMs) {
        clearInterval(interval);
        missionAudio.playCommPing(false);
        setCommState('received');
      }
    }, stepMs);
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
  };

  const activeDetail = moduleDetails[selectedModule];
  const currentPreset = RADIO_PRESETS[selectedPresetIdx];

  return (
    <section className="outpost-stage" aria-label="Outpost Interactive Schematic">
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
                    ? 'NASA DONKI EN VIVO (VER DATOS)'
                    : 'NASA DONKI LIVE (INSPECT)'
                  : lang === 'es'
                    ? 'REGISTRO REAL NASA DONKI (VER)'
                    : 'REAL NASA DONKI RECORD (INSPECT)'}
              </small>
            </div>
          </button>
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

        {/* Escenario Visual SVG Interactivo de la Base */}
        <div
          className={`svg-outpost-wrapper ${isLunar ? 'svg-env-lunar' : 'svg-env-mars'} ${
            isDustStorm ? 'svg-env-dust-storm' : ''
          } ${isLowPowerBlackout ? 'svg-env-blackout' : ''}`}
        >
          <svg
            viewBox="0 0 860 270"
            className="outpost-svg"
            role="img"
            aria-label={
              isLunar
                ? 'Interactive diagram of Artemis Lunar South Pole Outpost'
                : 'Interactive diagram of Martian Jezero Crater Outpost'
            }
          >
            {/* Fondo de cielo planetario plano */}
            <rect
              x="0"
              y="0"
              width="860"
              height="270"
              fill={isLunar ? '#0B1322' : '#2C150F'}
            />

            {/* Estrellas */}
            <g fill="#f1f5f9" opacity={isDustStorm ? 0.12 : isLunar ? 0.92 : 0.45}>
              <circle cx="65" cy="34" r="1.5" />
              <circle cx="115" cy="18" r="1.0" />
              <circle cx="145" cy="22" r="1.2" />
              <circle cx="255" cy="48" r="1.6" />
              <circle cx="315" cy="19" r="1.1" />
              <circle cx="380" cy="25" r="1.3" />
              <circle cx="510" cy="38" r="1.7" />
              <circle cx="595" cy="16" r="1.1" />
              <circle cx="670" cy="24" r="1.3" />
              <circle cx="790" cy="42" r="1.5" />
            </g>

            {/* Astro en el cielo: Tierra vista desde la Luna o Fobos/Deimos desde Marte */}
            {isLunar ? (
              <g transform="translate(755, 56)">
                <circle cx="0" cy="0" r="24" fill="#1d4ed8" />
                <path
                  d="M-12,-8 Q-2,-14 8,-6 Q14,2 4,12 Q-6,16 -14,6 Z"
                  fill="#22c55e"
                  opacity="0.85"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="25"
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth="1.5"
                  opacity="0.7"
                />
                <text
                  x="0"
                  y="38"
                  textAnchor="middle"
                  fill="#93c5fd"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  EARTH (1.3s)
                </text>
              </g>
            ) : (
              <g transform="translate(745, 52)">
                <ellipse cx="-18" cy="-4" rx="10" ry="8" fill="#e7cba9" />
                <circle cx="-21" cy="-5" r="2.2" fill="#a88b6d" />
                <circle cx="18" cy="10" r="5" fill="#c7ab8e" />
                <text
                  x="0"
                  y="34"
                  textAnchor="middle"
                  fill="#fed7aa"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  PHOBOS &amp; DEIMOS
                </text>
              </g>
            )}

            {/* Sol / Fuente de Clima Espacial DONKI */}
            <g
              transform="translate(62, 50)"
              opacity={isRimShadowPass ? 0.45 : isDustStorm ? 0.55 : 1}
            >
              <circle
                cx="0"
                cy="0"
                r={isSolarStorm ? 24 : 18}
                fill={isSolarStorm ? '#f97316' : '#facc15'}
                className={isSolarStorm ? 'pulse-sun' : ''}
              />
              <circle
                cx="0"
                cy="0"
                r={isSolarStorm ? 34 : 24}
                fill="none"
                stroke={isSolarStorm ? '#ef4444' : '#f59e0b'}
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <text
                x="0"
                y="44"
                textAnchor="middle"
                fill="#fde68a"
                fontSize="10"
                fontFamily="monospace"
              >
                {isRimShadowPass
                  ? 'LOW HORIZON SUN'
                  : weather.type === 'NOMINAL'
                  ? 'QUIET SUN'
                  : `DONKI ${weather.type}`}
              </text>
            </g>

            {/* Ondas de partículas solares si hay tormenta DONKI (FLR / SEP / CME) */}
            {isSolarStorm && (
              <g stroke="#fb923c" strokeWidth="2" strokeDasharray="8 6" opacity="0.85">
                <line x1="95" y1="62" x2="380" y2="145" className="solar-ray-anim" />
                <line x1="88" y1="78" x2="355" y2="175" className="solar-ray-anim" />
                <line x1="102" y1="48" x2="445" y2="125" className="solar-ray-anim" />
              </g>
            )}

            {/* Montañas / Borde escarpado del Cráter Shackleton vs Mesetas escalonadas del Delta Jezero */}
            {isLunar ? (
              <path
                d="M0,182 L88,118 L185,168 L310,122 L455,170 L615,126 L750,164 L860,148 L860,270 L0,270 Z"
                fill="#1e293b"
                stroke="#475569"
                strokeWidth="1"
              />
            ) : (
              <path
                d="M0,176 L95,142 L215,142 L265,168 L395,134 L515,134 L575,165 L710,138 L860,162 L860,270 L0,270 Z"
                fill="#6b2713"
                stroke="#9a3412"
                strokeWidth="1"
              />
            )}

            {/* Superficie planetaria */}
            <path
              d="M0,192 Q240,176 460,190 T860,184 L860,270 L0,270 Z"
              fill={isLunar ? '#334155' : '#7c2d12'}
            />

            {/* Depósito de Hielo Polar (Luna) o Sedimentos del Delta (Marte) */}
            {isLunar ? (
              <g transform="translate(740, 218)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="68"
                  ry="16"
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                />
                <path d="M-40,2 L-25,-6 L-10,3 L12,-7 L32,3 Z" fill="#38bdf8" opacity="0.75" />
                <text
                  x="0"
                  y="25"
                  textAnchor="middle"
                  fill="#7dd3fc"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  SHACKLETON ICE TRAP
                </text>
              </g>
            ) : (
              <g transform="translate(742, 220)">
                <ellipse
                  cx="0"
                  cy="0"
                  rx="68"
                  ry="15"
                  fill="#431407"
                  stroke="#fb923c"
                  strokeWidth="1.5"
                />
                <path d="M-38,0 Q-10,-6 20,0 T45,2" stroke="#fdba74" strokeWidth="1.5" fill="none" />
                <text
                  x="0"
                  y="24"
                  textAnchor="middle"
                  fill="#fed7aa"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  JEZERO DELTA (CO2/H2O)
                </text>
              </g>
            )}

            {/* MÓDULO 1: Granja Solar y Baterías */}
            <g
              transform="translate(135, 145)"
              className={`svg-module-node ${selectedModule === 'solar' ? 'svg-node-selected' : ''}`}
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
              <rect
                x="-48"
                y="0"
                width="42"
                height="52"
                rx="2"
                fill={isRimShadowPass ? '#0f172a' : isDustStorm ? '#78350f' : '#1e3a8a'}
                stroke={isRimShadowPass ? '#475569' : '#60a5fa'}
                strokeWidth="2"
              />
              <line x1="-27" y1="0" x2="-27" y2="52" stroke="#93c5fd" strokeWidth="1" opacity={isRimShadowPass ? 0.35 : 1} />
              <line x1="-48" y1="18" x2="-6" y2="18" stroke="#93c5fd" strokeWidth="1" opacity={isRimShadowPass ? 0.35 : 1} />
              <line x1="-48" y1="35" x2="-6" y2="35" stroke="#93c5fd" strokeWidth="1" opacity={isRimShadowPass ? 0.35 : 1} />

              <rect
                x="6"
                y="0"
                width="42"
                height="52"
                rx="2"
                fill={isRimShadowPass ? '#0f172a' : isDustStorm ? '#78350f' : '#1e3a8a'}
                stroke={isRimShadowPass ? '#475569' : '#60a5fa'}
                strokeWidth="2"
              />
              <line x1="27" y1="0" x2="27" y2="52" stroke="#93c5fd" strokeWidth="1" opacity={isRimShadowPass ? 0.35 : 1} />
              <line x1="6" y1="18" x2="48" y2="18" stroke="#93c5fd" strokeWidth="1" opacity={isRimShadowPass ? 0.35 : 1} />
              <line x1="6" y1="35" x2="48" y2="35" stroke="#93c5fd" strokeWidth="1" opacity={isRimShadowPass ? 0.35 : 1} />

              {/* C5: Sombra proyectada sobre los paneles cuando weather.id === 'MOON-RIM-SHADOW-PASS' */}
              {isRimShadowPass && (
                <g pointerEvents="none">
                  <polygon
                    points="-62,-18 64,-4 56,56 -62,56"
                    fill="rgba(2, 6, 23, 0.68)"
                    stroke="#38bdf8"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="-8"
                    textAnchor="middle"
                    fill="#7dd3fc"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {lang === 'es' ? 'SOMBRA DEL CRÁTER' : 'CRATER RIM SHADOW'}
                  </text>
                </g>
              )}

              <rect
                x="-32"
                y="54"
                width="64"
                height="20"
                rx="2"
                fill="#1e293b"
                stroke="#f59e0b"
                strokeWidth="1.8"
              />
              <rect
                x="-28"
                y="58"
                width={Math.max(4, Math.round((resources.power / 100) * 56))}
                height="12"
                rx="1"
                fill={resources.power >= 30 ? '#22c55e' : resources.power >= 15 ? '#f59e0b' : '#ef4444'}
              />
              <text x="0" y="90" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                PWR {resources.power}% kWh
              </text>
            </g>

            {/* MÓDULO 2 y 3: Domo Central ECLSS/MOXIE + Escudo de Agua Anti-Radiación */}
            <g transform="translate(415, 165)">
              <path
                d="M-105,40 A110,95 0 0,1 105,40"
                fill="rgba(56, 189, 248, 0.12)"
                stroke={projection.effectiveShielding >= 60 ? '#38bdf8' : '#f59e0b'}
                strokeWidth={projection.effectiveShielding >= 60 ? '3.5' : '1.8'}
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
                <path
                  d="M-72,40 A72,62 0 0,1 72,40 Z"
                  fill={isLowPowerBlackout ? '#334155' : '#cbd5e1'}
                  stroke={isLowPowerBlackout ? '#64748b' : '#f8fafc'}
                  strokeWidth="2.5"
                />
                <path
                  d="M-64,38 A64,54 0 0,1 64,38"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth={Math.max(2, Math.round((projection.effectiveShielding / 100) * 8))}
                  opacity={isLowPowerBlackout ? 0.35 : 0.75}
                />
                <rect
                  x="-16"
                  y="12"
                  width="32"
                  height="28"
                  rx="2"
                  fill="#0f172a"
                  stroke="#94a3b8"
                  strokeWidth="2"
                />
                <circle
                  cx="-38"
                  cy="16"
                  r="8"
                  fill={isLowPowerBlackout ? '#090d16' : '#fef08a'}
                  stroke={isLowPowerBlackout ? '#334155' : '#f59e0b'}
                  strokeWidth="1.5"
                />
                <circle
                  cx="38"
                  cy="16"
                  r="8"
                  fill={isLowPowerBlackout ? '#090d16' : '#fef08a'}
                  stroke={isLowPowerBlackout ? '#334155' : '#f59e0b'}
                  strokeWidth="1.5"
                />
                <circle
                  cx="0"
                  cy="-6"
                  r="10"
                  fill={isLowPowerBlackout ? '#1e293b' : '#38bdf8'}
                  stroke={isLowPowerBlackout ? '#ef4444' : '#bae6fd'}
                  strokeWidth="1.5"
                />
                {isLowPowerBlackout && (
                  <g pointerEvents="none">
                    <circle cx="0" cy="-28" r="4.5" fill="#ef4444" />
                    <text
                      x="0"
                      y="-36"
                      textAnchor="middle"
                      fill="#fca5a5"
                      fontSize="9.5"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {lang === 'es' ? 'LUCES APAGADAS (<15% PWR)' : 'LIGHTS OFF (<15% PWR)'}
                    </text>
                  </g>
                )}
                <text
                  x="0"
                  y="58"
                  textAnchor="middle"
                  fill="#f8fafc"
                  fontSize="11"
                  fontWeight="bold"
                >
                  O2 {resources.lifeSupport}% | SHD {projection.effectiveShielding}%
                </text>
              </g>
            </g>

            {/* MÓDULO 4: Invernadero Hidropónico Veggie */}
            <g
              transform="translate(625, 172)"
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
              <rect
                x="-58"
                y="0"
                width="116"
                height="36"
                rx="14"
                fill={isGreenhouseWilted ? '#292524' : isLowPowerBlackout ? '#0f172a' : '#064e3b'}
                stroke={isGreenhouseWilted ? '#a16207' : '#34d399'}
                strokeWidth="2.2"
              />
              {isGreenhouseWilted ? (
                <g>
                  <ellipse cx="-32" cy="24" rx="7" ry="4" fill="#a16207" />
                  <path d="M-32,28 Q-36,18 -41,22" stroke="#ca8a04" strokeWidth="2" fill="none" />
                  <ellipse cx="-10" cy="25" rx="8" ry="4" fill="#854d0e" />
                  <path d="M-10,28 Q-6,19 -1,24" stroke="#a16207" strokeWidth="2" fill="none" />
                  <ellipse cx="14" cy="24" rx="7" ry="4" fill="#a16207" />
                  <path d="M14,28 Q10,19 5,23" stroke="#ca8a04" strokeWidth="2" fill="none" />
                  <ellipse cx="35" cy="25" rx="6" ry="3.5" fill="#854d0e" />
                  <text
                    x="0"
                    y="-7"
                    textAnchor="middle"
                    fill="#fde047"
                    fontSize="9.5"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {lang === 'es' ? 'CULTIVO MARCHITO' : 'WILTED CROPS'}
                  </text>
                </g>
              ) : (
                <g>
                  <circle cx="-32" cy="18" r="8" fill="#22c55e" />
                  <circle cx="-10" cy="16" r="9" fill="#4ade80" />
                  <circle cx="14" cy="18" r="8" fill="#22c55e" />
                  <circle cx="35" cy="17" r="7" fill="#4ade80" />
                </g>
              )}
              <text x="0" y="53" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                VEGGIE {resources.food}%
              </text>
            </g>

            {/* Antena de Espacio Profundo */}
            <g transform="translate(275, 158)">
              <line x1="0" y1="45" x2="0" y2="15" stroke="#94a3b8" strokeWidth="3" />
              <path d="M-16,8 Q0,24 16,8" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
              <circle
                cx="0"
                cy="6"
                r="3.5"
                fill={commState === 'transmitting' ? '#22c55e' : '#f59e0b'}
              />
            </g>

            {/* C5: Velo de polvo naranja y ráfagas en DUST_STORM */}
            {isDustStorm && (
              <g pointerEvents="none">
                <rect
                  x="0"
                  y="0"
                  width="860"
                  height="270"
                  fill="rgba(217, 119, 6, 0.42)"
                />
                <g stroke="rgba(253, 186, 116, 0.55)" strokeWidth="2" strokeDasharray="18 10">
                  <line x1="40" y1="85" x2="820" y2="65" />
                  <line x1="15" y1="145" x2="845" y2="120" />
                  <line x1="60" y1="210" x2="830" y2="190" />
                </g>
                <g fill="#fdba74" opacity="0.65">
                  <circle cx="190" cy="110" r="2.5" />
                  <circle cx="340" cy="95" r="3" />
                  <circle cx="490" cy="135" r="2.2" />
                  <circle cx="660" cy="105" r="2.8" />
                  <circle cx="570" cy="195" r="2.5" />
                </g>
              </g>
            )}
          </svg>
        </div>

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
                ? 'Ver Detalles de los 4 Módulos'
                : 'Inspect 4 Outpost Modules'}
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

        {/* Cajón Plegable 1: Tarjetas de los 4 Módulos + Inspector de Ingeniería */}
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
                    setSelectedPresetIdx(Number(e.target.value));
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
