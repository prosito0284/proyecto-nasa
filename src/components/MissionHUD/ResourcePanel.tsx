/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Panel de Control de Recursos Vitales, Modos de Energía y Rango de Comandante.
 * C9: Cero emoji; usa exclusivamente iconos SVG de trazo de `src/components/icons`.
 */

import React, { useState } from 'react';
import {
  CoreResources,
  CrewStatus,
  Language,
  PowerAllocation,
  TradeoffChoice,
} from '../../types/mission';
import type {
  CommanderEvaluation,
  TurnProjection,
} from '../../engine/simulationEngine';
import type { UnlockedPatchRecord } from '../../services/patchStorage';
import { missionAudio } from '../../utils/sound';
import {
  AlertIcon,
  ArrowIcon,
  BatteryIcon,
  CheckIcon,
  ClockIcon,
  DropletIcon,
  HelmetIcon,
  LeafIcon,
  PatchIcon,
  RadiationIcon,
  ScienceIcon,
  ShieldIcon,
  SlidersIcon,
} from '../icons';
import { CrewPortrait } from '../crew';
import { MissionPatch } from './MissionPatch';

export interface ResourcePanelProps {
  lang: Language;
  resources: CoreResources;
  allocation: PowerAllocation;
  projection: TurnProjection;
  hoveredChoice: TradeoffChoice | null;
  pendingEffects: Array<{
    description: { es: string; en: string };
    resourceDelta: Partial<CoreResources>;
  }>;
  evaluation: CommanderEvaluation;
  onChangeAllocation: (next: PowerAllocation) => void;
  onOpenBadgesModal: () => void;
  /** C14: Estado opcional de la tripulación para mostrar el retrato de quien vigila cada vital */
  crew?: CrewStatus[];
  /** T04: Callback opcional para notificar acciones del entrenamiento guiado */
  onTutorialAction?: (stepId: string) => void;
  /** P03: Registros persistidos de parches desbloqueados */
  unlockedRecords?: Record<string, UnlockedPatchRecord>;
}

const POWER_PRESETS: Array<{
  id: 'balanced' | 'storm' | 'greenhouse' | 'science';
  icon: React.ReactNode;
  title: { es: string; en: string };
  subtitle: { es: string; en: string };
  alloc: PowerAllocation;
}> = [
  {
    id: 'balanced',
    icon: <SlidersIcon size={18} />,
    title: { es: 'Equilibrado', en: 'Balanced' },
    subtitle: { es: 'Estable para días normales', en: 'Steady for normal days' },
    alloc: {
      lifeSupportAlloc: 35,
      shieldingAlloc: 25,
      greenhouseAlloc: 25,
      scienceAndCommsAlloc: 15,
    },
  },
  {
    id: 'storm',
    icon: <ShieldIcon size={18} />,
    title: { es: 'Escudo Tormenta', en: 'Storm Shield' },
    subtitle: { es: 'Máxima defensa radiación', en: 'Max radiation defense' },
    alloc: {
      lifeSupportAlloc: 35,
      shieldingAlloc: 40,
      greenhouseAlloc: 15,
      scienceAndCommsAlloc: 10,
    },
  },
  {
    id: 'greenhouse',
    icon: <LeafIcon size={18} />,
    title: { es: 'Invernadero', en: 'Greenhouse' },
    subtitle: { es: 'Impulsa cosechas y O₂', en: 'Boosts crops & O₂' },
    alloc: {
      lifeSupportAlloc: 35,
      shieldingAlloc: 15,
      greenhouseAlloc: 40,
      scienceAndCommsAlloc: 10,
    },
  },
  {
    id: 'science',
    icon: <ScienceIcon size={18} />,
    title: { es: 'Ciencia', en: 'Science' },
    subtitle: { es: 'Más datos y telemetría', en: 'More data & telemetry' },
    alloc: {
      lifeSupportAlloc: 30,
      shieldingAlloc: 20,
      greenhouseAlloc: 20,
      scienceAndCommsAlloc: 30,
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
  crew,
  onTutorialAction,
  unlockedRecords,
}) => {
  const [showAdvancedSliders, setShowAdvancedSliders] = useState(false);
  const [gridIgnited, setGridIgnited] = useState(false);
  const [oxygenPressurized, setOxygenPressurized] = useState(false);
  const totalPowerUsed = projection.load;

  const updateSlider = (key: keyof PowerAllocation, val: number) => {
    missionAudio.playSliderTick();
    setGridIgnited(true);
    onChangeAllocation({
      ...allocation,
      [key]: val,
    });
    onTutorialAction?.('step-power-presets');
    onTutorialAction?.('power-grid');
  };

  const applyPreset = (preset: PowerAllocation, presetId?: string) => {
    missionAudio.playClick();
    setGridIgnited(true);
    onChangeAllocation(preset);
    onTutorialAction?.('step-power-presets');
    onTutorialAction?.('power-grid');
    if (presetId) {
      onTutorialAction?.(`power-preset-${presetId}`);
      if (presetId === 'storm') {
        onTutorialAction?.('thermal-stabilizer');
      }
    }
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
    icon: React.ReactNode;
    label: string;
    value: number;
    unit: string;
  }> = [
    {
      id: 'power',
      icon: <BatteryIcon size={16} />,
      label: lang === 'es' ? 'Energía (Baterías)' : 'Power (Batteries)',
      value: resources.power,
      unit: '%',
    },
    {
      id: 'lifeSupport',
      icon: <DropletIcon size={16} />,
      label: lang === 'es' ? 'Soporte Vital (O₂/H₂O)' : 'Life Support (O₂/H₂O)',
      value: resources.lifeSupport,
      unit: '%',
    },
    {
      id: 'shielding',
      icon: <ShieldIcon size={16} />,
      label: lang === 'es' ? 'Blindaje Radiación' : 'Radiation Shielding',
      value: resources.shielding,
      unit: '%',
    },
    {
      id: 'food',
      icon: <LeafIcon size={16} />,
      label: lang === 'es' ? 'Cultivos / Comida' : 'Crops / Food',
      value: resources.food,
      unit: '%',
    },
    {
      id: 'crewHealth',
      icon: <HelmetIcon size={16} />,
      label: lang === 'es' ? 'Salud Tripulación' : 'Crew Health',
      value: resources.crewHealth,
      unit: '%',
    },
  ];

  const isBadgeEarned = (badge: { id: string; earned: boolean }) =>
    badge.earned || Boolean(unlockedRecords?.[badge.id]);

  const earnedBadgesCount = evaluation.badges.filter(isBadgeEarned).length;
  const scienceDelta =
    projection.delta.sciencePoints + (hoveredChoice?.resourceDelta.sciencePoints ?? 0);

  return (
    <aside className="hud-panel" aria-label="Mission Resource Telemetry">
      {/* C2: Barra compacta de vitales fija arriba en móvil */}
      <div
        className="mobile-vitals-sticky"
        role="region"
        aria-live="polite"
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
                  {m.icon}
                </span>
                <span className="mv-val">
                  {m.value}%
                  <small
                    className={
                      delta > 0 ? 'mv-delta-up' : delta < 0 ? 'mv-delta-down' : 'mv-delta-flat'
                    }
                  >
                    {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'}
                  </small>
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
            <span className="mv-icon" aria-hidden="true">
              <PatchIcon size={15} />
            </span>
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
          <div className="commander-mini-top">
            <div>
              <span className="rank-eyebrow">
                {lang === 'es' ? 'Rango de Comandante' : 'Commander Rank'}
              </span>
              <div className="rank-title-row">
                <HelmetIcon size={18} />
                <strong>{evaluation.rank.title[lang]}</strong>
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
              <PatchIcon size={16} /> {earnedBadgesCount}/{evaluation.badges.length}{' '}
              {lang === 'es' ? 'Parches' : 'Patches'}
            </button>
          </div>
          <div
            className="commander-mini-patches"
            role="group"
            aria-label={
              lang === 'es' ? 'Colección de parches de misión' : 'Mission patch collection'
            }
          >
            {evaluation.badges.map((badge) => {
              const earned = isBadgeEarned(badge);
              return (
                <button
                  key={badge.id}
                  type="button"
                  className="commander-mini-patch-btn"
                  onClick={() => {
                    missionAudio.playClick();
                    onOpenBadgesModal();
                  }}
                  title={`${badge.title[lang]} — ${
                    earned
                      ? lang === 'es'
                        ? 'Ganado'
                        : 'Earned'
                      : lang === 'es'
                        ? 'Por desbloquear'
                        : 'Locked'
                  }`}
                  aria-label={badge.title[lang]}
                >
                  <MissionPatch badgeId={badge.id} earned={earned} size={26} />
                </button>
              );
            })}
          </div>
        </div>

        {/* C14: Vitales como Hoja de Checklist con Casilla de Estado, Retrato Opcional y Proyección */}
        <div
          className={`panel-section ${gridIgnited ? 'onboarding-grid-ignited' : ''}`}
          data-tutorial-id="vitals-checklist"
          data-onboarding-id="vitals-checklist"
        >
          <div className="section-title-row">
            <h2>
              <SlidersIcon size={17} />{' '}
              {lang === 'es' ? 'Checklist de vitales' : 'Vitals checklist'}
            </h2>
            <span className="science-score-badge" aria-live="polite">
              <ScienceIcon size={15} /> {resources.sciencePoints} (
              {scienceDelta >= 0 ? `+${scienceDelta}` : scienceDelta}) Pts
            </span>
          </div>

          <div className="vitals-checklist" role="list">
            {metrics.map((m) => {
              const delta = getCombinedDelta(m.id);
              const projectedVal = Math.max(0, Math.min(100, m.value + delta));
              const isCrit = m.value <= 25;
              const isWarn = m.value > 25 && m.value <= 50;
              const statusKey = isCrit ? 'critical' : isWarn ? 'warning' : 'nominal';
              const statusWord = isCrit
                ? lang === 'es'
                  ? 'CRÍTICO'
                  : 'CRIT'
                : isWarn
                  ? lang === 'es'
                    ? 'ATENCIÓN'
                    : 'WATCH'
                  : lang === 'es'
                    ? 'BIEN'
                    : 'OK';

              const watcher = crew?.find((c) => c.member.watches === m.id);
              const isOxygenRow = m.id === 'lifeSupport';

              return (
                <div
                  key={m.id}
                  role="listitem"
                  data-onboarding-id={isOxygenRow ? 'oxygen-module' : `vital-${m.id}`}
                  className={`vital-checklist-row vital-row-${statusKey} ${
                    isOxygenRow && oxygenPressurized ? 'onboarding-oxygen-pressurized' : ''
                  }`}
                  onClick={() => {
                    if (isOxygenRow) {
                      missionAudio.playClick();
                      setOxygenPressurized(true);
                      onTutorialAction?.('oxygen-module');
                    }
                  }}
                >
                  <div className="vital-checklist-main">
                    {/* Casilla de checklist con estado (bien / atención / crítico) */}
                    <span
                      className={`vital-checkbox-badge vital-check-${statusKey}`}
                      title={
                        lang === 'es'
                          ? `Estado actual: ${statusWord}`
                          : `Current status: ${statusWord}`
                      }
                    >
                      <span className="vital-checkbox-square" aria-hidden="true">
                        {isCrit || isWarn ? <AlertIcon size={12} /> : <CheckIcon size={12} />}
                      </span>
                      <span className="vital-status-word">{statusWord}</span>
                    </span>

                    {/* Retrato pequeño de quien vigila este vital (si `crew` está presente) */}
                    {watcher && (
                      <CrewPortrait
                        memberId={watcher.member.id}
                        mood={watcher.mood}
                        size={30}
                        title={`${watcher.member.name} (${watcher.member.role[lang]}): "${watcher.line[lang]}"`}
                        className="vital-watcher-portrait"
                      />
                    )}

                    {/* Nombre del vital + responsable opcional */}
                    <div className="vital-label-col">
                      <span className="resource-label-inline">
                        {m.icon} {m.label}
                      </span>
                      {watcher && (
                        <small className="vital-watcher-name">
                          {watcher.member.name} · {watcher.member.role[lang]}
                        </small>
                      )}
                    </div>
                  </div>

                  {/* Valor actual y proyección de mañana */}
                  <div className="vital-numbers-col">
                    <strong className="mono-val vital-current-val">
                      {m.value}
                      {m.unit}
                    </strong>
                    <span
                      className={`proj-badge ${
                        delta > 0 ? 'proj-up' : delta < 0 ? 'proj-down' : 'proj-flat'
                      }`}
                      title={
                        lang === 'es'
                          ? `Proyección mañana: ${projectedVal}% (${delta >= 0 ? '+' + delta : delta}%)`
                          : `Tomorrow projection: ${projectedVal}% (${delta >= 0 ? '+' + delta : delta}%)`
                      }
                    >
                      → {projectedVal}% ({delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '±0'})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="radiation-readout">
            <span className="resource-label-inline">
              <RadiationIcon size={15} />{' '}
              {lang === 'es' ? 'Dosis (NASA OSDR/RAD):' : 'Dose (NASA OSDR/RAD):'}
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
                <ClockIcon size={15} />{' '}
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
        <div
          className="panel-section"
          data-tutorial-id="power-presets"
          data-onboarding-id="power-presets-section"
        >
          <div className="section-title-row">
            <h2>
              <BatteryIcon size={17} />{' '}
              {lang === 'es' ? 'Modo de Energía' : 'Power Mode'}
            </h2>
            <span className={totalPowerUsed > 100 ? 'alloc-warn' : 'alloc-ok'}>
              {totalPowerUsed}% {lang === 'es' ? 'Carga' : 'Load'}
            </span>
          </div>

          <div className="power-presets-large-grid">
            {POWER_PRESETS.map((preset) => {
              const isActive = isSameAllocation(allocation, preset.alloc);
              const onboardingAttr =
                preset.id === 'balanced'
                  ? 'power-grid'
                  : preset.id === 'storm'
                    ? 'thermal-stabilizer'
                    : `power-preset-${preset.id}`;
              return (
                <button
                  key={preset.id}
                  type="button"
                  id={`power-preset-${preset.id}-btn`}
                  data-tutorial-id={`power-preset-${preset.id}`}
                  data-onboarding-id={onboardingAttr}
                  className={`preset-large-btn ${isActive ? 'preset-large-active' : ''}`}
                  aria-pressed={isActive}
                  onClick={() => applyPreset(preset.alloc, preset.id)}
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
            <SlidersIcon size={15} />{' '}
            {showAdvancedSliders
              ? lang === 'es'
                ? 'Ocultar Ajustes Avanzados'
                : 'Hide Advanced Sliders'
              : lang === 'es'
                ? 'Avanzado: Ajustar Sliders por Sistema'
                : 'Advanced: Fine-Tune System Sliders'}
            <ArrowIcon size={14} direction={showAdvancedSliders ? 'up' : 'down'} />
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
                  <span className="resource-label-inline">
                    <DropletIcon size={14} />{' '}
                    {lang === 'es' ? 'Oxígeno y Agua (ECLSS)' : 'Oxygen & Water (ECLSS)'}
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
                  <span className="resource-label-inline">
                    <ShieldIcon size={14} />{' '}
                    {lang === 'es' ? 'Escudo Anti-Radiación' : 'Radiation Shielding'}
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
                  <span className="resource-label-inline">
                    <LeafIcon size={14} />{' '}
                    {lang === 'es' ? 'Invernadero Hidropónico' : 'Hydroponic Greenhouse'}
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
                  <span className="resource-label-inline">
                    <ScienceIcon size={14} />{' '}
                    {lang === 'es'
                      ? 'Ciencia, Rovers y Antena'
                      : 'Science, Rovers & Comms'}
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
