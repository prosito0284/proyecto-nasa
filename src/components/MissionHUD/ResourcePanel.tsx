/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Panel de Recursos Vitales, Proyección de Turno en Tiempo Real (TurnProjection),
 * Presupuesto de Energía con Presets Táctiles y Alertas de Consecuencias Encadenadas.
 */

import React from 'react';
import {
  CoreResources,
  Language,
  LocalizedText,
  PowerAllocation,
  TradeoffChoice,
} from '../../types/mission';
import { CommanderEvaluation, TurnProjection } from '../../engine/simulationEngine';
import { missionAudio } from '../../utils/sound';

interface ResourcePanelProps {
  lang: Language;
  resources: CoreResources;
  allocation: PowerAllocation;
  projection: TurnProjection;
  hoveredChoice: TradeoffChoice | null;
  pendingEffects: Array<{
    description: LocalizedText;
    resourceDelta: Partial<CoreResources>;
  }>;
  evaluation: CommanderEvaluation;
  onChangeAllocation: (next: PowerAllocation) => void;
  onOpenBadgesModal: () => void;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({
  lang,
  resources,
  allocation,
  projection,
  hoveredChoice,
  pendingEffects,
  evaluation,
  onChangeAllocation,
  onOpenBadgesModal,
}) => {
  const totalPowerUsed = projection.load;

  const updateSlider = (key: keyof PowerAllocation, val: number) => {
    missionAudio.playSliderTick();
    onChangeAllocation({
      ...allocation,
      [key]: val,
    });
  };

  const applyPreset = (preset: PowerAllocation) => {
    missionAudio.playClick();
    onChangeAllocation(preset);
  };

  const getCombinedDelta = (
    key: 'power' | 'lifeSupport' | 'shielding' | 'food' | 'crewHealth'
  ): number => {
    const base = projection.delta[key] ?? 0;
    const choiceDelta = hoveredChoice?.resourceDelta[key] ?? 0;
    const delayedDelta = pendingEffects.reduce(
      (acc, item) => acc + (item.resourceDelta[key] ?? 0),
      0
    );
    return base + choiceDelta + delayedDelta;
  };

  const metrics: Array<{
    id: 'power' | 'lifeSupport' | 'shielding' | 'food' | 'crewHealth';
    label: string;
    value: number;
    unit: string;
  }> = [
    {
      id: 'power',
      label: lang === 'es' ? '⚡ Energía (Baterías)' : '⚡ Power (Batteries)',
      value: resources.power,
      unit: '%',
    },
    {
      id: 'lifeSupport',
      label: lang === 'es' ? '🫧 Soporte Vital (O₂/H₂O)' : '🫧 Life Support (O₂/H₂O)',
      value: resources.lifeSupport,
      unit: '%',
    },
    {
      id: 'shielding',
      label: lang === 'es' ? '🛡️ Blindaje Radiación' : '🛡️ Radiation Shielding',
      value: resources.shielding,
      unit: '%',
    },
    {
      id: 'food',
      label: lang === 'es' ? '🌱 Cultivos / Comida' : '🌱 Crops / Food',
      value: resources.food,
      unit: '%',
    },
    {
      id: 'crewHealth',
      label: lang === 'es' ? '❤️ Salud Tripulación' : '❤️ Crew Health',
      value: resources.crewHealth,
      unit: '%',
    },
  ];

  const earnedBadgesCount = evaluation.badges.filter((b) => b.earned).length;

  return (
    <aside className="hud-panel" aria-label="Mission Resource Telemetry">
      {/* Tarjeta de Rango Actual e Insignias */}
      <div className="commander-mini-card">
        <div>
          <span className="rank-eyebrow">
            {lang === 'es' ? 'RANGO DE COMANDANTE' : 'COMMANDER RANK'}
          </span>
          <div className="rank-title-row">
            <strong>
              {evaluation.rank.emoji} {evaluation.rank.title[lang]}
            </strong>
            <span className="rank-score-pill">{evaluation.score}/100</span>
          </div>
        </div>
        <button
          type="button"
          id="open-badges-modal-btn"
          className="btn-secondary btn-compact"
          onClick={() => {
            missionAudio.playClick();
            onOpenBadgesModal();
          }}
        >
          🏅 {earnedBadgesCount}/{evaluation.badges.length}{' '}
          {lang === 'es' ? 'Insignias' : 'Badges'}
        </button>
      </div>

      {/* Vitales con Proyección en Tiempo Real */}
      <div className="panel-section">
        <div className="section-title-row">
          <h2>{lang === 'es' ? '📊 Vitales + Proyección' : '📊 Vitals & Projection'}</h2>
          <span className="science-score-badge">
            🔬 {resources.sciencePoints}{' '}
            {projection.delta.sciencePoints + (hoveredChoice?.resourceDelta.sciencePoints ?? 0) > 0
              ? `(+${projection.delta.sciencePoints + (hoveredChoice?.resourceDelta.sciencePoints ?? 0)})`
              : ''}{' '}
            {lang === 'es' ? 'Pts' : 'Pts'}
          </span>
        </div>

        <div className="bars-list">
          {metrics.map((m) => {
            const delta = getCombinedDelta(m.id);
            const projectedVal = Math.max(0, Math.min(100, m.value + delta));
            const statusClass =
              m.value <= 25 ? 'bar-critical' : m.value <= 50 ? 'bar-warning' : 'bar-nominal';
            return (
              <div key={m.id} className="resource-row">
                <div className="resource-row-header">
                  <span>{m.label}</span>
                  <div className="resource-val-group">
                    <strong className="mono-val">
                      {m.value}
                      {m.unit}
                    </strong>
                    <span
                      className={`proj-badge ${
                        delta > 0 ? 'proj-up' : delta < 0 ? 'proj-down' : 'proj-flat'
                      }`}
                      title={
                        lang === 'es'
                          ? `Proyección al final del día: ${projectedVal}%`
                          : `End-of-day projection: ${projectedVal}%`
                      }
                    >
                      {delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : '0%'}
                    </span>
                  </div>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${statusClass}`}
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="radiation-readout">
          <span>
            {lang === 'es' ? '☢️ Dosis (NASA OSDR/RAD):' : '☢️ Dose (NASA OSDR/RAD):'}
          </span>
          <strong>
            {resources.radiationDoseMsv} mSv{' '}
            <small className="rad-delta">
              (+
              {(
                projection.delta.radiationDoseMsv +
                Math.max(0, hoveredChoice?.resourceDelta.radiationDoseMsv ?? 0)
              ).toFixed(2)}
              )
            </small>
          </strong>
        </div>

        {/* Efectos Encadenados del Día Anterior */}
        {pendingEffects.length > 0 && (
          <div className="pending-effects-box" role="status">
            <strong>
              ⏱️{' '}
              {lang === 'es'
                ? 'Consecuencias de Ayer Activas Hoy:'
                : 'Yesterday’s Chained Consequences Today:'}
            </strong>
            {pendingEffects.map((eff, i) => (
              <p key={i}>• {eff.description[lang]}</p>
            ))}
          </div>
        )}
      </div>

      {/* Presupuesto de Energía (4 Sliders + Presets) */}
      <div className="panel-section">
        <div className="section-title-row">
          <h2>
            {lang === 'es' ? '🎛️ Presupuesto de Energía' : '🎛️ Power Budget Trade-Off'}
          </h2>
          <span className={totalPowerUsed > 100 ? 'alloc-warn' : 'alloc-ok'}>
            {totalPowerUsed}% {lang === 'es' ? 'Carga' : 'Load'}
          </span>
        </div>
        <p className="helper-note">
          {lang === 'es'
            ? `Generación solar hoy: +${projection.solarGain}%. Si pasas de 100% de carga, gastas batería extra.`
            : `Solar gain today: +${projection.solarGain}%. Exceeding 100% grid load drains extra battery.`}
        </p>

        {/* Botones de Presets Rápidos para niños */}
        <div className="preset-chips-row">
          <button
            type="button"
            className="preset-chip"
            onClick={() =>
              applyPreset({
                lifeSupportAlloc: 25,
                shieldingAlloc: 25,
                greenhouseAlloc: 25,
                scienceAndCommsAlloc: 25,
              })
            }
          >
            ⚖️ {lang === 'es' ? 'Equilibrado' : 'Balanced'}
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={() =>
              applyPreset({
                lifeSupportAlloc: 25,
                shieldingAlloc: 45,
                greenhouseAlloc: 15,
                scienceAndCommsAlloc: 15,
              })
            }
          >
            🛡️ {lang === 'es' ? 'Modo Tormenta' : 'Storm Shield'}
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={() =>
              applyPreset({
                lifeSupportAlloc: 40,
                shieldingAlloc: 20,
                greenhouseAlloc: 25,
                scienceAndCommsAlloc: 15,
              })
            }
          >
            🫧 {lang === 'es' ? 'Prioridad O₂' : 'Boost O₂'}
          </button>
          <button
            type="button"
            className="preset-chip"
            onClick={() =>
              applyPreset({
                lifeSupportAlloc: 20,
                shieldingAlloc: 20,
                greenhouseAlloc: 20,
                scienceAndCommsAlloc: 15,
              })
            }
          >
            🔋 {lang === 'es' ? 'Ahorro (75%)' : 'Save Battery'}
          </button>
        </div>

        <div className="slider-group">
          <label htmlFor="slider-lifesupport">
            <span>{lang === 'es' ? '🫧 Oxígeno y Agua (ECLSS)' : '🫧 Oxygen & Water (ECLSS)'}</span>
            <strong>{allocation.lifeSupportAlloc}%</strong>
          </label>
          <input
            id="slider-lifesupport"
            type="range"
            min={10}
            max={50}
            step={5}
            value={allocation.lifeSupportAlloc}
            onChange={(e) => updateSlider('lifeSupportAlloc', Number(e.target.value))}
          />
        </div>

        <div className="slider-group">
          <label htmlFor="slider-shielding">
            <span>{lang === 'es' ? '🛡️ Escudo Anti-Radiación' : '🛡️ Radiation Shielding'}</span>
            <strong>{allocation.shieldingAlloc}%</strong>
          </label>
          <input
            id="slider-shielding"
            type="range"
            min={10}
            max={50}
            step={5}
            value={allocation.shieldingAlloc}
            onChange={(e) => updateSlider('shieldingAlloc', Number(e.target.value))}
          />
        </div>

        <div className="slider-group">
          <label htmlFor="slider-greenhouse">
            <span>{lang === 'es' ? '🌱 Invernadero Hidropónico' : '🌱 Hydroponic Greenhouse'}</span>
            <strong>{allocation.greenhouseAlloc}%</strong>
          </label>
          <input
            id="slider-greenhouse"
            type="range"
            min={10}
            max={50}
            step={5}
            value={allocation.greenhouseAlloc}
            onChange={(e) => updateSlider('greenhouseAlloc', Number(e.target.value))}
          />
        </div>

        <div className="slider-group">
          <label htmlFor="slider-science">
            <span>{lang === 'es' ? '🔬 Ciencia, Rovers y Antena' : '🔬 Science, Rovers & Comms'}</span>
            <strong>{allocation.scienceAndCommsAlloc}%</strong>
          </label>
          <input
            id="slider-science"
            type="range"
            min={10}
            max={45}
            step={5}
            value={allocation.scienceAndCommsAlloc}
            onChange={(e) => updateSlider('scienceAndCommsAlloc', Number(e.target.value))}
          />
        </div>
      </div>
    </aside>
  );
};
