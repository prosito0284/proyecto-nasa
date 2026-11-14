/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Modal y Certificado de Evaluación de Comandante Junior e Insignias de Ingeniería NASA
 * Conectado con `evaluateCommanderPerformance` del Bloque A (Claude Code).
 */

import React from 'react';
import { Language, OutpostSiteConfig } from '../../types/mission';
import { CommanderEvaluation } from '../../engine/simulationEngine';
import { missionAudio } from '../../utils/sound';

interface CommanderCertificateProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  evaluation: CommanderEvaluation;
  site: OutpostSiteConfig;
  currentDay: number;
  totalDays: number;
  missionStatus: 'briefing' | 'playing' | 'won' | 'failed';
  onRestartMission: () => void;
}

export const CommanderCertificate: React.FC<CommanderCertificateProps> = ({
  lang,
  isOpen,
  onClose,
  evaluation,
  site,
  currentDay,
  totalDays,
  missionStatus,
  onRestartMission,
}) => {
  if (!isOpen) return null;

  const breakdownItems = [
    {
      label: lang === 'es' ? 'Supervivencia de Misión' : 'Mission Survival',
      val: evaluation.breakdown.survival,
      max: 30,
    },
    {
      label: lang === 'es' ? 'Equilibrio de Recursos' : 'Resource Balance',
      val: evaluation.breakdown.resources,
      max: 25,
    },
    {
      label: lang === 'es' ? 'Salud de la Tripulación' : 'Crew Health',
      val: evaluation.breakdown.crew,
      max: 20,
    },
    {
      label: lang === 'es' ? 'Ciencia e Investigación' : 'Science & Research',
      val: evaluation.breakdown.science,
      max: 15,
    },
    {
      label: lang === 'es' ? 'Protección Radiación (ALARA)' : 'Radiation Protection (ALARA)',
      val: evaluation.breakdown.radiation,
      max: 10,
    },
  ];

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      id="commander-certificate-modal"
    >
      <div className="modal-card certificate-modal-card">
        <div className="modal-header">
          <div>
            <span className="nasa-badge">NASA JUNIOR ASTRONAUT MISSION EVALUATION</span>
            <h2>
              {evaluation.rank.emoji} {evaluation.rank.title[lang]} — {evaluation.score}/100 pts
            </h2>
            <p className="brand-subtitle">{evaluation.rank.message[lang]}</p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => {
              missionAudio.playClick();
              onClose();
            }}
            id="close-certificate-modal-btn"
          >
            {lang === 'es' ? 'Cerrar ✕' : 'Close ✕'}
          </button>
        </div>

        {/* Desglose de Puntuación de Ingeniería */}
        <div className="cert-breakdown-box">
          <div className="cert-meta-row">
            <span>
              📍 <strong>{site.name[lang]}</strong>
            </span>
            <span>
              🗓️ {site.dayName[lang]} {currentDay} / {totalDays}
            </span>
            <span>
              ☢️ {lang === 'es' ? 'Dosis de misión:' : 'Mission dose:'}{' '}
              <strong>{evaluation.missionDoseMsv} mSv</strong>
            </span>
          </div>

          <div className="cert-bars-grid">
            {breakdownItems.map((item, i) => (
              <div key={i} className="cert-bar-item">
                <div className="resource-row-header">
                  <span>{item.label}</span>
                  <strong className="mono-val">
                    {item.val} / {item.max}
                  </strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill bar-nominal"
                    style={{ width: `${Math.round((item.val / item.max) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insignias Desbloqueables */}
        <div>
          <h3 className="badges-heading">
            🏅{' '}
            {lang === 'es'
              ? 'Insignias de Ingeniería Espacial NASA'
              : 'NASA Space Engineering Badges'}
          </h3>
          <div className="badges-grid">
            {evaluation.badges.map((badge) => (
              <div
                key={badge.id}
                className={`badge-card ${badge.earned ? 'badge-earned' : 'badge-locked'}`}
              >
                <div className="badge-card-top">
                  <span className="badge-emoji">{badge.emoji}</span>
                  <span className="badge-status-tag">
                    {badge.earned
                      ? lang === 'es'
                        ? '✅ GANADA'
                        : '✅ EARNED'
                      : lang === 'es'
                        ? '🔒 POR DESBLOQUEAR'
                        : '🔒 LOCKED'}
                  </span>
                </div>
                <h4>{badge.title[lang]}</h4>
                <p>{badge.description[lang]}</p>
              </div>
            ))}
          </div>
        </div>

        {missionStatus !== 'playing' && (
          <div className="cert-footer-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                onClose();
                onRestartMission();
              }}
            >
              🔄 {lang === 'es' ? 'Jugar Nueva Misión' : 'Play Another Mission'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
