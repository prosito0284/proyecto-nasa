/**
 * Notificación / Banner Táctico No Bloqueante de Desbloqueo de Parche (P03).
 *
 * - Aparece brevemente cuando se obtiene un parche por primera vez.
 * - Contenedor externo con `pointer-events: none` para no bloquear ni interrumpir la partida.
 * - Tarjeta sólida con borde de 2 px, esquinas de 2 px, emblema SVG y nombre en ES/EN.
 */

import React, { useEffect } from 'react';
import { Language } from '../../types/mission';
import { UnlockedPatchRecord, getPatchMeta } from '../../services/patchStorage';
import { CloseIcon } from '../icons';
import { MissionPatch } from './MissionPatch';

export interface PatchUnlockBannerProps {
  lang: Language;
  record: UnlockedPatchRecord | null;
  onDismiss: () => void;
  onOpenShowcase?: () => void;
  /** Tiempo en ms tras el cual se cierra automáticamente (por defecto 5500 ms) */
  autoHideMs?: number;
}

export const PatchUnlockBanner: React.FC<PatchUnlockBannerProps> = ({
  lang,
  record,
  onDismiss,
  onOpenShowcase,
  autoHideMs = 5500,
}) => {
  useEffect(() => {
    if (!record || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      onDismiss();
    }, autoHideMs);
    return () => window.clearTimeout(timer);
  }, [record, autoHideMs, onDismiss]);

  if (!record) return null;

  const es = lang === 'es';
  const meta = getPatchMeta(record.id);

  return (
    <div
      className="patch-unlock-toast-layer"
      data-testid="patch-unlock-banner"
      role="status"
      aria-live="polite"
    >
      <div className="patch-unlock-toast-card" data-unlocked-patch-id={record.id}>
        <div className="patch-unlock-toast-emblem">
          <MissionPatch
            badgeId={record.id}
            earned={true}
            size={44}
            title={meta.title[lang]}
          />
        </div>

        <div className="patch-unlock-toast-body">
          <span className="patch-unlock-toast-eyebrow">
            {es ? 'PARCHE DESBLOQUEADO' : 'PATCH UNLOCKED'}
          </span>
          <h4 className="patch-unlock-toast-title">{meta.title[lang]}</h4>
          <p className="patch-unlock-toast-subtitle">
            {es ? 'Guardado en tu vitrina de misión.' : 'Saved to your mission showcase.'}
          </p>
        </div>

        <div className="patch-unlock-toast-actions">
          {onOpenShowcase && (
            <button
              type="button"
              className="patch-toast-btn"
              id="patch-toast-showcase-btn"
              onClick={onOpenShowcase}
            >
              {es ? 'Vitrina' : 'Patches'}
            </button>
          )}
          <button
            type="button"
            className="patch-toast-btn patch-toast-btn--close"
            id="patch-toast-dismiss-btn"
            onClick={onDismiss}
            aria-label={es ? 'Cerrar aviso de parche' : 'Dismiss patch notice'}
          >
            <CloseIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
