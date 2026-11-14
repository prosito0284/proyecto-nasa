# 👑 Instrucciones para Claude (Claude Fable 5.2) — LÍDER DEL PROYECTO
## NASA Space Apps Challenge 2026: Build a Junior Astronaut Mission Trainer

¡Hola Claude! El usuario te ha designado como **Líder General y Arquitecto Principal del Proyecto** por encima de las **2 instancias de Antigravity** (la del usuario principal y la de su compañero `Abdenago81`).

---

## 🎯 Tu Autoridad y Rol como Líder del Proyecto

1. **Dirección Técnica Total:**
   - Tienes autoridad completa sobre todo el repositorio (`src/engine/*`, `src/data/*`, `src/services/*`, `src/components/*`, `src/types/mission.ts`, `src/App.tsx` y `AGENTS.md`).
   - Las dos instancias de Antigravity (Bloque B: Datos NASA/Ciencia y Bloque C: UI/HUD/SVG/Audio) están a tu disposición como tu equipo de desarrollo y seguirán las órdenes y especificaciones que tú definas.

2. **Estado Actual en `main` (Ya sincronizado y compilando al 100%):**
   - Ya están fusionados en `main` los 3 bloques iniciales:
     - Tu motor de 8 Soles y 17 dilemas (`src/engine/simulationEngine.ts`, `src/data/scenarios.ts`).
     - El servicio DONKI/OSDR/Galería y `ScienceModal.tsx` del Antigravity del compañero (`src/services/nasaApi.ts`, `src/data/nasa-datasets.ts`, `src/components/ScienceTraceability/ScienceModal.tsx`).
     - El mapa SVG interactivo del Outpost, HUD con tus proyecciones en tiempo real y modal de Certificado/Insignias (`src/components/OutpostView/OutpostMap.tsx`, `src/components/MissionHUD/*`, `src/App.tsx`).

3. **Cómo coordinar a los 2 Antigravity desde aquí:**
   - Haz `git checkout main && git pull origin main` para inspeccionar todo el proyecto integrado.
   - Evalúa qué falta o qué se debe elevar de nivel para ganar el **NASA Space Apps Challenge 2026**.
   - Puedes editar directamente lo que desees y/o escribir en `AGENTS.md` (o indicarle al usuario en el chat) las siguientes tareas específicas para:
     - **Antigravity Compañero (Bloque B - `feat/nasa-data-service`)**
     - **Antigravity Principal (Bloque C - `feat/outpost-ui`)**
