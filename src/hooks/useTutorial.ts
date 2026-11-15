/**
 * Máquina de estados, gestor de foco compartido entre árboles DOM y rastreo seguro del
 * Sistema de Entrenamiento Guiado (T02 & T11)
 *
 * Responsabilidades:
 * - Persistencia en `localStorage` bajo `'jamt_tutorial_completed'`.
 * - Máquina de estados idempotente (`tutorialStateReducer`) para `startTutorial`, `nextStep`,
 *   `prevStep`, `skipTutorial` y `completeActionTrigger(stepId)` (evita doble avance si un
 *   control dispara tanto el listener nativo como el callback de React).
 * - Gestor de foco compartido (`collectSharedTutorialFocusables`, `getNextSharedFocusIndex`)
 *   que alterna `Tab` / `Shift+Tab` únicamente entre los botones del `TutorialCallout` y el
 *   elemento interactivo iluminado en el HUD (`data-tutorial-id`).
 * - Resolución de teclas (`Escape`, `ArrowLeft`, `ArrowRight`, `Tab`).
 * - Cálculo en tiempo real de coordenadas con `getBoundingClientRect()`, sincronizado mediante
 *   `ResizeObserver` y listeners de `scroll` / `resize`.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
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

export interface TutorialMachineState {
  isActive: boolean;
  hasCompleted: boolean;
  currentStepIndex: number;
  /** Contador incremental para disparar efectos de cierre una sola vez por sesión. */
  completionSeq: number;
}

export type TutorialMachineAction =
  | { type: 'START'; steps: TutorialStep[] }
  | { type: 'NEXT'; steps: TutorialStep[] }
  | { type: 'PREV' }
  | { type: 'SKIP' }
  | { type: 'GOTO'; index: number; steps: TutorialStep[] }
  | { type: 'STOP_SAFE' }
  | { type: 'COMPLETE_ACTION'; stepId: string; steps: TutorialStep[] };

/**
 * Reductor puro e idempotente de la máquina de estados del tutorial (T02 & T11).
 * Si `COMPLETE_ACTION` se invoca dos veces en el mismo ciclo para el mismo `stepId`,
 * la segunda llamada no salta el siguiente paso porque `currentStep` ya cambió.
 */
export function tutorialStateReducer(
  state: TutorialMachineState,
  action: TutorialMachineAction,
): TutorialMachineState {
  switch (action.type) {
    case 'START': {
      if (action.steps.length === 0) return state;
      return {
        ...state,
        isActive: true,
        currentStepIndex: 0,
      };
    }
    case 'SKIP': {
      if (!state.isActive && state.hasCompleted) return state;
      return {
        ...state,
        isActive: false,
        hasCompleted: true,
        completionSeq: state.completionSeq + 1,
      };
    }
    case 'NEXT': {
      if (!state.isActive) return state;
      if (state.currentStepIndex >= action.steps.length - 1) {
        return {
          ...state,
          isActive: false,
          hasCompleted: true,
          completionSeq: state.completionSeq + 1,
        };
      }
      return {
        ...state,
        currentStepIndex: state.currentStepIndex + 1,
      };
    }
    case 'PREV': {
      if (!state.isActive) return state;
      return {
        ...state,
        currentStepIndex: Math.max(0, state.currentStepIndex - 1),
      };
    }
    case 'GOTO': {
      if (!state.isActive) return state;
      const clamped = Math.max(0, Math.min(action.steps.length - 1, action.index));
      return {
        ...state,
        currentStepIndex: clamped,
      };
    }
    case 'STOP_SAFE': {
      if (!state.isActive) return state;
      return {
        ...state,
        isActive: false,
      };
    }
    case 'COMPLETE_ACTION': {
      if (!state.isActive) return state;
      const activeStep = action.steps[state.currentStepIndex];
      if (!activeStep) return state;
      if (activeStep.id !== action.stepId && activeStep.targetSelector !== action.stepId) {
        return state;
      }
      if (state.currentStepIndex >= action.steps.length - 1) {
        return {
          ...state,
          isActive: false,
          hasCompleted: true,
          completionSeq: state.completionSeq + 1,
        };
      }
      return {
        ...state,
        currentStepIndex: state.currentStepIndex + 1,
      };
    }
  }
}

export type TutorialKeyCommand = 'skip' | 'next' | 'prev' | 'tab' | null;

/**
 * Resuelve el comando de teclado cuando el tutorial está activo (T11):
 * - `Escape`: cierra el tutorial de inmediato (`'skip'`).
 * - `ArrowRight`: avanza al siguiente paso si el paso actual no exige acción obligatoria (`'next'`).
 * - `ArrowLeft`: retrocede al paso anterior si `stepIndex > 0` (`'prev'`).
 * - `Tab`: activa el ciclo de foco compartido entre el Callout y el elemento iluminado (`'tab'`).
 */
export function resolveTutorialKeyCommand(
  key: string,
  options: {
    requireAction: boolean;
    stepIndex: number;
    totalSteps: number;
    isEditableTarget?: boolean;
  },
): TutorialKeyCommand {
  if (key === 'Escape') return 'skip';
  if (key === 'Tab') return 'tab';
  if (options.isEditableTarget) return null;
  if (key === 'ArrowRight' && !options.requireAction && options.totalSteps > 0) {
    return 'next';
  }
  if (key === 'ArrowLeft' && options.stepIndex > 0) {
    return 'prev';
  }
  return null;
}

/**
 * Calcula el siguiente índice dentro de la lista de elementos enfocables compartidos
 * (botones del `TutorialCallout` + controles dentro del objetivo `data-tutorial-id`) al pulsar
 * `Tab` o `Shift+Tab` (T11).
 */
export function getNextSharedFocusIndex(
  totalFocusables: number,
  currentIndex: number,
  shiftKey: boolean,
): number {
  if (totalFocusables <= 0) return -1;
  if (currentIndex < 0 || currentIndex >= totalFocusables) {
    return shiftKey ? totalFocusables - 1 : 0;
  }
  if (shiftKey) {
    return (currentIndex - 1 + totalFocusables) % totalFocusables;
  }
  return (currentIndex + 1) % totalFocusables;
}

const FOCUSABLE_SELECTOR =
  'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

function isElementFocusable(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  const tabIdxAttr = el.getAttribute('tabindex');
  if (tabIdxAttr === '-1') return false;
  const tag = el.tagName.toLowerCase();
  if (['button', 'input', 'select', 'textarea', 'a'].includes(tag)) {
    return true;
  }
  return tabIdxAttr !== null;
}

/**
 * Obtiene la lista ordenada de elementos interactivos que participan en el gestor de foco
 * compartido (T11): primero el control iluminado en el HUD (`data-tutorial-id`) y sus controles
 * hijos habilitados, y después los botones del `TutorialCallout`.
 */
export function collectSharedTutorialFocusables(
  targetSelector: string,
  calloutRoot: HTMLElement | null,
): HTMLElement[] {
  const result: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  const pushUnique = (el: HTMLElement | null) => {
    if (!el || seen.has(el)) return;
    seen.add(el);
    result.push(el);
  };

  const targetEl = findTutorialTargetElement(targetSelector);
  if (targetEl) {
    if (isElementFocusable(targetEl)) {
      pushUnique(targetEl);
    }
    const nestedTargetFocusables = targetEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    nestedTargetFocusables.forEach((child) => {
      if (isElementFocusable(child)) pushUnique(child);
    });
  }

  if (calloutRoot) {
    const calloutButtons = calloutRoot.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    calloutButtons.forEach((btn) => {
      if (isElementFocusable(btn)) pushUnique(btn);
    });
  }

  return result;
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
  return Boolean(
    rect &&
      Number.isFinite(rect.width) &&
      Number.isFinite(rect.height) &&
      rect.width > 0 &&
      rect.height > 0,
  );
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

  const [machine, dispatch] = useReducer(
    tutorialStateReducer,
    undefined,
    (): TutorialMachineState => ({
      isActive: false,
      hasCompleted: readTutorialCompleted(),
      currentStepIndex: 0,
      completionSeq: 0,
    }),
  );

  const [targetRect, setTargetRect] = useState<TutorialTargetRect | null>(null);

  const autoStartedRef = useRef<boolean>(false);
  const scrolledStepIdRef = useRef<string | null>(null);
  const handledCompletionSeqRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { isActive, hasCompleted, currentStepIndex, completionSeq } = machine;

  const currentStep: TutorialStep | null =
    isActive && filteredSteps.length > 0
      ? (filteredSteps[currentStepIndex] ?? null)
      : null;

  // Sincroniza la persistencia en localStorage cuando el tutorial termina o se salta
  useEffect(() => {
    if (completionSeq > handledCompletionSeqRef.current) {
      handledCompletionSeqRef.current = completionSeq;
      writeTutorialCompleted(true);
      setTargetRect(null);
      scrolledStepIdRef.current = null;
      onCompleteRef.current?.();
    }
  }, [completionSeq]);

  const startTutorial = useCallback(() => {
    if (filteredSteps.length === 0) return;
    scrolledStepIdRef.current = null;
    dispatch({ type: 'START', steps: filteredSteps });
  }, [filteredSteps]);

  const skipTutorial = useCallback(() => {
    dispatch({ type: 'SKIP' });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT', steps: filteredSteps });
  }, [filteredSteps]);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV' });
  }, []);

  const completeActionTrigger = useCallback(
    (stepId: string) => {
      dispatch({ type: 'COMPLETE_ACTION', stepId, steps: filteredSteps });
    },
    [filteredSteps],
  );

  // Inicio automático la primera vez que un usuario entra a una misión (cuando 'jamt_tutorial_completed' no exista)
  useEffect(() => {
    if (
      autoStart &&
      enabled &&
      !hasCompleted &&
      !readTutorialCompleted() &&
      !isActive &&
      !autoStartedRef.current &&
      filteredSteps.length > 0
    ) {
      autoStartedRef.current = true;
      dispatch({ type: 'START', steps: filteredSteps });
    }
  }, [autoStart, enabled, hasCompleted, isActive, filteredSteps]);

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
      for (let i = currentStepIndex + 1; i < filteredSteps.length; i += 1) {
        const candidateEl = findTutorialTargetElement(filteredSteps[i].targetSelector);
        if (candidateEl) {
          const candidateRect = candidateEl.getBoundingClientRect();
          if (hasValidDimensions(candidateRect)) {
            dispatch({ type: 'GOTO', index: i, steps: filteredSteps });
            return;
          }
        }
      }
      dispatch({ type: 'STOP_SAFE' });
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
