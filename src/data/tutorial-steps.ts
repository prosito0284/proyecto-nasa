/**
 * Guion Bilingüe del Sistema de Entrenamiento Guiado (T04 & T07)
 * Reto NASA Space Apps 2026: Build a Junior Astronaut Mission Trainer
 *
 * Cubre los 5 contenedores reales instrumentados en el HUD (T07):
 * 1. Panel de recursos vitales (O2, agua, energía, radiación): `vitals-checklist`
 * 2. Presupuesto y controles de energía de la base: `power-presets`
 * 3. Vista principal de la misión/colonia y sus controles: `outpost-map`
 * 4. Estado de la tripulación y salud/fatiga: `crew-status`
 * 5. Controles de avance de ciclo/tiempo y órdenes de misión con datos NASA: `work-orders`
 * 6. Botón de acceso al modal de ciencia y datos reales de la NASA: `science-button`
 */

import type { TutorialStep } from '../types/tutorial';

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'step-vitals-checklist',
    targetSelector: 'vitals-checklist',
    title: {
      es: 'Panel de recursos vitales y radiación',
      en: 'Vitals and radiation telemetry panel',
    },
    body: {
      es: 'Aquí controlas el oxígeno, agua reciclada, energía, comida y la dosis de radiación en mSv. Si cualquiera de los vitales cae a cero antes del octavo día, la misión fracasa.',
      en: 'Here you monitor oxygen, recycled water, battery power, food, and radiation dose in mSv. If any vital drops to zero before day eight, the mission fails.',
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
      es: 'Vista de la colonia y controles de módulos',
      en: 'Outpost schematic view and module controls',
    },
    body: {
      es: 'Este diagrama técnico muestra en tiempo real los paneles solares, el refugio de agua y el clima espacial. También puedes tocar cada módulo o probar el retraso de señal con Houston.',
      en: 'This technical schematic displays solar arrays, the water shelter, and space weather in real time. You can also inspect each module or test the signal delay to Houston.',
    },
    placement: 'bottom',
    spotlightPadding: 6,
    requireAction: false,
    tone: 'info',
  },
  {
    id: 'step-crew-status',
    targetSelector: 'crew-status',
    title: {
      es: 'Estado y salud de la tripulación',
      en: 'Crew status and health monitor',
    },
    body: {
      es: 'Tus cuatro especialistas reportan aquí su nivel de fatiga, ánimo y alertas sobre el sistema que vigilan. Mantén todos los sistemas estables para alcanzar el rango de Comandante Estelar.',
      en: 'Your four specialists report their fatigue, mood, and alerts for the system they watch here. Keep every system stable to earn the top Star Commander rank.',
    },
    placement: 'top',
    spotlightPadding: 8,
    requireAction: false,
    tone: 'info',
  },
  {
    id: 'step-work-orders',
    targetSelector: 'work-orders',
    title: {
      es: 'Órdenes de misión y avance de ciclo',
      en: 'Mission work orders and cycle advance',
    },
    body: {
      es: 'Ninguna decisión es gratis: compara las columnas Ganas y Pagas antes de firmar una orden para avanzar al siguiente día. Cada opción está respaldada por estudios reales de la NASA.',
      en: 'No decision is free: compare the You gain and You pay columns before signing a work order to advance the day. Every option is backed by real NASA studies.',
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
      es: 'En este anexo puedes consultar el glosario para niños, estudios OSDR y fotos reales de la NASA. Haz clic en el botón iluminado para abrir el anexo antes del simulacro final.',
      en: 'In this annex you can explore the kid-friendly glossary, OSDR studies, and real NASA photos. Click the highlighted button to open the annex before the final drill.',
    },
    actionHint: {
      es: 'Abre "Ciencia NASA y quiz" y luego ciérralo para pasar al simulacro final.',
      en: 'Open "NASA science & quiz" and then close it to start the final drill.',
    },
    placement: 'bottom',
    spotlightPadding: 6,
    requireAction: true,
    tone: 'info',
  },
  {
    id: 'step-training-drill',
    targetSelector: 'power-preset-storm',
    title: {
      es: 'Simulacro de emergencia: pico de radiación solar',
      en: 'Emergency drill: solar radiation spike',
    },
    body: {
      es: 'Simulamos una lluvia de protones SEP del catálogo DONKI de la NASA como la que midió Curiosity RAD en mayo de 2024 (8.1 mGy). Activa Escudo Tormenta para desviar energía al blindaje rico en hidrógeno y frenar esas partículas sin dañar tu partida real.',
      en: 'We are simulating a NASA DONKI solar proton (SEP) surge like the 8.1 mGy spike measured by Curiosity RAD in May 2024. Activate Storm Shield to route power to the hydrogen-rich shielding and block those particles without hurting your real mission.',
    },
    actionHint: {
      es: 'Haz clic en "Escudo Tormenta" para mitigar la alerta del simulacro y completar tu entrenamiento.',
      en: 'Click "Storm Shield" to mitigate the drill alert and complete your training.',
    },
    placement: 'right',
    spotlightPadding: 6,
    requireAction: true,
    tone: 'caution',
    drill: true,
  },
];
