/**
 * BLOQUE B (Asignado a: Antigravity del Compañero - Rama: feat/nasa-data-service)
 * Cliente para la API pública de NASA DONKI (https://api.nasa.gov/DONKI/FLR)
 * con fallback transparente a eventos reales verificados para que nunca falle por rate-limit.
 */

import { SpaceWeatherEvent } from '../types/mission';
import { VERIFIED_NASA_WEATHER_EVENTS } from '../data/nasa-datasets';

const NASA_API_KEY = 'DEMO_KEY';

export async function fetchLiveOrVerifiedSpaceWeather(): Promise<SpaceWeatherEvent[]> {
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    const response = await fetch(
      `https://api.nasa.gov/DONKI/FLR?startDate=${startStr}&endDate=${endStr}&api_key=${NASA_API_KEY}`
    );

    if (!response.ok) {
      return VERIFIED_NASA_WEATHER_EVENTS;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return VERIFIED_NASA_WEATHER_EVENTS;
    }

    const latestFlares = data.slice(-3).reverse();
    const liveMapped: SpaceWeatherEvent[] = latestFlares.map((flr: any, idx: number) => {
      const classType: string = flr.classType || 'M1.0';
      const isXClass = classType.startsWith('X');
      const isMClass = classType.startsWith('M');

      return {
        id: flr.flrID || `DONKI-LIVE-${idx}`,
        type: 'FLR',
        classOrIntensity: `${classType} Solar Flare (${flr.activeRegionNum ? 'AR' + flr.activeRegionNum : 'Solar Disk'})`,
        startTime: flr.beginTime || new Date().toISOString(),
        sourceUrl: flr.link || 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
        isLiveNasaData: true,
        severity: isXClass ? 'critical' : isMClass ? 'warning' : 'watch',
        title: {
          es: `📡 Telemetría DONKI en Vivo: Llamarada Solar ${classType}`,
          en: `📡 Live DONKI Telemetry: ${classType} Solar Flare`,
        },
        kidFriendlyExplanation: {
          es: `¡Dato real recién recibido de la NASA! El Sol emitió una llamarada clase ${classType}. Ajusta el blindaje de tu base para proteger a tus astronautas.`,
          en: `Live data straight from NASA! The Sun emitted a class ${classType} flare. Adjust your outpost shielding to protect your astronauts.`,
        },
        scienceFact: {
          es: `Evento real ID: ${flr.flrID || 'DONKI'} captado por los observatorios solares de la NASA y NOAA.`,
          en: `Real event ID: ${flr.flrID || 'DONKI'} captured by NASA and NOAA solar observatories.`,
        },
        radiationMultiplier: isXClass ? 2.8 : isMClass ? 1.9 : 1.3,
        solarEfficiencyMultiplier: 1.0,
      };
    });

    return [...liveMapped, ...VERIFIED_NASA_WEATHER_EVENTS];
  } catch {
    return VERIFIED_NASA_WEATHER_EVENTS;
  }
}
