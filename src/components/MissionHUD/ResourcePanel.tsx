/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Panel de Recursos Vitales y Presupuesto de Energía (Power Budgeting).
 */

import React from 'react';
import { CoreResources, Language, PowerAllocation } from '../../types/mission';

interface ResourcePanelProps {
  lang: Language;
  resources: CoreResources;
  allocation: PowerAllocation;
  onChangeAllocation: (next: PowerAllocation) => void;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({
  lang,
  resources,
  allocation,
  onChangeAllocation,
}) => {
  const totalPowerUsed =
    allocation.lifeSupportAlloc +
    allocation.shieldingAlloc +
    allocation.greenhouseAlloc +
    allocation.scienceAndCommsAlloc;

  const updateSlider = (key: keyof PowerAllocation, val: number) => {
    onChangeAllocation({
      ...allocation,
      [key]: val,
    });
  };

  const metrics = [
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

  return (
    <aside className="hud-panel" aria-label="Mission Resource Telemetry">
      <div className="panel-section">
        <div className="section-title-row">
          <h2>{lang === 'es' ? '📊 Vitales del Hábitat' : '📊 Outpost Vitals'}</h2>
          <span className="science-score-badge">
            🔬 {resources.sciencePoints} {lang === 'es' ? 'Pts Ciencia' : 'Science Pts'}
          </span>
        </div>

        <div className="bars-list">
          {metrics.map((m) => {
            const statusClass =
              m.value <= 25 ? 'bar-critical' : m.value <= 50 ? 'bar-warning' : 'bar-nominal';
            return (
              <div key={m.id} className="resource-row">
                <div className="resource-row-header">
                  <span>{m.label}</span>
                  <strong className="mono-val">
                    {m.value}
                    {m.unit}
                  </strong>
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
            {lang === 'es' ? '☢️ Dosis Acumulada (NASA OSDR/RAD):' : '☢️ Cumulative Dose (NASA OSDR/RAD):'}
          </span>
          <strong>{resources.radiationDoseMsv} mSv</strong>
        </div>
      </div>

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
            ? 'Si asignas más de 100% en total, tus baterías principales se descargarán más rápido.'
            : 'Allocating over 100% total load drains your main battery reserves faster.'}
        </p>

        <div className="slider-group">
          <label htmlFor="slider-lifesupport">
            <span>{lang === 'es' ? 'Oxígeno y Agua (ECLSS)' : 'Oxygen & Water (ECLSS)'}</span>
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
            <span>{lang === 'es' ? 'Escudo Anti-Radiación' : 'Radiation Shielding'}</span>
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
            <span>{lang === 'es' ? 'Invernadero Hidropónico' : 'Hydroponic Greenhouse'}</span>
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
      </div>
    </aside>
  );
};
