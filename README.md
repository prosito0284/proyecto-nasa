# Junior Astronaut Mission Trainer

**NASA Space Apps Challenge 2026** · Reto: *Build a Junior Astronaut Mission Trainer*

[Español](#español) · [English](#english)

---

## Español

Un juego web para niños de 7 a 12 años. Diriges una base durante 8 días en la **Luna (cráter Shackleton, Artemis)** o en **Marte (cráter Jezero)** y cada día tomas una decisión de ingeniería en la que **ninguna opción es gratis**: proteger a la tripulación cuesta energía, fabricar oxígeno enfría el invernadero, hacer ciencia suma radiación.

Se juega en el navegador, sin instalar nada y sin cuentas.

### Cómo se juega

1. **Reparte la energía** entre soporte vital, blindaje, invernadero y ciencia.
2. **Elige** una de las opciones del dilema del día. Cada una muestra qué ganas y qué pierdes, hoy y mañana.
3. **Mira el informe del día**: las barras pasan de "antes" a "después" y aparecen las consecuencias de ayer.
4. Tras 8 días recibes un **rango de Comandante**, **insignias** y un **certificado imprimible** con el repaso de tus decisiones.

El **Reto del día** da a todos la misma misión (mismo clima y mismos dilemas) y se comparte con un enlace.

### Datos reales de la NASA que usa el juego

| Dato | Fuente | Para qué se usa |
|---|---|---|
| Llamaradas, partículas solares y eyecciones de masa coronal | [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) (`FLR`, `SEP`, `CME`), en vivo con archivo verificado de respaldo | Clima espacial de cada día |
| ~1.37 mSv por día en la superficie lunar | Dosímetro LND de Chang'e-4 (Zhang et al., 2020) | Radiación de fondo en la Luna |
| ~0.67 mSv por sol en la superficie de Marte | Curiosity RAD (Hassler et al., 2014) | Radiación de fondo en Marte |
| 122 g de oxígeno en 16 pruebas | MOXIE, Mars 2020 | Dilema "MOXIE o invernadero" |
| Retraso de señal: 1.3 s (Luna), 4 a 24 min (Marte) | Deep Space Network | Dilemas de teleoperación y autonomía |
| Hielo en cráteres en sombra permanente | LCROSS y LRO | Dilema del hielo de Shackleton |
| Cultivos en el espacio y en regolito | [NASA OSDR](https://osdr.nasa.gov/), Veggie y APH | Invernadero y panel de ciencia |
| Fotografías | NASA Image and Video Library | Galería del panel de ciencia |

La app indica siempre si un dato de clima espacial es **en vivo** o del **archivo real de la NASA**. Los porcentajes de recursos son una simplificación para niños; las cifras de la tabla son las reales.

### Ejecutar en local

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

Opcional: copia `.env.example` a `.env` y pon tu clave de [api.nasa.gov](https://api.nasa.gov/) en `VITE_NASA_API_KEY`. Sin clave se usa `DEMO_KEY` y, si se agota, el archivo verificado.

### Cómo está construido

- **Vite + React + TypeScript**, CSS propio y sonido sintetizado con Web Audio (sin archivos de audio).
- `src/engine/`: motor de simulación con funciones puras y semilla reproducible.
- `src/data/scenarios.ts`: 17 dilemas y la física de cada sitio.
- `src/services/nasaApi.ts`: cliente DONKI e imágenes, con caché y respaldo.
- `src/hooks/useMission.ts`: único punto donde la interfaz toca el motor.
- Pruebas automáticas (Vitest) que verifican que ninguna opción sea gratis y que el balance se mantenga.

### Uso de inteligencia artificial

Este proyecto se desarrolló con asistentes de IA para programar (Claude Code y Antigravity), dirigidos y revisados por el equipo. Los textos del juego fueron redactados con ayuda de IA y las cifras científicas se contrastaron con las fuentes de la NASA citadas arriba. No se usan imágenes ni audio generados por IA: las fotografías son de la NASA y el sonido se sintetiza en el navegador.

Guion de la demo: [`docs/DEMO.md`](./docs/DEMO.md) · Organización del equipo: [`AGENTS.md`](./AGENTS.md)

---

## English

A browser game for kids aged 7 to 12. You run an outpost for 8 days on the **Moon (Shackleton crater, Artemis)** or on **Mars (Jezero crater)**. Every day brings one engineering decision where **no option is free**: protecting the crew costs power, making oxygen chills the greenhouse, doing science adds radiation.

It runs in the browser with nothing to install and no accounts.

### How to play

1. **Budget your power** across life support, shielding, greenhouse and science.
2. **Choose** one option for the day's dilemma. Each shows what you gain and what you lose, today and tomorrow.
3. **Read the daily report**: bars move from "before" to "after" and yesterday's consequences show up.
4. After 8 days you earn a **Commander rank**, **badges** and a **printable certificate** reviewing your decisions.

The **Daily challenge** gives everyone the same mission (same weather, same dilemmas) and is shared with a link.

### Real NASA data in the game

| Data | Source | Used for |
|---|---|---|
| Solar flares, energetic particles, coronal mass ejections | [NASA DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) (`FLR`, `SEP`, `CME`), live with a verified archive as fallback | Each day's space weather |
| ~1.37 mSv per day on the lunar surface | Chang'e-4 LND dosimeter (Zhang et al., 2020) | Background radiation on the Moon |
| ~0.67 mSv per sol on the Martian surface | Curiosity RAD (Hassler et al., 2014) | Background radiation on Mars |
| 122 g of oxygen over 16 runs | MOXIE, Mars 2020 | "MOXIE or greenhouse" dilemma |
| Signal delay: 1.3 s (Moon), 4 to 24 min (Mars) | Deep Space Network | Teleoperation and autonomy dilemmas |
| Ice in permanently shadowed craters | LCROSS and LRO | Shackleton ice dilemma |
| Crops in space and in regolith | [NASA OSDR](https://osdr.nasa.gov/), Veggie and APH | Greenhouse and science panel |
| Photographs | NASA Image and Video Library | Science panel gallery |

The app always states whether a space-weather record is **live** or from the **real NASA archive**. Resource percentages are a simplification for kids; the figures in the table are the real ones.

### Run locally

Use the same commands as in the Spanish section: `npm install`, `npm run dev`, `npm test`, `npm run build`. Optionally copy `.env.example` to `.env` and set `VITE_NASA_API_KEY`.

### Use of artificial intelligence

This project was built with AI coding assistants (Claude Code and Antigravity), directed and reviewed by the team. In-game text was drafted with AI help and scientific figures were checked against the NASA sources cited above. No AI-generated images or audio are used: photographs come from NASA and sound is synthesized in the browser.
