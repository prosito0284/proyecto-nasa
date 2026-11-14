/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Mapa visual interactivo del Hábitat Espacial (Luna / Marte) y simulador de retraso de comunicación.
 */

import React, { useState } from 'react';
import { CoreResources, Language, OutpostSiteConfig, PowerAllocation, SpaceWeatherEvent } from '../../types/mission';
import { missionAudio } from '../../utils/sound';

interface OutpostMapProps {
  lang: Language;
  site: OutpostSiteConfig;
  resources: CoreResources;
  allocation: PowerAllocation;
  weather: SpaceWeatherEvent;
}

export const OutpostMap: React.FC<OutpostMapProps> = ({
  lang,
  site,
  resources,
  allocation,
  weather,
}) => {
  const [commState, setCommState] = useState<'idle' | 'transmitting' | 'received'>('idle');
  const isLunar = site.id === 'moon-shackleton';

  const handleTestComms = () => {
    if (commState === 'transmitting') return;
    missionAudio.playClick();
    setCommState('transmitting');
    const simulatedDelayMs = isLunar ? 1300 : 3500;
    setTimeout(() => {
      missionAudio.playSuccess();
      setCommState('received');
      setTimeout(() => setCommState('idle'), 4000);
    }, simulatedDelayMs);
  };

  return (
    <section className="outpost-stage" aria-label="Outpost Interactive Schematic">
      <div className={`surface-canvas ${isLunar ? 'surface-lunar' : 'surface-mars'}`}>
        <div className="surface-header">
          <div>
            <span className="coord-pill">{site.coordinates}</span>
            <h3>{site.name[lang]}</h3>
            <p className="surface-subtitle">{site.locationName[lang]}</p>
          </div>
          <div className={`weather-pill severity-${weather.severity}`}>
            <span>{weather.type === 'NOMINAL' ? '☀️' : '⚡'}</span>
            <div>
              <strong>{weather.classOrIntensity}</strong>
              <small>
                {weather.isLiveNasaData
                  ? lang === 'es'
                    ? 'NASA DONKI En Vivo'
                    : 'NASA DONKI Live'
                  : lang === 'es'
                    ? 'Datos Reales NASA DONKI'
                    : 'Real NASA DONKI Data'}
              </small>
            </div>
          </div>
        </div>

        {/* Diagrama interactivo de los 4 módulos de la base */}
        <div className="modules-grid">
          <div className="outpost-module">
            <div className="module-top">
              <span className="module-icon">☀️</span>
              <span className="module-alloc">
                {Math.round(weather.solarEfficiencyMultiplier * 100)}% Eff
              </span>
            </div>
            <h4>{lang === 'es' ? 'Granja Solar y Baterías' : 'Solar Array & Batteries'}</h4>
            <p>
              {lang === 'es'
                ? `Reserva actual: ${resources.power}% kWh.`
                : `Current reserve: ${resources.power}% kWh.`}
            </p>
          </div>

          <div className="outpost-module">
            <div className="module-top">
              <span className="module-icon">🫧</span>
              <span className="module-alloc">{allocation.lifeSupportAlloc}% Watts</span>
            </div>
            <h4>{lang === 'es' ? 'Domo ECLSS / MOXIE (O₂ y Agua)' : 'ECLSS / MOXIE Dome (O₂ & H₂O)'}</h4>
            <p>
              {lang === 'es'
                ? `Soporte Vital al ${resources.lifeSupport}%. Reciclando aire y agua.`
                : `Life Support at ${resources.lifeSupport}%. Recycling air & water.`}
            </p>
          </div>

          <div className="outpost-module">
            <div className="module-top">
              <span className="module-icon">🛡️</span>
              <span className="module-alloc">{allocation.shieldingAlloc}% Watts</span>
            </div>
            <h4>{lang === 'es' ? 'Refugio de Agua Anti-Radiación' : 'Water-Wall Radiation Shelter'}</h4>
            <p>
              {lang === 'es'
                ? `Blindaje: ${resources.shielding}% | Dosis: ${resources.radiationDoseMsv} mSv.`
                : `Shielding: ${resources.shielding}% | Dose: ${resources.radiationDoseMsv} mSv.`}
            </p>
          </div>

          <div className="outpost-module">
            <div className="module-top">
              <span className="module-icon">🌱</span>
              <span className="module-alloc">{allocation.greenhouseAlloc}% Watts</span>
            </div>
            <h4>{lang === 'es' ? 'Invernadero Hidropónico Veggie' : 'Veggie Hydroponic Greenhouse'}</h4>
            <p>
              {lang === 'es'
                ? `Reservas de cultivo: ${resources.food}%.`
                : `Crop reserves: ${resources.food}%.`}
            </p>
          </div>
        </div>

        {/* Simulador interactivo de Retraso de Señal Tierra-Base */}
        <div className="comm-delay-bar">
          <div>
            <strong>
              📡 {lang === 'es' ? 'Retraso de Luz Tierra ↔ Base:' : 'Earth ↔ Outpost Light-Time Delay:'}{' '}
              {site.commDelayDisplay[lang]}
            </strong>
            <p>
              {commState === 'idle' &&
                (lang === 'es'
                  ? 'Prueba enviar un mensaje por radio a Houston para sentir la distancia espacial real.'
                  : 'Test sending a radio ping to Houston to experience real deep-space distance.')}
              {commState === 'transmitting' &&
                (lang === 'es'
                  ? isLunar
                    ? 'Viajando a 300,000 km/s hacia la Luna (1.3 s)...'
                    : 'Viajando por el espacio profundo hacia Marte (simulación acelerada de 12 min)...'
                  : isLunar
                    ? 'Traveling at 300,000 km/s to the Moon (1.3 s)...'
                    : 'Traveling across deep space to Mars (accelerated 12-min simulation)...')}
              {commState === 'received' &&
                (lang === 'es'
                  ? '✅ "¡Aquí Houston! Telemetría recibida. Recuerda que en Marte no podemos ayudarte al instante si hay una emergencia."'
                  : '✅ "Houston here! Telemetry received. Remember on Mars we cannot help instantly during an emergency."')}
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={handleTestComms}
            disabled={commState === 'transmitting'}
            id="test-comm-delay-btn"
          >
            {commState === 'transmitting'
              ? lang === 'es'
                ? 'Transmitiendo...'
                : 'Transmitting...'
              : lang === 'es'
                ? 'Probar Señal a Tierra'
                : 'Ping Mission Control'}
          </button>
        </div>
      </div>
    </section>
  );
};
