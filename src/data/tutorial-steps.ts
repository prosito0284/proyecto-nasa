/**
 * Guion Bilingüe del Sistema de Entrenamiento Guiado (T04)
 * Reto NASA Space Apps 2026: Build a Junior Astronaut Mission Trainer
 *
 * Diseñado para cadetes de 7 a 12 años siguiendo la regla de dieta de texto (Ronda 4):
 * - Títulos en tipo oración.
 * - Cuerpo de máximo 2 frases por paso en Español (ES) e Inglés (EN).
 * - Conectado a los atributos reales `data-tutorial-id` del HUD, Mapa, Dilemas y Ciencia.
 */

import type { TutorialStep } from '../types/tutorial';

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-vitals-checklist',
    targetSelector: 'vitals-checklist',
    title: {
      es: 'Tu hoja de vitales y tripulación',
      en: 'Your vitals checklist and crew',
    },
    body: {
      es: 'Cada miembro de tu tripulación vigila un recurso vital como batería, oxígeno, comida o blindaje. Si cualquier vital cae a cero antes del octavo día, la misión se interrumpe.',
      en: 'Each crew member watches over a vital resource like battery, oxygen, food, or shielding. If any vital drops to zero before day eight, the mission ends early.',
    },
    placement: 'right',
    spotlightPadding: 8,
    requireAction: false,
    tone: 'info',
  },
  {
    id: 'step-power-presets',
    targetSelector: 'power-presets',
    title: {
      es: 'Reparte la energía de la base',
      en: 'Budget your outpost power',
    },
    body: {
      es: 'Elige un modo de energía según el peligro del día, como Escudo Tormenta o Invernadero. Haz clic en cualquiera de los modos para ver cómo cambia la proyección de mañana.',
      en: 'Pick a power mode that matches today’s hazard, such as Storm Shield or Greenhouse. Click any power mode button to see how tomorrow’s projection changes.',
    },
    actionHint: {
      es: 'Haz clic en un modo de energía para avanzar al siguiente paso.',
      en: 'Click any power mode button to advance to the next step.',
    },
    placement: 'right',
    spotlightPadding: 8,
    requireAction: true,
    tone: 'caution',
  },
  {
    id: 'step-outpost-map',
    targetSelector: 'outpost-map',
    title: {
      es: 'Diagrama técnico de la base y radio',
      en: 'Outpost technical schematic and radio',
    },
    body: {
      es: 'Este plano muestra en tiempo real tus paneles solares, el refugio de agua y el clima espacial de hoy. Aquí también puedes probar cuánto tarda tu voz en llegar a Houston a la velocidad de la luz.',
      en: 'This schematic shows your solar arrays, water shelter, and today’s space weather in real time. You can also test how long your voice takes to reach Houston at the speed of light.',
    },
    placement: 'bottom',
    spotlightPadding: 6,
    requireAction: false,
    tone: 'info',
  },
  {
    id: 'step-dilemma-weather',
    targetSelector: 'dilemma-weather',
    title: {
      es: 'Clima espacial real de la NASA',
      en: 'Real NASA space weather',
    },
    body: {
      es: 'Cada día enfrentas un evento respaldado por datos reales de las misiones DONKI, OSDR, Artemis o Marte. El sello de tinta indica de qué archivo científico proviene el dato de hoy.',
      en: 'Each day brings an event backed by real data from NASA DONKI, OSDR, Artemis, or Mars missions. The ink stamp shows which scientific archive provides today’s telemetry.',
    },
    placement: 'bottom',
    spotlightPadding: 8,
    requireAction: false,
    tone: 'caution',
  },
  {
    id: 'step-work-orders',
    targetSelector: 'work-orders',
    title: {
      es: 'Órdenes de trabajo: nada es gratis',
      en: 'Work orders: no decision is free',
    },
    body: {
      es: 'En ingeniería espacial toda decisión tiene un costo: revisa las columnas Ganas y Pagas antes de firmar. Pasa el cursor sobre una orden para previsualizar su impacto en tu hoja de vitales.',
      en: 'In space engineering every choice has a trade-off: check the You gain and You pay columns before signing. Hover or tap a work order to preview its impact on your vitals checklist.',
    },
    placement: 'top',
    spotlightPadding: 8,
    requireAction: false,
    tone: 'caution',
  },
  {
    id: 'step-science-button',
    targetSelector: 'science-button',
    title: {
      es: 'Anexo de ciencia NASA y quiz',
      en: 'NASA science annex and quiz',
    },
    body: {
      es: 'En este anexo puedes consultar el glosario para niños, estudios espaciales y fotos reales de la NASA. Haz clic en el botón iluminado para abrir el anexo y completar tu entrenamiento.',
      en: 'In this annex you can explore the kid-friendly glossary, space biology studies, and real NASA photos. Click the highlighted button to open the annex and complete your training.',
    },
    actionHint: {
      es: 'Haz clic en "Ciencia NASA y quiz" para finalizar el entrenamiento.',
      en: 'Click "NASA science & quiz" to finish your training.',
    },
    placement: 'bottom',
    spotlightPadding: 6,
    requireAction: true,
    tone: 'info',
  },
];
