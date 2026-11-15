/**
 * Contrato del Sistema de Entrenamiento Guiado (Tutorial Interactivo)
 * Reto NASA Space Apps 2026: Build a Junior Astronaut Mission Trainer
 *
 * Sincronizado con las convenciones bilingües (Language, LocalizedText)
 * y de escenarios (OutpostSiteId) definidas en `src/types/mission.ts`.
 */

import type { Language, LocalizedText, OutpostSiteId } from './mission';

export type { Language, LocalizedText, OutpostSiteId };

/** Clave de persistencia en localStorage para recordar si el cadete ya completó el tutorial. */
export const TUTORIAL_STORAGE_KEY = 'jamt_tutorial_completed';

/** Posición preferida de la ficha de instrucciones respecto al recorte iluminado. */
export type TutorialPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Tono visual del marco técnico del recorte:
 * - 'info': cian de telemetría para lectura e inspección de sistemas
 * - 'caution': ámbar de advertencia para decisiones con trade-offs o presupuesto energético
 */
export type TutorialTone = 'info' | 'caution';

/**
 * Paso individual del entrenamiento guiado para niños de 7 a 12 años.
 */
export interface TutorialStep {
  /** Identificador único y estable del paso (ej. 'step-vitals-checklist') */
  id: string;
  /** Valor exacto del atributo `data-tutorial-id` del elemento objetivo en el DOM */
  targetSelector: string;
  /** Título en tipo oración (bilingüe ES/EN) */
  title: LocalizedText;
  /** Explicación clara para niños de 7 a 12 años (máximo 2 frases, bilingüe ES/EN) */
  body: LocalizedText;
  /** Ubicación de la tarjeta respecto al elemento destacado */
  placement: TutorialPlacement;
  /** Margen interior en píxeles alrededor del elemento iluminado */
  spotlightPadding: number;
  /** Si es true, el paso exige hacer clic directamente en el elemento real iluminado */
  requireAction: boolean;
  /** Tono cromático del borde técnico de 2px ('info' = cian telemetría, 'caution' = ámbar) */
  tone: TutorialTone;
  /** Indicación breve opcional de la acción requerida cuando `requireAction` es true */
  actionHint?: LocalizedText;
  /** Filtro opcional por escenario si el paso aplica solo a Luna o Marte */
  siteFilter?: OutpostSiteId | 'both';
}

/** Coordenadas en tiempo real del elemento objetivo medidas con getBoundingClientRect(). */
export interface TutorialTargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}
