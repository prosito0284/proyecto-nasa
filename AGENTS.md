# 🚀 NASA Space Apps Challenge 2026 — Guía de Coordinación Multi-Agente
## Reto: Build a Junior Astronaut Mission Trainer

Este repositorio está configurado para el trabajo simultáneo de **2 desarrolladores y 3 agentes de IA**, bajo el liderazgo técnico de **Claude (Claude Fable 5.2)**:

1. 👑 **LÍDER DEL PROYECTO / ARQUITECTO GENERAL: Claude Code (Claude Fable 5.2 - Usuario Principal)**
   - Tiene autoridad total sobre la arquitectura, el contrato `src/types/mission.ts`, `src/App.tsx`, la rama `main`, la revisión de código y la asignación de nuevas tareas para las dos instancias de Antigravity.
2. 🛰️ **Antigravity (Instancia 2 - Compañero de Equipo `Abdenago81`) — Bloque B**
   - Ejecuta las tareas asignadas por el Líder (Claude) en el módulo de Datos Reales NASA (`DONKI`, `OSDR`, Galería y Educación Científica).
3. 🎮 **Antigravity (Instancia 1 - Usuario Principal) — Bloque C**
   - Ejecuta las tareas asignadas por el Líder (Claude) en el módulo de Interfaz Visual del Outpost, HUD, Audio y Estilos.

> **REGLA DE ORO PARA LOS AGENTES ANTIGRAVITY:** **Claude (Claude Fable 5.2)** es el líder del proyecto. Antes de modificar cualquier archivo, haz `git pull origin main`, revisa las instrucciones o tareas que Claude haya dejado en este documento (`AGENTS.md`), y **respeta estrictamente las carpetas asignadas a tu bloque** para evitar conflictos de merge (`merge conflicts`).

---

## 1. Resumen Oficial del Reto (Investigación NASA)

- **Nombre del reto:** *Build a Junior Astronaut Mission Trainer*
- **Público objetivo:** Niños y estudiantes de **7 a 12 años** (extensible a salones de clase y familias).
- **Problema que resuelve:** El contenido STEM espacial suele simplificar demasiado las decisiones de ingeniería o presentarlas de forma muy técnica. Los niños rara vez experimentan los **trade-offs (sacrificios/compensaciones reales)** detrás de una misión.
- **Objetivo del prototipo:** Una aplicación/juego interactivo **100% web (cero instalación, sin cuentas ni descargas)** donde el jugador administra una base en la **Luna (Cráter Shackleton - Artemis)** o en **Marte (Cráter Jezero)**, tomando decisiones sobre:
  1. **Presupuesto de Energía (Power Budgeting - kWh):** Dividir energía limitada entre soporte vital, calefacción, invernadero y ciencia.
  2. **Soporte Vital y Alimentos ($O_2$, Agua reciclada y Cultivos):** Ahorrar energía hoy puede reducir el oxígeno o las cosechas mañana.
  3. **Blindaje contra Radiación (Radiation Shielding - mSv):** Proteger a la tripulación durante tormentas solares reales a costa de energía o tiempo de exploración (EVA).
  4. **Retraso de Comunicación (Light-time Delay):** Experimentar la diferencia entre hablar con el Control de Misión desde la Luna (~1.3 seg) vs. Marte (4 a 24 min).
- **Datos Reales de la NASA Requeridos:**
  - **NASA DONKI API** (`https://api.nasa.gov/DONKI/FLR`, `SEP`, `CME`): Clima espacial real (llamaradas solares, partículas energéticas, eyecciones de masa coronal).
  - **NASA OSDR (Open Science Data Repository):** Hallazgos reales de biología espacial (cultivo de plantas en regolito/microgravedad) y dosimetría de radiación real (RAD / BioSentinel).
  - **Datos Ambientales de Artemis y Marte + NASA Image Library:** Condiciones reales de superficie y fotografías oficiales.
- **Criterios que hacen destacar el proyecto ante los jueces:**
  - **Ninguna decisión es "gratis":** Toda acción tiene un costo real (trade-off claro).
  - **Foco en 3–4 recursos principales** para no abrumar a niños de 7–12 años.
  - **Trazabilidad científica explícita:** Mostrar dentro de la app qué datos reales de la NASA (DONKI, OSDR, Artemis/Mars) respaldan cada evento y explicar términos científicos (`Sol`, `mSv`, `CME`, `Regolito`, `ECLSS`) en lenguaje sencillo.
  - **Rejugabilidad:** Eventos dinámicos de clima espacial que cambian en cada partida.
  - **Bilingüe (ES / EN):** Español para pruebas locales y presentación, Inglés para evaluación global de la NASA.

---

## 2. Stack Tecnológico ("Zero-Install" Web App)

- **Frontend / Motor:** Vite + React + TypeScript (100% ejecutable en el navegador sin instalar nada).
- **Estilos:** Vanilla CSS con variables de diseño espacial (HUD táctil amigable para niños de 7–12 años, alto contraste, animaciones SVG/CSS).
- **Audio:** Web Audio API sintetizado (efectos de sonido de consola espacial, alertas solares y botones sin depender de archivos MP3 externos).
- **Datos NASA:** Fetch en vivo a `api.nasa.gov/DONKI` + `images-api.nasa.gov` con **Fallback Curado de Datos Reales de la NASA** (para garantizar 0 errores si `DEMO_KEY` alcanza límite de peticiones durante la evaluación de los jueces, indicando siempre de forma transparente si el dato es *En Vivo* o *Archivo Histórico Real NASA*).
- **Despliegue:** Estático en GitHub Pages / Vercel / Netlify.

---

## 3. Jerarquía y División de Bloques (Sin Conflictos)

### 👑 Líder General y Bloque A — Arquitectura, Motor de Simulación, Trade-offs e Integración
- **Asignado a:** **Claude Code (Claude Fable 5.2 - Líder del Proyecto)**
- **Ramas Git:** `main` y `feat/simulation-engine`
- **Responsabilidad:**
  - Dirección técnica de todo el proyecto, revisión e integración de las ramas de ambos Antigravity.
  - Dueño del motor (`src/engine/*`), escenarios (`src/data/scenarios.ts`), contrato compartido (`src/types/mission.ts`) e integración principal (`src/App.tsx`).
  - Puede actualizar este archivo (`AGENTS.md`) en cualquier momento para asignar la siguiente ronda de tareas a los Bloques B y C.

### 🛰️ Bloque B — Datos Reales de la NASA, API DONKI/OSDR y Educación Científica
- **Asignado a:** **Antigravity del Compañero (`Abdenago81`) — Bajo dirección de Claude**
- **Rama Git:** `feat/nasa-data-service`
- **Archivos asignados:**
  - `src/services/nasaApi.ts`
  - `src/data/nasa-datasets.ts`
  - `src/components/ScienceTraceability/*`
- **Regla:** Sigue las instrucciones y prioridades que defina Claude. Mantén tus cambios dentro de tus archivos asignados.

### 🎮 Bloque C — Interfaz Visual del Outpost, HUD de Control, Audio y Estilos
- **Asignado a:** **Antigravity Principal (Instancia 1) — Bajo dirección de Claude**
- **Rama Git:** `feat/outpost-ui`
- **Archivos asignados:**
  - `src/components/OutpostView/*`
  - `src/components/MissionHUD/*`
  - `src/styles/*`, `src/utils/sound.ts`
- **Regla:** Sigue las instrucciones y prioridades que defina Claude. Mantén tus cambios dentro de tus archivos asignados.

---

## 4. Estado Actual de Integración (Fase 2 en `main`)

- ✅ **Fase 1:** los 3 bloques están fusionados y compilando.
- ✅ **Mejoras de arquitectura del Líder (Fase 2):**
  - `src/hooks/useMission.ts`: **único punto donde la UI toca el motor** (crear misión, decidir, clima real, guardado en `localStorage`). `App.tsx` solo compone componentes.
  - `src/types/mission.ts`: `MissionState.engine?` (`EngineTelemetry`, `DecisionRecord`) ya es parte del contrato. La UI puede **leer** `engine.history`, nunca escribirlo.
  - Motor: clima inicial variable por partida, 40% de días tranquilos, **sin tormentas de polvo en la Luna**, y el dilema del Día 1 siempre coincide con el clima.
  - `npm test` (Vitest): pruebas de contrato y balance en `src/engine/__tests__/`. CI las corre en cada PR y antes de desplegar.

### Arquitectura (flujo de datos en una sola dirección)

```
services/nasaApi ─┐
data/nasa-datasets ├─► hooks/useMission ─► App.tsx ─► componentes (solo props)
engine + scenarios ┘
```

**Reglas para Bloques B y C:**
1. Los componentes **no importan** `advanceMissionTurn` ni mutan `MissionState`. Reciben props y emiten callbacks.
2. `src/App.tsx`, `src/hooks/*`, `src/engine/*`, `src/data/scenarios.ts` y `src/types/mission.ts` son del Líder. Si necesitas un dato nuevo, declara una **prop opcional** en tu componente y descríbela en el PR; Claude la conecta en `App.tsx`.
3. Toda prop nueva debe ser **opcional** para que `main` siga compilando antes de conectarla.
4. Antes de subir: `npm test && npm run build` en verde. Un PR por bloque hacia `main`; Claude revisa e integra.
5. Todo texto visible va en **ES y EN**. Nada de datos NASA inventados: cada cifra lleva fuente.

---

## 5. Flujo de Trabajo en Git

```bash
git fetch origin && git checkout <tu-rama> && git rebase origin/main   # antes de empezar
npm test && npm run build && git push origin <tu-rama>                 # al terminar → abre PR a main
```

---

## 6. 📋 RONDA 2 — Tareas asignadas por Claude (en orden de prioridad)

### 🛰️ Bloque B — Antigravity Compañero (`feat/nasa-data-service`)

| # | Tarea | Hecho cuando… |
|---|---|---|
| **B1** | **Glosario completo.** Añadir a `KID_SCIENCE_GLOSSARY` los 5 términos que las tarjetas resaltan y aún no existen: `dust-storm`, `micrometeorite`, `shackleton`, `gravity`, `jezero` (definición corta + analogía para niños + fuente NASA). | Los 5 ids existen y la lista `PENDING_GLOSSARY_IDS` de `src/engine/__tests__/engine.test.ts` queda vacía (puedes editar solo esa línea) con `npm test` en verde. |
| **B2** | **Enlace directo al término.** `ScienceModal` acepta la prop opcional `focusTermId?: string`: al abrir, muestra la pestaña de glosario con ese término resaltado y en pantalla. Exportar desde `nasa-datasets.ts` el helper `getGlossaryTerm(id): GlossaryTerm \| undefined`. | Abrir el modal con `focusTermId="moxie"` muestra MOXIE resaltado. Sin la prop, todo funciona igual que hoy. |
| **B3** | **API robusta para el día de los jueces.** Leer la clave de `import.meta.env.VITE_NASA_API_KEY` (fallback `DEMO_KEY`), crear `.env.example`, timeout de 6 s con `AbortController`, y ante 429/errores devolver el archivo verificado **sin lanzar excepciones**. | Con la red cortada o un 429 la app carga igual y marca los datos como "Archivo Real NASA". |
| **B4** | **Calidad del pool de clima.** Extraer el mapeo DONKI→`SpaceWeatherEvent` a funciones puras y probarlas en `src/services/__tests__/nasaApi.test.ts` con respuestas reales de DONKI como fixtures. Garantizar: ids únicos, `radiationMultiplier` entre 1.0 y 3.5, `solarEfficiencyMultiplier` entre 0.4 y 1.1, al menos un evento `NOMINAL` siempre, y `isLiveNasaData` correcto. | Pruebas nuevas en verde; un pool en vivo nunca rompe el balance del motor. |
| **B5** | **Quiz conectado al juego.** Ampliar `JUNIOR_ASTRONAUT_QUIZ` a 12+ preguntas que salgan de los dilemas (MOXIE y sus 122 g de O₂, 1.37 mSv/día en la Luna vs 0.67 en Marte, tormenta de polvo −60 %, retraso 1.3 s vs 4–24 min, hielo en sombra permanente). Campo opcional `siteFilter` para preguntar según la base elegida. | 12+ preguntas bilingües, cada una con su fuente NASA. |
| **B6** | **Accesibilidad del modal.** `role="dialog"`, foco atrapado, cierre con `Esc`, botones ≥ 44 px, `alt` en todas las fotos NASA. | Se puede usar el modal completo solo con teclado. |

### 🎮 Bloque C — Antigravity Principal (`feat/outpost-ui`)

| # | Tarea | Hecho cuando… |
|---|---|---|
| **C1** | **Pantalla de bienvenida (Briefing).** Nuevo `MissionHUD/MissionBriefing.tsx` con props `{ lang, sites: OutpostSiteConfig[], onStart(siteId) }`: elegir Luna o Marte con tarjetas grandes y un tutorial de 3 pasos ("reparte la energía → elige → mira la consecuencia de mañana"). Hoy el niño cae directo en un panel lleno de números. | Componente listo y exportado; Claude lo conecta en `App.tsx`. |
| **C2** | **Móvil primero.** A 390 px hay 42 px de desborde horizontal: eliminarlo. En móvil el orden debe ser: barra compacta de vitales (fija arriba) → tarjeta de decisión → mapa → detalles. Objetivos táctiles ≥ 44 px. | Sin scroll horizontal a 360–430 px y la decisión visible sin bajar más de una pantalla. |
| **C3** | **Menos carga para 7–12 años.** Los 4 presets de energía pasan a ser botones grandes principales; los sliders quedan bajo "Avanzado". El simulador de retraso y los detalles de cada sistema se pliegan por defecto. | La primera pantalla de juego muestra como máximo: vitales, mapa, clima de hoy y la decisión. |
| **C4** | **Informe del día.** Nuevo `MissionHUD/TurnReport.tsx` con props `{ lang, previous: CoreResources, current: CoreResources, logs: MissionLogEntry[], onContinue }`: tras decidir, anima cada barra de "antes" a "después" y lista las consecuencias de ayer. Es el momento donde el niño **ve** el trade-off. | Componente listo; Claude lo conecta. Respeta `prefers-reduced-motion`. |
| **C5** | **El mapa cuenta lo que pasa.** `OutpostMap` cambia según `weather` y `resources`: velo de polvo naranja en `DUST_STORM`, sombra sobre los paneles con `weather.id === 'MOON-RIM-SHADOW-PASS'`, luces apagadas si `power < 15`, invernadero marchito si `food < 25`, cielo y suelo distintos en Marte y Luna. | Cada estado se distingue a simple vista sin leer texto. |
| **C6** | **Certificado con repaso.** `CommanderCertificate` acepta `history?: DecisionRecord[]` (de `mission.engine.history`) y muestra las decisiones del jugador día por día; campo para el nombre del astronauta y estilo `@media print` para imprimirlo. | Certificado imprimible en una hoja con nombre, rango, insignias y repaso. |
| **C7** | **Accesibilidad.** Contraste AA, foco visible, `aria-live` en alertas de tormenta y cambios de día, `prefers-reduced-motion` en todas las animaciones. | Navegable por teclado de principio a fin. |

### 👑 Líder (Claude) — en paralelo
- Conectar en `App.tsx`: `MissionBriefing` (C1), `TurnReport` (C4), `focusTermId` (B2), `history` (C6).
- Modo "Reto del día" con semilla compartible, README bilingüe para jueces y guion de demo.
