# 👨‍🚀 Junior Astronaut Mission Trainer — Outpost Commander

**2026 NASA Space Apps Challenge** | Challenge: *Build a Junior Astronaut Mission Trainer*

Una aplicación web interactiva (**100% en navegador, cero instalación**) diseñada para que niños y jóvenes de **7 a 12 años** administren una base espacial en la **Luna (Cráter Shackleton - Artemis)** o en **Marte (Cráter Jezero)**, aprendiendo mediante el juego los **trade-offs (decisiones y sacrificios reales de ingeniería)** que enfrentan los astronautas y planificadores de misión de la NASA.

---

## 🌟 Características Principales (Alineadas con los Criterios de la NASA)

1. **Cero Instalación (Browser-Playable):** Funciona directamente en cualquier navegador web (PC, tablet o celular) sin descargas, cuentas ni configuraciones.
2. **Trade-Offs de Ingeniería Reales (3 Recursos Nucleares + Ciencia):**
   - ⚡ **Energía (Power Budget - kWh):** Paneles solares, baterías y distribución entre módulos.
   - 🌱 **Soporte Vital y Alimentos ($O_2$, $H_2O$ Reciclada e Invernadero):** Sistemas ECLSS, extracción de hielo lunar y MOXIE en Marte.
   - 🛡️ **Blindaje contra Radiación y Salud (mSv):** Protección activa ante tormentas solares vs. exploración (EVA).
   - 📡 **Retraso Real de Comunicación (Light-Time Delay):** 1.3 segundos en la Luna vs. 4–24 minutos en Marte.
3. **Respaldado por Datos Abiertos Reales de la NASA:**
   - **NASA DONKI (Space Weather Database):** Llamaradas solares (`FLR`), partículas energéticas solares (`SEP`) y eyecciones de masa coronal (`CME`).
   - **NASA OSDR (Open Science Data Repository):** Datos reales de dosimetría de radiación (RAD / BioSentinel) e investigaciones de biología espacial (crecimiento de plantas en regolito y microgravedad).
   - **Datos Ambientales de Superficie (Artemis & Mars Perseverance/InSight):** Temperaturas reales, irradiancia solar y fotografías oficiales de la NASA.
4. **Trazabilidad Científica para Niños (7–12 años):** Glosario contextual integrado y panel de *"Ciencia Real de la NASA"* que explica de dónde provienen los datos de cada evento.
5. **Bilingüe (Español / English):** Cambio instantáneo de idioma para estudiantes y jueces locales/globales.

---

## 🤝 Organización Multi-Agente del Equipo

Ver [`AGENTS.md`](./AGENTS.md) y [`CLAUDE.md`](./CLAUDE.md) para el protocolo completo de ramas y carpetas sin conflictos:

| Bloque | Responsable | Rama Git | Carpetas Exclusivas |
| :--- | :--- | :--- | :--- |
| **Bloque A: Motor de Simulación y Trade-offs** | **Claude Code** (Usuario) | `feat/simulation-engine` | `src/engine/*`, `src/data/scenarios.ts` |
| **Bloque B: Datos Reales NASA (DONKI/OSDR) y Glosario** | **Antigravity** (Compañero) | `feat/nasa-data-service` | `src/services/*`, `src/data/nasa-datasets.ts`, `src/components/ScienceTraceability/*` |
| **Bloque C: Interfaz Visual Outpost, HUD y Audio** | **Antigravity** (Usuario) | `feat/outpost-ui` | `src/components/OutpostView/*`, `src/components/MissionHUD/*`, `src/styles/*`, `src/utils/*` |
| **Contrato Compartido** | Todos (Coordinado) | `main` | `src/types/mission.ts` |
