/**
 * BLOQUE B — Pruebas unitarias y de contrato para src/services/nasaApi.ts (Tarea B4).
 * Verifica las funciones puras de mapeo DONKI -> SpaceWeatherEvent con fixtures reales de NASA DONKI,
 * las garantías del pool de clima (IDs únicos, rangos de multiplicadores, evento NOMINAL obligatorio,
 * bandera isLiveNasaData) y la resiliencia ante HTTP 429 o corte de red.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { VERIFIED_NASA_WEATHER_EVENTS, getGlossaryTerm } from '../../data/nasa-datasets';
import {
  DonkiCmeItem,
  DonkiFlrItem,
  DonkiSepItem,
  buildWeatherPoolFromDonki,
  fetchLiveOrVerifiedSpaceWeather,
  getNasaApiKey,
  mapDonkiCmeToEvent,
  mapDonkiFlareToEvent,
  mapDonkiSepToEvent,
  sanitizeWeatherEvent,
} from '../nasaApi';

const REAL_DONKI_FLR_FIXTURES: DonkiFlrItem[] = [
  {
    flrID: '2024-05-14T16:46:00-FLR-001',
    beginTime: '2024-05-14T16:46Z',
    peakTime: '2024-05-14T16:51Z',
    classType: 'X8.7',
    activeRegionNum: 13664,
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/31512/-1',
  },
  {
    flrID: '2024-10-03T12:08:00-FLR-001',
    beginTime: '2024-10-03T12:08Z',
    peakTime: '2024-10-03T12:18Z',
    classType: 'X9.0',
    activeRegionNum: 13842,
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/34210/-1',
  },
  {
    flrID: '2024-11-01T04:12:00-FLR-001',
    beginTime: '2024-11-01T04:12Z',
    classType: 'C4.2',
    activeRegionNum: 13878,
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/34801/-1',
  },
];

const REAL_DONKI_SEP_FIXTURES: DonkiSepItem[] = [
  {
    sepID: '2024-05-11T01:20:00-SEP-001',
    eventTime: '2024-05-11T01:20Z',
    instruments: [{ displayName: 'GOES-18: SEISS >100 MeV' }],
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/SEP/31400/-1',
  },
  {
    sepID: '2024-10-09T02:45:00-SEP-001',
    eventTime: '2024-10-09T02:45Z',
    instruments: [{ displayName: 'SOHO: COSTEP 28-50 MeV' }],
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/SEP/34350/-1',
  },
];

const REAL_DONKI_CME_FIXTURES: DonkiCmeItem[] = [
  {
    activityID: '2024-05-10T06:54:00-CME-001',
    startTime: '2024-05-10T06:54Z',
    note: 'Full halo CME directed toward Earth and Mars.',
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/CME/31355/-1',
    cmeAnalyses: [
      { speed: 1250, type: 'O', isMostAccurate: false },
      { speed: 1780, type: 'O', isMostAccurate: true },
    ],
  },
  {
    activityID: '2024-10-07T19:24:00-CME-001',
    startTime: '2024-10-07T19:24Z',
    note: 'Moderate partial halo CME.',
    link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/CME/34299/-1',
    cmeAnalyses: [{ speed: 690, type: 'C', isMostAccurate: true }],
  },
];

describe('nasaApi — funciones puras de mapeo DONKI y calidad del pool (B3 y B4)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getNasaApiKey usa DEMO_KEY cuando la clave está vacía o indefinida', () => {
    expect(getNasaApiKey('')).toBe('DEMO_KEY');
    expect(getNasaApiKey('   ')).toBe('DEMO_KEY');
    expect(getNasaApiKey('MI_CLAVE_NASA_123')).toBe('MI_CLAVE_NASA_123');
  });

  it('getGlossaryTerm devuelve el término correcto o undefined si no existe', () => {
    const moxie = getGlossaryTerm('moxie');
    expect(moxie).toBeDefined();
    expect(moxie?.id).toBe('moxie');
    expect(getGlossaryTerm('shackleton')?.nasaSource).toBe('ARTEMIS');
    expect(getGlossaryTerm('no-existe')).toBeUndefined();
    expect(getGlossaryTerm(undefined)).toBeUndefined();
  });

  it('mapea fixtures reales de FLR, SEP y CME con isLiveNasaData=true y rangos válidos', () => {
    const xFlare = mapDonkiFlareToEvent(REAL_DONKI_FLR_FIXTURES[1], 0);
    expect(xFlare.id).toBe('2024-10-03T12:08:00-FLR-001');
    expect(xFlare.type).toBe('FLR');
    expect(xFlare.isLiveNasaData).toBe(true);
    expect(xFlare.severity).toBe('critical');
    expect(xFlare.radiationMultiplier).toBeGreaterThanOrEqual(1.0);
    expect(xFlare.radiationMultiplier).toBeLessThanOrEqual(3.5);
    expect(xFlare.solarEfficiencyMultiplier).toBeGreaterThanOrEqual(0.4);
    expect(xFlare.solarEfficiencyMultiplier).toBeLessThanOrEqual(1.1);

    const cFlare = mapDonkiFlareToEvent(REAL_DONKI_FLR_FIXTURES[2], 1);
    expect(cFlare.severity).toBe('watch');
    expect(cFlare.isLiveNasaData).toBe(true);

    const sepEvent = mapDonkiSepToEvent(REAL_DONKI_SEP_FIXTURES[1], 0);
    expect(sepEvent.id).toBe('2024-10-09T02:45:00-SEP-001');
    expect(sepEvent.type).toBe('SEP');
    expect(sepEvent.isLiveNasaData).toBe(true);
    expect(sepEvent.classOrIntensity).toContain('SOHO: COSTEP');

    const fastCme = mapDonkiCmeToEvent(REAL_DONKI_CME_FIXTURES[0], 0);
    expect(fastCme.id).toBe('2024-05-10T06:54:00-CME-001');
    expect(fastCme.type).toBe('CME');
    expect(fastCme.isLiveNasaData).toBe(true);
    expect(fastCme.severity).toBe('critical');
    expect(fastCme.classOrIntensity).toContain('1780 km/s');
  });

  it('buildWeatherPoolFromDonki garantiza ids únicos, rangos [1.0..3.5] / [0.4..1.1], evento NOMINAL y banderas correctas', () => {
    const pool = buildWeatherPoolFromDonki({
      flr: REAL_DONKI_FLR_FIXTURES,
      sep: REAL_DONKI_SEP_FIXTURES,
      cme: REAL_DONKI_CME_FIXTURES,
    });

    expect(pool.length).toBeGreaterThan(6);

    const ids = pool.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    const hasNominal = pool.some((e) => e.type === 'NOMINAL');
    expect(hasNominal).toBe(true);

    const liveItems = pool.filter((e) => e.isLiveNasaData);
    const archiveItems = pool.filter((e) => !e.isLiveNasaData);
    expect(liveItems.length).toBeGreaterThan(0);
    expect(archiveItems.length).toBeGreaterThan(0);

    for (const ev of pool) {
      expect(ev.radiationMultiplier).toBeGreaterThanOrEqual(1.0);
      expect(ev.radiationMultiplier).toBeLessThanOrEqual(3.5);
      expect(ev.solarEfficiencyMultiplier).toBeGreaterThanOrEqual(0.4);
      expect(ev.solarEfficiencyMultiplier).toBeLessThanOrEqual(1.1);
      expect(ev.title.es.length).toBeGreaterThan(0);
      expect(ev.title.en.length).toBeGreaterThan(0);
      expect(ev.kidFriendlyExplanation.es.length).toBeGreaterThan(0);
      expect(ev.kidFriendlyExplanation.en.length).toBeGreaterThan(0);
    }
  });

  it('inyecta siempre un evento NOMINAL incluso si el fallback recibido no tuviera ninguno', () => {
    const onlyStormFallback = VERIFIED_NASA_WEATHER_EVENTS.filter((e) => e.type !== 'NOMINAL');
    const pool = buildWeatherPoolFromDonki(
      { flr: [REAL_DONKI_FLR_FIXTURES[0]] },
      onlyStormFallback
    );

    expect(pool.some((e) => e.type === 'NOMINAL')).toBe(true);
    const sanitizedExtreme = sanitizeWeatherEvent({
      ...VERIFIED_NASA_WEATHER_EVENTS[0],
      radiationMultiplier: 99,
      solarEfficiencyMultiplier: 0.05,
    });
    expect(sanitizedExtreme.radiationMultiplier).toBe(3.5);
    expect(sanitizedExtreme.solarEfficiencyMultiplier).toBe(0.4);
  });

  it('ante HTTP 429 o error de red devuelve el archivo verificado sin lanzar excepciones', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'OVER_RATE_LIMIT' }), { status: 429 })
    );

    const on429 = await fetchLiveOrVerifiedSpaceWeather(true);
    expect(on429.length).toBeGreaterThan(0);
    expect(on429.every((e) => e.isLiveNasaData === false)).toBe(true);
    expect(on429.some((e) => e.type === 'NOMINAL')).toBe(true);

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network offline'));
    const onOffline = await fetchLiveOrVerifiedSpaceWeather(true);
    expect(onOffline.length).toBeGreaterThan(0);
    expect(onOffline.every((e) => e.isLiveNasaData === false)).toBe(true);
  });
});
