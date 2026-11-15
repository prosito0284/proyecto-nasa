/**
 * Máquina de estados y rastreo DOM seguro del Sistema de Entrenamiento Guiado (T02)
 *
 * Responsabilidades:
 * - Persistencia en `localStorage` bajo `'jamt_tutorial_completed'`.
 * - Control de pasos (`startTutorial`, `nextStep`, `prevStep`, `skipTutorial`, `completeActionTrigger`).
 * - Cálculo en tiempo real de coordenadas con `getBoundingClientRect()`, sincronizado mediante
 *   `ResizeObserver` y listeners de `scroll` / `resize`.
 * - Recuperación segura ante elementos no montados o con dimensiones `0x0` (scroll suave o salto
 *   automático al siguiente paso válido sin romper la aplicación).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  TUTORIAL_STORAGE_KEY,
  type OutpostSiteId,
  type TutorialStep,
  type TutorialTargetRect,
} from '../types/tutorial';

export interface UseTutorialOptions {
  /** Si es true y el usuario no ha completado el tutorial, arranca automáticamente cuando `enabled` sea true. */
  autoStart?: boolean;
  /** Indica si la pantalla objetivo ya está lista en el DOM (ej. `!isBriefing && mission.status === 'playing'`). */
  enabled?: boolean;
  /** Sitio activo para filtrar pasos exclusivos de Luna o Marte si existieran. */
  siteId?: OutpostSiteId;
  /** Callback opcional invocado cuando el usuario termina o salta el entrenamiento. */
  onComplete?: () => void;
}

export interface UseTutorialReturn {
  isActive: boolean;
  hasCompleted: boolean;
  currentStepIndex: number;
  totalSteps: number;
  currentStep: TutorialStep | null;
  targetRect: TutorialTargetRect | null;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTutorial: () => void;
  completeActionTrigger: (stepId: string) => void;
}

/** Lee de forma segura si el entrenamiento ya fue completado previamente. */
export function readTutorialCompleted(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const raw = window.localStorage.getItem(TUTORIAL_STORAGE_KEY);
    return raw === 'true' || raw === '1';
  } catch {
    return false;
  }
}

/** Guarda de forma segura en `localStorage` que el entrenamiento fue completado. */
export function writeTutorialCompleted(completed = true): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (completed) {
      window.localStorage.setItem(TUTORIAL_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(TUTORIAL_STORAGE_KEY);
    }
  } catch {
    // Modo privado o almacenamiento bloqueado: continúa en memoria sin lanzar errores.
  }
}

/** Busca el elemento objetivo por su atributo `data-tutorial-id` (o selector directo como respaldo). */
export function findTutorialTargetElement(targetSelector: string): HTMLElement | null {
  if (typeof document === 'undefined' || !targetSelector) return null;
  const byDataId = document.querySelector<HTMLElement>(
    `[data-tutorial-id="${targetSelector}"]`,
  );
  if (byDataId) return byDataId;
  try {
    return document.querySelector<HTMLElement>(targetSelector);
  } catch {
    return null;
  }
}

/** Extrae un objeto inmutable `TutorialTargetRect` a partir de un `DOMRect`. */
function toTargetRect(rect: DOMRect): TutorialTargetRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

function hasValidDimensions(rect: DOMRect | TutorialTargetRect | null): boolean {
  return Boolean(rect && Number.isFinite(rect.width) && Number.isFinite(rect.height) && rect.width > 0 && rect.height > 0);
}

export function useTutorial(
  steps: TutorialStep[],
  options: UseTutorialOptions = {},
): UseTutorialReturn {
  const { autoStart = false, enabled = true, siteId, onComplete } = options;

  const filteredSteps = useMemo(
    () =>
      steps.filter(
        (step) =>
          !step.siteFilter ||
          step.siteFilter === 'both' ||
          !siteId ||
          step.siteFilter === siteId,
      ),
    [steps, siteId],
  );

  const [hasCompleted, setHasCompleted] = useState<boolean>(() => readTutorialCompleted());
  const [isActive, setIsActive] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<TutorialTargetRect | null>(null);

  const autoStartedRef = useRef<boolean>(false);
  const scrolledStepIdRef = useRef<string | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const currentStep: TutorialStep | null =
    isActive && filteredSteps.length > 0
      ? (filteredSteps[currentStepIndex] ?? null)
      : null;

  const finishTutorial = useCallback(() => {
    writeTutorialCompleted(true);
    setHasCompleted(true);
    setIsActive(false);
    setTargetRect(null);
    scrolledStepIdRef.current = null;
    onCompleteRef.current?.();
  }, []);

  const startTutorial = useCallback(() => {
    if (filteredSteps.length === 0) return;
    scrolledStepIdRef.current = null;
    setCurrentStepIndex(0);
    setIsActive(true);
  }, [filteredSteps.length]);

  const skipTutorial = useCallback(() => {
    finishTutorial();
  }, [finishTutorial]);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prevIdx) => {
      if (prevIdx >= filteredSteps.length - 1) {
        finishTutorial();
        return prevIdx;
      }
      return prevIdx + 1;
    });
  }, [filteredSteps.length, finishTutorial]);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prevIdx) => Math.max(0, prevIdx - 1));
  }, []);

  const completeActionTrigger = useCallback(
    (stepId: string) => {
      if (!isActive || !currentStep) return;
      if (currentStep.id === stepId || currentStep.targetSelector === stepId) {
        nextStep();
      }
    },
    [isActive, currentStep, nextStep],
  );

  // Inicio automático en la primera visita cuando la vista principal está habilitada
  useEffect(() => {
    if (
      autoStart &&
      enabled &&
      !hasCompleted &&
      !isActive &&
      !autoStartedRef.current &&
      filteredSteps.length > 0
    ) {
      autoStartedRef.current = true;
      setCurrentStepIndex(0);
      setIsActive(true);
    }
  }, [autoStart, enabled, hasCompleted, isActive, filteredSteps.length]);

  // Rastreo de coordenadas en tiempo real y manejo seguro de objetivos no montados o 0x0
  useEffect(() => {
    if (!isActive || !enabled || !currentStep) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;
    let skipTimer: ReturnType<typeof setTimeout> | null = null;

    const advanceOrFinishSafely = () => {
      if (cancelled) return;
      // Busca el siguiente paso que sí tenga un elemento válido en el DOM
      for (let i = currentStepIndex + 1; i < filteredSteps.length; i += 1) {
        const candidateEl = findTutorialTargetElement(filteredSteps[i].targetSelector);
        if (candidateEl) {
          const candidateRect = candidateEl.getBoundingClientRect();
          if (hasValidDimensions(candidateRect)) {
            setCurrentStepIndex(i);
            return;
          }
        }
      }
      // Si ningún paso posterior está disponible con dimensiones válidas, cerramos sin romper la app
      setIsActive(false);
      setTargetRect(null);
    };

    const measureAndSync = (allowScrollAndSkip: boolean) => {
      if (cancelled) return;
      const el = findTutorialTargetElement(currentStep.targetSelector);

      if (!el) {
        setTargetRect(null);
        if (allowScrollAndSkip && skipTimer === null) {
          skipTimer = setTimeout(() => {
            const retryEl = findTutorialTargetElement(currentStep.targetSelector);
            if (!retryEl || !hasValidDimensions(retryEl.getBoundingClientRect())) {
              advanceOrFinishSafely();
            } else {
              setTargetRect(toTargetRect(retryEl.getBoundingClientRect()));
            }
          }, 90);
        }
        return;
      }

      if (allowScrollAndSkip && scrolledStepIdRef.current !== currentStep.id) {
        scrolledStepIdRef.current = currentStep.id;
        try {
          const initialRect = el.getBoundingClientRect();
          const viewportH = typeof window !== 'undefined' ? window.innerHeight : 800;
          const isOutOfView =
            !hasValidDimensions(initialRect) ||
            initialRect.top < 12 ||
            initialRect.bottom > viewportH - 12;
          if (isOutOfView && typeof el.scrollIntoView === 'function') {
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
          }
        } catch {
          // Ignorar errores en entornos de prueba sin implementación de scrollIntoView
        }
      }

      const rect = el.getBoundingClientRect();
      if (!hasValidDimensions(rect)) {
        setTargetRect(null);
        if (allowScrollAndSkip && skipTimer === null) {
          skipTimer = setTimeout(() => {
            const retryEl = findTutorialTargetElement(currentStep.targetSelector);
            const retryRect = retryEl?.getBoundingClientRect() ?? null;
            if (retryRect && hasValidDimensions(retryRect)) {
              setTargetRect(toTargetRect(retryRect));
            } else {
              advanceOrFinishSafely();
            }
          }, 90);
        }
        return;
      }

      setTargetRect(toTargetRect(rect));
    };

    measureAndSync(true);

    const handleViewportUpdate = () => {
      measureAndSync(false);
    };

    window.addEventListener('resize', handleViewportUpdate, { passive: true });
    window.addEventListener('scroll', handleViewportUpdate, {
      capture: true,
      passive: true,
    });

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      try {
        resizeObserver = new ResizeObserver(() => {
          measureAndSync(false);
        });
        const targetEl = findTutorialTargetElement(currentStep.targetSelector);
        if (targetEl) resizeObserver.observe(targetEl);
        if (document.documentElement) resizeObserver.observe(document.documentElement);
      } catch {
        // Sin soporte completo de ResizeObserver en el entorno actual
      }
    }

    return () => {
      cancelled = true;
      if (skipTimer !== null) clearTimeout(skipTimer);
      window.removeEventListener('resize', handleViewportUpdate);
      window.removeEventListener('scroll', handleViewportUpdate, true);
      resizeObserver?.disconnect();
    };
  }, [isActive, enabled, currentStep, currentStepIndex, filteredSteps]);

  // Si el paso activo exige acción (`requireAction: true`), también detecta clic directo en el elemento real
  useEffect(() => {
    if (!isActive || !enabled || !currentStep || !currentStep.requireAction) return;
    const el = findTutorialTargetElement(currentStep.targetSelector);
    if (!el) return;

    const handleTargetClick = () => {
      completeActionTrigger(currentStep.id);
    };

    el.addEventListener('click', handleTargetClick);
    return () => {
      el.removeEventListener('click', handleTargetClick);
    };
  }, [isActive, enabled, currentStep, completeActionTrigger]);

  return {
    isActive,
    hasCompleted,
    currentStepIndex,
    totalSteps: filteredSteps.length,
    currentStep,
    targetRect,
    startTutorial,
    nextStep,
    prevStep,
    skipTutorial,
    completeActionTrigger,
  };
}
