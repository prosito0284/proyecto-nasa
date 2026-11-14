# 🚀 NASA Space Apps Challenge 2026 — Guía de Coordinación Multi-Agente
## Reto: Build a Junior Astronaut Mission Trainer

Este repositorio está configurado para el trabajo simultáneo de **2 desarrolladores y 3 agentes de IA**:
1. **Antigravity (Instancia 1 - Usuario Principal)**
2. **Claude Code (Instancia del Usuario Principal)**
3. **Antigravity (Instancia 2 - Compañero de Equipo)**

> **REGLA DE ORO PARA TODOS LOS AGENTES:** Antes de modificar cualquier archivo, lee este documento completo, verifica en qué rama estás (`git status`) y **respeta estrictamente las carpetas asignadas a tu bloque** para evitar conflictos de merge (`merge conflicts`).

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

## 3. División de Tareas y Fronteras de Archivos (Sin Conflictos)

Para que los 3 agentes trabajen al mismo tiempo sin pisarse cambios, el código se divide en **3 módulos independientes** conectados únicamente por el contrato compartido `src/types/mission.ts`:

### 🧠 Bloque A — Motor de Simulación, Trade-offs y Misiones
- **Asignado a:** **Claude Code (Usuario Principal)**
- **Rama Git:** `feat/simulation-engine`
- **Archivos exclusivos:**
  - `src/engine/*` (cálculo de turnos/Soles, fórmulas de consumo/producción, consecuencias encadenadas, evaluación de victoria/derrota y puntaje de comandante).
  - `src/data/scenarios.ts` (configuración física real de Luna - Cráter Shackleton vs. Marte - Cráter Jezero, cartas de decisión con trade-offs y dilemas de ingeniería).
- **Regla:** No edites componentes visuales en `src/components/`. Expón funciones puras y hooks limpios que consuman y devuelvan los tipos de `src/types/mission.ts`.

### 🛰️ Bloque B — Datos Reales de la NASA, API DONKI/OSDR y Educación Científica
- **Asignado a:** **Antigravity del Compañero**
- **Rama Git:** `feat/nasa-data-service`
- **Archivos exclusivos:**
  - `src/services/nasaApi.ts` (cliente para NASA DONKI `FLR`/`SEP`/`CME` e imágenes de la NASA con caché en `localStorage` y fallback automático).
  - `src/data/nasa-datasets.ts` (datos reales verificados de NASA OSDR sobre radiación y cultivo espacial, eventos históricos reales de DONKI con sus IDs oficiales, y glosario para niños de 7–12 años).
  - `src/components/ScienceTraceability/*` (modal/panel "Ciencia Real de la NASA", tarjetas educativas de términos científicos y visor de telemetría DONKI en tiempo real).
- **Regla:** Mantén tus componentes dentro de `src/components/ScienceTraceability/` y tus servicios en `src/services/`.

### 🎮 Bloque C — Interfaz Visual del Outpost, HUD de Control, Audio y Base del Proyecto
- **Asignado a:** **Antigravity Principal (Instancia 1)**
- **Rama Git:** `feat/outpost-ui` (y configuración inicial en `main`)
- **Archivos exclusivos:**
  - `src/components/OutpostView/*` (mapa interactivo de la base lunar/marciana: domo habitable, paneles solares, invernadero, escudo de radiación, antena con simulación de retraso de señal Tierra-Luna/Marte).
  - `src/components/MissionHUD/*` (barras de recursos vitales, selector de distribución de energía, alertas de tormenta solar, bitácora del astronauta junior).
  - `src/styles/*`, `src/utils/sound.ts`, `src/i18n/*` (sistema de diseño espacial, sintetizador de audio Web Audio API, selector Español/Inglés).

### 🤝 Punto de Unión (`src/types/mission.ts` y `src/App.tsx`)
- `src/types/mission.ts` define las interfaces compartidas entre los 3 bloques. Si un agente necesita añadir un campo, debe ser opcional (`?`) o notificarse antes de hacer merge a `main`.

---

## 4. Flujo de Trabajo en Git para Todos los Agentes

1. **Antes de empezar a programar:**
   ```bash
   git fetch origin
   git checkout -b <tu-rama> origin/main
   ```
2. **Commits pequeños y descriptivos:**
   Usa prefijos claros: `feat(engine): ...`, `feat(nasa-data): ...`, `feat(ui): ...`.
3. **Sincronización frecuente:**
   Antes de subir cambios o abrir PR:
   ```bash
   git fetch origin
   git rebase origin/main
   git push -u origin <tu-rama>
   ```
4. **Integración en `main`:**
   Cada bloque se integra en `main` mediante Pull Request o merge limpio cuando el comando `npm run build` pase sin errores de TypeScript.
