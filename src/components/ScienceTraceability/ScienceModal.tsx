/**
 * BLOQUE B (Asignado a: Antigravity del Compañero - Rama: feat/nasa-data-service)
 * Panel de Trazabilidad Científica ("Ciencia Real de la NASA") y Glosario para niños (7-12 años).
 */

import React from 'react';
import { GlossaryTerm, Language, SpaceWeatherEvent } from '../../types/mission';

interface ScienceModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  glossary: GlossaryTerm[];
  currentWeather: SpaceWeatherEvent;
}

export const ScienceModal: React.FC<ScienceModalProps> = ({
  lang,
  isOpen,
  onClose,
  glossary,
  currentWeather,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" id="nasa-science-modal">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <span className="nasa-badge">NASA OPEN DATA TRACEABILITY</span>
            <h2>
              {lang === 'es'
                ? '🔬 Ciencia Real de la NASA y Diccionario Espacial'
                : '🔬 Real NASA Science & Junior Astronaut Glossary'}
            </h2>
          </div>
          <button className="btn-secondary" onClick={onClose} id="close-science-modal-btn">
            {lang === 'es' ? 'Cerrar ✕' : 'Close ✕'}
          </button>
        </div>

        <div className="science-weather-box">
          <h3>
            {lang === 'es'
              ? '☀️ Estado Actual de Clima Espacial (NASA DONKI)'
              : '☀️ Current Space Weather Status (NASA DONKI)'}
          </h3>
          <p className="mono-tag">
            ID: {currentWeather.id} | {currentWeather.classOrIntensity} |{' '}
            {currentWeather.isLiveNasaData
              ? lang === 'es'
                ? '🟢 TELEMETRÍA EN VIVO (api.nasa.gov)'
                : '🟢 LIVE TELEMETRY (api.nasa.gov)'
              : lang === 'es'
                ? '📘 ARCHIVO HISTÓRICO REAL VERIFICADO NASA'
                : '📘 VERIFIED HISTORICAL NASA ARCHIVE'}
          </p>
          <p>{currentWeather.scienceFact[lang]}</p>
        </div>

        <div className="glossary-grid">
          {glossary.map((item) => (
            <article key={item.id} className="glossary-item">
              <div className="glossary-item-header">
                <h4>{item.term[lang]}</h4>
                <span className="source-tag">NASA {item.nasaSource}</span>
              </div>
              <p className="glossary-def">{item.shortDefinition[lang]}</p>
              <p className="glossary-analogy">💡 {item.kidAnalogy[lang]}</p>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};
