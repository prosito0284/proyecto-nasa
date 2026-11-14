/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Mapa visual SVG interactivo del Hábitat Espacial (Luna Shackleton / Marte Jezero),
 * Inspector de Ingeniería de Módulos y Simulador de Retraso de Señal Tierra-Base (Light-Time Delay).
 */

import React, { useEffect, useState } from 'react';
import {
  CoreResources,
  Language,
  OutpostSiteConfig,
  PowerAllocation,
  SpaceWeatherEvent,
} from '../../types/mission';
import { TurnProjection, getCommDelaySeconds } from '../../engine/simulationEngine';
import { missionAudio } from '../../utils/sound';

interface OutpostMapProps {
  lang: Language;
  site: OutpostSiteConfig;
  currentDay: number;
  resources: CoreResources;
  allocation: PowerAllocation;
  weather: SpaceWeatherEvent;
  projection: TurnProjection;
  onOpenScienceModal?: () => void;
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
      es: '📡 Solicitar reporte solar DONKI a Houston',
      en: '📡 Request DONKI solar forecast from Houston',
    },
    houstonReplyLunar: {
      es: '✅ Houston (1.3s): "¡Copiado, Base Artemis! Telemetría DONKI recibida casi al instante. Mantengan el escudo de agua listo si sube el flujo de protones."',
      en: '✅ Houston (1.3s): "Copy that, Artemis Base! DONKI telemetry received almost instantly. Keep water walls ready if proton flux rises."',
    },
    houstonReplyMars: {
      es: '✅ Houston (tras ~12 min reales): "¡Recibido, Jezero! Recuerden que nuestra voz tardó minutos en llegar a la velocidad de la luz. Si ocurre una llamarada solar, deben activar el refugio ustedes mismos sin esperar nuestra orden."',
      en: '✅ Houston (after ~12 real min): "Copy, Jezero! Remember our voice took minutes to arrive at light speed. If a solar flare hits, you must trigger the shelter yourselves without waiting for us."',
    },
  },
  {
    id: 'medical-dosimetry',
    label: {
      es: '🩺 Enviar lectura de dosímetros RAD / OSDR',
      en: '🩺 Transmit RAD / OSDR dosimeter readings',
    },
    houstonReplyLunar: {
      es: '✅ Cirujano de Vuelo NASA (1.3s): "Datos biomédicos OSDR en rango seguro. Con solo 1.3 segundos de retraso podemos guiarlos en vivo desde la Tierra."',
      en: '✅ NASA Flight Surgeon (1.3s): "OSDR biomedical data within safe limits. With only a 1.3-second delay we can guide you live from Earth."',
    },
    houstonReplyMars: {
      es: '✅ Cirujano de Vuelo NASA (tras ~12 min reales): "Lectura RAD recibida. En Marte una pregunta y su respuesta tardan hasta 24 minutos en ir y volver (ida y vuelta). ¡Su computadora médica a bordo es vital!"',
      en: '✅ NASA Flight Surgeon (after ~12 real min): "RAD reading received. On Mars a question and answer take up to 24 minutes round-trip. Your onboard medical autonomy is vital!"',
    },
  },
  {
    id: 'greenhouse-status',
    label: {
      es: '🌱 Reportar humedad del invernadero Veggie',
      en: '🌱 Report Veggie greenhouse humidity',
    },
    houstonReplyLunar: {
      es: '✅ Botánica NASA Kennedy (1.3s): "¡Excelente trabajo con las hojas verdes! Reciclar el agua en el ECLSS mantiene vivo el cultivo sin gastar reservas."',
      en: '✅ NASA Kennedy Botany (1.3s): "Great job with the leafy greens! Recycling water in the ECLSS keeps crops thriving without draining reserves."',
    },
    houstonReplyMars: {
      es: '✅ Botánica NASA Kennedy (tras ~12 min reales): "Telemetría Veggie confirmada. Si una tormenta de polvo oscurece el Cráter Jezero, equilibren las lámparas LED con el generador MOXIE."',
      en: '✅ NASA Kennedy Botany (after ~12 real min): "Veggie telemetry confirmed. If a dust storm darkens Jezero Crater, balance LED grow lamps with the MOXIE generator."',
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
}) => {
  const [selectedModule, setSelectedModule] = useState<ModuleKey>('shielding');
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [commState, setCommState] = useState<'idle' | 'transmitting' | 'received'>('idle');
  const [commProgress, setCommProgress] = useState(0);

  const isLunar = site.id === 'moon-shackleton';
  const isSolarStorm =
    weather.type === 'FLR' || weather.type === 'SEP' || weather.type === 'CME';
  const isDustStorm = weather.type === 'DUST_STORM';
  const realDelaySec = getCommDelaySeconds(site.id, currentDay);
  const realDelayMin = (realDelaySec / 60).toFixed(1);

  useEffect(() => {
    setCommState('idle');
    setCommProgress(0);
  }, [site.id, currentDay]);

  const handleTestComms = () => {
    if (commState === 'transmitting') return;
    missionAudio.playCommPing(true);
    setCommState('transmitting');
    setCommProgress(0);

    // En la Luna dura 1.3s reales; en Marte hacemos una simulación visual de 3.6s con velocímetro acelerado
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
      icon: string;
      title: { es: string; en: string };
      allocLabel: string;
      statusText: { es: string; en: string };
      nasaEngineeringNote: { es: string; en: string };
      deltaLabel: string;
      isPositive: boolean;
    }
  > = {
    solar: {
      icon: '☀️',
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
      icon: '🫧',
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
          : 'El experimento MOXIE de la NASA en el rover Perseverance demostró que se puede extraer oxígeno directamente del aire de CO₂ de Marte, ¡pero exige mucha energía!',
        en: isLunar
          ? 'NASA’s ECLSS recycles 98% of astronaut water and splits H₂O molecules with electricity (electrolysis) into breathable oxygen.'
          : 'NASA’s MOXIE experiment on Perseverance proved we can extract breathable oxygen right out of Mars’s CO₂ atmosphere—at a high power cost!',
      },
      deltaLabel: `${formatDelta(projection.delta.lifeSupport)} / ${site.dayName[lang]}`,
      isPositive: projection.delta.lifeSupport >= 0,
    },
    shielding: {
      icon: '🛡️',
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
      icon: '🌱',
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
      deltaLabel: `${formatDelta(projection.delta.food)} / +${projection.delta.sciencePoints} 🔬`,
      isPositive: projection.delta.food >= 0,
    },
  };

  const activeDetail = moduleDetails[selectedModule];
  const currentPreset = RADIO_PRESETS[selectedPresetIdx];

  return (
    <section className="outpost-stage" aria-label="Outpost Interactive Schematic">
      <div className={`surface-canvas ${isLunar ? 'surface-lunar' : 'surface-mars'}`}>
        {/* Cabecera del Mapa Planetario */}
        <div className="surface-header">
          <div>
            <div className="coord-row">
              <span className="coord-pill">{site.coordinates}</span>
              <span className="gravity-pill">
                🌍 {site.gravityG}g | 🌡️ {site.avgTempCelsius}
              </span>
            </div>
            <h3>{site.name[lang]}</h3>
            <p className="surface-subtitle">{site.nasaMissionReference[lang]}</p>
          </div>

          <button
            type="button"
            className={`weather-pill severity-${weather.severity}`}
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
            <span className="weather-icon">
              {isSolarStorm ? '⚡' : isDustStorm ? '🌪️' : '☀️'}
            </span>
            <div>
              <strong>{weather.classOrIntensity}</strong>
              <small>
                {weather.isLiveNasaData
                  ? lang === 'es'
                    ? '🟢 NASA DONKI En Vivo (Ver datos ↗)'
                    : '🟢 NASA DONKI Live (Inspect ↗)'
                  : lang === 'es'
                    ? '📘 Registro Real NASA DONKI (Ver ↗)'
                    : '📘 Real NASA DONKI Record (Inspect ↗)'}
              </small>
            </div>
          </button>
        </div>

        {/* Escenario Visual SVG Interactivo de la Base */}
        <div className="svg-outpost-wrapper">
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
            <defs>
              <linearGradient id="skyGradLunar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#070b14" />
                <stop offset="65%" stopColor="#101829" />
                <stop offset="100%" stopColor="#1e2738" />
              </linearGradient>
              <linearGradient id="skyGradMars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1f110e" />
                <stop offset="60%" stopColor="#3b1e16" />
                <stop offset="100%" stopColor="#5c2d1e" />
              </linearGradient>
              <linearGradient id="groundLunar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#353f52" />
                <stop offset="100%" stopColor="#1c222e" />
              </linearGradient>
              <linearGradient id="groundMars" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3823" />
                <stop offset="100%" stopColor="#421c11" />
              </linearGradient>
              <radialGradient id="shieldAura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(56, 189, 248, 0.05)" />
                <stop offset="75%" stopColor="rgba(56, 189, 248, 0.18)" />
                <stop offset="100%" stopColor="rgba(245, 158, 11, 0.55)" />
              </radialGradient>
            </defs>

            {/* Fondo de cielo planetario */}
            <rect
              x="0"
              y="0"
              width="860"
              height="270"
              fill={isLunar ? 'url(#skyGradLunar)' : 'url(#skyGradMars)'}
            />

            {/* Estrellas */}
            <g fill="#e2e8f0" opacity={isDustStorm ? 0.25 : 0.75}>
              <circle cx="65" cy="34" r="1.4" />
              <circle cx="145" cy="22" r="1.1" />
              <circle cx="255" cy="48" r="1.5" />
              <circle cx="380" cy="25" r="1.2" />
              <circle cx="510" cy="38" r="1.6" />
              <circle cx="670" cy="24" r="1.2" />
              <circle cx="790" cy="42" r="1.5" />
            </g>

            {/* Astro en el cielo: Tierra vista desde la Luna o Fobos/Deimos desde Marte */}
            {isLunar ? (
              <g transform="translate(755, 56)">
                <circle cx="0" cy="0" r="24" fill="#1d4ed8" />
                <path
                  d="M-12,-8 Q-2,-14 8,-6 Q14,2 4,12 Q-6,16 -14,6 Z"
                  fill="#22c55e"
                  opacity="0.8"
                />
                <circle
                  cx="0"
                  cy="0"
                  r="25"
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
                <text x="0" y="38" textAnchor="middle" fill="#93c5fd" fontSize="10" fontFamily="monospace">
                  EARTH (1.3s)
                </text>
              </g>
            ) : (
              <g transform="translate(745, 52)">
                <circle cx="-18" cy="-4" r="9" fill="#d6b89c" />
                <circle cx="18" cy="10" r="5" fill="#b89b82" />
                <text x="0" y="34" textAnchor="middle" fill="#fdba74" fontSize="10" fontFamily="monospace">
                  PHOBOS &amp; DEIMOS
                </text>
              </g>
            )}

            {/* Sol / Fuente de Clima Espacial DONKI */}
            <g transform="translate(62, 50)">
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
              <text x="0" y="44" textAnchor="middle" fill="#fde68a" fontSize="10" fontFamily="monospace">
                {weather.type === 'NOMINAL' ? 'QUIET SUN' : `DONKI ${weather.type}`}
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

            {/* Montañas / Borde del Cráter Shackleton o Delta del Cráter Jezero */}
            <path
              d="M0,185 L120,135 L230,172 L370,128 L520,168 L675,132 L860,175 L860,270 L0,270 Z"
              fill={isLunar ? '#263042' : '#572517'}
            />

            {/* Superficie planetaria */}
            <path
              d="M0,192 Q240,176 460,190 T860,184 L860,270 L0,270 Z"
              fill={isLunar ? 'url(#groundLunar)' : 'url(#groundMars)'}
            />

            {/* Depósito de Hielo Polar (Luna) o Sedimentos del Delta (Marte) */}
            {isLunar ? (
              <g transform="translate(740, 218)">
                <ellipse cx="0" cy="0" rx="68" ry="16" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
                <path d="M-40,2 L-25,-6 L-10,3 L12,-7 L32,3 Z" fill="#38bdf8" opacity="0.65" />
                <text x="0" y="25" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontFamily="monospace">
                  HIELO CRÁTER SHACKLETON
                </text>
              </g>
            ) : (
              <g transform="translate(742, 220)">
                <ellipse cx="0" cy="0" rx="68" ry="15" fill="#3b160c" stroke="#fb923c" strokeWidth="1.2" />
                <text x="0" y="24" textAnchor="middle" fill="#fdba74" fontSize="10" fontFamily="monospace">
                  REGOLITO RICO EN CO₂ / H₂O
                </text>
              </g>
            )}

            {/* MÓDULO 1: Granja Solar y Baterías (Interactivo) */}
            <g
              transform="translate(135, 145)"
              className={`svg-module-node ${selectedModule === 'solar' ? 'svg-node-selected' : ''}`}
              onClick={() => {
                missionAudio.playClick();
                setSelectedModule('solar');
              }}
            >
              {/* Paneles Solares */}
              <rect x="-48" y="0" width="42" height="52" rx="3" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
              <line x1="-27" y1="0" x2="-27" y2="52" stroke="#93c5fd" strokeWidth="1" />
              <line x1="-48" y1="18" x2="-6" y2="18" stroke="#93c5fd" strokeWidth="1" />
              <line x1="-48" y1="35" x2="-6" y2="35" stroke="#93c5fd" strokeWidth="1" />

              <rect x="6" y="0" width="42" height="52" rx="3" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
              <line x1="27" y1="0" x2="27" y2="52" stroke="#93c5fd" strokeWidth="1" />
              <line x1="6" y1="18" x2="48" y2="18" stroke="#93c5fd" strokeWidth="1" />
              <line x1="6" y1="35" x2="48" y2="35" stroke="#93c5fd" strokeWidth="1" />

              {/* Banco de baterías en la base */}
              <rect x="-32" y="54" width="64" height="20" rx="4" fill="#1e293b" stroke="#f59e0b" strokeWidth="1.8" />
              <rect
                x="-28"
                y="58"
                width={Math.max(4, Math.round((resources.power / 100) * 56))}
                height="12"
                rx="2"
                fill={resources.power > 30 ? '#22c55e' : '#ef4444'}
              />
              <text x="0" y="90" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                ⚡ {resources.power}% kWh
              </text>
            </g>

            {/* MÓDULO 2 y 3: Domo Central ECLSS/MOXIE + Escudo de Agua Anti-Radiación */}
            <g transform="translate(415, 165)">
              {/* Cúpula de Escudo Magnético / Agua (se ilumina fuerte cuando effectiveShielding >= 60) */}
              <path
                d="M-105,40 A110,95 0 0,1 105,40"
                fill="url(#shieldAura)"
                stroke={projection.effectiveShielding >= 60 ? '#38bdf8' : '#f59e0b'}
                strokeWidth={projection.effectiveShielding >= 60 ? '3.5' : '1.8'}
                strokeDasharray={projection.effectiveShielding >= 60 ? 'none' : '6 4'}
                onClick={() => {
                  missionAudio.playClick();
                  setSelectedModule('shielding');
                }}
                className="svg-module-node"
              />

              {/* Domo Habitable Presurizado ECLSS */}
              <g
                className={`svg-module-node ${selectedModule === 'eclss' ? 'svg-node-selected' : ''}`}
                onClick={() => {
                  missionAudio.playClick();
                  setSelectedModule('eclss');
                }}
              >
                <path
                  d="M-72,40 A72,62 0 0,1 72,40 Z"
                  fill="#cbd5e1"
                  stroke="#f8fafc"
                  strokeWidth="2.5"
                />
                {/* Paredes de agua interna (Blindaje Hidrógeno) */}
                <path
                  d="M-64,38 A64,54 0 0,1 64,38"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth={Math.max(2, Math.round((projection.effectiveShielding / 100) * 8))}
                  opacity="0.75"
                />
                {/* Ventana y Esclusa */}
                <rect x="-18" y="10" width="36" height="30" rx="5" fill="#1e293b" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="0" cy="-6" r="10" fill="#38bdf8" opacity="0.85" />
                <text x="0" y="58" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                  🫧 O₂ {resources.lifeSupport}% | 🛡️ {projection.effectiveShielding}%
                </text>
              </g>
            </g>

            {/* MÓDULO 4: Invernadero Hidropónico Veggie (Interactivo) */}
            <g
              transform="translate(625, 172)"
              className={`svg-module-node ${selectedModule === 'greenhouse' ? 'svg-node-selected' : ''}`}
              onClick={() => {
                missionAudio.playClick();
                setSelectedModule('greenhouse');
              }}
            >
              <rect
                x="-58"
                y="0"
                width="116"
                height="36"
                rx="16"
                fill="#064e3b"
                stroke="#34d399"
                strokeWidth="2.2"
              />
              {/* Plantas hidropónicas iluminadas con LEDs */}
              <circle cx="-32" cy="18" r="8" fill="#22c55e" />
              <circle cx="-10" cy="16" r="9" fill="#4ade80" />
              <circle cx="14" cy="18" r="8" fill="#22c55e" />
              <circle cx="35" cy="17" r="7" fill="#4ade80" />
              <text x="0" y="53" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="bold">
                🌱 Veggie {resources.food}%
              </text>
            </g>

            {/* Antena de Espacio Profundo (Deep Space Network) */}
            <g transform="translate(275, 158)">
              <line x1="0" y1="45" x2="0" y2="15" stroke="#94a3b8" strokeWidth="3" />
              <path d="M-16,8 Q0,24 16,8" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
              <circle
                cx="0"
                cy="6"
                r="3.5"
                fill={commState === 'transmitting' ? '#22c55e' : '#f59e0b'}
              />
              {commState === 'transmitting' && (
                <circle
                  cx="0"
                  cy="6"
                  r="14"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="1.8"
                  className="pulse-sun"
                />
              )}
            </g>

            {/* Nube de polvo si hay tormenta marciana */}
            {isDustStorm && (
              <rect
                x="0"
                y="0"
                width="860"
                height="270"
                fill="rgba(180, 83, 9, 0.28)"
                pointerEvents="none"
              />
            )}
          </svg>
        </div>

        {/* Tarjetas selectoras de los 4 módulos + Inspector de Ingeniería */}
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
                <div className={`module-delta-pill ${mod.isPositive ? 'delta-pos' : 'delta-neg'}`}>
                  {mod.deltaLabel}
                </div>
              </button>
            );
          })}
        </div>

        {/* Inspector de Ingeniería del Módulo Seleccionado */}
        <div className="module-inspector" role="region" aria-live="polite">
          <div className="inspector-header">
            <strong>
              {activeDetail.icon} {activeDetail.title[lang]}
            </strong>
            <span className="inspector-telemetry">{activeDetail.statusText[lang]}</span>
          </div>
          <p className="inspector-note">🔬 {activeDetail.nasaEngineeringNote[lang]}</p>
        </div>

        {/* Simulador interactivo de Retraso de Señal Tierra-Base (Light-Time Delay) */}
        <div className="comm-delay-bar">
          <div className="comm-info-col">
            <div className="comm-header-line">
              <strong>
                📡{' '}
                {lang === 'es'
                  ? 'Simulador de Retraso de Luz Tierra ↔ Base:'
                  : 'Earth ↔ Outpost Light-Time Delay Simulator:'}{' '}
                <span className="comm-highlight">
                  {isLunar
                    ? `${realDelaySec} s (${lang === 'es' ? 'Luna' : 'Moon'})`
                    : `${realDelayMin} min / ${realDelaySec} s (${lang === 'es' ? 'Marte Día ' + currentDay : 'Mars Sol ' + currentDay})`}
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
                <span>👨‍🚀 {isLunar ? 'Artemis' : 'Jezero'}</span>
                <div className="comm-track-bar">
                  <div className="comm-track-fill" style={{ width: `${commProgress}%` }} />
                </div>
                <span>🌎 Houston</span>
              </div>
            )}

            {commState === 'received' && (
              <p className="comm-reply-box">
                {isLunar
                  ? currentPreset.houstonReplyLunar[lang]
                  : currentPreset.houstonReplyMars[lang]}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
