/**
 * BLOQUE B (Asignado a: Antigravity del Compañero - Rama: feat/nasa-data-service)
 * Datasets reales verificados de NASA DONKI, NASA OSDR (Open Science Data Repository),
 * y Glosario Educativo para niños de 7 a 12 años.
 */

import { GlossaryTerm, SpaceWeatherEvent } from '../types/mission';

export const VERIFIED_NASA_WEATHER_EVENTS: SpaceWeatherEvent[] = [
  {
    id: 'DONKI-2024-05-14-X8.7',
    type: 'FLR',
    classOrIntensity: 'X8.7 Solar Flare (Región Activa 3664)',
    startTime: '2024-05-14T16:46Z',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: false,
    severity: 'critical',
    title: {
      es: 'Llamarada Solar Extrema Clase X (Registro Real NASA DONKI)',
      en: 'Extreme X-Class Solar Flare (Real NASA DONKI Record)',
    },
    kidFriendlyExplanation: {
      es: '¡El Sol lanzó un destello gigante de energía equivalente a miles de millones de bombas atómicas! Viaja a la velocidad de la luz y aumenta la radiación en la base.',
      en: 'The Sun unleashed a giant flash of energy! It travels at the speed of light and spikes radiation levels across the outpost.',
    },
    scienceFact: {
      es: 'En mayo de 2024, la región solar AR3664 produjo una llamarada X8.7 registrada por NASA DONKI, la más potente del ciclo solar 25.',
      en: 'In May 2024, sunspot region AR3664 produced an X8.7 flare logged in NASA DONKI—the strongest of Solar Cycle 25.',
    },
    radiationMultiplier: 2.8,
    solarEfficiencyMultiplier: 1.0,
  },
  {
    id: 'DONKI-2024-05-11-SEP',
    type: 'SEP',
    classOrIntensity: 'SEP >100 MeV Proton Event',
    startTime: '2024-05-11T01:20Z',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: false,
    severity: 'warning',
    title: {
      es: 'Lluvia de Partículas Energéticas Solares (SEP)',
      en: 'Solar Energetic Particle (SEP) Proton Shower',
    },
    kidFriendlyExplanation: {
      es: 'Protones invisibles disparados por el Sol están golpeando el exterior del hábitat. Salir a caminar ahora sin blindaje es riesgoso.',
      en: 'Invisible protons shot from the Sun are hitting the habitat exterior. Going on a spacewalk right now without shielding is risky.',
    },
    scienceFact: {
      es: 'El detector RAD de la NASA en Marte (Curiosity) y los dosímetros de Artemis I (OSDR) miden cómo estos protones atraviesan el casco de las naves.',
      en: 'NASA’s RAD detector on Mars (Curiosity) and Artemis I dosimeters (OSDR) measure how these protons penetrate spacecraft hulls.',
    },
    radiationMultiplier: 2.2,
    solarEfficiencyMultiplier: 0.9,
  },
  {
    id: 'NOMINAL-SOLAR-WIND',
    type: 'NOMINAL',
    classOrIntensity: 'Viento Solar Estable (~380 km/s)',
    startTime: '2026-11-14T00:00Z',
    sourceUrl: 'https://api.nasa.gov/',
    isLiveNasaData: false,
    severity: 'nominal',
    title: {
      es: 'Clima Espacial Tranquilo — Sol Estable',
      en: 'Quiet Space Weather — Calm Sun',
    },
    kidFriendlyExplanation: {
      es: 'El Sol está tranquilo hoy. Tus paneles solares funcionan al 100% y es un excelente día para cultivar plantas o explorar el cráter.',
      en: 'The Sun is calm today. Your solar panels run at 100% efficiency and it is a great day to grow crops or explore the crater.',
    },
    scienceFact: {
      es: 'Incluso en días tranquilos, en la Luna y Marte existe radiación de fondo llamada Rayos Cósmicos Galácticos (GCR) medida por NASA OSDR.',
      en: 'Even on calm days, the Moon and Mars experience background Galactic Cosmic Rays (GCR) measured by NASA OSDR.',
    },
    radiationMultiplier: 1.0,
    solarEfficiencyMultiplier: 1.05,
  },
];

export const KID_SCIENCE_GLOSSARY: GlossaryTerm[] = [
  {
    id: 'sep',
    term: {
      es: 'SEP (Partículas Energéticas Solares)',
      en: 'SEP (Solar Energetic Particles)',
    },
    shortDefinition: {
      es: 'Átomos diminutos (protones) que el Sol dispara a casi la velocidad de la luz durante una tormenta solar.',
      en: 'Tiny atoms (protons) blasted from the Sun at nearly the speed of light during a solar storm.',
    },
    kidAnalogy: {
      es: 'Imagina una lluvia de granizo invisible: en la Tierra nuestro campo magnético nos sirve de paraguas, pero en la Luna y Marte necesitas paredes llenas de agua para frenarlas.',
      en: 'Imagine invisible hailstones: on Earth our magnetic field acts like an umbrella, but on the Moon and Mars you need water-filled walls to stop them.',
    },
    nasaSource: 'DONKI',
    nasaStudyOrUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'msv',
    term: {
      es: 'Milisievert (mSv) — Dosis de Radiación',
      en: 'Millisievert (mSv) — Radiation Dose',
    },
    shortDefinition: {
      es: 'La unidad con la que los médicos de la NASA miden cuánta radiación absorbe el cuerpo de un astronauta.',
      en: 'The unit NASA flight surgeons use to measure how much radiation an astronaut’s body absorbs.',
    },
    kidAnalogy: {
      es: 'Una radiografía del dentista es apenas 0.01 mSv. En la Tierra recibimos ~3 mSv en todo un año, ¡pero en Marte o la Luna una sola tormenta solar sin refugio puede darte mucho más!',
      en: 'A dental X-ray is tiny (0.01 mSv). On Earth we get ~3 mSv per year, but on the Moon or Mars a single unshielded solar storm can deliver much more!',
    },
    nasaSource: 'OSDR',
    nasaStudyOrUrl: 'https://osdr.nasa.gov/bio/repo/search?q=radiation+dosimetry',
  },
  {
    id: 'eclss',
    term: {
      es: 'ECLSS (Soporte Vital y Reciclaje)',
      en: 'ECLSS (Environmental Control & Life Support)',
    },
    shortDefinition: {
      es: 'Las máquinas que limpian el aire que respiran los astronautas y reciclan hasta el 98% del agua (¡incluso el sudor!).',
      en: 'The machines that scrub the air astronauts breathe and recycle up to 98% of water (even sweat!).',
    },
    kidAnalogy: {
      es: 'Como no hay ríos ni tiendas en el espacio, el café de ayer se purifica para convertirse en el café y el oxígeno de mañana. ¡Pero esas máquinas gastan mucha batería!',
      en: 'Since there are no rivers or stores in space, yesterday’s water is purified into tomorrow’s drinking water and oxygen—but those machines use lots of battery power!',
    },
    nasaSource: 'ECLSS',
    nasaStudyOrUrl: 'https://www.nasa.gov/reference/environmental-control-and-life-support-system/',
  },
  {
    id: 'regolith',
    term: {
      es: 'Regolito Lunar y Marciano',
      en: 'Lunar & Martian Regolith',
    },
    shortDefinition: {
      es: 'La capa de polvo, arena y roca triturada por meteoritos que cubre la superficie de la Luna y Marte.',
      en: 'The layer of dust, sand, and meteorite-crushed rock covering the surface of the Moon and Mars.',
    },
    kidAnalogy: {
      es: 'Sirve para dos cosas: podemos hornearlo para extraer hielo de agua oculto, o apilarlo encima del techo de la base como un escudo grueso contra la radiación.',
      en: 'It serves two purposes: we can bake it to extract hidden water ice, or pile it over our habitat roof as a thick radiation shield.',
    },
    nasaSource: 'ARTEMIS',
    nasaStudyOrUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-379',
  },
];
