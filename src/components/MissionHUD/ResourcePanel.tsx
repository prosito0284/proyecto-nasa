/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * C2 & C3 — Panel de Recursos Vitales y Presupuesto de Energía Simplificado para 7–12 años.
 * Los 4 presets de energía son botones grandes principales y los sliders individuales
 * quedan plegados por defecto bajo "Avanzado".
 */

import React, { useState } from 'react';
import {
  CoreResources,
  Language,
  LocalizedText,
  PowerAllocation,
  TradeoffChoice,
} from '../../types/mission';
import type { CommanderEvaluation, TurnProjection } from '../../engine/simulationEngine';
import { missionAudio } from '../../utils/sound';

export interface ResourcePanelProps {
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

interface PowerPresetOption {
  id: string;
  icon: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  alloc: PowerAllocation;
}

const POWER_PRESETS: PowerPresetOption[] = [
  {
    id: 'balanced',
    icon: '⚖️',
    title: { es: 'Equilibrado', en: 'Balanced' },
    subtitle: { es: 'Todo estable (100% carga)', en: 'All steady (100% load)' },
    alloc: {
      lifeSupportAlloc: 25,
      shieldingAlloc: 25,
      greenhouseAlloc: 25,
      scienceAndCommsAlloc: 25,
    },
  },
  {
    id: 'storm-shield',
    icon: '🛡️',
    title: { es: 'Modo Tormenta', en: 'Storm Shield' },
    subtitle: { es: 'Máximo escudo solar', en: 'Max radiation shield' },
    alloc: {
      lifeSupportAlloc: 25,
      shieldingAlloc: 45,
      greenhouseAlloc: 15,
      scienceAndCommsAlloc: 15,
    },
  },
  {
    id: 'boost-o2',
    icon: '🫧',
    title: { es: 'Prioridad O₂ y Cultivo', en: 'Boost O₂ & Crops' },
    subtitle: { es: '+Aire y comida vital', en: '+Air & greenhouse' },
    alloc: {
      lifeSupportAlloc: 35,
      shieldingAlloc: 20,
      greenhouseAlloc: 30,
      scienceAndCommsAlloc: 15,
    },
  },
  {
    id: 'save-battery',
    icon: '🔋',
    title: { es: 'Recargar Batería', en: 'Save Battery' },
    subtitle: { es: 'Bajo consumo (75% carga)', en: 'Low drain (75% load)' },
    alloc: {
      lifeSupportAlloc: 20,
      shieldingAlloc: 20,
      greenhouseAlloc: 20,
      scienceAndCommsAlloc: 15,
    },
  },
];

function isSameAllocation(a: PowerAllocation, b: PowerAllocation): boolean {
  return (
    a.lifeSupportAlloc === b.lifeSupportAlloc &&
    a.shieldingAlloc === b.shieldingAlloc &&
    a.greenhouseAlloc === b.greenhouseAlloc &&
    a.scienceAndCommsAlloc === b.scienceAndCommsAlloc
  );
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
  const [showAdvancedSliders, setShowAdvancedSliders] = useState(false);
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
    shortIcon: string;
    label: string;
    value: number;
    unit: string;
  }> = [
    {
      id: 'power',
      shortIcon: '⚡',
      label: lang === 'es' ? '⚡ Energía (Baterías)' : '⚡ Power (Batteries)',
      value: resources.power,
      unit: '%',
    },
    {
      id: 'lifeSupport',
      shortIcon: '🫧',
      label: lang === 'es' ? '🫧 Soporte Vital (O₂/H₂O)' : '🫧 Life Support (O₂/H₂O)',
      value: resources.lifeSupport,
      unit: '%',
    },
    {
      id: 'shielding',
      shortIcon: '🛡️',
      label: lang === 'es' ? '🛡️ Blindaje Radiación' : '🛡️ Radiation Shielding',
      value: resources.shielding,
      unit: '%',
    },
    {
      id: 'food',
      shortIcon: '🌱',
      label: lang === 'es' ? '🌱 Cultivos / Comida' : '🌱 Crops / Food',
      value: resources.food,
      unit: '%',
    },
    {
      id: 'crewHealth',
      shortIcon: '❤️',
      label: lang === 'es' ? '❤️ Salud Tripulación' : '❤️ Crew Health',
      value: resources.crewHealth,
      unit: '%',
    },
  ];

  const earnedBadgesCount = evaluation.badges.filter((b) => b.earned).length;
  const scienceDelta =
    projection.delta.sciencePoints + (hoveredChoice?.resourceDelta.sciencePoints ?? 0);

  return (
    <aside className="hud-panel" aria-label="Mission Resource Telemetry">
      {/* C2: Barra compacta de vitales fija arriba en móvil */}
      <div
        className="mobile-vitals-sticky"
        role="region"
        aria-label={lang === 'es' ? 'Resumen rápido de vitales' : 'Quick vitals summary'}
      >
        <div className="mobile-vitals-pills">
          {metrics.map((m) => {
            const delta = getCombinedDelta(m.id);
            const isCrit = m.value <= 25;
            const isWarn = m.value > 25 && m.value <= 50;
            return (
              <div
                key={m.id}
                className={`mobile-vital-pill ${
                  isCrit ? 'mv-crit' : isWarn ? 'mv-warn' : 'mv-ok'
                }`}
              >
                <span className="mv-icon" aria-hidden="true">
                  {m.shortIcon}
                </span>
                <span className="mv-val">
                  {m.value}%
                  {delta !== 0 && (
                    <small className={delta > 0 ? 'mv-delta-up' : 'mv-delta-down'}>
                      {delta > 0 ? `+${delta}` : delta}
                    </small>
                  )}
                </span>
              </div>
            );
          })}
          <button
            type="button"
            className="mobile-vital-pill mv-badges-btn"
            onClick={() => {
              missionAudio.playClick();
              onOpenBadgesModal();
            }}
            aria-label={lang === 'es' ? 'Ver rango e insignias' : 'View rank and badges'}
          >
            <span>{evaluation.rank.emoji}</span>
            <span className="mv-val">
              {earnedBadgesCount}/{evaluation.badges.length}
            </span>
          </button>
        </div>
      </div>

      {/* Contenedor de vitales y modos de energía */}
      <div className="hud-details-panel">
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
            <h2>{lang === 'es' ? '📊 Vitales de la Base' : '📊 Outpost Vitals'}</h2>
            <span className="science-score-badge">
              🔬 {resources.sciencePoints}
              {scienceDelta > 0 ? ` (+${scienceDelta})` : ''} Pts
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
            <div className="pending-effects-box" role="status" aria-live="polite">
              <strong>
                ⏱️{' '}
                {lang === 'es'
                  ? 'Consecuencia de Ayer Activa Hoy:'
                  : 'Yesterday’s Consequence Active Today:'}
              </strong>
              {pendingEffects.map((eff, i) => (
                <p key={i}>• {eff.description[lang]}</p>
              ))}
            </div>
          )}
        </div>

        {/* C3: Modos de Energía como Botones Grandes Principales + Sliders Plegados bajo "Avanzado" */}
        <div className="panel-section">
          <div className="section-title-row">
            <h2>{lang === 'es' ? '⚡ Modo de Energía' : '⚡ Power Mode'}</h2>
            <span className={totalPowerUsed > 100 ? 'alloc-warn' : 'alloc-ok'}>
              {totalPowerUsed}% {lang === 'es' ? 'Carga' : 'Load'}
            </span>
          </div>

          <div className="power-presets-large-grid">
            {POWER_PRESETS.map((preset) => {
              const isActive = isSameAllocation(allocation, preset.alloc);
              return (
                <button
                  key={preset.id}
                  type="button"
                  id={`power-preset-${preset.id}-btn`}
                  className={`preset-large-btn ${isActive ? 'preset-large-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => applyPreset(preset.alloc)}
                >
                  <span className="preset-large-icon" aria-hidden="true">
                    {preset.icon}
                  </span>
                  <span className="preset-large-text">
                    <strong>{preset.title[lang]}</strong>
                    <small>{preset.subtitle[lang]}</small>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Botón plegable "Avanzado" para los 4 sliders individuales */}
          <button
            type="button"
            id="toggle-advanced-power-btn"
            className="btn-secondary advanced-toggle-btn"
            aria-expanded={showAdvancedSliders}
            onClick={() => {
              missionAudio.playClick();
              setShowAdvancedSliders((prev) => !prev);
            }}
          >
            ⚙️{' '}
            {showAdvancedSliders
              ? lang === 'es'
                ? 'Ocultar Ajustes Avanzados ▲'
                : 'Hide Advanced Sliders ▲'
              : lang === 'es'
                ? 'Avanzado: Ajustar Sliders por Sistema ▼'
                : 'Advanced: Fine-Tune System Sliders ▼'}
          </button>

          {showAdvancedSliders && (
            <div className="advanced-sliders-drawer">
              <p className="helper-note">
                {lang === 'es'
                  ? `Generación solar hoy: +${projection.solarGain}%. Si pasas de 100% de carga, gastas batería extra.`
                  : `Solar gain today: +${projection.solarGain}%. Exceeding 100% grid load drains extra battery.`}
              </p>

              <div className="slider-group">
                <label htmlFor="slider-lifesupport">
                  <span>
                    {lang === 'es' ? '🫧 Oxígeno y Agua (ECLSS)' : '🫧 Oxygen & Water (ECLSS)'}
                  </span>
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
                  <span>
                    {lang === 'es' ? '🛡️ Escudo Anti-Radiación' : '🛡️ Radiation Shielding'}
                  </span>
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
                  <span>
                    {lang === 'es' ? '🌱 Invernadero Hidropónico' : '🌱 Hydroponic Greenhouse'}
                  </span>
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
                  <span>
                    {lang === 'es'
                      ? '🔬 Ciencia, Rovers y Antena'
                      : '🔬 Science, Rovers & Comms'}
                  </span>
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
          )}
        </div>
      </div>
    </aside>
  );
};
