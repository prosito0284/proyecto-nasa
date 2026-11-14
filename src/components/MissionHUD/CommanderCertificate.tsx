/**
 * BLOQUE C (Asignado a: Antigravity Principal - Rama: feat/outpost-ui)
 * Modal y Certificado de Evaluación de Comandante Junior e Insignias de Ingeniería NASA
 * C9: Cero emoji; usa exclusivamente iconos SVG de trazo de `src/components/icons`.
 */

import React, { useEffect, useState } from 'react';
import {
  DecisionRecord,
  Language,
  OutpostSiteConfig,
  SpaceWeatherEvent,
} from '../../types/mission';
import type { CommanderEvaluation } from '../../engine/simulationEngine';
import { missionAudio } from '../../utils/sound';
import {
  AlertIcon,
  ArrowIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  DustIcon,
  HelmetIcon,
  LanguageIcon,
  PatchIcon,
  PrintIcon,
  RadiationIcon,
  SunIcon,
} from '../icons';
import { MissionPatch } from './MissionPatch';

export interface CommanderCertificateProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  evaluation: CommanderEvaluation;
  site: OutpostSiteConfig;
  currentDay: number;
  totalDays: number;
  missionStatus: 'briefing' | 'playing' | 'won' | 'failed';
  onRestartMission: () => void;
  /** C6: Historial opcional de decisiones día por día (provisto por state.engine?.history) */
  history?: DecisionRecord[];
  /** C6: Nombre opcional inicial del astronauta */
  astronautName?: string;
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
  history,
  astronautName,
}) => {
  const [commanderName, setCommanderName] = useState(astronautName ?? '');

  useEffect(() => {
    if (astronautName !== undefined) {
      setCommanderName(astronautName);
    }
  }, [astronautName]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        missionAudio.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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

  const formatWeatherBadge = (weatherType: SpaceWeatherEvent['type']) => {
    switch (weatherType) {
      case 'FLR':
        return {
          icon: <SunIcon size={13} />,
          label: lang === 'es' ? 'Llamarada Solar (FLR)' : 'Solar Flare (FLR)',
        };
      case 'SEP':
        return {
          icon: <RadiationIcon size={13} />,
          label: lang === 'es' ? 'Partículas SEP' : 'SEP Radiation',
        };
      case 'CME':
        return {
          icon: <AlertIcon size={13} />,
          label: lang === 'es' ? 'Tormenta Solar (CME)' : 'CME Storm',
        };
      case 'DUST_STORM':
        return {
          icon: <DustIcon size={13} />,
          label: lang === 'es' ? 'Tormenta de Polvo' : 'Dust Storm',
        };
      default:
        return {
          icon: <SunIcon size={13} />,
          label: lang === 'es' ? 'Sol en Calma' : 'Quiet Sun',
        };
    }
  };

  const formatCodeLabel = (rawId: string) =>
    rawId
      .replace(/^(MOON|MARS|BOTH|SHARED)-/i, '')
      .replace(/-/g, ' ')
      .toUpperCase();

  const displayCommanderName =
    commanderName.trim() ||
    (lang === 'es' ? 'Comandante Espacial Junior' : 'Junior Space Commander');

  const earnedBadgesCount = evaluation.badges.filter((b) => b.earned).length;

  return (
    <div
      className="modal-backdrop certificate-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="certificate-modal-title"
      id="commander-certificate-modal"
    >
      <div className="modal-card certificate-modal-card">
        <div className="cert-paper-diploma-frame">
          {/* C12: Cinta Técnica de Serie del Documento Oficial */}
          <div className="cert-serial-bar">
            <span>FORM JSC-2026-CERT // NASA SPACE APPS CHALLENGE</span>
            <span>
              SITE: {site.id.toUpperCase()} ({site.coordinates})
            </span>
            <span>
              PATCHES: {earnedBadgesCount}/{evaluation.badges.length}
            </span>
          </div>

          <div className="modal-header cert-diploma-header">
            <div>
              <span className="nasa-badge">NASA JUNIOR ASTRONAUT MISSION EVALUATION</span>
              <h2 id="certificate-modal-title">
                <PatchIcon size={22} /> {evaluation.rank.title[lang]} — {evaluation.score}/100 pts
              </h2>
              <p className="brand-subtitle">{evaluation.rank.message[lang]}</p>
            </div>
            <div className="cert-header-actions no-print">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  missionAudio.playClick();
                  window.print();
                }}
                id="print-certificate-btn"
              >
                <PrintIcon size={16} />{' '}
                {lang === 'es' ? 'Imprimir Diploma (A4/Carta)' : 'Print Diploma (A4/Letter)'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  missionAudio.playClick();
                  onClose();
                }}
                id="close-certificate-modal-btn"
              >
                <CloseIcon size={16} /> {lang === 'es' ? 'Cerrar' : 'Close'}
              </button>
            </div>
          </div>

          {/* C6 & C12: Campo de nombre del Astronauta Junior + Encabezado de Diploma Imprimible */}
          <div className="cert-astronaut-name-box">
            <div className="cert-name-input-group no-print">
              <label htmlFor="astronaut-name-input" className="cert-name-label">
                <HelmetIcon size={16} />{' '}
                {lang === 'es'
                  ? 'Nombre del Astronauta / Comandante:'
                  : 'Astronaut / Commander Name:'}
              </label>
              <input
                id="astronaut-name-input"
                type="text"
                className="cert-name-input"
                maxLength={48}
                value={commanderName}
                onChange={(e) => setCommanderName(e.target.value)}
                placeholder={
                  lang === 'es'
                    ? 'Escribe tu nombre para el diploma...'
                    : 'Enter your name for the diploma...'
                }
              />
            </div>
            <div className="cert-diploma-banner">
              <div>
                <span className="cert-diploma-overline">
                  {lang === 'es'
                    ? 'DIPLOMA OFICIAL DE ENTRENAMIENTO DE MISIÓN OTORGADO A'
                    : 'OFFICIAL MISSION TRAINING DIPLOMA AWARDED TO'}
                </span>
                <strong className="cert-diploma-recipient">{displayCommanderName}</strong>
                <p className="cert-diploma-citation">
                  {lang === 'es'
                    ? `Por liderar la base ${site.name.es} gestionando energía solar, soporte vital ECLSS y blindaje anti-radiación bajo datos reales NASA DONKI y OSDR.`
                    : `For commanding ${site.name.en} by balancing solar power, ECLSS life support, and radiation shielding under real NASA DONKI and OSDR telemetry.`}
                </p>
              </div>
              <span className="cert-official-stamp">
                {missionStatus === 'won'
                  ? lang === 'es'
                    ? 'MISIÓN CERTIFICADA'
                    : 'MISSION CERTIFIED'
                  : lang === 'es'
                    ? 'REGISTRO DE VUELO'
                    : 'FLIGHT RECORD'}
              </span>
            </div>
          </div>

          {/* Desglose de Puntuación de Ingeniería */}
          <div className="cert-breakdown-box">
            <div className="cert-meta-row">
              <span className="cert-meta-item">
                <LanguageIcon size={15} /> <strong>{site.name[lang]}</strong>
              </span>
              <span className="cert-meta-item">
                <ClockIcon size={15} /> {site.dayName[lang]} {currentDay} / {totalDays}
              </span>
              <span className="cert-meta-item">
                <RadiationIcon size={15} />{' '}
                {lang === 'es' ? 'Dosis de misión:' : 'Mission dose:'}{' '}
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

          {/* C6: Repaso Día por Día de la Misión (history?: DecisionRecord[]) */}
          <div className="cert-history-section">
            <h3 className="badges-heading">
              <ClockIcon size={18} />{' '}
              {lang === 'es'
                ? `Bitácora de Decisiones (${site.dayName[lang]} a ${site.dayName[lang]})`
                : `Command Decision Log (${site.dayName[lang]} by ${site.dayName[lang]})`}
            </h3>
            {history && history.length > 0 ? (
              <div className="cert-history-grid">
                {history.map((record, idx) => {
                  const weatherInfo = formatWeatherBadge(record.weatherType);
                  return (
                    <div
                      key={`${record.day}-${record.cardId}-${idx}`}
                      className="cert-history-item"
                    >
                      <div className="cert-history-top">
                        <strong className="cert-history-day">
                          {site.dayName[lang]} {record.day}
                        </strong>
                        <span className="cert-history-weather">
                          <span aria-hidden="true">{weatherInfo.icon}</span> {weatherInfo.label}
                        </span>
                      </div>
                      <div className="cert-history-detail">
                        <span className="cert-history-card-id">
                          ORD: {formatCodeLabel(record.cardId)}
                        </span>
                        <span className="cert-history-choice-id">
                          <CheckIcon size={12} /> {lang === 'es' ? 'Opción:' : 'Choice:'}{' '}
                          <strong>{formatCodeLabel(record.choiceId)}</strong>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="helper-note">
                {lang === 'es'
                  ? 'Toma decisiones cada día para registrar aquí tu historial completo de mando.'
                  : 'Make decisions each day to record your complete command history here.'}
              </p>
            )}
          </div>

          {/* Insignias Desbloqueables con Parches Bordados SVG (C10 & C12) */}
          <div className="cert-patches-section">
            <h3 className="badges-heading">
              <PatchIcon size={18} />{' '}
              {lang === 'es'
                ? 'Parches de Ingeniería Espacial NASA'
                : 'NASA Space Engineering Patches'}
            </h3>
            <div className="badges-grid">
              {evaluation.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`badge-card ${badge.earned ? 'badge-earned' : 'badge-locked'}`}
                >
                  <div className="badge-card-top">
                    <MissionPatch
                      badgeId={badge.id}
                      earned={badge.earned}
                      size={46}
                      title={badge.title[lang]}
                    />
                    <span className="badge-status-tag">
                      {badge.earned
                        ? lang === 'es'
                          ? 'GANADA'
                          : 'EARNED'
                        : lang === 'es'
                          ? 'POR DESBLOQUEAR'
                          : 'LOCKED'}
                    </span>
                  </div>
                  <h4>{badge.title[lang]}</h4>
                  <p>{badge.description[lang]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* C12: Pie de Firma Oficial del Diploma de Papel */}
          <div className="cert-signature-footer">
            <div className="cert-sig-col">
              <span className="cert-sig-script">NASA Flight Control — Houston</span>
              <span className="cert-sig-line">
                {lang === 'es'
                  ? 'DIRECCIÓN DE ENTRENAMIENTO ARTEMIS / MARTE'
                  : 'ARTEMIS / MARS TRAINING DIRECTORATE'}
              </span>
            </div>
            <div className="cert-seal-box">
              <span>TELEMETRY VERIFIED</span>
              <strong>DONKI + OSDR</strong>
            </div>
            <div className="cert-sig-col">
              <span className="cert-sig-script">{displayCommanderName}</span>
              <span className="cert-sig-line">
                {lang === 'es'
                  ? 'FIRMA DEL COMANDANTE ESPACIAL JUNIOR'
                  : 'JUNIOR SPACE COMMANDER SIGNATURE'}
              </span>
            </div>
          </div>

          <div className="cert-footer-actions no-print">
            {missionStatus !== 'playing' && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  missionAudio.playClick();
                  onClose();
                  onRestartMission();
                }}
              >
                {lang === 'es' ? 'Jugar Nueva Misión' : 'Play Another Mission'}
                <ArrowIcon size={16} direction="right" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
