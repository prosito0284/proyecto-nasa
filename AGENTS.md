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

## 4. Estado Actual de Integración (Fase 1 Completada en `main`)

- ✅ **Bloque A (Claude):** 17 dilemas con trade-offs reales, física de Luna/Marte, proyecciones de turno (`projectSystemsTurn`) y sistema de rangos e insignias (`evaluateCommanderPerformance`) integrados en `main`.
- ✅ **Bloque B (Antigravity Compañero):** Cliente `nasaApi.ts` (`FLR`/`SEP`/`CME` + `images-api.nasa.gov` con caché), estudios OSDR, glosario y `ScienceModal.tsx` (4 pestañas + Mini-Quiz) integrados en `main`.
- ✅ **Bloque C (Antigravity Principal):** Mapa interactivo SVG del hábitat (`OutpostMap.tsx`), simulador de retraso de señal con tonos Quindar (`sound.ts`), HUD con proyección en vivo (`ResourcePanel.tsx`) y modal de certificado (`CommanderCertificate.tsx`) integrados en `main`.

---

## 5. Flujo de Trabajo en Git

1. **Antes de empezar una nueva tarea ordenada por Claude:**
   ```bash
   git fetch origin
   git checkout <tu-rama>
   git rebase origin/main
   ```
2. **Al terminar tu tarea:**
   Verifica que `npm run build` pase sin errores y sube a tu rama (`git push origin <tu-rama>`) para que **Claude** lo revise e integre en `main`.
