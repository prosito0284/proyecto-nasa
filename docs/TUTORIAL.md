# Sistema de Entrenamiento Guiado (Tutorial Interactivo)

Documentación técnica del Sistema de Entrenamiento Guiado de **Junior Astronaut Mission Trainer** (`feat/interactive-tutorial`, tareas `T01` a `T12`).

---

## 1. Arquitectura general

El sistema guía a niños de 7 a 12 años por los controles reales del HUD sin tapar ni clonar la interfaz:

- **Contrato y tipos (`src/types/tutorial.ts`):** Define `TutorialStep`, `TutorialPlacement`, `TutorialTone` (`'info'` | `'caution'`), `TutorialTargetRect` y la clave de persistencia `TUTORIAL_STORAGE_KEY = 'jamt_tutorial_completed'`.
- **Guion bilingüe (`src/data/tutorial-steps.ts`):** Lista ordenada `TUTORIAL_STEPS` en español e inglés, con un máximo estricto de 2 frases por paso y cero emoji.
- **Máquina de estados y gestor de foco (`src/hooks/useTutorial.ts`):**
  - Persiste en `localStorage` (`'jamt_tutorial_completed'`).
  - Arranca automáticamente la primera vez que un jugador entra a una misión y puede reiniciarse en cualquier momento desde el botón permanente **"Entrenamiento" / "Training"** (`#start-tutorial-btn`) de la barra superior sin perder el progreso de la misión actual.
  - Rastrea en tiempo real el elemento objetivo mediante `getBoundingClientRect()`, `ResizeObserver` y eventos `scroll` / `resize`. Si un elemento no está montado o mide `0x0`, hace scroll suave o salta de forma segura al siguiente paso válido.
  - Gestiona el teclado (`Escape` para cerrar de inmediato, `ArrowLeft` / `ArrowRight` para navegar pasos informativos y `Tab` / `Shift+Tab` para alternar el foco compartido entre el control iluminado del HUD y los botones del `TutorialCallout`).
- **Iluminación de 4 cuadrantes (`src/components/Tutorial/TutorialSpotlight.tsx`):**
  - Dibuja 4 paneles oscuros independientes (`top`, `bottom`, `left`, `right`) con `rgba(6, 10, 18, 0.85)` y `pointer-events: auto` que bloquean clics fuera del área de interés, dejando el recorte central completamente libre para interactuar con el HUD real.
- **Recuadro táctico (`src/components/Tutorial/TutorialCallout.tsx`):**
  - Panel de instrumentos NASA (`#0B101B`, borde sólido de `2 px`, esquinas de `2 px`, sin degradados ni sombras difusas), contenedor de texto con `aria-live="polite"`, inversión automática de bordes (`computeCalloutPosition`) y botones táctiles de mínimo `44x44 px`.
- **Señalización vectorial (`src/components/Tutorial/TutorialPointer.tsx`):**
  - Línea conectora ortogonal SVG en ángulos de 90° (`buildOrthogonalConnector`) y 4 escuadras técnicas exteriores (`buildCornerBrackets`) con `pointer-events: none`.
- **Simulacro guiado de micro-emergencia (`src/engine/trainingDrill.ts`):**
  - Función pura `simulateTrainingDrill(state)` que proyecta una tormenta real de protones solares SEP del catálogo DONKI de la NASA (`2024-05-11T01:20:00-SEP-001` en la Luna, `2024-05-20T05:17:00-SEP-MARS` en Marte) comparando la dosis actual frente al modo **Escudo Tormenta** sin mutar `MissionState` ni provocar *Game Over*. Al terminar el simulacro, `src/App.tsx` restaura el reparto de energía original del jugador.

---

## 2. Tabla completa de pasos implementados (`TUTORIAL_STEPS`)

| ID | Selector `data-tutorial-id` | Componente donde reside | Texto ES (Título + Cuerpo) | Texto EN (Title + Body) | Requiere acción (`requireAction`) |
|---|---|---|---|---|---|
| `step-vitals-checklist` | `vitals-checklist` | `src/components/MissionHUD/ResourcePanel.tsx` | **Panel de recursos vitales y radiación:** Aquí controlas el oxígeno, agua reciclada, energía, comida y la dosis de radiación en mSv. Si cualquiera de los vitales cae a cero antes del octavo día, la misión fracasa. | **Vitals and radiation telemetry panel:** Here you monitor oxygen, recycled water, battery power, food, and radiation dose in mSv. If any vital drops to zero before day eight, the mission fails. | `false` (`tone: 'info'`) |
| `step-power-presets` | `power-presets` | `src/components/MissionHUD/ResourcePanel.tsx` | **Reparte la energía de la base:** Elige un modo de energía según el peligro del día, como Escudo Tormenta o Invernadero. Haz clic en cualquiera de los modos para ver cómo cambia la proyección de mañana. | **Budget your outpost power:** Pick a power mode that matches today’s hazard, such as Storm Shield or Greenhouse. Click any power mode button to see how tomorrow’s projection changes. | `true` (`tone: 'caution'`) |
| `step-outpost-map` | `outpost-map` | `src/components/OutpostView/OutpostMap.tsx` | **Vista de la colonia y controles de módulos:** Este diagrama técnico muestra en tiempo real los paneles solares, el refugio de agua y el clima espacial. También puedes tocar cada módulo o probar el retraso de señal con Houston. | **Outpost schematic view and module controls:** This technical schematic displays solar arrays, the water shelter, and space weather in real time. You can also inspect each module or test the signal delay to Houston. | `false` (`tone: 'info'`) |
| `step-crew-status` | `crew-status` | `src/App.tsx` (envuelve `CrewRoster`) | **Estado y salud de la tripulación:** Tus cuatro especialistas reportan aquí su nivel de fatiga, ánimo y alertas sobre el sistema que vigilan. Mantén todos los sistemas estables para alcanzar el rango de Comandante Estelar. | **Crew status and health monitor:** Your four specialists report their fatigue, mood, and alerts for the system they watch here. Keep every system stable to earn the top Star Commander rank. | `false` (`tone: 'info'`) |
| `step-work-orders` | `work-orders` | `src/App.tsx` (envuelve `WorkOrder`) | **Órdenes de misión y avance de ciclo:** Ninguna decisión es gratis: compara las columnas Ganas y Pagas antes de firmar una orden para avanzar al siguiente día. Cada opción está respaldada por estudios reales de la NASA. | **Mission work orders and cycle advance:** No decision is free: compare the You gain and You pay columns before signing a work order to advance the day. Every option is backed by real NASA studies. | `false` (`tone: 'caution'`) |
| `step-science-button` | `science-button` | `src/App.tsx` (`#open-science-modal-btn`) | **Anexo de ciencia NASA y quiz:** En este anexo puedes consultar el glosario para niños, estudios OSDR y fotos reales de la NASA. Haz clic en el botón iluminado para abrir el anexo antes del simulacro final. | **NASA science annex and quiz:** In this annex you can explore the kid-friendly glossary, OSDR studies, and real NASA photos. Click the highlighted button to open the annex before the final drill. | `true` (`tone: 'info'`) |
| `step-training-drill` | `power-preset-storm` | `src/components/MissionHUD/ResourcePanel.tsx` (`#power-preset-storm-btn`) | **Simulacro de emergencia: pico de radiación solar:** Simulamos una lluvia de protones SEP del catálogo DONKI de la NASA como la que midió Curiosity RAD en mayo de 2024 (8.1 mGy). Activa Escudo Tormenta para desviar energía al blindaje rico en hidrógeno y frenar esas partículas sin dañar tu partida real. | **Emergency drill: solar radiation spike:** We are simulating a NASA DONKI solar proton (SEP) surge like the 8.1 mGy spike measured by Curiosity RAD in May 2024. Activate Storm Shield to route power to the hydrogen-rich shielding and block those particles without hurting your real mission. | `true` (`tone: 'caution'`, `drill: true`) |

---

## 3. Selectores `data-tutorial-id` adicionales instrumentados en el DOM

Además de los selectores utilizados por los 7 pasos principales, el HUD y los modales incluyen los siguientes anclajes listos para futuros pasos:

| Selector `data-tutorial-id` | Componente | Descripción |
|---|---|---|
| `timeline-bar` | `src/App.tsx` | Barra superior de progreso de los 8 días/soles de misión y estado DONKI en vivo. |
| `dilemma-weather` | `src/App.tsx` | Tarjeta de alerta meteorológica espacial del día con sello de procedencia NASA (`SourceStamp`). |
| `primary-work-order` | `src/components/Mission/WorkOrder.tsx` | Primera tarjeta de orden de trabajo del dilema activo. |
| `primary-work-order-sign-btn` | `src/components/Mission/WorkOrder.tsx` | Botón de firma y ejecución de la primera orden de trabajo. |
| `power-preset-balanced` / `storm` / `greenhouse` / `science` | `src/components/MissionHUD/ResourcePanel.tsx` | Botones individuales de cada modo rápido de energía. |
| `science-modal-sheet` | `src/components/ScienceTraceability/ScienceModal.tsx` | Hoja principal del Anexo del Cuaderno de Ciencia NASA. |
| `science-folder-tabs` | `src/components/ScienceTraceability/ScienceModal.tsx` | Pestañas de carpeta del Anexo de Ciencia (Glosario, OSDR, Galería y Quiz). |

---

## 4. Cómo añadir nuevos pasos al tutorial

Sigue estos 4 pasos para agregar un nuevo paso sin romper el contrato ni las pruebas:

1. **Instrumenta el elemento objetivo en el DOM:**
   - Añade el atributo `data-tutorial-id="tu-nuevo-selector"` al contenedor o botón real en el componente correspondiente.
   - Verifica que el elemento esté montado y tenga dimensiones mayores a `0x0` cuando la misión esté activa (`!isBriefing && mission.status === 'playing'`).

2. **Declara el paso en `src/data/tutorial-steps.ts`:**
   - Añade un objeto `TutorialStep` al arreglo `TUTORIAL_STEPS`:
     ```ts
     {
       id: 'step-mi-nuevo-paso',
       targetSelector: 'tu-nuevo-selector',
       title: {
         es: 'Título en tipo oración',
         en: 'Sentence-case title',
       },
       body: {
         es: 'Primera frase clara para niños de 7 a 12 años. Segunda frase con el dato real de la NASA.',
         en: 'First clear sentence for ages 7 to 12. Second sentence explaining the real NASA data.',
       },
       placement: 'bottom', // 'top' | 'bottom' | 'left' | 'right'
       spotlightPadding: 8,
       requireAction: false, // true si el jugador debe interactuar con el control iluminado
       tone: 'info', // 'info' (cian) o 'caution' (ámbar)
     }
     ```
   - **Reglas obligatorias de estilo y contenido:**
     - **Máximo 2 frases** en `body.es` y `body.en` (validado automáticamente por `src/hooks/__tests__/tutorial.test.ts`).
     - **Cero emoji** en `title`, `body` y `actionHint`.
     - **Títulos en tipo oración** (no uses mayúsculas sostenidas en frases largas).

3. **Conecta el disparador de acción (solo si `requireAction: true`):**
   - Si el objetivo es un botón simple, `useTutorial` escucha automáticamente el evento `click` sobre `[data-tutorial-id="tu-nuevo-selector"]`.
   - Si además deseas disparar el avance desde un callback específico de React (por ejemplo, al mover un deslizador o cambiar de pestaña), invoca `onTutorialAction?.('step-mi-nuevo-paso')` o `tutorial.completeActionTrigger('step-mi-nuevo-paso')`. El reductor `tutorialStateReducer` es idempotente y evita avances dobles.

4. **Ejecuta la suite de pruebas y el build de producción:**
   ```bash
   npm test && npm run build
   ```
   La prueba `src/hooks/__tests__/tutorial.test.ts` verifica automáticamente que todos los pasos de `TUTORIAL_STEPS` cumplan el límite de 2 frases, no contengan emoji y tengan su `data-tutorial-id` presente en el marcado de los componentes reales.
