/**
 * BLOQUE A (Asignado a: Claude Code - Rama: feat/simulation-engine)
 * Escenarios físicos reales de la Luna (Cráter Shackleton - Artemis) y Marte (Cráter Jezero)
 * + Tarjetas de Dilemas de Ingeniería con Trade-offs Reales.
 */

import { MissionDilemmaCard, OutpostSiteConfig } from '../types/mission';

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
      es: 'En el borde del Cráter Shackleton hay picos de luz solar casi continua para tus paneles, y en el fondo oscuro hay hielo de agua milenario. Pero no hay atmósfera que te proteja de la radiación solar (DONKI SEP).',
      en: 'Along Shackleton Crater’s rim, peaks of near-constant sunlight power your solar arrays, while ancient water ice hides in dark craters. However, there is zero atmosphere to block solar radiation (DONKI SEP).',
    },
    nasaMissionReference: {
      es: 'Datos basados en NASA Artemis III/IV y Lunar Reconnaissance Orbiter (LRO).',
      en: 'Data grounded in NASA Artemis III/IV & Lunar Reconnaissance Orbiter (LRO).',
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
      es: 'Un antiguo delta fluvial explorado por Perseverance. La atmósfera de CO₂ permite fabricar oxígeno con MOXIE, pero consume muchísima energía y las tormentas de polvo cubren los paneles solares.',
      en: 'An ancient river delta explored by Perseverance. The CO₂ atmosphere lets you generate oxygen via MOXIE, but it requires massive power and regional dust storms choke solar arrays.',
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

export const INITIAL_DILEMMA_CARDS: MissionDilemmaCard[] = [
  {
    id: 'solar-storm-alert',
    siteFilter: 'both',
    triggeredByWeather: ['FLR', 'SEP', 'CME'],
    highlightedTermId: 'sep',
    title: {
      es: '⚠️ Alerta DONKI: Tormenta de Partículas Solares (SEP)',
      en: '⚠️ DONKI Alert: Solar Energetic Particle (SEP) Storm',
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
          es: 'TRADE-OFF: Protege al 100% a la tripulación (+Blindaje, +Salud), pero consume -22% de Energía y pausa el riego del invernadero (-12% Comida mañana).',
          en: 'TRADE-OFF: Fully protects crew (+Shielding, +Health), but drains -22% Power and pauses greenhouse irrigation (-12% Food tomorrow).',
        },
        resourceDelta: {
          power: -22,
          shielding: 18,
          crewHealth: 4,
          radiationDoseMsv: 0.1,
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
          es: 'TRADE-OFF: Conservas tus cultivos (+8% Comida) y ahorras batería (-10% Energía), pero la tripulación absorbe +1.8 mSv de radiación (-8% Salud).',
          en: 'TRADE-OFF: Preserves crops (+8% Food) and saves battery (-10% Power), but crew absorbs +1.8 mSv radiation (-8% Health).',
        },
        resourceDelta: {
          power: -10,
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
      es: '🔧 Dilema de Soporte Vital: Generador de Oxígeno vs. Calefacción de Cultivos',
      en: '🔧 Life Support Dilemma: Oxygen Generator vs. Crop Heating',
    },
    situation: {
      es: 'Durante la noche helada, las baterías bajaron. No hay suficiente potencia para operar al máximo el reciclador de aire/agua (ECLSS) y los calefactores de papas y lechugas espaciales al mismo tiempo.',
      en: 'During the freezing night, battery reserves dropped. There isn’t enough wattage to run both the ECLSS air/water recycler and the space lettuce heaters at full capacity.',
    },
    choices: [
      {
        id: 'prioritize-eclss',
        label: {
          es: 'Priorizar Oxígeno y Reciclaje de Agua (ECLSS / MOXIE)',
          en: 'Prioritize Oxygen & Water Recycling (ECLSS / MOXIE)',
        },
        description: {
          es: 'Dedica la energía principal a electrolizar agua para producir oxígeno puro.',
          en: 'Dedicate primary power to water electrolysis for pure breathable oxygen.',
        },
        tradeoffWarning: {
          es: 'TRADE-OFF: Sube Soporte Vital (+16%), pero el frío marchita parte de la cosecha (-14% Comida) y gasta -12% de Energía.',
          en: 'TRADE-OFF: Boosts Life Support (+16%), but cold temperatures wilt part of the harvest (-14% Food) and uses -12% Power.',
        },
        resourceDelta: {
          lifeSupport: 16,
          food: -14,
          power: -12,
          sciencePoints: 8,
        },
        outcomeFeedback: {
          es: '¡Sin oxígeno una misión termina en horas, mientras que la comida dura días! En la EEI y Artemis, el sistema ECLSS recicla hasta el 98% del agua.',
          en: 'Without oxygen a mission fails in hours, whereas food reserves last days! On the ISS and Artemis, ECLSS recycles up to 98% of water.',
        },
        nasaDataReference: 'NASA ECLSS (Environmental Control and Life Support System) & MOXIE Mars 2020',
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
          es: 'TRADE-OFF: Cosecha exitosa (+15% Comida, +10 Ciencia), pero los tanques de Soporte Vital bajan (-15% O₂/Agua).',
          en: 'TRADE-OFF: Successful harvest (+15% Food, +10 Science), but Life Support tanks drop (-15% O₂/Water).',
        },
        resourceDelta: {
          food: 15,
          lifeSupport: -15,
          power: -8,
          sciencePoints: 12,
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
      es: '🧑‍🚀 Caminata Espacial (EVA): Explorar Cráter vs. Recargar Baterías',
      en: '🧑‍🚀 Spacewalk (EVA): Explore Crater vs. Recharge Batteries',
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
          es: 'TRADE-OFF: +25 Puntos de Ciencia y +12% Soporte Vital (hielo extraído), pero cuesta -18% Energía y +0.6 mSv de radiación al salir del domo.',
          en: 'TRADE-OFF: +25 Science Points and +12% Life Support (harvested ice), but costs -18% Power and +0.6 mSv radiation outside the dome.',
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
          es: 'TRADE-OFF: Recuperas +20% de Energía y +6% de Blindaje sin recibir radiación, pero pierdes la ventana de investigación (+0 Ciencia hoy y -8% Soporte Vital por consumo base).',
          en: 'TRADE-OFF: Recover +20% Power and +6% Shielding with zero radiation exposure, but miss the research window (+0 Science today and -8% Life Support baseline drain).',
        },
        resourceDelta: {
          power: 20,
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
];
