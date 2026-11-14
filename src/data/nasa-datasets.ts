/**
 * BLOQUE B (Asignado a: Antigravity del Compañero - Rama: feat/nasa-data-service)
 * Datasets reales verificados de NASA DONKI, NASA OSDR (Open Science Data Repository),
 * NASA Image Library y Glosario + Mini-Quiz Educativo para niños de 7 a 12 años.
 */

import { GlossaryTerm, LocalizedText, OutpostSiteId, SpaceWeatherEvent } from '../types/mission';

export interface NasaOsdrStudy {
  id: string;
  osdrAccession: string;
  category: 'radiation' | 'plants' | 'life-support' | 'microbiome';
  siteRelevance: OutpostSiteId | 'both';
  title: LocalizedText;
  missionOrFacility: string;
  organismOrInstrument: LocalizedText;
  keyFinding: LocalizedText;
  kidExplanation: LocalizedText;
  outpostTradeoffConnection: LocalizedText;
  telemetryMetric: LocalizedText;
  officialUrl: string;
}

export interface NasaGalleryImage {
  nasaId: string;
  title: LocalizedText;
  center: string;
  dateCreated: string;
  category: 'moon' | 'mars' | 'solar' | 'plants' | 'radiation';
  imageUrl: string;
  sourcePageUrl: string;
  kidCaption: LocalizedText;
  scienceConnection: LocalizedText;
  fallbackEmoji: string;
  isLiveApiResult?: boolean;
}

export interface ScienceQuizQuestion {
  id: string;
  badgeSource: string;
  question: LocalizedText;
  options: Array<{
    id: string;
    text: LocalizedText;
    isCorrect: boolean;
  }>;
  explanation: LocalizedText;
}

export const VERIFIED_NASA_WEATHER_EVENTS: SpaceWeatherEvent[] = [
  {
    id: '2024-05-14T16:46:00-FLR-001',
    type: 'FLR',
    classOrIntensity: 'X8.7 Solar Flare (Región Activa AR3664)',
    startTime: '2024-05-14T16:46Z',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: false,
    severity: 'critical',
    title: {
      es: 'Llamarada Solar Extrema Clase X8.7 (Registro Real NASA DONKI)',
      en: 'Extreme X8.7-Class Solar Flare (Real NASA DONKI Record)',
    },
    kidFriendlyExplanation: {
      es: '¡El Sol lanzó un destello gigante de energía equivalente a miles de millones de bombas atómicas! Viaja a la velocidad de la luz y aumenta la radiación en la base.',
      en: 'The Sun unleashed a giant flash of energy! It travels at the speed of light and spikes radiation levels across the outpost.',
    },
    scienceFact: {
      es: 'En mayo de 2024, la región solar AR3664 produjo una llamarada X8.7 registrada por NASA DONKI (2024-05-14T16:46:00-FLR-001), la más potente del Ciclo Solar 25.',
      en: 'In May 2024, sunspot region AR3664 produced an X8.7 flare logged in NASA DONKI (2024-05-14T16:46:00-FLR-001)—the strongest of Solar Cycle 25.',
    },
    radiationMultiplier: 2.8,
    solarEfficiencyMultiplier: 1.0,
  },
  {
    id: '2024-05-11T01:20:00-SEP-001',
    type: 'SEP',
    classOrIntensity: 'SEP >100 MeV Proton Event (GOES-18 / SOHO)',
    startTime: '2024-05-11T01:20Z',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: false,
    severity: 'warning',
    title: {
      es: 'Lluvia de Partículas Energéticas Solares (SEP)',
      en: 'Solar Energetic Particle (SEP) Proton Shower',
    },
    kidFriendlyExplanation: {
      es: 'Protones invisibles disparados por el Sol están golpeando el exterior del hábitat. Salir a caminar ahora sin blindaje de agua es muy riesgoso.',
      en: 'Invisible protons shot from the Sun are hitting the habitat exterior. Going on a spacewalk right now without water-wall shielding is risky.',
    },
    scienceFact: {
      es: 'El detector RAD de la NASA en Marte (Curiosity) y los dosímetros de Artemis I (OSDR) miden cómo estos protones atraviesan el casco de las naves.',
      en: 'NASA’s RAD detector on Mars (Curiosity) and Artemis I dosimeters (OSDR) measure how these protons penetrate spacecraft hulls.',
    },
    radiationMultiplier: 2.3,
    solarEfficiencyMultiplier: 0.9,
  },
  {
    id: '2024-05-10T06:54:00-CME-001',
    type: 'CME',
    classOrIntensity: 'Halo CME 1780 km/s (Tormenta Solar G5 Histórica)',
    startTime: '2024-05-10T06:54Z',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: false,
    severity: 'critical',
    title: {
      es: 'Eyección de Masa Coronal (CME) Supersónica — Nube de Plasma',
      en: 'Supersonic Coronal Mass Ejection (CME) — Plasma Cloud',
    },
    kidFriendlyExplanation: {
      es: '¡Una burbuja gigante de gas solar magnetizado viaja a casi 1,800 km por segundo! Al chocar con tu base sobrecarga redes eléctricas y eleva la radiación.',
      en: 'A giant bubble of magnetized solar gas is racing at nearly 1,800 km per second! When it hits your outpost, it strains power grids and spikes radiation.',
    },
    scienceFact: {
      es: 'Esta CME registrada en DONKI provocó auroras globales en la Tierra y en Marte fue detectada por MAVEN y el rover Perseverance en el Cráter Jezero.',
      en: 'This DONKI-cataloged CME triggered global auroras on Earth and was detected at Mars by MAVEN and the Perseverance rover in Jezero Crater.',
    },
    radiationMultiplier: 3.1,
    solarEfficiencyMultiplier: 0.85,
  },
  {
    id: '2024-05-20T05:17:00-SEP-MARS',
    type: 'SEP',
    classOrIntensity: 'X12 Far-Side Flare + Mars RAD SEP Spike',
    startTime: '2024-05-20T05:17Z',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: false,
    severity: 'critical',
    title: {
      es: 'Supertormenta Solar en Marte (Evento Real Curiosity RAD)',
      en: 'Mars Super Solar Storm (Real Curiosity RAD Event)',
    },
    kidFriendlyExplanation: {
      es: 'Las partículas cargadas llegaron hasta Marte e hicieron brillar el cielo marciano. ¡Incluso las cámaras de los rovers se llenaron de "nieve" estática!',
      en: 'Charged particles reached Mars and lit up the Martian sky. Even the rover cameras were filled with white "snow" streaks from hitting protons!',
    },
    scienceFact: {
      es: 'El 20 de mayo de 2024, el instrumento RAD en Marte midió 8.1 mSv en un solo día (equivalente a 30 radiografías de tórax), la mayor dosis en 12 años.',
      en: 'On May 20, 2024, the RAD instrument on Mars measured 8.1 mSv in a single day (equal to 30 chest X-rays)—the highest surge in 12 years.',
    },
    radiationMultiplier: 3.0,
    solarEfficiencyMultiplier: 0.88,
  },
  {
    id: '2022-11-16T06:47:00-FLR-ARTEMIS1',
    type: 'FLR',
    classOrIntensity: 'M1.6 Solar Flare (Misión Artemis I Orion)',
    startTime: '2022-11-16T06:47Z',
    sourceUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    isLiveNasaData: false,
    severity: 'watch',
    title: {
      es: 'Llamarada Clase M1.6 durante Vuelo Lunar Artemis I',
      en: 'M1.6-Class Solar Flare During Artemis I Lunar Flight',
    },
    kidFriendlyExplanation: {
      es: 'Una llamarada moderada del Sol. Es una buena oportunidad para probar los sensores de radiación sin tener que apagar toda la base.',
      en: 'A moderate flash from the Sun. It is a great opportunity to test radiation sensors without shutting down the entire base.',
    },
    scienceFact: {
      es: 'Durante la misión Artemis I en noviembre de 2022, los sensores HERA y los maniquíes Helga y Zohar midieron la protección real de la cápsula Orion.',
      en: 'During the November 2022 Artemis I mission, HERA sensors and mannequins Helga and Zohar measured real shielding inside the Orion capsule.',
    },
    radiationMultiplier: 1.5,
    solarEfficiencyMultiplier: 1.0,
  },
  {
    id: 'MARS-MEDA-2022-09-DUST',
    type: 'DUST_STORM',
    classOrIntensity: 'Tormenta Regional de Polvo (Tau > 1.8 — MEDA)',
    startTime: '2022-09-21T00:00Z',
    sourceUrl: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/meda/',
    isLiveNasaData: false,
    severity: 'warning',
    title: {
      es: 'Tormenta de Polvo Marciano — Alerta Meteorológica MEDA',
      en: 'Martian Regional Dust Storm — MEDA Weather Alert',
    },
    kidFriendlyExplanation: {
      es: 'Una nube gigante de polvo rojizo cubre el cielo y tapa el Sol. La radiación no sube, ¡pero tus paneles solares producen menos de la mitad de energía!',
      en: 'A giant cloud of rusty dust blocks the sky and dims the Sun. Radiation stays low, but your solar panels generate less than half their normal power!',
    },
    scienceFact: {
      es: 'La estación meteorológica MEDA del rover Perseverance y el módulo InSight registraron en 2022 una tormenta que redujo un 35–55% la energía solar disponible.',
      en: 'Perseverance’s MEDA weather station and the InSight lander recorded a 2022 dust storm that cut solar energy generation by 35–55%.',
    },
    radiationMultiplier: 0.95,
    solarEfficiencyMultiplier: 0.5,
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

export const NASA_OSDR_STUDIES: NasaOsdrStudy[] = [
  {
    id: 'osd-379-lunar-regolith-plants',
    osdrAccession: 'OSD-379 / GLDS-379 (Veggie & Lunar Regolith)',
    category: 'plants',
    siteRelevance: 'both',
    title: {
      es: 'Cultivo de Plantas en Regolito Lunar Real del Apolo e Invernadero Veggie',
      en: 'Growing Plants in Real Apollo Lunar Regolith & ISS Veggie Habitat',
    },
    missionOrFacility: 'Apollo 11, 12, 17 Samples & ISS Veggie (OSDR OSD-379)',
    organismOrInstrument: {
      es: 'Planta Arabidopsis thaliana y Lechuga Romana Roja (Lactuca sativa)',
      en: 'Arabidopsis thaliana & Outredgeous Red Romaine Lettuce (Lactuca sativa)',
    },
    keyFinding: {
      es: 'Las semillas germinaron en suelo lunar real traído por las misiones Apolo, pero activaron más de 1,000 genes de estrés por sales metálicas y vidrio afilado.',
      en: 'Seeds germinated in real lunar soil brought back by Apollo missions, but activated over 1,000 stress-response genes due to metallic salts and sharp glass particles.',
    },
    kidExplanation: {
      es: '¡Científicos plantaron semillas en polvo real de la Luna por primera vez! Sí crecieron, pero el polvo lunar es "áspero y salado", así que las plantas necesitan agua purificada, luz LED especial y nutrientes para no enfermarse.',
      en: 'Scientists planted seeds in real Moon dirt for the first time! They grew, but lunar dirt is sharp and salty, so plants need purified water, special LED grow lights, and extra nutrients to stay healthy.',
    },
    outpostTradeoffConnection: {
      es: 'TRADE-OFF EN TU BASE: Si bajas la energía del invernadero o pausas el riego durante una tormenta solar, tus cultivos sufren estrés rápido y pierdes comida al día siguiente.',
      en: 'OUTPOST TRADE-OFF: If you cut greenhouse power or pause irrigation during a solar storm, your crops experience rapid stress and food yield drops the next day.',
    },
    telemetryMetric: {
      es: '1,093 genes de estrés oxidativo analizados en NASA OSDR',
      en: '1,093 oxidative stress genes sequenced in NASA OSDR',
    },
    officialUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-379',
  },
  {
    id: 'biosentinel-artemis-1',
    osdrAccession: 'OSDR BioSentinel (Artemis I Deep Space CubeSat)',
    category: 'radiation',
    siteRelevance: 'both',
    title: {
      es: 'BioSentinel: Levadura Viva como Biosensor de Radiación en Espacio Profundo',
      en: 'BioSentinel: Living Yeast as a Deep-Space Radiation Biosensor',
    },
    missionOrFacility: 'NASA Artemis I — NASA Ames Research Center & OSDR',
    organismOrInstrument: {
      es: 'Levadura en gemación (Saccharomyces cerevisiae) + Espectrómetro LET',
      en: 'Budding Yeast (Saccharomyces cerevisiae) + LET Radiation Spectrometer',
    },
    keyFinding: {
      es: 'Primer experimento biológico más allá de la órbita terrestre en 50 años. Compara el daño real al ADN celular con los sensores físicos de radiación cósmica y solar.',
      en: 'First biological experiment beyond Low Earth Orbit in over 50 years. It compares real cellular DNA damage against physical cosmic and solar radiation sensors.',
    },
    kidExplanation: {
      es: '¡La NASA envió células de levadura (como la que se usa para hacer pan) al espacio profundo! Nuestras células y las de la levadura reparan su ADN de forma muy parecida cuando una partícula solar las golpea.',
      en: 'NASA launched yeast cells (just like bread yeast!) into deep space! Yeast cells repair their DNA very much like human cells do when struck by a solar particle.',
    },
    outpostTradeoffConnection: {
      es: 'TRADE-OFF EN TU BASE: Cada milisievert (mSv) acumulado daña las células. Debes invertir energía en el Blindaje antes de que la salud de tu tripulación caiga.',
      en: 'OUTPOST TRADE-OFF: Every accumulated millisievert (mSv) stresses living cells. You must invest power in Shielding before crew health drops.',
    },
    telemetryMetric: {
      es: 'Órbita heliocéntrica a >1 millón de km con dosimetría óptica en vivo',
      en: 'Heliocentric orbit >1 million km with live optical dosimetry',
    },
    officialUrl: 'https://www.nasa.gov/mission/biosentinel/',
  },
  {
    id: 'curiosity-rad-artemis-dosimetry',
    osdrAccession: 'MSL-RAD / Artemis I HERA & MARE (OSDR Radiation)',
    category: 'radiation',
    siteRelevance: 'both',
    title: {
      es: 'Dosimetría Real en Superficie: Detector RAD (Marte) y Maniquíes Artemis I (Luna)',
      en: 'Surface Radiation Dosimetry: Mars RAD Detector & Artemis I Mannequins',
    },
    missionOrFacility: 'Mars Science Laboratory (Curiosity RAD) & Orion Artemis I',
    organismOrInstrument: {
      es: 'Detector de Evaluación de Radiación (RAD) + Fantomas Helga y Zohar',
      en: 'Radiation Assessment Detector (RAD) + Helga & Zohar Dosimetry Phantoms',
    },
    keyFinding: {
      es: 'En Marte se reciben ~0.64 mSv/día en clima tranquilo, pero hasta >8 mSv/día en tormentas SEP. En Artemis I, el refugio rodeado de bolsas de agua redujo la dosis hasta un 50%.',
      en: 'Mars surface receives ~0.64 mSv/day in calm weather, spiking >8 mSv/day during SEP storms. On Artemis I, the water-bag storm shelter cut radiation dose by up to 50%.',
    },
    kidExplanation: {
      es: 'El agua está llena de átomos de hidrógeno, que funcionan como "colchones" microscópicos para frenar los protones veloces del Sol sin producir metralla secundaria.',
      en: 'Water is packed with hydrogen atoms, which act like microscopic pillows that slow down fast solar protons without creating secondary radiation shrapnel.',
    },
    outpostTradeoffConnection: {
      es: 'TRADE-OFF EN TU BASE: Bombear agua a las paredes del refugio salva a los astronautas en alertas DONKI, pero deja menos agua y energía para el invernadero.',
      en: 'OUTPOST TRADE-OFF: Pumping water into shelter walls saves astronauts during DONKI alerts, but leaves less water and power for the greenhouse.',
    },
    telemetryMetric: {
      es: '0.64 mSv/día base GCR | -50% dosis con escudo de hidrógeno/agua',
      en: '0.64 mSv/day baseline GCR | -50% dose with hydrogen/water shield',
    },
    officialUrl: 'https://osdr.nasa.gov/bio/repo/search?q=radiation+dosimetry',
  },
  {
    id: 'osd-321-aph-space-crops',
    osdrAccession: 'OSD-321 / APH-01 & VEG-03 (Advanced Plant Habitat)',
    category: 'plants',
    siteRelevance: 'both',
    title: {
      es: 'Hábitat Avanzado de Plantas (APH): Fotosíntesis, Agua y Consumo Eléctrico LED',
      en: 'Advanced Plant Habitat (APH): Photosynthesis, Water & LED Power Trade-Offs',
    },
    missionOrFacility: 'International Space Station (ISS) & Kennedy Space Center',
    organismOrInstrument: {
      es: 'Rábanos, Trigo Enano y Hojas Verdes con 180+ sensores ambientales',
      en: 'Radishes, Dwarf Wheat & Leafy Greens with 180+ environmental sensors',
    },
    keyFinding: {
      es: 'Las plantas espaciales absorben CO₂, liberan oxígeno y transpiran agua limpia que el sistema ECLSS recupera, pero requieren iluminación LED roja/azul constante.',
      en: 'Space plants absorb CO₂, release oxygen, and transpire clean water recovered by ECLSS, but demand continuous high-intensity red/blue LED lighting.',
    },
    kidExplanation: {
      es: 'Como las plantas no tienen luz del Sol dentro del domo blindado, usamos lámparas LED moradas (rojo + azul). ¡Las plantas comen luz y nos devuelven ensalada fresca y oxígeno!',
      en: 'Since plants inside a shielded dome don’t get direct sunlight, we use purple (red + blue) LED lamps. Plants eat light and give us back fresh salad and oxygen!',
    },
    outpostTradeoffConnection: {
      es: 'TRADE-OFF EN TU BASE: Asignar más % de energía al Invernadero sube Comida y ayuda al Soporte Vital, pero reduce la reserva de batería para emergencias.',
      en: 'OUTPOST TRADE-OFF: Allocating more % power to the Greenhouse boosts Food and aids Life Support, but lowers battery reserves for emergencies.',
    },
    telemetryMetric: {
      es: 'Control fotoperiódico LED de 16h luz / 8h oscuridad y reciclaje de humedad',
      en: '16h light / 8h dark LED photoperiod & transpired moisture recovery',
    },
    officialUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-321',
  },
  {
    id: 'eclss-moxie-life-support',
    osdrAccession: 'NASA ECLSS (ISS/Artemis) & Mars 2020 MOXIE',
    category: 'life-support',
    siteRelevance: 'both',
    title: {
      es: 'Reciclaje de Agua al 98% (ECLSS) y Fábrica de Oxígeno en Marte (MOXIE)',
      en: '98% Closed-Loop Water Recycling (ECLSS) & Mars Oxygen Factory (MOXIE)',
    },
    missionOrFacility: 'ISS Destiny Lab & Perseverance Rover (Cráter Jezero)',
    organismOrInstrument: {
      es: 'Procesador de Agua WPA/BPA + Electrolizador de Óxido Sólido MOXIE',
      en: 'Water Processor Assembly (WPA/BPA) + MOXIE Solid Oxide Electrolyzer',
    },
    keyFinding: {
      es: 'En 2023, la NASA alcanzó 98% de reciclaje de agua en órbita. En Marte, MOXIE produjo 122 gramos de O₂ puro (98% pureza) en 16 ejecuciones calentando CO₂ marciano a 800°C.',
      en: 'In 2023, NASA achieved 98% water recovery in orbit. On Mars, MOXIE generated 122 grams of pure O₂ (98% purity) across 16 runs by heating Martian CO₂ to 800°C.',
    },
    kidExplanation: {
      es: 'En Marte el aire es 96% dióxido de carbono (no se puede respirar). MOXIE es una "tostadora" dorada que le arranca los átomos de oxígeno al aire marciano, ¡pero gasta muchísima electricidad!',
      en: 'Martian air is 96% carbon dioxide (unbreathable). MOXIE is a golden "toaster" that rips oxygen atoms out of Martian air—but it uses a massive amount of electricity!',
    },
    outpostTradeoffConnection: {
      es: 'TRADE-OFF EN TU BASE: El deslizador de Soporte Vital es el que más protege la vida hoy, pero su alto consumo de kWh compite directamente con Ciencia y Cultivos.',
      en: 'OUTPOST TRADE-OFF: The Life Support slider keeps your crew breathing today, but its heavy kWh draw competes directly with Science and Crops.',
    },
    telemetryMetric: {
      es: '98% agua reciclada (ECLSS) | 800°C electrólisis de CO₂ (MOXIE)',
      en: '98% water recycled (ECLSS) | 800°C CO₂ electrolysis (MOXIE)',
    },
    officialUrl: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/',
  },
];

export const VERIFIED_NASA_GALLERY_IMAGES: NasaGalleryImage[] = [
  {
    nasaId: 'PIA24428',
    title: {
      es: 'Polo Sur Lunar y Cráter Shackleton (Objetivo Artemis)',
      en: 'Lunar South Pole & Shackleton Crater (Artemis Target)',
    },
    center: 'NASA / GSFC / LRO',
    dateCreated: '2022-08-19',
    category: 'moon',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24428/PIA24428~orig.jpg',
    sourcePageUrl: 'https://images.nasa.gov/details/PIA24428',
    kidCaption: {
      es: 'Fotografía real tomada por la sonda LRO de la NASA. Los bordes iluminados reciben sol casi todo el año para tus paneles, mientras el centro oscuro guarda hielo de agua.',
      en: 'Real photo captured by NASA’s LRO spacecraft. The sunlit rims receive near-constant sunlight for your solar panels, while the dark crater floor traps ancient water ice.',
    },
    scienceConnection: {
      es: 'Conecta con: Base Lunar Artemis (89.9°S) y extracción de hielo en regolito (ISRU).',
      en: 'Connects to: Artemis Lunar Outpost (89.9°S) and regolith ice extraction (ISRU).',
    },
    fallbackEmoji: '🌕',
  },
  {
    nasaId: 'PIA24486',
    title: {
      es: 'Rover Perseverance en el Antiguo Delta del Cráter Jezero, Marte',
      en: 'Perseverance Rover in Ancient River Delta of Jezero Crater, Mars',
    },
    center: 'NASA / JPL-Caltech',
    dateCreated: '2021-03-17',
    category: 'mars',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24486/PIA24486~orig.jpg',
    sourcePageUrl: 'https://images.nasa.gov/details/PIA24486',
    kidCaption: {
      es: 'Vista real de la superficie marciana en el Cráter Jezero. Aquí el aire es delgado y polvoriento, y los mensajes de radio tardan entre 4 y 24 minutos en llegar a la Tierra.',
      en: 'Real view of the Martian surface inside Jezero Crater. Here the air is thin and dusty, and radio messages take 4 to 24 minutes to reach Earth.',
    },
    scienceConnection: {
      es: 'Conecta con: Estación Marciana Jezero, tormentas de polvo MEDA y retraso de luz.',
      en: 'Connects to: Jezero Martian Outpost, MEDA dust storms, and light-time comm delay.',
    },
    fallbackEmoji: '🔴',
  },
  {
    nasaId: 'GSFC_20171208_Archive_e001435',
    title: {
      es: 'Llamarada Solar Gigante Captada por el Observatorio SDO de la NASA',
      en: 'Giant Solar Flare Captured by NASA Solar Dynamics Observatory (SDO)',
    },
    center: 'NASA / GSFC / SDO',
    dateCreated: '2017-09-06',
    category: 'solar',
    imageUrl:
      'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001435/GSFC_20171208_Archive_e001435~orig.jpg',
    sourcePageUrl: 'https://images.nasa.gov/details/GSFC_20171208_Archive_e001435',
    kidCaption: {
      es: '¡Mira ese destello brillante! El satélite SDO fotografía el Sol en luz ultravioleta extrema cada 12 segundos para alimentar el sistema de alertas NASA DONKI.',
      en: 'Look at that bright flash! The SDO satellite photographs the Sun in extreme ultraviolet light every 12 seconds to feed the NASA DONKI alert system.',
    },
    scienceConnection: {
      es: 'Conecta con: Telemetría NASA DONKI (eventos FLR, SEP y CME) y escudo de radiación.',
      en: 'Connects to: NASA DONKI telemetry (FLR, SEP, and CME events) and radiation shielding.',
    },
    fallbackEmoji: '☀️',
  },
  {
    nasaId: 'iss044e045595',
    title: {
      es: 'Cosecha de Lechuga Espacial Roja en el Invernadero Veggie (EEI)',
      en: 'Harvesting Red Romaine Space Lettuce in the Veggie Chamber (ISS)',
    },
    center: 'NASA / JSC / OSDR',
    dateCreated: '2015-08-10',
    category: 'plants',
    imageUrl: 'https://images-assets.nasa.gov/image/iss044e045595/iss044e045595~orig.jpg',
    sourcePageUrl: 'https://images.nasa.gov/details/iss044e045595',
    kidCaption: {
      es: 'Los astronautas prueban lechuga cultivada en el espacio bajo luces LED magenta. El repositorio NASA OSDR guarda los datos genéticos de cómo crecen estas plantas.',
      en: 'Astronauts taste lettuce grown in space under magenta LED lights. The NASA OSDR repository stores genetic data on how these plants grow.',
    },
    scienceConnection: {
      es: 'Conecta con: Estudio NASA OSDR OSD-379 / Veggie y el presupuesto de energía del invernadero.',
      en: 'Connects to: NASA OSDR Study OSD-379 / Veggie and greenhouse power budgeting.',
    },
    fallbackEmoji: '🌱',
  },
  {
    nasaId: 'PIA24321',
    title: {
      es: 'Experimento MOXIE: La Fábrica Dorada de Oxígeno en Marte',
      en: 'MOXIE Experiment: The Golden Oxygen Factory on Mars',
    },
    center: 'NASA / JPL-Caltech / MIT',
    dateCreated: '2021-02-20',
    category: 'mars',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA24321/PIA24321~orig.jpg',
    sourcePageUrl: 'https://images.nasa.gov/details/PIA24321',
    kidCaption: {
      es: 'MOXIE está recubierto de oro real para no calentar el resto del rover mientras hornea el aire marciano a 800°C para fabricar oxígeno respirable.',
      en: 'MOXIE is coated in real gold so it doesn’t overheat the rest of the rover while baking Martian air at 800°C to manufacture breathable oxygen.',
    },
    scienceConnection: {
      es: 'Conecta con: Soporte Vital en Marte y el alto costo eléctrico de producir oxígeno.',
      en: 'Connects to: Mars Life Support and the high electrical cost of producing oxygen.',
    },
    fallbackEmoji: '⚙️',
  },
  {
    nasaId: 'PIA16938',
    title: {
      es: 'Detector de Radiación RAD del Rover Curiosity en Marte',
      en: 'Curiosity Rover’s Radiation Assessment Detector (RAD) on Mars',
    },
    center: 'NASA / JPL-Caltech / SwRI',
    dateCreated: '2013-05-30',
    category: 'radiation',
    imageUrl: 'https://images-assets.nasa.gov/image/PIA16938/PIA16938~orig.jpg',
    sourcePageUrl: 'https://images.nasa.gov/details/PIA16938',
    kidCaption: {
      es: 'Este instrumento del tamaño de una lata de café mide todos los días cuántos milisieverts (mSv) de radiación golpean el suelo marciano.',
      en: 'This coffee-can-sized instrument measures every single day how many millisieverts (mSv) of radiation strike the Martian ground.',
    },
    scienceConnection: {
      es: 'Conecta con: Dosis acumulada en mSv y protección de la salud de los astronautas.',
      en: 'Connects to: Accumulated mSv dose and protecting astronaut crew health.',
    },
    fallbackEmoji: '🛡️',
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
    id: 'flr',
    term: {
      es: 'FLR (Llamarada Solar — Clases C, M y X)',
      en: 'FLR (Solar Flare — Classes C, M, and X)',
    },
    shortDefinition: {
      es: 'Una explosión repentina de luz y rayos X en la superficie del Sol. Las clase X son las más gigantes.',
      en: 'A sudden explosion of light and X-rays on the Sun’s surface. X-class flares are the biggest giants.',
    },
    kidAnalogy: {
      es: 'Es como el flash de una cámara colosal en el Sol: su luz llega en minutos y avisa a los astronautas que una tormenta de partículas puede venir detrás.',
      en: 'It’s like a colossal camera flash on the Sun: its light arrives in minutes and warns astronauts that a particle storm might be right behind it.',
    },
    nasaSource: 'DONKI',
    nasaStudyOrUrl: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  },
  {
    id: 'cme',
    term: {
      es: 'CME (Eyección de Masa Coronal)',
      en: 'CME (Coronal Mass Ejection)',
    },
    shortDefinition: {
      es: 'Una nube gigantesca de miles de millones de toneladas de plasma solar y campos magnéticos lanzada al espacio.',
      en: 'A gigantic cloud of billions of tons of solar plasma and magnetic fields hurled into space.',
    },
    kidAnalogy: {
      es: 'Si la llamarada (FLR) es el relámpago de luz, la CME es la bola de cañón gigante que tarda de 1 a 3 días en llegar y sacudir los sistemas eléctricos.',
      en: 'If a solar flare (FLR) is the lightning flash, a CME is the giant cannonball that takes 1 to 3 days to arrive and rattle electrical grids.',
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
    id: 'biosentinel',
    term: {
      es: 'BioSentinel (Biosensor de Espacio Profundo)',
      en: 'BioSentinel (Deep Space Biosensor)',
    },
    shortDefinition: {
      es: 'Misión de la NASA en Artemis I que usó células vivas de levadura para medir cómo la radiación espacial afecta el ADN.',
      en: 'NASA Artemis I mission that used living yeast cells to measure how deep-space radiation affects DNA.',
    },
    kidAnalogy: {
      es: 'Como los canarios que ayudaban a los mineros a detectar gases, estas pequeñas levaduras viajan por el espacio avisándonos cómo proteger las células humanas.',
      en: 'Like canaries that helped miners detect gases, these tiny yeast cells travel through deep space teaching us how to protect human cells.',
    },
    nasaSource: 'OSDR',
    nasaStudyOrUrl: 'https://www.nasa.gov/mission/biosentinel/',
  },
  {
    id: 'veggie',
    term: {
      es: 'Veggie y Estudio OSD-379 (Botánica Espacial)',
      en: 'Veggie & Study OSD-379 (Space Botany)',
    },
    shortDefinition: {
      es: 'Invernaderos espaciales de la NASA y experimentos del repositorio OSDR donde se cultivan lechugas y plantas en microgravedad y regolito lunar.',
      en: 'NASA space greenhouses and OSDR repository experiments where lettuce and plants are grown in microgravity and lunar regolith.',
    },
    kidAnalogy: {
      es: 'Es una huerta portátil iluminada con focos LED rosas. Da vitaminas frescas a los astronautas y los hace sentir más cerca de la Tierra.',
      en: 'It’s a portable garden lit by pink LED bulbs. It gives astronauts fresh vitamins and makes them feel closer to home on Earth.',
    },
    nasaSource: 'OSDR',
    nasaStudyOrUrl: 'https://osdr.nasa.gov/bio/repo/data/studies/OSD-379',
  },
  {
    id: 'eclss',
    term: {
      es: 'ECLSS (Soporte Vital y Reciclaje al 98%)',
      en: 'ECLSS (Environmental Control & 98% Recycling)',
    },
    shortDefinition: {
      es: 'Las máquinas que limpian el aire que respiran los astronautas y reciclan hasta el 98% del agua (¡incluso el sudor y el vapor del aliento!).',
      en: 'The machines that scrub the air astronauts breathe and recycle up to 98% of water (even sweat and breath moisture!).',
    },
    kidAnalogy: {
      es: 'Como no hay ríos ni tiendas en el espacio, el café de ayer se purifica para convertirse en el café y el oxígeno de mañana. ¡Pero esas máquinas gastan mucha batería!',
      en: 'Since there are no rivers or stores in space, yesterday’s water is purified into tomorrow’s drinking water and oxygen—but those machines use lots of battery power!',
    },
    nasaSource: 'ECLSS',
    nasaStudyOrUrl: 'https://www.nasa.gov/reference/environmental-control-and-life-support-system/',
  },
  {
    id: 'moxie',
    term: {
      es: 'MOXIE (Fábrica de Oxígeno en Marte)',
      en: 'MOXIE (Mars Oxygen ISRU Experiment)',
    },
    shortDefinition: {
      es: 'Experimento del rover Perseverance que demostró cómo fabricar oxígeno respirable a partir del dióxido de carbono (CO₂) de la atmósfera de Marte.',
      en: 'Perseverance rover experiment that proved how to make breathable oxygen out of carbon dioxide (CO₂) in Mars’ atmosphere.',
    },
    kidAnalogy: {
      es: 'Funciona como un árbol mecánico en Marte: inhala el aire de CO₂ marciano, lo calienta a 800°C y exhala oxígeno puro para los astronautas.',
      en: 'It works like a mechanical tree on Mars: it inhales Martian CO₂ air, heats it to 800°C, and exhales pure oxygen for astronauts.',
    },
    nasaSource: 'MARS_ROVER',
    nasaStudyOrUrl: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/moxie/',
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
  {
    id: 'isru',
    term: {
      es: 'ISRU (Usar Recursos del Lugar)',
      en: 'ISRU (In-Situ Resource Utilization)',
    },
    shortDefinition: {
      es: 'La técnica de fabricar agua, oxígeno y materiales de construcción usando el hielo y las rocas de la Luna o Marte en vez de traer todo desde la Tierra.',
      en: 'The engineering practice of making water, oxygen, and building materials from Moon or Mars ice and rocks instead of launching everything from Earth.',
    },
    kidAnalogy: {
      es: 'Cuando vas de campamento no cargas un río entero en tu mochila; llevas un filtro para usar el agua que encuentras allá. ¡Eso es ISRU!',
      en: 'When you go camping you don’t carry a whole river in your backpack; you bring a filter to use the water you find there. That’s ISRU!',
    },
    nasaSource: 'ARTEMIS',
    nasaStudyOrUrl: 'https://www.nasa.gov/overview-in-situ-resource-utilization/',
  },
  {
    id: 'sol',
    term: {
      es: 'Sol Marciano (24h 39m) vs. Día Lunar',
      en: 'Martian Sol (24h 39m) vs. Lunar Day',
    },
    shortDefinition: {
      es: 'Un "Sol" es lo que tarda Marte en girar una vez sobre sí mismo: 24 horas y 39 minutos. En cambio, en el Polo Sur Lunar (Shackleton) el Sol roza el horizonte casi todo el año.',
      en: 'A "Sol" is one full rotation of Mars: 24 hours and 39 minutes. At the Lunar South Pole (Shackleton), however, the Sun skims the horizon almost year-round.',
    },
    kidAnalogy: {
      es: 'Si vivieras en Marte, ¡tu reloj tendría 39 minutos extra cada día para jugar o investigar antes de ir a dormir!',
      en: 'If you lived on Mars, your clock would have 39 bonus minutes every single day before bedtime!',
    },
    nasaSource: 'MARS_ROVER',
    nasaStudyOrUrl: 'https://mars.nasa.gov/all-about-mars/facts/mars-time/',
  },
  {
    id: 'light-delay',
    term: {
      es: 'Retraso de Tiempo-Luz (Comunicación Espacial)',
      en: 'Light-Time Delay (Deep Space Comms)',
    },
    shortDefinition: {
      es: 'El tiempo que tardan las ondas de radio (viajando a 300,000 km/s) en llegar de tu base al Control de Misión en la Tierra: 1.3 s desde la Luna y de 4 a 24 min desde Marte.',
      en: 'The time radio waves (traveling at 300,000 km/s) take to travel between your outpost and Mission Control on Earth: 1.3 s from the Moon and 4 to 24 min from Mars.',
    },
    kidAnalogy: {
      es: 'En la Luna puedes hablar casi como por teléfono, pero en Marte si preguntas "¿Qué hago en esta tormenta?", ¡la respuesta de la Tierra puede tardar 40 minutos en ir y volver!',
      en: 'On the Moon you can chat almost like a phone call, but on Mars if you ask "What do I do in this storm?", Earth’s reply can take 40 minutes round-trip!',
    },
    nasaSource: 'MARS_ROVER',
    nasaStudyOrUrl: 'https://mars.nasa.gov/mars2020/timeline/cruise/communications/',
  },
  {
    id: 'dust-storm',
    term: {
      es: 'Tormenta de Polvo Marciano (Opacidad τ MEDA)',
      en: 'Martian Dust Storm (MEDA Optical Depth τ)',
    },
    shortDefinition: {
      es: 'Vientos marcianos que levantan polvo fino de óxido de hierro hasta cubrir regiones enteras o todo el planeta, reduciendo la luz solar en los paneles hasta un 60% o más.',
      en: 'Martian winds that lift fine iron-oxide dust to blanket entire regions or the whole planet, cutting sunlight reaching solar arrays by 60% or more.',
    },
    kidAnalogy: {
      es: 'Es como si una cortina de polvo rojizo tapara el cielo durante días: no te golpea fuerte porque el aire marciano es muy delgado, ¡pero deja tus paneles solares a oscuras como le pasó al rover Opportunity en 2018!',
      en: 'It’s like a curtain of red dust covering the sky for days: the wind won’t knock you over because Martian air is super thin, but it starves your solar panels of light just like what happened to the Opportunity rover in 2018!',
    },
    nasaSource: 'MARS_ROVER',
    nasaStudyOrUrl: 'https://mars.nasa.gov/mars2020/spacecraft/instruments/meda/',
  },
  {
    id: 'micrometeorite',
    term: {
      es: 'Micrometeorito (Impacto Hiperveloz MMOD)',
      en: 'Micrometeorite (Hypervelocity MMOD Impact)',
    },
    shortDefinition: {
      es: 'Partículas de roca o polvo espacial del tamaño de un grano de arena que viajan entre 10 y 70 km por segundo y golpean la Luna sin frenarse porque no hay atmósfera.',
      en: 'Sand-sized grains of space rock or dust traveling at 10 to 70 km per second that strike the Moon at full speed because there is no atmosphere to burn them up.',
    },
    kidAnalogy: {
      es: 'En la Tierra se queman en el aire y los vemos como "estrellas fugaces", pero en la Luna no hay aire que los frene, así que un granito diminuto golpea más rápido que una bala.',
      en: 'On Earth they burn up in the air as "shooting stars," but on the Moon there is no air to slow them down—so a tiny grain hits faster than a speeding bullet.',
    },
    nasaSource: 'ARTEMIS',
    nasaStudyOrUrl: 'https://www.nasa.gov/centers-and-facilities/marshall/nasa-meteoroid-environment-office/',
  },
  {
    id: 'shackleton',
    term: {
      es: 'Cráter Shackleton (Polo Sur Lunar 89.9°S)',
      en: 'Shackleton Crater (Lunar South Pole 89.9°S)',
    },
    shortDefinition: {
      es: 'Cráter de 21 km de ancho en el Polo Sur de la Luna cuyos bordes reciben luz solar más del 80% del año, mientras su fondo en sombra eterna a -180°C conserva hielo de agua.',
      en: 'A 21-km-wide crater at the Lunar South Pole whose rim peaks receive sunlight over 80% of the year, while its permanently shadowed floor at -180°C traps ancient water ice.',
    },
    kidAnalogy: {
      es: 'Es el campamento perfecto para Artemis: arriba en la montaña tienes enchufe solar casi todo el año, y abajo en la cueva oscura tienes un congelador gigante con agua lista para extraer.',
      en: 'It’s the ultimate campsite for Artemis: up on the rim you get a solar power plug almost all year, and down in the dark crater floor you have a giant freezer full of water ice.',
    },
    nasaSource: 'ARTEMIS',
    nasaStudyOrUrl: 'https://lunar.gsfc.nasa.gov/',
  },
  {
    id: 'gravity',
    term: {
      es: 'Gravedad Parcial y Masa Ósea (0.166 g Luna / 0.378 g Marte)',
      en: 'Partial Gravity & Bone Density (0.166 g Moon / 0.378 g Mars)',
    },
    shortDefinition: {
      es: 'La fuerza de atracción en la Luna es 1/6 de la terrestre (0.166 g) y en Marte es poco más de 1/3 (0.378 g). Sin ejercicio diario, los huesos pierden ~1% de masa por mes.',
      en: 'Surface gravity on the Moon is 1/6 of Earth’s (0.166 g) and on Mars is just over 1/3 (0.378 g). Without daily resistance exercise, astronauts lose ~1% of bone mass per month.',
    },
    kidAnalogy: {
      es: 'Si pesas 36 kg en la Tierra, en la Luna pesarías solo 6 kg y en Marte unos 14 kg. ¡Saltar es divertidísimo, pero como tus huesos trabajan menos se vuelven flojos si no haces gimnasio espacial!',
      en: 'If you weigh 36 kg on Earth, you’d weigh only 6 kg on the Moon and about 14 kg on Mars. Jumping is super fun, but because your bones work less they get weak unless you use the space gym!',
    },
    nasaSource: 'OSDR',
    nasaStudyOrUrl: 'https://www.nasa.gov/hrp/',
  },
  {
    id: 'jezero',
    term: {
      es: 'Cráter Jezero (Antiguo Lago y Delta en Marte)',
      en: 'Jezero Crater (Ancient Martian Lake & River Delta)',
    },
    shortDefinition: {
      es: 'Cráter marciano de 45 km de ancho (18.38°N, 77.58°E) donde hace 3,500 millones de años desembocaba un río formando un delta de arcillas y carbonatos explorado por Perseverance.',
      en: 'A 45-km-wide Martian crater (18.38°N, 77.58°E) where a river flowed into a lake 3.5 billion years ago, leaving a clay-and-carbonate delta explored by the Perseverance rover.',
    },
    kidAnalogy: {
      es: 'Es el fondo seco de un lago prehistórico en Marte: el barro antiguo atrapó minerales como una cápsula del tiempo donde los científicos buscan huellas de microbios marcianos.',
      en: 'It’s the dried-up bed of a prehistoric Martian lake: ancient mud trapped minerals like a time capsule where scientists hunt for clues of ancient Martian microbes.',
    },
    nasaSource: 'MARS_ROVER',
    nasaStudyOrUrl: 'https://mars.nasa.gov/mars2020/',
  },
];

/**
 * Helper para buscar un término del glosario científico por su ID.
 */
export function getGlossaryTerm(id?: string | null): GlossaryTerm | undefined {
  if (!id) return undefined;
  return KID_SCIENCE_GLOSSARY.find((term) => term.id === id);
}

export const JUNIOR_ASTRONAUT_QUIZ: ScienceQuizQuestion[] = [
  {
    id: 'quiz-water-shield',
    badgeSource: 'NASA DONKI & Artemis I (OSDR)',
    question: {
      es: '1. Cuando la API NASA DONKI detecta una tormenta de protones solares (SEP), ¿por qué los astronautas se refugian detrás de paredes llenas de agua?',
      en: '1. When the NASA DONKI API detects a Solar Energetic Particle (SEP) storm, why do astronauts shelter behind water-filled walls?',
    },
    options: [
      {
        id: 'a',
        text: {
          es: 'Porque los átomos de hidrógeno del agua frenan los protones veloces como pequeños colchones.',
          en: 'Because hydrogen atoms in water slow down fast protons like microscopic pillows.',
        },
        isCorrect: true,
      },
      {
        id: 'b',
        text: {
          es: 'Porque el agua congela los rayos del Sol y apaga las manchas solares.',
          en: 'Because water freezes sunbeams and turns off sunspots.',
        },
        isCorrect: false,
      },
      {
        id: 'c',
        text: {
          es: 'Porque en el espacio la radiación no atraviesa ningún líquido transparente.',
          en: 'Because in space radiation cannot pass through any clear liquid.',
        },
        isCorrect: false,
      },
    ],
    explanation: {
      es: '¡Exacto! En Artemis I, los dosímetros de la NASA demostraron que los materiales ricos en hidrógeno (como el agua potable y los alimentos húmedos) reducen la dosis en milisieverts (mSv) hasta un 50%.',
      en: 'Spot on! On Artemis I, NASA dosimeters proved that hydrogen-rich materials (like drinking water and wet food bags) cut radiation dose in millisieverts (mSv) by up to 50%.',
    },
  },
  {
    id: 'quiz-osd-379',
    badgeSource: 'NASA OSDR (Estudio OSD-379)',
    question: {
      es: '2. ¿Qué descubrieron los científicos en el estudio real OSD-379 de NASA OSDR al plantar semillas en regolito (suelo) lunar traído por las misiones Apolo?',
      en: '2. What did scientists discover in real NASA OSDR study OSD-379 when they planted seeds in lunar regolith brought back by Apollo?',
    },
    options: [
      {
        id: 'a',
        text: {
          es: 'Que las semillas se convirtieron en rocas lunares y nunca abrieron.',
          en: 'That the seeds turned into moon rocks and never sprouted.',
        },
        isCorrect: false,
      },
      {
        id: 'b',
        text: {
          es: 'Que sí germinaron, pero sufrieron estrés por el suelo afilado y salado, necesitando cuidado extra de agua y luz LED.',
          en: 'That they sprouted, but experienced stress from the sharp, salty soil—needing extra water and LED light care.',
        },
        isCorrect: true,
      },
      {
        id: 'c',
        text: {
          es: 'Que las plantas crecen 10 veces más rápido sin agua ni electricidad.',
          en: 'That plants grow 10 times faster without water or electricity.',
        },
        isCorrect: false,
      },
    ],
    explanation: {
      es: '¡Gran trabajo! En OSD-379 todas las semillas germinaron, pero activaron más de 1,000 genes de estrés. Por eso en el simulador debes cuidar la energía y el agua del invernadero.',
      en: 'Great job! In OSD-379 all seeds sprouted, but turned on over 1,000 stress genes. That is why in the simulator you must carefully manage greenhouse power and water.',
    },
  },
  {
    id: 'quiz-comm-delay',
    badgeSource: 'NASA Deep Space Network (DSN)',
    question: {
      es: '3. Si ocurre una emergencia en el Cráter Jezero en Marte, ¿por qué los astronautas deben resolver el trade-off por sí mismos sin esperar al Control de Misión?',
      en: '3. If an emergency strikes Jezero Crater on Mars, why must astronauts solve the trade-off themselves without waiting for Mission Control?',
    },
    options: [
      {
        id: 'a',
        text: {
          es: 'Porque en Marte no existen las antenas de radio.',
          en: 'Because radio antennas do not work on Mars.',
        },
        isCorrect: false,
      },
      {
        id: 'b',
        text: {
          es: 'Porque la señal de radio tarda de 4 a 24 minutos solo de ida (contra 1.3 segundos en la Luna).',
          en: 'Because radio signals take 4 to 24 minutes one-way (compared to 1.3 seconds on the Moon).',
        },
        isCorrect: true,
      },
      {
        id: 'c',
        text: {
          es: 'Porque el Control de Misión solo abre los fines de semana.',
          en: 'Because Mission Control is only open on weekends.',
        },
        isCorrect: false,
      },
    ],
    explanation: {
      es: '¡Correcto! Aunque la radio viaja a la velocidad de la luz (300,000 km/s), Marte está tan lejos que una pregunta y su respuesta pueden tardar hasta 48 minutos en ir y volver.',
      en: 'Correct! Even though radio travels at the speed of light (300,000 km/s), Mars is so far away that a question and its reply can take up to 48 minutes round-trip.',
    },
  },
  {
    id: 'quiz-biosentinel',
    badgeSource: 'NASA BioSentinel & OSDR',
    question: {
      es: '4. ¿Qué ser vivo diminuto viajó en el satélite BioSentinel de Artemis I para ayudar a la NASA a medir el daño de la radiación en el ADN?',
      en: '4. What tiny living organism flew aboard Artemis I’s BioSentinel satellite to help NASA measure radiation DNA damage?',
    },
    options: [
      {
        id: 'a',
        text: {
          es: 'Células de levadura (como la que usamos para hacer pan).',
          en: 'Budding yeast cells (like the yeast used to bake bread).',
        },
        isCorrect: true,
      },
      {
        id: 'b',
        text: {
          es: 'Peces dorados en una pecera presurizada.',
          en: 'Goldfish inside a pressurized aquarium.',
        },
        isCorrect: false,
      },
      {
        id: 'c',
        text: {
          es: 'Cactus del desierto sin raíces.',
          en: 'Rootless desert cacti.',
        },
        isCorrect: false,
      },
    ],
    explanation: {
      es: '¡Así es! Las células de levadura (Saccharomyces cerevisiae) reparan su ADN de forma muy similar a las células humanas, enseñándonos cómo proteger a los futuros exploradores.',
      en: 'That’s right! Yeast cells (Saccharomyces cerevisiae) repair their DNA very much like human cells, teaching us how to protect future explorers.',
    },
  },
  {
    id: 'quiz-eclss-moxie',
    badgeSource: 'NASA ECLSS & Mars 2020 MOXIE',
    question: {
      es: '5. ¿Cuál es el sacrificio (trade-off) real de usar el sistema ECLSS (que recicla 98% del agua) y MOXIE (que fabrica oxígeno en Marte)?',
      en: '5. What is the real engineering trade-off of running ECLSS (98% water recycling) and MOXIE (making oxygen on Mars)?',
    },
    options: [
      {
        id: 'a',
        text: {
          es: 'No tienen ningún costo: funcionan gratis sin usar las baterías de la base.',
          en: 'They have zero cost: they run for free without using base batteries.',
        },
        isCorrect: false,
      },
      {
        id: 'b',
        text: {
          es: 'Mantienen viva a la tripulación con oxígeno y agua limpia, pero consumen mucha energía eléctrica (kWh).',
          en: 'They keep the crew alive with oxygen and clean water, but consume heavy electrical power (kWh).',
        },
        isCorrect: true,
      },
      {
        id: 'c',
        text: {
          es: 'Atraen meteoritos hacia los paneles solares.',
          en: 'They attract meteorites toward the solar panels.',
        },
        isCorrect: false,
      },
    ],
    explanation: {
      es: '¡Regla de oro de la ingeniería espacial! Ninguna decisión es gratis: producir oxígeno a 800°C con MOXIE o purificar el 98% del agua con ECLSS requiere gran parte de tu presupuesto de energía.',
      en: 'Golden rule of space engineering! No decision is free: producing oxygen at 800°C with MOXIE or purifying 98% of water with ECLSS requires a big share of your power budget.',
    },
  },
];
