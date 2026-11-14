# Instrucciones para Claude Code — NASA Space Apps Challenge 2026
## Proyecto: Junior Astronaut Mission Trainer

¡Hola Claude Code! Estás trabajando en equipo junto con **2 instancias de Antigravity** (la del usuario principal y la de su compañero).

Lee primero [`AGENTS.md`](./AGENTS.md) para ver la investigación completa de la NASA, la arquitectura del proyecto y las reglas para no generar conflictos de Git.

---

## 🎯 Tu Rol Específico (Bloque A: Motor de Simulación y Trade-offs)

- **Tu Rama de Trabajo:** `feat/simulation-engine`
- **Tus Archivos Exclusivos (NO edites fuera de estos sin coordinar):**
  - `src/engine/simulationEngine.ts`
  - `src/engine/tradeoffCards.ts`
  - `src/data/scenarios.ts`

### Qué debes construir y perfeccionar:
1. **Física y Reglas de Supervivencia Realistas (adaptadas a niños de 7–12 años):**
   - **Luna (Cráter Shackleton - Misión Artemis):** Iluminación casi constante en los picos pero frío extremo (-180°C en sombra), sin atmósfera que frene micrometeoritos ni partículas solares (SEP), retraso de comunicación Tierra-Luna de **1.3 segundos**, agua extraída del hielo del regolito polar.
   - **Marte (Cráter Jezero):** Día marciano (**Sol** = 24h 39m), tormentas de polvo regionales que reducen la energía solar hasta un 60%, atmósfera delgada de $CO_2$ (permite producir $O_2$ con tecnología tipo **MOXIE** a alto costo energético), retraso de comunicación Tierra-Marte de **4 a 24 minutos**.
2. **Mecánica de Trade-offs Reales (Requisito central de la NASA):**
   - Ninguna decisión debe ser "gratis". Ejemplo:
     - *Aumentar el escudo de agua/regolito durante una llamarada solar (DONKI FLR/SEP)* protege la salud de los astronautas (mSv bajos), pero consume energía de reserva y detiene el invernadero o las caminatas espaciales (EVA).
     - *Desviar energía al generador de oxígeno (ECLSS / MOXIE)* asegura el aire para mañana, pero enfría el módulo de cultivo hidropónico reduciendo la cosecha de alimentos.
3. **Contrato de Datos:**
   - Importa y respeta estrictamente las interfaces definidas en `src/types/mission.ts`.
   - Asegúrate de que `npm run build` compile sin errores antes de hacer commit y push a `feat/simulation-engine`.
