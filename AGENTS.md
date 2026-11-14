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

## 4. Estado Actual de Integración (Fase 5 en `main`)

- ✅ **Ronda 4 integrada:** C13–C17 y B11–B15 fusionados sin conflictos; cada bloque tocó solo sus archivos.
- ✅ **Tripulación:** `src/data/crew.ts` (4 personas) y `getCrewStatus` / `getCrewReaction` en el motor. Conectada al panel de vitales, a la decisión del día, al informe y al certificado.
- ✅ **Rango máximo con disciplina:** Comandante Estelar exige 73 puntos y no dejar caer ningún vital en toda la misión (`TOP_RANK`). La pantalla final muestra qué requisito faltó.
- ✅ Parche "As del quiz" por acertar todo el quiz; órdenes de trabajo sin la nota repetida; regla tipográfica aplicada en `lead.css`.
- ✅ Corregido: el botón "Firmar y ejecutar" se escapaba del cursor porque el panel de vitales cambiaba de alto al previsualizar (scroll anchoring).
- ✅ `npm test`: 28 pruebas.
- ⚠️ **`docs/FUENTES.md` no es fiable para `scenarios.ts`:** varias filas citan textos que no existen en ese archivo. Ver la nota del Líder al inicio del documento. Queda pendiente una verificación humana de las cifras.

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

## 6. Ronda 3 (completada) — referencia de la dirección de arte

La tabla de dirección de arte sigue vigente para todo trabajo nuevo. Las tareas C8–C12 y B7–B10 están hechas.

### Dirección de arte: "Cuaderno de Vuelo del Comandante"

El niño no usa un dashboard: lleva el **cuaderno de vuelo** de su misión, como los planes de vuelo de papel de Apolo y los manuales gráficos de la NASA de 1975.

| Elemento | Regla |
|---|---|
| **Superficie** | Papel de plan de vuelo: fondo crema `#F2EBDD`, tinta `#1B1F2A`, líneas finas de formulario. El espacio oscuro queda **solo dentro de la ventana del mapa**. |
| **Color** | Rojo NASA `#FC3D21` para alertas y acción principal, azul `#0B3D91` para datos, verde de check `#2E7D4F`. Sin degradados ni brillos. |
| **Tipografía** | Un rótulo condensado tipo señalética para títulos y una monoespaciada para cifras y checklists. Quitar la mezcla actual de tres familias. |
| **Iconos** | **Cero emoji en la interfaz.** Un set propio de ~16 iconos SVG de trazo (batería, gota, hoja, escudo, casco, antena, sol, polvo…) dibujados con la misma regla. |
| **Formas** | Esquinas rectas o de 2 px, bordes de 1.5 px, pestañas de carpeta, sellos y casillas de checklist. Nada de tarjetas flotantes con sombra. |
| **Decisiones** | Cada opción es una **orden de trabajo** que el comandante firma: dos columnas "Ganas / Pagas" y un sello "EJECUTADA" al elegir. |
| **Insignias** | **Parches de misión bordados** (SVG redondo con borde de hilo), uno por logro, en lugar de emoji en una caja. |
| **Mapa** | Ilustración plana a dos tintas por sitio (gris-azul lunar, óxido marciano) con estilo de diagrama técnico y rótulos con líneas guía. |
| **Voz** | Frases cortas de control de misión. Sin signos de admiración en cadena ni mayúsculas de adorno. |

### 🎮 Bloque C — Antigravity Principal (`feat/outpost-ui`)

| # | Tarea | Hecho cuando… |
|---|---|---|
| **C8** | **Tokens y base.** Reescribir las variables de `src/styles/index.css` según la tabla (color, tipografía, bordes, espaciado) y aplicar la superficie de papel a toda la app. | Ningún degradado, sombra difusa ni `border-radius` mayor de 2 px fuera del mapa. Contraste AA. |
| **C9** | **Set de iconos propio.** Crear `src/components/icons/` con ~16 iconos SVG de trazo y sustituir **todos** los emoji de tus componentes. | `grep` de emoji en `src/components/MissionHUD` y `OutpostView` devuelve cero. |
| **C10** | **Parches de misión.** Componente `MissionHUD/MissionPatch.tsx` con props `{ badgeId, earned, size? }` que dibuja un parche bordado distinto por insignia. Usarlo en el HUD y el certificado. | 9 parches distintos; los no ganados se ven como contorno punteado. |
| **C11** | **Mapa como diagrama técnico.** Rehacer `OutpostMap` a dos tintas por sitio con rótulos y líneas guía; conservar todos los estados de C5. | Luna y Marte se distinguen a un metro de la pantalla. |
| **C12** | **Certificado como diploma de papel.** Aplicar la identidad al certificado y revisar la impresión en una hoja. | Se imprime en A4/Carta sin cortes y con los parches. |

### 🛰️ Bloque B — Antigravity Compañero (`feat/nasa-data-service`)

| # | Tarea | Hecho cuando… |
|---|---|---|
| **B7** | **Panel de ciencia como "Anexo del cuaderno".** Aplicar la identidad a `ScienceModal`: pestañas de carpeta, fichas de término tipo tarjeta de biblioteca, cero emoji (usar los iconos de `src/components/icons/` cuando C9 esté en `main`; mientras, texto). | Cero emoji en `ScienceTraceability/`. |
| **B8** | **Sello de procedencia.** Componente `ScienceTraceability/SourceStamp.tsx` con props `{ source: 'DONKI' \| 'OSDR' \| 'ARTEMIS' \| 'MARS', live: boolean, url? }`: un sello de tinta que dice de dónde viene el dato y si es en vivo o de archivo. | Componente exportado; Claude lo coloca en dilemas y bitácora. |
| **B9** | **"¿Cómo lo sabemos?"** Añadir a cada término del glosario un campo opcional `howWeKnow: LocalizedText` (una frase: qué instrumento o misión midió el dato). | Los 17 términos lo tienen, con fuente. |
| **B10** | **Datos en vivo visibles.** Exportar `getWeatherPoolStatus()` → `{ live: boolean, fetchedAt: string, count: number }` para mostrar "DONKI en vivo · actualizado hace 2 h". | Función exportada y probada. |

### 👑 Líder (Claude)
- Textos de dilemas con la voz nueva; "orden de trabajo" en `App.tsx` (columnas Ganas / Pagas, sello al ejecutar).
- Colocar `SourceStamp` y el estado de DONKI en vivo; quitar los emoji de `App.tsx`.
- Modo aula: tabla de resultados del Reto del día en el mismo dispositivo.
- Revisión final en móvil, tablet y escritorio, y publicación.

**Orden:** C8 y C9 primero (todo lo demás depende de los tokens y los iconos). B8–B10 pueden avanzar en paralelo.

---

## 7. Ronda 4 (completada) — Tripulación, menos texto y más reto

**Diagnóstico del Líder tras la Ronda 3.** La identidad ya es propia. Lo que falta para un niño de 7 a 12 años: (1) no hay personas, la "salud" es solo una barra; (2) hay demasiado texto y todo va en mayúsculas condensadas; (3) el panel izquierdo sigue pareciendo un tablero; (4) el rango máximo sale demasiado fácil.

**Contrato nuevo (ya en `src/types/mission.ts`):** `CrewMood`, `CrewMember`, `CrewStatus`. La tripulación tiene 4 personas con ids fijos: `commander` (vigila `crewHealth`), `engineer` (`power`), `botanist` (`food`), `medic` (`shielding`). El Líder escribe los datos y `getCrewStatus(state)`; los componentes solo reciben `CrewStatus[]`.

**Regla tipográfica nueva (para todos):** mayúsculas solo en rótulos de hasta 3 palabras (etiquetas, códigos, botones cortos). Títulos y frases van en tipo oración con la fuente de rótulo. Texto de cuerpo mínimo 16 px.

### 🎮 Bloque C — Antigravity Principal (`feat/outpost-ui`)

| # | Tarea | Hecho cuando… |
|---|---|---|
| **C13** | **Retratos y lista de tripulación.** `src/components/crew/CrewPortrait.tsx` con props `{ memberId, mood, size? }`: 4 personajes de trazo a dos tintas (misma regla que los iconos), cada uno con 4 expresiones (`great`, `ok`, `worried`, `critical`). Diversos y sin estereotipos. `src/components/crew/CrewRoster.tsx` con props `{ lang, crew: CrewStatus[], compact? }`: retrato, nombre, rol y su frase en un globo de cómic de papel. | 16 combinaciones se distinguen a simple vista; el roster funciona a 360 px. |
| **C14** | **Panel izquierdo como hoja de checklist.** `ResourcePanel` deja de ser un tablero de barras: cada vital es una línea de checklist con casilla de estado (bien / atención / crítico), valor y la proyección de mañana. Acepta la prop opcional `crew?: CrewStatus[]` para mostrar junto a cada vital el retrato pequeño de quien lo vigila. | Sin la prop funciona igual que hoy; con ella cada vital tiene una cara. |
| **C15** | **Pase tipográfico.** Aplicar la regla nueva en `index.css` y tus componentes: quitar `text-transform: uppercase` de títulos y frases largas, cuerpo a 16 px mínimo, líneas de 45 a 75 caracteres. | Ningún título de más de 3 palabras en mayúsculas en tus componentes. |
| **C16** | **Informe del día con voz.** `TurnReport` acepta `crewLine?: CrewStatus` y lo muestra arriba: el tripulante más afectado dice una frase sobre lo que pasó. | Con la prop aparece retrato y frase; sin ella, igual que hoy. |
| **C17** | **Bienvenida y certificado.** Revisar ambos con la identidad y la regla tipográfica: bienvenida que quepa en una pantalla de escritorio sin scroll (máximo 3 datos por base) y certificado con los retratos de la tripulación. Adjuntar capturas en el PR. | Capturas de escritorio y móvil de ambas pantallas. |

### 🛰️ Bloque B — Antigravity Compañero (`feat/nasa-data-service`)

| # | Tarea | Hecho cuando… |
|---|---|---|
| **B11** | **Auditoría de fuentes.** Verificar contra la fuente oficial **cada cifra** de `src/data/scenarios.ts` y `src/data/nasa-datasets.ts` (p. ej. 98 % de agua reciclada, 122 g de O₂ de MOXIE, 1.37 y 0.67 mSv/día, límite de 600 mSv, ~1 % de hueso al mes, 800 °C de MOXIE). Entregar `docs/FUENTES.md`: tabla con afirmación, archivo, fuente con URL, y estado (verificada / corregir / sin fuente). **No edites `scenarios.ts`**: lista las correcciones para que Claude las aplique. Corrige tú las de `nasa-datasets.ts`. | Tabla completa; ninguna cifra queda "sin revisar". |
| **B12** | **Dieta de texto en el panel de ciencia.** Cada ficha muestra como máximo 2 frases; el resto queda tras "Leer más". Aplicar la regla tipográfica nueva en `science.css`. | Ninguna ficha ocupa más de media pantalla de móvil sin desplegar. |
| **B13** | **Quiz que cuenta.** `ScienceModal` acepta `onQuizComplete?: (correct: number, total: number) => void` y lo llama al terminar el quiz. | Callback probado; sin la prop, igual que hoy. |
| **B14** | **Galería sin saltos.** Las fotos NASA cargan con `loading="lazy"`, proporción fija y un recuadro de respaldo con el crédito si la imagen falla. | Sin saltos de diseño al cargar ni iconos de imagen rota sin conexión. |
| **B15** | **Revisión del inglés.** Leer todos los textos en inglés de tus archivos como lo haría un juez nativo: corregir calcos del español y frases largas. | Lista de cambios en el PR. |

### 👑 Líder (Claude)
- `src/data/crew.ts` y `getCrewStatus(state)` en el motor, con frases por recurso y estado.
- Conectar `CrewRoster`, `crew` en el panel, `crewLine` en el informe y `onQuizComplete` (parche por quiz perfecto).
- Rebalanceo de rangos: el máximo debe exigir planificación; prueba automática que lo impida con decisiones al azar.
- Recorte de texto en las órdenes de trabajo y aplicar las correcciones de B11.

---

## 8. Pendientes conocidos para la entrega

| Dueño | Pendiente |
|---|---|
| Equipo humano | Abrir las fuentes y confirmar las cifras que el juego muestra (ver nota en `docs/FUENTES.md`). |
| Bloque C | Checklist de vitales: las etiquetas se parten en varias líneas en el panel estrecho; en `TurnReport` falta un separador entre nombre y rol del tripulante. |
| Bloque B | Repetir la auditoría de `scenarios.ts` citando el texto real del archivo. |
| Líder | Grabar la demo con `docs/DEMO.md` y revisar los textos en inglés de `scenarios.ts`. |
