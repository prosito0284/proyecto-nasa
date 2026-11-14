/**
 * BLOQUE A (Asignado a: Claude Code - Rama: feat/simulation-engine)
 * Escenarios físicos reales de la Luna (Cráter Shackleton - Artemis) y Marte (Cráter Jezero)
 * + Tarjetas de Dilemas de Ingeniería con Trade-offs Reales.
 *
 * REGLA NASA: ninguna opción es "gratis". Cada TradeoffChoice tiene al menos un beneficio
 * y al menos un costo (inmediato o diferido al siguiente Sol/Día en `nextTurnEffect`).
 */

import {
  LocalizedText,
  MissionDilemmaCard,
  OutpostSiteConfig,
  OutpostSiteId,
  SpaceWeatherEvent,
} from '../types/mission';

const t = (es: string, en: string): LocalizedText => ({ es, en });

export const OUTPOST_SITES: Record<string, OutpostSiteConfig> = {
  'moon-shackleton': {
    id: 'moon-shackleton',
    name: {
      es: 'Base Lunar Artemis — Cráter Shackleton',
      en: 'Artemis Lunar Base — Shackleton Crater',
    },
    locationName: {
      es: 'Polo Sur Lunar (89.9°S, 0.0°E)',
      en: 'Lunar South Pole (89.9°S, 0.0°E)',
    },
    coordinates: '89.9° S, 0.0° E',
    gravityG: 0.166,
    avgTempCelsius: '-180°C (sombra) / -50°C (borde iluminado)',
    commDelaySeconds: 1.3,
    commDelayDisplay: {
      es: '1.3 segundos (casi instantáneo)',
      en: '1.3 seconds (nearly instant)',
    },
    dayName: {
      es: 'Día de Misión',
      en: 'Mission Day',
    },
    totalMissionDays: 8,
    description: {
      es: 'En el borde del Cráter Shackleton hay picos de luz solar casi continua para tus paneles, y en el fondo oscuro hay hielo de agua milenario. Pero no hay atmósfera que te proteja de la radiación solar (DONKI SEP) ni de los micrometeoritos.',
      en: 'Along Shackleton Crater’s rim, peaks of near-constant sunlight power your solar arrays, while ancient water ice hides in dark craters. However, there is zero atmosphere to block solar radiation (DONKI SEP) or micrometeorites.',
    },
    nasaMissionReference: {
      es: 'Datos basados en NASA Artemis III/IV, Lunar Reconnaissance Orbiter (LRO) y el dosímetro LND de Chang’e-4.',
      en: 'Data grounded in NASA Artemis III/IV, Lunar Reconnaissance Orbiter (LRO) & the Chang’e-4 LND dosimeter.',
    },
    initialResources: {
      power: 80,
      lifeSupport: 85,
      food: 75,
      shielding: 70,
      crewHealth: 95,
      radiationDoseMsv: 1.2,
      sciencePoints: 10,
    },
  },
  'mars-jezero': {
    id: 'mars-jezero',
    name: {
      es: 'Estación Marciana — Cráter Jezero',
      en: 'Martian Outpost — Jezero Crater',
    },
    locationName: {
      es: 'Cráter Jezero, Marte (18.38°N, 77.58°E)',
      en: 'Jezero Crater, Mars (18.38°N, 77.58°E)',
    },
    coordinates: '18.38° N, 77.58° E',
    gravityG: 0.378,
    avgTempCelsius: '-65°C promedio',
    commDelaySeconds: 720,
    commDelayDisplay: {
      es: '12 minutos por mensaje (4 a 24 min según órbita)',
      en: '12 minutes one-way (4 to 24 min orbital range)',
    },
    dayName: {
      es: 'Sol Marciano',
      en: 'Martian Sol',
    },
    totalMissionDays: 8,
    description: {
      es: 'Un antiguo delta fluvial explorado por Perseverance. La atmósfera de CO₂ permite fabricar oxígeno con MOXIE, pero consume muchísima energía y las tormentas de polvo cubren los paneles solares. Cada Sol dura 24 h 39 min.',
      en: 'An ancient river delta explored by Perseverance. The CO₂ atmosphere lets you generate oxygen via MOXIE, but it requires massive power and regional dust storms choke solar arrays. Each Sol lasts 24 h 39 min.',
    },
    nasaMissionReference: {
      es: 'Datos basados en Mars 2020 Perseverance (MEDA, MOXIE) y Curiosity RAD.',
      en: 'Data grounded in Mars 2020 Perseverance (MEDA, MOXIE) & Curiosity RAD.',
    },
    initialResources: {
      power: 75,
      lifeSupport: 80,
      food: 75,
      shielding: 75,
      crewHealth: 95,
      radiationDoseMsv: 2.4,
      sciencePoints: 15,
    },
  },
};

/**
 * Física simplificada (pero con números reales de la NASA como ancla) que usa el motor
 * para calcular cada turno. Los valores de recursos son % (0-100) adaptados para niños.
 */
export interface SitePhysics {
  /** Energía solar ganada por turno con eficiencia 1.0 (% de batería) */
  solarGainPerTurn: number;
  /** Consumo base del hábitat por turno: calefacción, computadoras, bombas (% de batería) */
  baseHabitatLoad: number;
  /** Consumo base de O₂/Agua por turno (ECLSS) */
  lifeSupportDrainPerTurn: number;
  /** Consumo base de comida por turno */
  foodDrainPerTurn: number;
  /** Desgaste del blindaje activo por turno */
  shieldingDecayPerTurn: number;
  /** Dosis de radiación de fondo por día SIN blindaje (mSv/día, dato real) */
  backgroundDoseMsvPerDay: number;
  /** Dosis acumulada (mSv añadidos en la misión) a partir de la cual la salud empieza a sufrir */
  doseWarningMsv: number;
  /** Probabilidad de que un día "tranquilo" se convierta en evento ambiental local */
  localEventChance: number;
  /** Retraso de comunicación mínimo / máximo en segundos (una vía) */
  commDelayRangeSeconds: [number, number];
  /** Duración del día de misión en horas */
  dayLengthHours: number;
  /** Explicación del dato real usado */
  physicsNote: LocalizedText;
}

export const SITE_PHYSICS: Record<OutpostSiteId, SitePhysics> = {
  'moon-shackleton': {
    solarGainPerTurn: 24,
    baseHabitatLoad: 21,
    lifeSupportDrainPerTurn: 6,
    foodDrainPerTurn: 5,
    shieldingDecayPerTurn: 2,
    // Chang’e-4 LND (Zhang et al. 2020, Science Advances): ~1.37 mSv/día en la superficie lunar
    backgroundDoseMsvPerDay: 1.37,
    doseWarningMsv: 14,
    localEventChance: 0.3,
    commDelayRangeSeconds: [1.25, 1.35],
    dayLengthHours: 24,
    physicsNote: t(
      'Sin atmósfera ni campo magnético, la superficie lunar recibe ~1.37 mSv al día (unas 2-3 veces más que la Estación Espacial). La calefacción contra -180°C consume mucha energía.',
      'With no atmosphere or magnetic field, the lunar surface receives ~1.37 mSv per day (2-3x the Space Station). Heating against -180°C costs a lot of power.'
    ),
  },
  'mars-jezero': {
    solarGainPerTurn: 22,
    baseHabitatLoad: 19,
    lifeSupportDrainPerTurn: 5,
    foodDrainPerTurn: 5,
    shieldingDecayPerTurn: 2,
    // Curiosity RAD (Hassler et al. 2014, Science): ~0.67 mSv/sol en el cráter Gale
    backgroundDoseMsvPerDay: 0.67,
    doseWarningMsv: 10,
    localEventChance: 0.45,
    commDelayRangeSeconds: [240, 1440],
    dayLengthHours: 24.65,
    physicsNote: t(
      'La delgada atmósfera de CO₂ frena un poco la radiación (~0.67 mSv por Sol según Curiosity RAD), pero el polvo puede bajar la energía solar hasta un 60%.',
      'The thin CO₂ atmosphere blocks a little radiation (~0.67 mSv per Sol per Curiosity RAD), but dust can cut solar power by up to 60%.'
    ),
  },
};

/**
 * Eventos ambientales locales (no vienen de DONKI) que el motor puede inyectar en días tranquilos.
 * Marte: tormenta de polvo regional. Luna: sombra pasajera sobre los picos del borde de Shackleton.
 */
export const SITE_ENVIRONMENT_EVENTS: Record<OutpostSiteId, SpaceWeatherEvent> = {
  'mars-jezero': {
    id: 'MARS-REGIONAL-DUST-STORM',
    type: 'DUST_STORM',
    classOrIntensity: 'Tormenta de polvo regional (opacidad τ ≈ 2)',
    startTime: '2026-11-14T00:00Z',
    sourceUrl: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/meda/',
    isLiveNasaData: false,
    severity: 'warning',
    title: t('Tormenta de Polvo Regional en Jezero', 'Regional Dust Storm over Jezero'),
    kidFriendlyExplanation: t(
      'Un viento enorme levantó polvo rojo que tapa el Sol. Tus paneles solares reciben mucha menos luz: ¡hoy hay que ahorrar energía!',
      'Giant winds lifted red dust that blocks the Sun. Your solar panels get far less light: today you must save power!'
    ),
    scienceFact: t(
      'En 2018 una tormenta de polvo global cubrió todo Marte y dejó sin energía al rover Opportunity. El sensor MEDA de Perseverance mide el polvo en Jezero.',
      'In 2018 a planet-wide dust storm blanketed Mars and left the Opportunity rover without power. Perseverance’s MEDA sensor measures dust at Jezero.'
    ),
    radiationMultiplier: 0.95,
    solarEfficiencyMultiplier: 0.4,
  },
  'moon-shackleton': {
    id: 'MOON-RIM-SHADOW-PASS',
    type: 'NOMINAL',
    classOrIntensity: 'Sombra pasajera en el borde (iluminación ~55%)',
    startTime: '2026-11-14T00:00Z',
    sourceUrl: 'https://lunar.gsfc.nasa.gov/',
    isLiveNasaData: false,
    severity: 'watch',
    title: t('Sombra Pasajera sobre los Paneles del Borde', 'Passing Shadow over the Rim Solar Arrays'),
    kidFriendlyExplanation: t(
      'En el Polo Sur el Sol apenas sube sobre el horizonte. Hoy la sombra de una montaña cubre parte de tus paneles y hace más frío.',
      'At the South Pole the Sun barely rises above the horizon. Today a mountain’s shadow covers part of your panels and it gets colder.'
    ),
    scienceFact: t(
      'Los mapas del altímetro LOLA (LRO) muestran que algunos picos cerca de Shackleton tienen luz más del 80% del año, ¡pero nunca el 100%!',
      'LRO’s LOLA altimeter maps show some peaks near Shackleton are lit over 80% of the year—but never 100%!'
    ),
    radiationMultiplier: 1.0,
    solarEfficiencyMultiplier: 0.55,
  },
};

export const INITIAL_DILEMMA_CARDS: MissionDilemmaCard[] = [
  // ───────────────────────────── AMBOS SITIOS ─────────────────────────────
  {
    id: 'solar-storm-alert',
    siteFilter: 'both',
    triggeredByWeather: ['FLR', 'SEP', 'CME'],
    highlightedTermId: 'sep',
    title: {
      es: 'Alerta DONKI: tormenta de partículas solares',
      en: 'DONKI alert: solar particle storm',
    },
    situation: {
      es: 'Los satélites de la NASA detectaron una eyección solar dirigiéndose a tu base. Si los astronautas reciben radiación alta, su salud bajará. ¿Cómo redistribuyes los recursos de la base hoy?',
      en: 'NASA satellites detected a solar particle wave heading toward your outpost. High radiation exposure will harm crew health. How will you trade off your outpost resources today?',
    },
    choices: [
      {
        id: 'max-water-shield',
        label: {
          es: 'Activar Escudo Magnético y Refugio de Agua al 100%',
          en: 'Activate Full Water-Wall Shelter & Active Shielding',
        },
        description: {
          es: 'Bombea toda el agua reciclada a las paredes del refugio y desvía la batería al blindaje.',
          en: 'Pump recycled water into the shelter walls and route battery reserves to active shielding.',
        },
        tradeoffWarning: {
          es: 'Protege a la tripulación (+18% Blindaje, +4% Salud), pero consume -20% de Energía y pausa el riego del invernadero (-12% Comida mañana).',
          en: 'Protects the crew (+18% Shielding, +4% Health), but drains -20% Power and pauses greenhouse irrigation (-12% Food tomorrow).',
        },
        resourceDelta: {
          power: -20,
          shielding: 18,
          crewHealth: 4,
        },
        nextTurnEffect: {
          description: {
            es: 'El invernadero recibió menos agua y luz durante el refugio solar.',
            en: 'Greenhouse received reduced water and lighting during the solar shelter lock-in.',
          },
          resourceDelta: {
            food: -12,
          },
        },
        outcomeFeedback: {
          es: '¡Decisión real de la NASA! En la nave Orion (Artemis), los astronautas usan los tanques de agua potable y bolsas de suministros para crear un refugio denso en hidrógeno que frena los protones solares.',
          en: 'Real NASA engineering! On the Orion spacecraft (Artemis), astronauts use water tanks and stowage bags to build a hydrogen-rich storm shelter that blocks solar protons.',
        },
        nasaDataReference: 'NASA DONKI SEP & Artemis I Orion Active Dosimetry (OSDR)',
      },
      {
        id: 'partial-shield-keep-greenhouse',
        label: {
          es: 'Blindaje Moderado y Mantener Invernadero Activo',
          en: 'Moderate Shielding & Keep Greenhouse Running',
        },
        description: {
          es: 'Cancela las salidas al exterior (EVA), pero no apagues las lámparas de cultivo ni las bombas de oxígeno.',
          en: 'Cancel outdoor EVAs, but keep hydroponic grow lamps and oxygen pumps running.',
        },
        tradeoffWarning: {
          es: 'Conservas tus cultivos (+8% Comida) y ahorras batería (solo -8% Energía), pero la tripulación absorbe +1.8 mSv de radiación (-8% Salud).',
          en: 'Preserves crops (+8% Food) and saves battery (only -8% Power), but crew absorbs +1.8 mSv radiation (-8% Health).',
        },
        resourceDelta: {
          power: -8,
          food: 8,
          crewHealth: -8,
          radiationDoseMsv: 1.8,
          sciencePoints: 5,
        },
        outcomeFeedback: {
          es: 'Equilibraste comida y energía, pero la dosis en milisieverts (mSv) subió. Los planificadores de misión vigilan el límite de radiación acumulada de cada astronauta.',
          en: 'You balanced food and power, but radiation dose (mSv) increased. Mission planners strictly track each astronaut’s career radiation limit.',
        },
        nasaDataReference: 'NASA OSDR Biological & Radiation Dosimetry Dataset (Curiosity RAD)',
      },
    ],
  },
  {
    id: 'eclss-oxygen-vs-crops',
    siteFilter: 'both',
    highlightedTermId: 'eclss',
    title: {
      es: 'Energía justa: oxígeno o calor para los cultivos',
      en: 'Tight power: oxygen or heat for the crops',
    },
    situation: {
      es: 'Durante la noche helada, las baterías bajaron. No hay suficiente potencia para operar al máximo el reciclador de aire/agua (ECLSS) y los calefactores de papas y lechugas espaciales al mismo tiempo.',
      en: 'During the freezing night, battery reserves dropped. There isn’t enough wattage to run both the ECLSS air/water recycler and the space lettuce heaters at full capacity.',
    },
    choices: [
      {
        id: 'prioritize-eclss',
        label: {
          es: 'Priorizar Oxígeno y Reciclaje de Agua (ECLSS)',
          en: 'Prioritize Oxygen & Water Recycling (ECLSS)',
        },
        description: {
          es: 'Dedica la energía principal a electrolizar agua para producir oxígeno puro.',
          en: 'Dedicate primary power to water electrolysis for pure breathable oxygen.',
        },
        tradeoffWarning: {
          es: 'Sube Soporte Vital (+16%), pero el frío marchita parte de la cosecha (-14% Comida) y gasta -12% de Energía.',
          en: 'Boosts Life Support (+16%), but cold temperatures wilt part of the harvest (-14% Food) and uses -12% Power.',
        },
        resourceDelta: {
          lifeSupport: 16,
          food: -14,
          power: -12,
          sciencePoints: 4,
        },
        outcomeFeedback: {
          es: '¡Sin oxígeno una misión termina en horas, mientras que la comida dura días! En la EEI, el sistema ECLSS recicla hasta el 98% del agua.',
          en: 'Without oxygen a mission fails in hours, whereas food reserves last days! On the ISS, ECLSS recycles up to 98% of water.',
        },
        nasaDataReference: 'NASA ECLSS (Environmental Control and Life Support System) — ISS Water Recovery 98%',
      },
      {
        id: 'prioritize-hydroponics',
        label: {
          es: 'Proteger el Invernadero Veggie y Usar Reservas de O₂',
          en: 'Protect Veggie Greenhouse & Draw Down O₂ Tanks',
        },
        description: {
          es: 'Mantén calientes las plantas (que también producen algo de oxígeno por fotosíntesis) y usa tanques de emergencia.',
          en: 'Keep plants warm (which also produce some oxygen via photosynthesis) and tap emergency O₂ tanks.',
        },
        tradeoffWarning: {
          es: 'Cosecha exitosa (+15% Comida, +10 Ciencia), pero los tanques de Soporte Vital bajan (-15% O₂/Agua) y gasta -8% Energía.',
          en: 'Successful harvest (+15% Food, +10 Science), but Life Support tanks drop (-15% O₂/Water) and uses -8% Power.',
        },
        resourceDelta: {
          food: 15,
          lifeSupport: -15,
          power: -8,
          sciencePoints: 10,
        },
        outcomeFeedback: {
          es: 'Los experimentos Veggie y APH de la NASA (OSDR) demostraron que cultivar hojas verdes mejora la nutrición y el ánimo de los astronautas, aunque no reemplaza por completo al ECLSS.',
          en: 'NASA’s Veggie and APH experiments (OSDR) proved that growing leafy greens boosts astronaut nutrition and morale, though it cannot fully replace mechanical ECLSS.',
        },
        nasaDataReference: 'NASA OSDR Space Biology Plant Habitat Studies (OSD-379 / Veggie)',
      },
    ],
  },
  {
    id: 'eva-science-vs-battery',
    siteFilter: 'both',
    highlightedTermId: 'regolith',
    title: {
      es: 'Caminata espacial o recarga de baterías',
      en: 'Spacewalk or battery recharge',
    },
    situation: {
      es: 'El equipo científico encontró una zona rica en minerales y hielo bajo el regolito, pero preparar los trajes espaciales y el rover presurizado consume mucha energía y oxígeno.',
      en: 'The science team spotted a zone rich in minerals and subsurface ice beneath the regolith, but pressurizing spacesuits and the rover consumes heavy power and oxygen.',
    },
    choices: [
      {
        id: 'launch-eva',
        label: {
          es: 'Realizar Caminata Espacial (EVA) y Extraer Muestras',
          en: 'Launch Spacewalk (EVA) & Extract Regolith Ice',
        },
        description: {
          es: 'Sal del hábitat con el rover para recolectar hielo de agua y datos geológicos.',
          en: 'Exit the habitat with the rover to harvest water ice and geological data.',
        },
        tradeoffWarning: {
          es: '+25 Puntos de Ciencia y +12% Soporte Vital (hielo extraído), pero cuesta -18% Energía y +0.6 mSv de radiación al salir del domo.',
          en: '+25 Science Points and +12% Life Support (harvested ice), but costs -18% Power and +0.6 mSv radiation outside the dome.',
        },
        resourceDelta: {
          power: -18,
          lifeSupport: 12,
          radiationDoseMsv: 0.6,
          sciencePoints: 25,
        },
        outcomeFeedback: {
          es: '¡Eso es ISRU (Utilización de Recursos In-Situ)! Extraer agua del regolito lunar o marciano evita tener que lanzarla desde la Tierra, donde cada litro cuesta miles de dólares.',
          en: 'That is ISRU (In-Situ Resource Utilization)! Harvesting water from lunar or Martian regolith saves launching it from Earth, where every liter costs thousands of dollars.',
        },
        nasaDataReference: 'NASA Artemis ISRU & VIPER Lunar Volatiles Research',
      },
      {
        id: 'stay-inside-maintenance',
        label: {
          es: 'Quedarse en el Domo: Limpiar Paneles y Ahorrar Energía',
          en: 'Stay Inside Dome: Clean Solar Arrays & Conserve Power',
        },
        description: {
          es: 'Usa brazos robóticos desde adentro para limpiar el polvo electrostático de los paneles solares.',
          en: 'Use robotic arms from inside to brush electrostatic dust off the solar arrays.',
        },
        tradeoffWarning: {
          es: 'Recuperas +18% de Energía y +6% de Blindaje sin recibir radiación, pero pierdes la ventana de investigación (+2 Ciencia) y el soporte vital baja -8%.',
          en: 'Recover +18% Power and +6% Shielding with zero radiation exposure, but miss the research window (+2 Science) and Life Support drops -8%.',
        },
        resourceDelta: {
          power: 18,
          shielding: 6,
          lifeSupport: -8,
          sciencePoints: 2,
        },
        outcomeFeedback: {
          es: 'El polvo lunar y marciano reduce drásticamente la energía solar. La misión InSight en Marte terminó porque el polvo cubrió sus paneles; mantenerlos limpios salva la base.',
          en: 'Lunar and Martian dust drastically cuts solar power. NASA’s InSight lander on Mars ended because dust covered its panels; keeping arrays clean saves the outpost.',
        },
        nasaDataReference: 'NASA InSight Mars Lander & Apollo Dust Mitigation Reports',
      },
    ],
  },
  {
    id: 'cme-incoming',
    siteFilter: 'both',
    triggeredByWeather: ['CME', 'SEP'],
    highlightedTermId: 'cme',
    title: t(
      'Eyección de Masa Coronal (CME) en Camino',
      'Coronal mass ejection inbound'
    ),
    situation: t(
      'El modelo WSA-ENLIL de la NASA calcula que una nube gigante de plasma solar (CME) llegará en pocas horas. Tienes tiempo para prepararte… pero prepararse cuesta.',
      'NASA’s WSA-ENLIL model predicts a giant cloud of solar plasma (CME) will arrive within hours. You have time to prepare… but preparing has a cost.'
    ),
    choices: [
      {
        id: 'precharge-shelter',
        label: t('Cargar Escudos y Encerrar a la Tripulación', 'Charge Shields & Lock Down the Crew'),
        description: t(
          'Usa la batería para reforzar el blindaje y mueve a todos al refugio central antes de que llegue la CME.',
          'Use the battery to reinforce shielding and move everyone to the central shelter before the CME hits.'
        ),
        tradeoffWarning: t(
          '+14% Blindaje, pero gasta -16% Energía y el invernadero queda a oscuras (-6% Comida mañana).',
          '+14% Shielding, but spends -16% Power and the greenhouse goes dark (-6% Food tomorrow).'
        ),
        resourceDelta: { shielding: 14, power: -16 },
        nextTurnEffect: {
          description: t(
            'Las plantas pasaron un día sin luz LED durante el encierro por la CME.',
            'The plants spent a day without LED light during the CME lockdown.'
          ),
          resourceDelta: { food: -6 },
        },
        outcomeFeedback: t(
          '¡Bien anticipado! Los pronósticos de DONKI dan horas o días de aviso. Prepararse antes de la tormenta es mucho más barato que curar a la tripulación después.',
          'Well anticipated! DONKI forecasts give hours or days of warning. Preparing before the storm is far cheaper than treating the crew afterward.'
        ),
        nasaDataReference: 'NASA DONKI CME Analysis & WSA-ENLIL Arrival Model (CCMC)',
      },
      {
        id: 'continue-ops-watch',
        label: t('Seguir Trabajando y Vigilar los Sensores', 'Keep Working & Watch the Sensors'),
        description: t(
          'No detengas los experimentos; la tripulación solo entrará si los dosímetros suben mucho.',
          'Don’t stop the experiments; the crew will only go inside if dosimeters spike.'
        ),
        tradeoffWarning: t(
          '+12 Ciencia y casi no gastas energía (-4%), pero la tripulación recibe +1.2 mSv (-6% Salud).',
          '+12 Science and almost no power used (-4%), but the crew takes +1.2 mSv (-6% Health).'
        ),
        resourceDelta: { sciencePoints: 12, power: -4, radiationDoseMsv: 1.2, crewHealth: -6 },
        outcomeFeedback: t(
          'Ganaste datos, pero aceptaste riesgo. En la vida real, la NASA prefiere “tan bajo como sea razonablemente posible” (ALARA) para la radiación.',
          'You gained data, but accepted risk. In real life, NASA follows “As Low As Reasonably Achievable” (ALARA) for radiation.'
        ),
        nasaDataReference: 'NASA Space Radiation Analysis Group (SRAG, JSC) — ALARA principle',
      },
    ],
  },
  {
    id: 'flare-eva-recall',
    siteFilter: 'both',
    triggeredByWeather: ['FLR', 'SEP'],
    highlightedTermId: 'msv',
    title: t(
      'Llamarada solar con astronautas afuera',
      'Solar flare with astronauts outside'
    ),
    situation: t(
      'Dos astronautas están en una caminata espacial cuando DONKI detecta una llamarada. La luz llega en 8 minutos, pero los protones peligrosos tardan un poco más. ¿Regresan ya?',
      'Two astronauts are on a spacewalk when DONKI detects a flare. Its light arrives in 8 minutes, but the dangerous protons take a bit longer. Do they come back now?'
    ),
    choices: [
      {
        id: 'abort-eva-now',
        label: t('Abortar la EVA y Regresar de Inmediato', 'Abort the EVA & Return Immediately'),
        description: t(
          'Deja las herramientas afuera y vuelve a la esclusa lo más rápido posible.',
          'Leave the tools outside and get back to the airlock as fast as possible.'
        ),
        tradeoffWarning: t(
          'La tripulación queda a salvo (+2% Salud), pero se pierden las muestras (-5 Ciencia) y el ciclo de emergencia de la esclusa gasta aire (-6% Soporte Vital).',
          'Crew stays safe (+2% Health), but the samples are lost (-5 Science) and the emergency airlock cycle wastes air (-6% Life Support).'
        ),
        resourceDelta: { crewHealth: 2, sciencePoints: -5, lifeSupport: -6 },
        outcomeFeedback: t(
          'La seguridad primero. Los controladores de radiación de la NASA (SRAG) pueden ordenar terminar una EVA si llega una tormenta solar.',
          'Safety first. NASA radiation controllers (SRAG) can order an EVA to end early if a solar storm arrives.'
        ),
        nasaDataReference: 'NASA DONKI FLR + JSC Space Radiation Analysis Group (SRAG) EVA flight rules',
      },
      {
        id: 'finish-sample',
        label: t('Terminar de Tomar la Muestra (10 min más)', 'Finish Collecting the Sample (10 more min)'),
        description: t(
          'La muestra es única. Los astronautas se apuran y regresan después.',
          'The sample is one of a kind. The astronauts hurry and come back afterward.'
        ),
        tradeoffWarning: t(
          '+20 Ciencia, pero +1.5 mSv de radiación extra (-8% Salud).',
          '+20 Science, but +1.5 mSv extra radiation (-8% Health).'
        ),
        resourceDelta: { sciencePoints: 20, radiationDoseMsv: 1.5, crewHealth: -8 },
        outcomeFeedback: t(
          'Conseguiste una muestra valiosa, pero la radiación se acumula toda la carrera de un astronauta. Cada mSv cuenta.',
          'You got a valuable sample, but radiation adds up over an astronaut’s whole career. Every mSv counts.'
        ),
        nasaDataReference: 'NASA OSDR Radiation Dosimetry & NASA-STD-3001 career exposure limit (600 mSv)',
      },
    ],
  },
  {
    id: 'low-gravity-exercise',
    siteFilter: 'both',
    highlightedTermId: 'gravity',
    title: t(
      'Huesos Fuertes en Baja Gravedad',
      'Strong Bones in Low Gravity'
    ),
    situation: t(
      'Con menos gravedad, los huesos y músculos se debilitan si no hacen ejercicio. La caminadora con arneses gasta energía y hace que la tripulación coma más.',
      'With less gravity, bones and muscles weaken without exercise. The harnessed treadmill uses power and makes the crew eat more.'
    ),
    choices: [
      {
        id: 'treadmill-session',
        label: t('Sesión de Ejercicio de 2 Horas', '2-Hour Exercise Session'),
        description: t(
          'Toda la tripulación usa la caminadora y la máquina de resistencia.',
          'The whole crew uses the treadmill and the resistance machine.'
        ),
        tradeoffWarning: t(
          '+10% Salud, pero cuesta -10% Energía y -4% Comida (más calorías).',
          '+10% Health, but costs -10% Power and -4% Food (more calories).'
        ),
        resourceDelta: { crewHealth: 10, power: -10, food: -4 },
        outcomeFeedback: t(
          '¡Igual que en la Estación Espacial! Los astronautas hacen unas 2 horas de ejercicio al día con la máquina ARED para no perder hueso.',
          'Just like on the Space Station! Astronauts exercise about 2 hours a day on the ARED machine to avoid losing bone.'
        ),
        nasaDataReference: 'NASA Human Research Program — ISS ARED exercise & bone density studies',
      },
      {
        id: 'skip-exercise-science',
        label: t('Saltar el Ejercicio y Hacer Más Ciencia', 'Skip Exercise & Do More Science'),
        description: t(
          'Usa esas horas para analizar muestras en el laboratorio.',
          'Use those hours to analyze samples in the lab.'
        ),
        tradeoffWarning: t(
          '+14 Ciencia hoy, pero mañana la tripulación estará más débil (-10% Salud).',
          '+14 Science today, but tomorrow the crew will be weaker (-10% Health).'
        ),
        resourceDelta: { sciencePoints: 14 },
        nextTurnEffect: {
          description: t(
            'Músculos y huesos se debilitaron por saltarse el ejercicio en baja gravedad.',
            'Muscles and bones weakened after skipping exercise in low gravity.'
          ),
          resourceDelta: { crewHealth: -10 },
        },
        outcomeFeedback: t(
          'En microgravedad los astronautas pueden perder ~1% de masa ósea por mes sin ejercicio. La salud de hoy es la ciencia de mañana.',
          'In microgravity astronauts can lose ~1% of bone mass per month without exercise. Today’s health is tomorrow’s science.'
        ),
        nasaDataReference: 'NASA Human Research Program — Bone loss ~1%/month in microgravity',
      },
    ],
  },
  {
    id: 'greenhouse-harvest-timing',
    siteFilter: 'both',
    highlightedTermId: 'veggie',
    title: t(
      'Cosechar hoy o dejar crecer las lechugas',
      'Harvest today or let the lettuce grow'
    ),
    situation: t(
      'Las lechugas “Outredgeous” del invernadero ya se pueden comer, pero si siguen creciendo con luz LED darán más comida… y gastarán más energía.',
      'The “Outredgeous” lettuce in the greenhouse is ready to eat, but if it keeps growing under LED light it will give more food… and use more power.'
    ),
    choices: [
      {
        id: 'harvest-now',
        label: t('Cosechar Ahora y Apagar las Luces', 'Harvest Now & Switch Off the Lights'),
        description: t(
          'Recoge todo y apaga las lámparas LED para ahorrar batería.',
          'Pick everything and turn off the LED lamps to save battery.'
        ),
        tradeoffWarning: t(
          '+12% Comida y +4% Energía hoy, pero mañana las bandejas estarán vacías (-8% Comida).',
          '+12% Food and +4% Power today, but tomorrow the trays will be empty (-8% Food).'
        ),
        resourceDelta: { food: 12, power: 4 },
        nextTurnEffect: {
          description: t(
            'Las bandejas de cultivo quedaron vacías y las semillas nuevas apenas germinan.',
            'The grow trays are empty and the new seeds are barely sprouting.'
          ),
          resourceDelta: { food: -8 },
        },
        outcomeFeedback: t(
          'Comer verduras frescas es bueno para la salud y el ánimo, pero un invernadero necesita tiempo: sembrar hoy es comer en semanas.',
          'Eating fresh greens is good for health and mood, but a greenhouse needs time: planting today means eating in weeks.'
        ),
        nasaDataReference: 'NASA Veggie (VEG-01/03) — “Outredgeous” red romaine grown on ISS (OSDR)',
      },
      {
        id: 'grow-longer',
        label: t('Dejar Crecer con Luz LED Extra', 'Let Them Grow with Extra LED Light'),
        description: t(
          'Mantén las lámparas encendidas un día más y registra datos de crecimiento.',
          'Keep the lamps on one more day and record growth data.'
        ),
        tradeoffWarning: t(
          '-10% Energía y hoy comen de la despensa (-4% Comida), pero mañana +16% Comida y +6 Ciencia de datos de plantas.',
          '-10% Power and today the crew eats from storage (-4% Food), but tomorrow +16% Food and +6 Science from plant data.'
        ),
        resourceDelta: { power: -10, food: -4, sciencePoints: 6 },
        nextTurnEffect: {
          description: t(
            '¡Las lechugas crecieron grandes y la cosecha fue abundante!',
            'The lettuce grew big and the harvest was plentiful!'
          ),
          resourceDelta: { food: 16 },
        },
        outcomeFeedback: t(
          'Paciencia de ingeniero: invertir energía hoy da más comida mañana. El hábitat APH de la NASA estudia cómo crecen las plantas con distintas luces.',
          'Engineer’s patience: investing power today gives more food tomorrow. NASA’s APH habitat studies how plants grow under different lights.'
        ),
        nasaDataReference: 'NASA Advanced Plant Habitat (APH) — OSDR plant growth datasets',
      },
    ],
  },

  // ───────────────────────────── LUNA — SHACKLETON ─────────────────────────────
  {
    id: 'moon-psr-ice',
    siteFilter: 'moon-shackleton',
    highlightedTermId: 'regolith',
    title: t(
      'Hielo en la Sombra Eterna de Shackleton',
      'Ice in Shackleton’s Eternal Shadow'
    ),
    situation: t(
      'El fondo del cráter nunca ha visto la luz del Sol y está a más de -180°C. Ahí hay hielo de agua de hace miles de millones de años. Tus tanques de agua necesitan recarga.',
      'The crater floor has never seen sunlight and is colder than -180°C. Billion-year-old water ice is hidden there. Your water tanks need refilling.'
    ),
    choices: [
      {
        id: 'psr-rover-ice-run',
        label: t('Enviar el Rover Calefactado al Cráter Oscuro', 'Send the Heated Rover into the Dark Crater'),
        description: t(
          'El rover baja a la sombra permanente, excava regolito helado y lo trae para derretirlo.',
          'The rover drives into permanent shadow, digs icy regolith and brings it back to melt.'
        ),
        tradeoffWarning: t(
          '+18% Soporte Vital y +15 Ciencia, pero -18% Energía hoy y mañana -6% Energía (las baterías del rover se congelaron).',
          '+18% Life Support and +15 Science, but -18% Power today and -6% Power tomorrow (the rover batteries froze).'
        ),
        resourceDelta: { lifeSupport: 18, sciencePoints: 15, power: -18 },
        nextTurnEffect: {
          description: t(
            'Las baterías del rover se recuperan lentamente del frío extremo.',
            'The rover batteries slowly recover from the extreme cold.'
          ),
          resourceDelta: { power: -6 },
        },
        outcomeFeedback: t(
          '¡ISRU real! En 2009 la misión LCROSS de la NASA chocó contra un cráter polar y encontró agua. El LRO sigue mapeando estas “trampas frías”.',
          'Real ISRU! In 2009 NASA’s LCROSS mission impacted a polar crater and found water. LRO still maps these “cold traps.”'
        ),
        nasaDataReference: 'NASA LCROSS (2009) & LRO Diviner/LAMP — polar water ice',
      },
      {
        id: 'ration-water',
        label: t('Racionar Agua y Reciclar al Máximo', 'Ration Water & Recycle to the Max'),
        description: t(
          'No salgas: reduce duchas y bebidas, y deja que el ECLSS recicle cada gota.',
          'Don’t go out: cut showers and drinks, and let ECLSS recycle every drop.'
        ),
        tradeoffWarning: t(
          'Ahorras energía (-4%) y ganas +5% Soporte Vital, pero la tripulación se siente cansada y con sed (-7% Salud).',
          'Saves power (-4%) and gains +5% Life Support, but the crew feels tired and thirsty (-7% Health).'
        ),
        resourceDelta: { power: -4, lifeSupport: 5, crewHealth: -7 },
        outcomeFeedback: t(
          'Reciclar es clave, pero ningún reciclador es 100% eficiente. Por eso encontrar agua local es tan importante para Artemis.',
          'Recycling is key, but no recycler is 100% efficient. That’s why finding local water is so important for Artemis.'
        ),
        nasaDataReference: 'NASA ECLSS Water Recovery System (ISS) — ~98% recovery',
      },
    ],
  },
  {
    id: 'moon-teleop-rover',
    siteFilter: 'moon-shackleton',
    highlightedTermId: 'light-delay',
    title: t(
      'Rover: lo maneja la Tierra o la tripulación',
      'Rover: driven from Earth or by the crew'
    ),
    situation: t(
      'La Luna está tan cerca que una señal de radio tarda solo 1.3 segundos. ¡El Control de Misión podría manejar el rover a distancia como un videojuego!',
      'The Moon is so close that a radio signal takes only 1.3 seconds. Mission Control could drive the rover remotely like a video game!'
    ),
    choices: [
      {
        id: 'earth-teleop',
        label: t('Que la Tierra Maneje el Rover', 'Let Earth Drive the Rover'),
        description: t(
          'Envía video en vivo a la Tierra; los astronautas se quedan seguros adentro.',
          'Stream live video to Earth; the astronauts stay safe inside.'
        ),
        tradeoffWarning: t(
          '+14 Ciencia sin radiación, pero la antena y el rover gastan -12% Energía.',
          '+14 Science with no radiation, but the antenna and rover use -12% Power.'
        ),
        resourceDelta: { sciencePoints: 14, power: -12 },
        outcomeFeedback: t(
          'Con solo 1.3 s de retraso, la teleoperación desde la Tierra funciona. ¡En Marte sería imposible: cada orden tardaría hasta 24 minutos!',
          'With only a 1.3 s delay, teleoperation from Earth works. On Mars it would be impossible: each command could take up to 24 minutes!'
        ),
        nasaDataReference: 'NASA Deep Space Network — Earth–Moon light time 1.3 s',
      },
      {
        id: 'crew-eva-drive',
        label: t('Los Astronautas Salen a Manejar', 'Astronauts Go Out & Drive'),
        description: t(
          'Los astronautas ven y deciden en el momento, encontrando rocas más interesantes.',
          'The astronauts see and decide on the spot, finding more interesting rocks.'
        ),
        tradeoffWarning: t(
          '+22 Ciencia, pero los trajes gastan aire (-8% Soporte Vital), -6% Energía y +0.5 mSv de radiación.',
          '+22 Science, but the suits use air (-8% Life Support), -6% Power and +0.5 mSv radiation.'
        ),
        resourceDelta: { sciencePoints: 22, lifeSupport: -8, power: -6, radiationDoseMsv: 0.5 },
        outcomeFeedback: t(
          'Los geólogos humanos son rápidos y creativos, como en Apolo 17. Pero cada salida cuesta oxígeno y radiación.',
          'Human geologists are fast and creative, like on Apollo 17. But every trip outside costs oxygen and radiation.'
        ),
        nasaDataReference: 'NASA Apollo 17 Lunar Roving Vehicle & Artemis LTV (Lunar Terrain Vehicle)',
      },
    ],
  },
  {
    id: 'moon-shadow-heating',
    siteFilter: 'moon-shackleton',
    highlightedTermId: 'shackleton',
    title: t(
      'Viene la sombra: cómo mantener el calor',
      'Shadow incoming: how to stay warm'
    ),
    situation: t(
      'En el Polo Sur el Sol va casi rozando el horizonte. Durante unas horas la sombra de una montaña cubrirá tu base y la temperatura exterior caerá en picada.',
      'At the South Pole the Sun skims the horizon. For a few hours a mountain’s shadow will cover your base and the outside temperature will plunge.'
    ),
    choices: [
      {
        id: 'heat-with-battery',
        label: t('Calefacción Completa con Baterías', 'Full Heating from Batteries'),
        description: t('Mantén el hábitat a 21°C toda la noche.', 'Keep the habitat at 21°C all night.'),
        tradeoffWarning: t(
          'La tripulación duerme bien (+4% Salud), pero gastas -16% Energía.',
          'The crew sleeps well (+4% Health), but you spend -16% Power.'
        ),
        resourceDelta: { crewHealth: 4, power: -16 },
        outcomeFeedback: t(
          'Calentar un hábitat en el espacio es caro. Por eso Artemis busca los “picos de luz eterna” cerca de Shackleton.',
          'Heating a habitat in space is expensive. That’s why Artemis targets the “peaks of eternal light” near Shackleton.'
        ),
        nasaDataReference: 'NASA LRO LOLA South Pole Illumination Maps',
      },
      {
        id: 'cold-sleep-mode',
        label: t('Modo Ahorro: 15°C y Sacos de Dormir', 'Saver Mode: 15°C & Sleeping Bags'),
        description: t('Baja el termostato y todos duermen abrigados.', 'Turn down the thermostat and everyone bundles up.'),
        tradeoffWarning: t(
          'Los calefactores casi apagados ahorran batería (+4% Energía), pero la tripulación pasa frío y duerme mal (-8% Salud).',
          'Heaters almost off save battery (+4% Power), but the crew gets cold and sleeps badly (-8% Health).'
        ),
        resourceDelta: { power: 4, crewHealth: -8 },
        outcomeFeedback: t(
          'Ahorraste batería, pero dormir mal afecta la concentración. ¡Los astronautas cansados cometen más errores!',
          'You saved battery, but poor sleep hurts focus. Tired astronauts make more mistakes!'
        ),
        nasaDataReference: 'NASA Human Research Program — Sleep & circadian studies',
      },
      {
        id: 'borrow-greenhouse-heat',
        label: t('Usar el Calor del Invernadero', 'Borrow Heat from the Greenhouse'),
        description: t(
          'Desvía el aire caliente del invernadero al dormitorio.',
          'Divert warm greenhouse air to the sleeping quarters.'
        ),
        tradeoffWarning: t(
          'Solo -8% Energía y la tripulación duerme cómoda (+2% Salud), pero las plantas pasan frío (-6% Comida hoy y -8% mañana).',
          'Only -8% Power and the crew sleeps comfortably (+2% Health), but the plants get cold (-6% Food today and -8% tomorrow).'
        ),
        resourceDelta: { power: -8, food: -6, crewHealth: 2 },
        nextTurnEffect: {
          description: t('Algunas plantas se dañaron por el frío nocturno.', 'Some plants were damaged by the night chill.'),
          resourceDelta: { food: -8 },
        },
        outcomeFeedback: t(
          'Todo en una base está conectado: el calor que ayuda a las personas puede faltar a las plantas.',
          'Everything in a base is connected: the heat that helps people may be missing for the plants.'
        ),
        nasaDataReference: 'NASA Veggie / APH temperature requirements (OSDR)',
      },
    ],
  },
  {
    id: 'moon-regolith-berm',
    siteFilter: 'moon-shackleton',
    highlightedTermId: 'regolith',
    title: t(
      'Muro de regolito contra la radiación',
      'Regolith wall against radiation'
    ),
    situation: t(
      'Sin atmósfera, la radiación golpea la base todos los días. Una excavadora robótica podría apilar regolito (polvo lunar) alrededor del hábitat como escudo.',
      'With no atmosphere, radiation hits the base every day. A robotic bulldozer could pile regolith (lunar dust) around the habitat as a shield.'
    ),
    choices: [
      {
        id: 'build-berm',
        label: t('Construir el Muro de Regolito', 'Build the Regolith Wall'),
        description: t(
          'Un astronauta supervisa afuera mientras la excavadora trabaja todo el día.',
          'An astronaut supervises outside while the bulldozer works all day.'
        ),
        tradeoffWarning: t(
          '+18% Blindaje hoy y +5% mañana, pero -14% Energía, -5% Soporte Vital y +0.4 mSv. Cero ciencia hoy.',
          '+18% Shielding today and +5% tomorrow, but -14% Power, -5% Life Support and +0.4 mSv. Zero science today.'
        ),
        resourceDelta: { shielding: 18, power: -14, lifeSupport: -5, radiationDoseMsv: 0.4 },
        nextTurnEffect: {
          description: t('El muro de regolito se asentó y protege aún mejor.', 'The regolith wall settled and protects even better.'),
          resourceDelta: { shielding: 5 },
        },
        outcomeFeedback: t(
          'Un par de metros de regolito pueden frenar gran parte de la radiación. ¡Construir con materiales locales es ISRU!',
          'A couple of meters of regolith can stop much of the radiation. Building with local materials is ISRU!'
        ),
        nasaDataReference: 'NASA Lunar Surface Innovation Initiative — regolith shielding studies',
      },
      {
        id: 'keep-drilling',
        label: t('Seguir Perforando para Ciencia', 'Keep Drilling for Science'),
        description: t(
          'Usa la excavadora para sacar núcleos de hielo y roca en vez de construir.',
          'Use the bulldozer to extract ice and rock cores instead of building.'
        ),
        tradeoffWarning: t(
          '+18 Ciencia, pero -6% Energía y el blindaje sigue desgastándose (-6% hoy y -4% mañana).',
          '+18 Science, but -6% Power and shielding keeps wearing down (-6% today and -4% tomorrow).'
        ),
        resourceDelta: { sciencePoints: 18, power: -6, shielding: -6 },
        nextTurnEffect: {
          description: t(
            'Sin mantenimiento, el blindaje del hábitat siguió perdiendo eficacia.',
            'Without maintenance, the habitat shielding kept losing effectiveness.'
          ),
          resourceDelta: { shielding: -4 },
        },
        outcomeFeedback: t(
          'Los núcleos de hielo cuentan la historia del Sistema Solar, pero la base queda más expuesta.',
          'Ice cores tell the story of the Solar System, but the base is left more exposed.'
        ),
        nasaDataReference: 'NASA VIPER / PRIME-1 drill science objectives',
      },
    ],
  },
  {
    id: 'moon-micrometeorite',
    siteFilter: 'moon-shackleton',
    highlightedTermId: 'micrometeorite',
    title: t(
      'Un micrometeorito perforó el radiador',
      'A micrometeorite punctured the radiator'
    ),
    situation: t(
      'Sin atmósfera, granitos de roca más rápidos que una bala golpean la superficie lunar. Uno perforó un tubo del radiador que enfría las baterías.',
      'With no atmosphere, grains of rock faster than a bullet hit the lunar surface. One punctured a radiator tube that cools the batteries.'
    ),
    choices: [
      {
        id: 'eva-repair',
        label: t('Reparación con Caminata Espacial', 'Repair with a Spacewalk'),
        description: t('Dos astronautas salen a parchar el tubo hoy mismo.', 'Two astronauts go out to patch the tube today.'),
        tradeoffWarning: t(
          'Reparación completa (+4% Blindaje), pero los trajes gastan -6% Soporte Vital, -5% Energía y +0.5 mSv.',
          'Full repair (+4% Shielding), but the suits use -6% Life Support, -5% Power and +0.5 mSv.'
        ),
        resourceDelta: { shielding: 4, lifeSupport: -6, power: -5, radiationDoseMsv: 0.5 },
        outcomeFeedback: t(
          'Los astronautas de la EEI ya han reparado daños por micrometeoritos. ¡Las manos humanas son herramientas increíbles!',
          'ISS astronauts have repaired micrometeoroid damage before. Human hands are amazing tools!'
        ),
        nasaDataReference: 'NASA Meteoroid Environment Office (MEO) & ISS MMOD repairs',
      },
      {
        id: 'bypass-loop',
        label: t('Cerrar el Tubo y Seguir Trabajando', 'Seal the Tube & Keep Working'),
        description: t(
          'Aísla el tubo dañado y deja la reparación para después.',
          'Isolate the damaged tube and leave the repair for later.'
        ),
        tradeoffWarning: t(
          '+6 Ciencia y nada de energía hoy, pero mañana las baterías se sobrecalientan (-14% Energía, -3% Salud).',
          '+6 Science and no power cost today, but tomorrow the batteries overheat (-14% Power, -3% Health).'
        ),
        resourceDelta: { sciencePoints: 6 },
        nextTurnEffect: {
          description: t(
            'Con medio radiador, las baterías se calentaron y perdieron carga.',
            'With half a radiator, the batteries overheated and lost charge.'
          ),
          resourceDelta: { power: -14, crewHealth: -3 },
        },
        outcomeFeedback: t(
          'Posponer reparaciones parece gratis hoy, pero los problemas pequeños crecen. ¡Los ingenieros lo llaman “deuda técnica”!',
          'Postponing repairs seems free today, but small problems grow. Engineers call it “technical debt”!'
        ),
        nasaDataReference: 'NASA MMOD Risk Assessments (ISS / Artemis Gateway)',
      },
    ],
  },

  // ───────────────────────────── MARTE — JEZERO ─────────────────────────────
  {
    id: 'mars-dust-storm',
    siteFilter: 'mars-jezero',
    triggeredByWeather: ['DUST_STORM'],
    highlightedTermId: 'dust-storm',
    title: t(
      'Tormenta de polvo: paneles solares al 40%',
      'Dust storm: solar panels at 40%'
    ),
    situation: t(
      'Una tormenta regional cubrió el cielo de Jezero. Tus paneles producen 60% menos energía y no sabes cuántos Soles durará. ¿Qué sistema sacrificas?',
      'A regional storm covered the Jezero sky. Your panels make 60% less power and you don’t know how many Sols it will last. Which system do you sacrifice?'
    ),
    choices: [
      {
        id: 'hibernate-science',
        label: t('Hibernar Rovers y Laboratorio', 'Hibernate Rovers & Lab'),
        description: t('Apaga todo lo que no sea vital para ahorrar energía.', 'Switch off everything non-vital to save power.'),
        tradeoffWarning: t(
          'Recuperas +12% Energía, pero pierdes datos de un experimento (-6 Ciencia).',
          'Recover +12% Power, but you lose an experiment’s data (-6 Science).'
        ),
        resourceDelta: { power: 12, sciencePoints: -6 },
        outcomeFeedback: t(
          'Es lo que hacen los rovers reales: en tormentas, Curiosity y Perseverance reducen actividades para sobrevivir.',
          'That’s what real rovers do: during storms, Curiosity and Perseverance cut activities to survive.'
        ),
        nasaDataReference: 'NASA Opportunity 2018 dust storm & Mars 2020 MEDA dust monitoring',
      },
      {
        id: 'keep-moxie-full',
        label: t('Mantener MOXIE al Máximo', 'Keep MOXIE at Full Power'),
        description: t(
          'El oxígeno es lo más importante: MOXIE sigue convirtiendo CO₂ en O₂.',
          'Oxygen comes first: MOXIE keeps turning CO₂ into O₂.'
        ),
        tradeoffWarning: t(
          '+12% Soporte Vital, pero -16% Energía y mañana el invernadero se enfría (-10% Comida).',
          '+12% Life Support, but -16% Power and tomorrow the greenhouse gets cold (-10% Food).'
        ),
        resourceDelta: { lifeSupport: 12, power: -16 },
        nextTurnEffect: {
          description: t(
            'Sin energía para los calentadores, el invernadero se enfrió durante la tormenta.',
            'With no power for heaters, the greenhouse cooled during the storm.'
          ),
          resourceDelta: { food: -10 },
        },
        outcomeFeedback: t(
          'MOXIE necesita calentarse a 800°C para separar el oxígeno del CO₂. Producir aire en Marte es posible, ¡pero carísimo en energía!',
          'MOXIE must heat up to 800°C to split oxygen from CO₂. Making air on Mars is possible—but extremely power-hungry!'
        ),
        nasaDataReference: 'NASA MOXIE (Mars 2020) — solid oxide electrolysis at ~800°C',
      },
      {
        id: 'crew-clean-panels',
        label: t('Salir a Limpiar los Paneles en la Tormenta', 'Go Out & Clean Panels During the Storm'),
        description: t('La tripulación barre el polvo de los paneles a mano.', 'The crew brushes dust off the panels by hand.'),
        tradeoffWarning: t(
          '+16% Energía, pero el viento y el polvo agotan a la tripulación (-6% Salud) y los trajes gastan -6% Soporte Vital.',
          '+16% Power, but wind and dust exhaust the crew (-6% Health) and the suits use -6% Life Support.'
        ),
        resourceDelta: { power: 16, crewHealth: -6, lifeSupport: -6, radiationDoseMsv: 0.2 },
        outcomeFeedback: t(
          'Los rovers no pueden limpiar sus paneles, ¡pero los humanos sí! Esa es una gran ventaja de las misiones tripuladas.',
          'Rovers can’t clean their panels, but humans can! That’s a big advantage of crewed missions.'
        ),
        nasaDataReference: 'NASA InSight (2022) solar power loss from dust accumulation',
      },
    ],
  },
  {
    id: 'mars-moxie-vs-greenhouse',
    siteFilter: 'mars-jezero',
    highlightedTermId: 'moxie',
    title: t(
      'MOXIE o invernadero: aire o comida',
      'MOXIE or greenhouse: air or food'
    ),
    situation: t(
      'Los tanques de oxígeno están bajando. MOXIE puede fabricar más O₂ con el CO₂ marciano, pero necesita tanta energía que habría que apagar los calentadores del invernadero.',
      'The oxygen tanks are getting low. MOXIE can make more O₂ from Martian CO₂, but it needs so much power you’d have to turn off the greenhouse heaters.'
    ),
    choices: [
      {
        id: 'moxie-overdrive',
        label: t('MOXIE a Toda Potencia', 'MOXIE at Full Power'),
        description: t('Toda la energía extra va a fabricar oxígeno.', 'All spare power goes to making oxygen.'),
        tradeoffWarning: t(
          '+20% Soporte Vital, pero -16% Energía y mañana el invernadero frío pierde cosecha (-12% Comida).',
          '+20% Life Support, but -16% Power and tomorrow the cold greenhouse loses crops (-12% Food).'
        ),
        resourceDelta: { lifeSupport: 20, power: -16 },
        nextTurnEffect: {
          description: t(
            'El invernadero se enfrió mientras MOXIE usaba toda la energía.',
            'The greenhouse cooled down while MOXIE used all the power.'
          ),
          resourceDelta: { food: -12 },
        },
        outcomeFeedback: t(
          'El MOXIE real produjo 122 gramos de oxígeno en 16 pruebas: ¡lo que respira un perro en 10 horas! Una base necesitaría una versión 200 veces más grande.',
          'The real MOXIE made 122 grams of oxygen over 16 runs—what a dog breathes in 10 hours! A base would need a version 200 times bigger.'
        ),
        nasaDataReference: 'NASA MOXIE (Mars 2020) — 122 g O₂ over 16 runs, up to 12 g/h',
      },
      {
        id: 'greenhouse-priority',
        label: t('Priorizar el Invernadero', 'Prioritize the Greenhouse'),
        description: t(
          'Las plantas también hacen un poco de oxígeno con fotosíntesis.',
          'Plants also make a little oxygen through photosynthesis.'
        ),
        tradeoffWarning: t(
          '+14% Comida, pero -10% Soporte Vital y -6% Energía.',
          '+14% Food, but -10% Life Support and -6% Power.'
        ),
        resourceDelta: { food: 14, lifeSupport: -10, power: -6 },
        outcomeFeedback: t(
          'Las plantas ayudan, pero harían falta muchísimas para darle aire a una persona. Por eso las bases combinan máquinas y plantas.',
          'Plants help, but you’d need a huge number to supply one person’s air. That’s why bases combine machines and plants.'
        ),
        nasaDataReference: 'NASA BIO-Plex / OSDR bioregenerative life support studies',
      },
      {
        id: 'split-power',
        label: t('Dividir la Energía a la Mitad', 'Split the Power in Half'),
        description: t('MOXIE y el invernadero trabajan a media capacidad.', 'MOXIE and the greenhouse both run at half capacity.'),
        tradeoffWarning: t(
          '+8% Soporte Vital y +5% Comida, pero cuesta -14% Energía porque ambos sistemas pierden eficiencia a media carga.',
          '+8% Life Support and +5% Food, but costs -14% Power because both systems lose efficiency at half load.'
        ),
        resourceDelta: { lifeSupport: 8, food: 5, power: -14 },
        outcomeFeedback: t(
          'Repartir parece justo, pero muchas máquinas funcionan peor a media potencia. ¡Los ingenieros buscan el punto de máxima eficiencia!',
          'Splitting seems fair, but many machines run worse at half power. Engineers look for the point of maximum efficiency!'
        ),
        nasaDataReference: 'NASA MOXIE operating-point studies (Hecht et al. 2021)',
      },
    ],
  },
  {
    id: 'mars-comm-delay-alarm',
    siteFilter: 'mars-jezero',
    highlightedTermId: 'light-delay',
    title: t(
      'Alarma en el reciclador. La Tierra está a 12 minutos',
      'Recycler alarm. Earth is 12 minutes away'
    ),
    situation: t(
      'El reciclador de agua muestra un error. Un mensaje de radio tarda entre 4 y 24 minutos en llegar a la Tierra, y otro tanto en volver. ¿Esperas a los expertos o lo arreglan ustedes?',
      'The water recycler shows an error. A radio message takes 4 to 24 minutes to reach Earth, and as long to come back. Do you wait for the experts or fix it yourselves?'
    ),
    choices: [
      {
        id: 'wait-for-houston',
        label: t('Esperar Instrucciones del Control de Misión', 'Wait for Mission Control’s Instructions'),
        description: t(
          'Apaga el reciclador y espera la respuesta de los ingenieros en la Tierra.',
          'Switch off the recycler and wait for the engineers on Earth to reply.'
        ),
        tradeoffWarning: t(
          'Hoy el reciclador está apagado (-8% Soporte Vital, -4% Energía de antena), pero mañana la reparación experta da +12% Soporte Vital.',
          'Today the recycler is off (-8% Life Support, -4% antenna Power), but tomorrow the expert repair gives +12% Life Support.'
        ),
        resourceDelta: { lifeSupport: -8, power: -4 },
        nextTurnEffect: {
          description: t(
            'Llegaron las instrucciones de la Tierra y el reciclador quedó como nuevo.',
            'Instructions arrived from Earth and the recycler works like new.'
          ),
          resourceDelta: { lifeSupport: 12 },
        },
        outcomeFeedback: t(
          'Con el retraso de Marte, cada pregunta a la Tierra puede tardar casi una hora ida y vuelta. ¡La paciencia también es ingeniería!',
          'With the Mars delay, each question to Earth can take almost an hour round-trip. Patience is engineering too!'
        ),
        nasaDataReference: 'NASA DSN Earth–Mars one-way light time 4–24 min',
      },
      {
        id: 'crew-fixes-now',
        label: t('La Tripulación lo Arregla Sola', 'The Crew Fixes It Alone'),
        description: t(
          'Usa los manuales a bordo y repara el reciclador de inmediato.',
          'Use the onboard manuals and repair the recycler right away.'
        ),
        tradeoffWarning: t(
          '+6% Soporte Vital hoy, pero la reparación es estresante (-5% Salud) y el arreglo temporal falla un poco mañana (-4% Soporte Vital).',
          '+6% Life Support today, but the repair is stressful (-5% Health) and the temporary fix slips a bit tomorrow (-4% Life Support).'
        ),
        resourceDelta: { lifeSupport: 6, crewHealth: -5 },
        nextTurnEffect: {
          description: t(
            'El arreglo improvisado necesitó ajustes extra.',
            'The improvised fix needed extra adjustments.'
          ),
          resourceDelta: { lifeSupport: -4 },
        },
        outcomeFeedback: t(
          'Las tripulaciones a Marte deberán ser mucho más autónomas que en la Estación Espacial. ¡La NASA entrena para eso en los simulacros CHAPEA y HERA!',
          'Mars crews will have to be far more autonomous than on the Space Station. NASA trains for this in the CHAPEA and HERA analog missions!'
        ),
        nasaDataReference: 'NASA CHAPEA & HERA analog missions — crew autonomy with comm delay',
      },
    ],
  },
  {
    id: 'mars-jezero-delta-samples',
    siteFilter: 'mars-jezero',
    highlightedTermId: 'jezero',
    title: t(
      'Muestras del Antiguo Delta de Jezero',
      'Samples from Jezero’s Ancient Delta'
    ),
    situation: t(
      'Hace miles de millones de años, un río llenaba este cráter con agua. Las rocas del delta podrían guardar señales de vida antigua. ¿Cómo las recolectas?',
      'Billions of years ago, a river filled this crater with water. The delta rocks might hold signs of ancient life. How do you collect them?'
    ),
    choices: [
      {
        id: 'long-eva-delta',
        label: t('Expedición Humana de Todo el Sol', 'All-Sol Human Expedition'),
        description: t(
          'Dos astronautas viajan al frente del delta con el rover presurizado.',
          'Two astronauts travel to the delta front in the pressurized rover.'
        ),
        tradeoffWarning: t(
          '+30 Ciencia, pero -10% Soporte Vital, -10% Energía, +0.4 mSv y mañana la tripulación está agotada (-5% Salud).',
          '+30 Science, but -10% Life Support, -10% Power, +0.4 mSv and tomorrow the crew is exhausted (-5% Health).'
        ),
        resourceDelta: { sciencePoints: 30, lifeSupport: -10, power: -10, radiationDoseMsv: 0.4 },
        nextTurnEffect: {
          description: t('La tripulación está agotada después de la gran expedición.', 'The crew is exhausted after the big expedition.'),
          resourceDelta: { crewHealth: -5 },
        },
        outcomeFeedback: t(
          '¡Increíble! Perseverance ya guardó muestras de este delta en tubos especiales para traerlas algún día a la Tierra.',
          'Amazing! Perseverance already sealed samples from this delta in special tubes to bring to Earth someday.'
        ),
        nasaDataReference: 'NASA Mars 2020 Perseverance sample caching — Jezero delta',
      },
      {
        id: 'robot-sampling',
        label: t('Enviar un Rover Robótico', 'Send a Robotic Rover'),
        description: t(
          'El rover trabaja solo; la tripulación lo supervisa desde el hábitat.',
          'The rover works alone; the crew supervises from the habitat.'
        ),
        tradeoffWarning: t(
          'Sin riesgo para la tripulación, pero el rover es lento (+14 Ciencia) y gasta -14% Energía.',
          'No risk to the crew, but the rover is slow (+14 Science) and uses -14% Power.'
        ),
        resourceDelta: { sciencePoints: 14, power: -14 },
        outcomeFeedback: t(
          'Los rovers son pacientes y no respiran, ¡pero un humano haría en un día lo que un rover hace en semanas!',
          'Rovers are patient and don’t breathe—but a human could do in a day what a rover does in weeks!'
        ),
        nasaDataReference: 'NASA Mars 2020 Perseverance traverse & sampling operations',
      },
    ],
  },
  {
    id: 'mars-gcr-sleep-shelter',
    siteFilter: 'mars-jezero',
    highlightedTermId: 'msv',
    title: t(
      'Radiación Cósmica Mientras Duermen',
      'Cosmic Radiation While They Sleep'
    ),
    situation: t(
      'Marte no tiene un campo magnético global, así que los rayos cósmicos llegan todos los días (~0.67 mSv por Sol). La tripulación pasa 8 horas durmiendo: ¿proteges el dormitorio?',
      'Mars has no global magnetic field, so cosmic rays arrive every day (~0.67 mSv per Sol). The crew spends 8 hours sleeping: do you protect the bedroom?'
    ),
    choices: [
      {
        id: 'regolith-sandbags',
        label: t('Sacos de Regolito sobre el Dormitorio', 'Regolith Sandbags over the Bedroom'),
        description: t(
          'Llena sacos con suelo marciano y cúbrelos sobre el techo.',
          'Fill bags with Martian soil and pile them on the roof.'
        ),
        tradeoffWarning: t(
          '+16% Blindaje hoy y +4% mañana, pero cuesta -10% Energía y -6% Soporte Vital (trabajo afuera).',
          '+16% Shielding today and +4% tomorrow, but costs -10% Power and -6% Life Support (outdoor work).'
        ),
        resourceDelta: { shielding: 16, power: -10, lifeSupport: -6 },
        nextTurnEffect: {
          description: t('Se terminó la última capa de sacos de regolito.', 'The last layer of regolith bags was finished.'),
          resourceDelta: { shielding: 4 },
        },
        outcomeFeedback: t(
          'Construir con suelo local ahorra lanzar toneladas desde la Tierra. ¡Es ISRU aplicado al blindaje!',
          'Building with local soil saves launching tons from Earth. It’s ISRU applied to shielding!'
        ),
        nasaDataReference: 'NASA Curiosity RAD (Hassler et al. 2014) — ~0.67 mSv/sol at Gale',
      },
      {
        id: 'water-wall-bedroom',
        label: t('Rodear las Camas con Tanques de Agua', 'Surround the Beds with Water Tanks'),
        description: t(
          'El agua frena bien la radiación. Mueve los tanques alrededor de las literas.',
          'Water stops radiation well. Move the tanks around the bunks.'
        ),
        tradeoffWarning: t(
          '+10% Blindaje con poca energía (-4%), pero esa agua ya no riega el invernadero (-8% Comida).',
          '+10% Shielding with little power (-4%), but that water no longer irrigates the greenhouse (-8% Food).'
        ),
        resourceDelta: { shielding: 10, power: -4, food: -8 },
        outcomeFeedback: t(
          'El hidrógeno del agua es excelente frenando partículas. ¡Por eso los diseños de naves usan el agua como escudo!',
          'The hydrogen in water is excellent at stopping particles. That’s why spacecraft designs use water as a shield!'
        ),
        nasaDataReference: 'NASA Space Radiation Shielding — hydrogen-rich materials (OSDR)',
      },
      {
        id: 'accept-dose-do-science',
        label: t('No Mover Nada y Seguir con la Ciencia', 'Change Nothing & Keep Doing Science'),
        description: t('Usa el tiempo para el laboratorio en vez de construir.', 'Use the time for the lab instead of building.'),
        tradeoffWarning: t(
          '+16 Ciencia, pero +0.8 mSv extra y -3% Salud.',
          '+16 Science, but +0.8 mSv extra and -3% Health.'
        ),
        resourceDelta: { sciencePoints: 16, radiationDoseMsv: 0.8, crewHealth: -3 },
        outcomeFeedback: t(
          'La radiación cósmica es poca cada día, pero se suma. En una misión de 2 años a Marte, un astronauta podría recibir ~1000 mSv.',
          'Cosmic radiation is small each day, but it adds up. On a 2-year Mars mission an astronaut could receive ~1000 mSv.'
        ),
        nasaDataReference: 'NASA MSL RAD cruise + surface dose (Zeitlin et al. 2013)',
      },
    ],
  },
];

/** Devuelve el mazo de dilemas válido para un sitio (cartas 'both' + específicas del sitio). */
export function getDilemmaDeckForSite(siteId: OutpostSiteId): MissionDilemmaCard[] {
  return INITIAL_DILEMMA_CARDS.filter(
    (card) => !card.siteFilter || card.siteFilter === 'both' || card.siteFilter === siteId
  );
}
