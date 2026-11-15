/**
 * Vitrina de Parches de Misión (Patch Showcase Modal — P03).
 * Lista todos los parches disponibles en el catálogo:
 * - Desbloqueados: emblema SVG bordado a color NASA + fecha de obtención (+ escenario).
 * - Bloqueados: silueta punteada tenue + 1 frase corta ES/EN explicando cómo ganarlos.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Language, OutpostSiteId } from '../../types/mission';
import {
  PATCH_CATALOG,
  PatchCategory,
  UnlockedPatchRecord,
} from '../../services/patchStorage';
import { missionAudio } from '../../utils/sound';
import { CheckIcon, CloseIcon, PatchIcon } from '../icons';
import { MissionPatch } from './MissionPatch';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface PatchShowcaseModalProps {
  lang: Language;
  isOpen: boolean;
  onClose: () => void;
  unlockedById: Record<string, UnlockedPatchRecord>;
  /** Callback opcional para abrir el certificado de la misión en curso */
  onOpenCertificate?: () => void;
}

type ShowcaseFilter = 'all' | PatchCategory;

export function formatPatchUnlockDate(isoDate: string, lang: Language): string {
  try {
    const parsed = new Date(isoDate);
    if (Number.isNaN(parsed.getTime())) return isoDate.slice(0, 10);
    return parsed.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoDate.slice(0, 10);
  }
}

function formatScenarioChip(siteId: OutpostSiteId, lang: Language): string {
  if (siteId === 'moon-shackleton') {
    return lang === 'es' ? 'Cráter Shackleton (Luna)' : 'Shackleton Crater (Moon)';
  }
  return lang === 'es' ? 'Cráter Jezero (Marte)' : 'Jezero Crater (Mars)';
}

const FILTER_TABS: Array<{
  id: ShowcaseFilter;
  label: { es: string; en: string };
}> = [
  { id: 'all', label: { es: 'Todos', en: 'All' } },
  { id: 'training', label: { es: 'Entrenamiento', en: 'Training' } },
  { id: 'mission', label: { es: 'Misiones', en: 'Missions' } },
  { id: 'survival', label: { es: 'Supervivencia', en: 'Survival' } },
  { id: 'science', label: { es: 'Ciencia', en: 'Science' } },
];

export const PatchShowcaseModal: React.FC<PatchShowcaseModalProps> = ({
  lang,
  isOpen,
  onClose,
  unlockedById,
  onOpenCertificate,
}) => {
  const [filter, setFilter] = useState<ShowcaseFilter>('all');
  const modalCardRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    previousFocusRef.current =
      typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        missionAudio.playClick();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalCardRef.current) {
        const focusableNodeList =
          modalCardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const focusables = Array.from(focusableNodeList).filter(
          (el) => el.offsetParent !== null || el === document.activeElement,
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        const activeEl = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (activeEl === firstEl || !modalCardRef.current.contains(activeEl)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (activeEl === lastEl || !modalCardRef.current.contains(activeEl)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const es = lang === 'es';
  const totalUnlocked = PATCH_CATALOG.filter((p) => Boolean(unlockedById[p.id])).length;
  const visiblePatches =
    filter === 'all' ? PATCH_CATALOG : PATCH_CATALOG.filter((p) => p.category === filter);

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="patch-showcase-title"
      id="patch-showcase-modal"
      data-testid="patch-showcase-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          missionAudio.playClick();
          onClose();
        }
      }}
    >
      <div ref={modalCardRef} className="modal-card patch-showcase-card-shell">
        <div className="modal-header">
          <div>
            <span className="nasa-badge">
              {es ? 'ARCHIVO DE PARCHES' : 'PATCH ARCHIVE'}
            </span>
            <h2 id="patch-showcase-title">
              <PatchIcon size={22} />{' '}
              {es ? 'Vitrina de parches de misión' : 'Mission patch showcase'}
            </h2>
          </div>

          <div className="cert-header-actions">
            {onOpenCertificate && (
              <button
                type="button"
                className="btn-secondary"
                id="open-certificate-from-showcase-btn"
                onClick={() => {
                  missionAudio.playClick();
                  onOpenCertificate();
                }}
              >
                {es ? 'Ver diploma' : 'View diploma'}
              </button>
            )}
            <button
              ref={closeButtonRef}
              type="button"
              className="btn-secondary"
              id="close-patches-modal-btn"
              onClick={() => {
                missionAudio.playClick();
                onClose();
              }}
            >
              <CloseIcon size={16} /> {es ? 'Cerrar' : 'Close'}
            </button>
          </div>
        </div>

        <div className="patch-showcase-summary">
          <p className="patch-showcase-lead">
            {es
              ? 'Cada parche obtenido queda guardado en este dispositivo para tus próximas expediciones.'
              : 'Every earned patch stays saved on this device across your future expeditions.'}
          </p>
          <span className="patch-showcase-counter" data-testid="patch-showcase-counter">
            <PatchIcon size={16} /> {totalUnlocked} / {PATCH_CATALOG.length}{' '}
            {es ? 'DESBLOQUEADOS' : 'UNLOCKED'}
          </span>
        </div>

        <div
          className="patch-showcase-tabs"
          role="tablist"
          aria-label={es ? 'Categorías de parches' : 'Patch categories'}
        >
          {FILTER_TABS.map((tab) => {
            const countInTab =
              tab.id === 'all'
                ? PATCH_CATALOG.length
                : PATCH_CATALOG.filter((p) => p.category === tab.id).length;
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`patch-filter-btn ${isActive ? 'patch-filter-btn--active' : ''}`}
                onClick={() => {
                  missionAudio.playClick();
                  setFilter(tab.id);
                }}
              >
                <span>{tab.label[lang]}</span>
                <span>({countInTab})</span>
              </button>
            );
          })}
        </div>

        <div className="patch-showcase-grid">
          {visiblePatches.map((patch) => {
            const record = unlockedById[patch.id];
            const isEarned = Boolean(record);
            return (
              <article
                key={patch.id}
                data-patch-id={patch.id}
                data-patch-state={isEarned ? 'unlocked' : 'locked'}
                className={`patch-showcase-card ${
                  isEarned ? 'patch-showcase-card--unlocked' : 'patch-showcase-card--locked'
                }`}
              >
                <div className="patch-showcase-card-top">
                  <div className={isEarned ? undefined : 'patch-showcase-art-locked'}>
                    <MissionPatch
                      badgeId={patch.id}
                      earned={isEarned}
                      size={56}
                      title={patch.title[lang]}
                    />
                  </div>
                  <span className="patch-showcase-status">
                    {isEarned
                      ? es
                        ? 'DESBLOQUEADO'
                        : 'UNLOCKED'
                      : es
                        ? 'BLOQUEADO'
                        : 'LOCKED'}
                  </span>
                </div>

                <h4 className="patch-showcase-title">{patch.title[lang]}</h4>
                <p className="patch-showcase-hint">{patch.unlockHint[lang]}</p>

                {isEarned && record && (
                  <div className="patch-showcase-meta">
                    <CheckIcon size={14} />
                    <span>
                      {es ? 'Obtenido' : 'Unlocked'}:{' '}
                      {formatPatchUnlockDate(record.unlockedAt, lang)}
                    </span>
                    {record.scenarioId && (
                      <span>· {formatScenarioChip(record.scenarioId, lang)}</span>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
