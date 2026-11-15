/**
 * Hook y máquina de estados del Entrenamiento Interactivo de Encendido ("Aprender Haciendo")
 * (T02, T03, T04 & T05)
 *
 * Reglas estrictas:
 * - Persistencia en `localStorage` bajo `'jamt_onboarding_done'`.
 * - Cero muros de texto: cada paso tiene una sola orden directa de <= 15 palabras (1 frase).
 * - Sin botones de "Siguiente/Anterior": el paso SOLO avanza cuando el jugador hace clic
 *   directamente en el elemento iluminado del HUD (`data-onboarding-id`).
 * - Tecla `Escape` o botón "Saltar" / "Skip" cierra el entrenamiento en cualquier momento.
 * - Cálculo reactivo de coordenadas mediante `getBoundingClientRect()` y `ResizeObserver`.
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { Language, LocalizedText } from '../types/mission';

export type { Language, LocalizedText };

export const ONBOARDING_STORAGE_KEY = 'jamt_onboarding_done';

export type OnboardingTone = 'info' | 'caution';
export type OnboardingPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface OnboardingStep {
  /** Identificador único del paso */
  id: string;
  /** Valor del atributo `data-onboarding-id` en el control real del HUD */
  targetId: string;
  /** Rótulo superior de máximo 3 palabras en mayúsculas (ej. "SISTEMA 1/4") */
  eyebrow: LocalizedText;
  /** Orden directa de 1 sola frase y máximo 15 palabras (bilingüe ES/EN) */
  command: LocalizedText;
  /** Ubicación preferida del recuadro micro-táctico */
  placement: OnboardingPlacement;
  /** Tono del marco técnico de 2 px ('info' = cian, 'caution' = ámbar de alerta) */
  tone: OnboardingTone;
  /** Margen interior alrededor del control iluminado */
  padding: number;
  /** Marca si el paso activa la micro-emergencia térmica en vivo (T04 paso 4) */
  isEmergency?: boolean;
}

export interface OnboardingRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

/**
 * Secuencia de encendido en 4 clics reales ("Aprender Haciendo" — T04).
 * Cada orden tiene 1 sola frase y <= 11 palabras en ES y EN, cero emoji.
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'onboarding-power-grid',
    targetId: 'power-grid',
    eyebrow: { es: 'SISTEMA 1/4', en: 'SYSTEM 1/4' },
    command: {
      es: 'Enciende la red eléctrica para activar los instrumentos de la colonia.',
      en: 'Turn on the power grid to activate your outpost instruments.',
    },
    placement: 'right',
    tone: 'info',
    padding: 6,
  },
  {
    id: 'onboarding-oxygen-module',
    targetId: 'oxygen-module',
    eyebrow: { es: 'SISTEMA 2/4', en: 'SYSTEM 2/4' },
    command: {
      es: 'Presiona el módulo de oxígeno para presurizar el hábitat.',
      en: 'Press the oxygen module to pressurize the habitat.',
    },
    placement: 'right',
    tone: 'info',
    padding: 6,
  },
  {
    id: 'onboarding-nasa-telemetry',
    targetId: 'nasa-telemetry',
    eyebrow: { es: 'SISTEMA 3/4', en: 'SYSTEM 3/4' },
    command: {
      es: 'Abre la telemetría NASA para ver mediciones reales del planeta.',
      en: 'Open NASA telemetry to view real planetary measurements.',
    },
    placement: 'bottom',
    tone: 'info',
    padding: 6,
  },
  {
    id: 'onboarding-thermal-emergency',
    targetId: 'thermal-stabilizer',
    eyebrow: { es: 'SISTEMA 4/4', en: 'SYSTEM 4/4' },
    command: {
      es: 'Baja temperatura nocturna: activa Escudo Tormenta para estabilizar la base.',
      en: 'Night temperature drop: activate Storm Shield to stabilize the outpost.',
    },
    placement: 'right',
    tone: 'caution',
    padding: 6,
    isEmergency: true,
  },
];

/** Lee de forma segura si el entrenamiento de encendido ya fue completado. */
export function readOnboardingDone(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return raw === 'true' || raw === '1';
  } catch {
    return false;
  }
}

/** Guarda de forma segura en `localStorage` el estado de `'jamt_onboarding_done'`. */
export function writeOnboardingDone(done = true): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    if (done) {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    }
  } catch {
    // Almacenamiento bloqueado o privado: continúa en memoria.
  }
}

/** Localiza el elemento objetivo en el DOM por `data-onboarding-id`. */
export function findOnboardingTarget(targetId: string): HTMLElement | null {
  if (typeof document === 'undefined' || !targetId) return null;
  return document.querySelector<HTMLElement>(`[data-onboarding-id="${targetId}"]`);
}

export interface OnboardingMachineState {
  isActive: boolean;
  isDone: boolean;
  stepIndex: number;
  completionSeq: number;
}

export type OnboardingMachineAction =
  | { type: 'START'; totalSteps: number }
  | { type: 'SKIP' }
  | { type: 'COMPLETE_TARGET'; targetId: string; steps: OnboardingStep[] };

/**
 * Reductor puro e idempotente para avanzar únicamente por clic real en el objetivo activo
 * o cerrar con Saltar / Escape.
 */
export function onboardingReducer(
  state: OnboardingMachineState,
  action: OnboardingMachineAction,
): OnboardingMachineState {
  switch (action.type) {
    case 'START': {
      if (action.totalSteps <= 0) return state;
      return {
        ...state,
        isActive: true,
        stepIndex: 0,
      };
    }
    case 'SKIP': {
      if (!state.isActive && state.isDone) return state;
      return {
        ...state,
        isActive: false,
        isDone: true,
        completionSeq: state.completionSeq + 1,
      };
    }
    case 'COMPLETE_TARGET': {
      if (!state.isActive) return state;
      const current = action.steps[state.stepIndex];
      if (!current) return state;
      if (current.targetId !== action.targetId && current.id !== action.targetId) {
        return state;
      }
      if (state.stepIndex >= action.steps.length - 1) {
        return {
          ...state,
          isActive: false,
          isDone: true,
          completionSeq: state.completionSeq + 1,
        };
      }
      return {
        ...state,
        stepIndex: state.stepIndex + 1,
      };
    }
  }
}

export interface UseOnboardingOptions {
  autoStart?: boolean;
  enabled?: boolean;
  steps?: OnboardingStep[];
  onStepCompleted?: (targetId: string, nextStepIndex: number) => void;
  onFinish?: () => void;
}

export interface UseOnboardingReturn {
  isActive: boolean;
  isDone: boolean;
  stepIndex: number;
  totalSteps: number;
  currentStep: OnboardingStep | null;
  targetRect: OnboardingRect | null;
  startOnboarding: () => void;
  skipOnboarding: () => void;
  completeOnboardingTarget: (targetId: string) => void;
}

function toOnboardingRect(rect: DOMRect): OnboardingRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
    right: rect.right,
    bottom: rect.bottom,
  };
}

export function useOnboarding(options: UseOnboardingOptions = {}): UseOnboardingReturn {
  const {
    autoStart = true,
    enabled = true,
    steps = ONBOARDING_STEPS,
    onStepCompleted,
    onFinish,
  } = options;

  const [machine, dispatch] = useReducer(
    onboardingReducer,
    undefined,
    (): OnboardingMachineState => ({
      isActive: false,
      isDone: readOnboardingDone(),
      stepIndex: 0,
      completionSeq: 0,
    }),
  );

  const [targetRect, setTargetRect] = useState<OnboardingRect | null>(null);
  const autoStartedRef = useRef(false);
  const handledCompletionRef = useRef(0);
  const onStepCompletedRef = useRef(onStepCompleted);
  onStepCompletedRef.current = onStepCompleted;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const { isActive, isDone, stepIndex, completionSeq } = machine;
  const currentStep = isActive && steps.length > 0 ? (steps[stepIndex] ?? null) : null;

  useEffect(() => {
    if (completionSeq > handledCompletionRef.current) {
      handledCompletionRef.current = completionSeq;
      writeOnboardingDone(true);
      setTargetRect(null);
      onFinishRef.current?.();
    }
  }, [completionSeq]);

  const startOnboarding = useCallback(() => {
    writeOnboardingDone(false);
    dispatch({ type: 'START', totalSteps: steps.length });
  }, [steps.length]);

  const skipOnboarding = useCallback(() => {
    dispatch({ type: 'SKIP' });
  }, []);

  const completeOnboardingTarget = useCallback(
    (targetId: string) => {
      if (!currentStep) return;
      if (currentStep.targetId === targetId || currentStep.id === targetId) {
        onStepCompletedRef.current?.(currentStep.targetId, stepIndex + 1);
        dispatch({ type: 'COMPLETE_TARGET', targetId, steps });
      }
    },
    [currentStep, stepIndex, steps],
  );

  useEffect(() => {
    if (
      autoStart &&
      enabled &&
      !isDone &&
      !readOnboardingDone() &&
      !isActive &&
      !autoStartedRef.current &&
      steps.length > 0
    ) {
      autoStartedRef.current = true;
      dispatch({ type: 'START', totalSteps: steps.length });
    }
  }, [autoStart, enabled, isDone, isActive, steps.length]);

  // Medición reactiva con getBoundingClientRect() + ResizeObserver + scroll/resize
  useEffect(() => {
    if (!isActive || !enabled || !currentStep) {
      setTargetRect(null);
      return;
    }

    const measure = () => {
      const el = findOnboardingTarget(currentStep.targetId);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setTargetRect(toOnboardingRect(rect));
      } else {
        setTargetRect(null);
      }
    };

    measure();

    const targetEl = findOnboardingTarget(currentStep.targetId);
    if (targetEl && typeof targetEl.scrollIntoView === 'function') {
      try {
        const r = targetEl.getBoundingClientRect();
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        if (r.top < 12 || r.bottom > vh - 12) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      } catch {
        // Ignorar en entornos de test sin scrollIntoView completo
      }
    }

    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('scroll', measure, { capture: true, passive: true });

    let observer: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && typeof window.ResizeObserver !== 'undefined') {
      try {
        observer = new window.ResizeObserver(() => measure());
        if (targetEl) observer.observe(targetEl);
        if (typeof document !== 'undefined' && document.documentElement) {
          observer.observe(document.documentElement);
        }
      } catch {
        // Ignorar si ResizeObserver falla en un mock parcial
      }
    }

    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
      observer?.disconnect();
    };
  }, [isActive, enabled, currentStep]);

  // Avance automático al hacer clic directamente en el elemento real iluminado
  useEffect(() => {
    if (!isActive || !enabled || !currentStep) return;
    const el = findOnboardingTarget(currentStep.targetId);
    if (!el) return;

    const handleDirectClick = () => {
      completeOnboardingTarget(currentStep.targetId);
    };

    el.addEventListener('click', handleDirectClick);
    return () => {
      el.removeEventListener('click', handleDirectClick);
    };
  }, [isActive, enabled, currentStep, completeOnboardingTarget]);

  return {
    isActive,
    isDone,
    stepIndex,
    totalSteps: steps.length,
    currentStep,
    targetRect,
    startOnboarding,
    skipOnboarding,
    completeOnboardingTarget,
  };
}
