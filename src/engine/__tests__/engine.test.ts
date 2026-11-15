/**
 * Pruebas de contrato del proyecto (las corre CI antes de desplegar).
 * Protegen las reglas del reto NASA: ninguna opción gratis, trazabilidad científica,
 * física coherente por sitio y un balance donde equilibrar gana y arriesgarlo todo pierde.
 */
import { describe, expect, it } from 'vitest';
import { CoreResources, MissionState, PowerAllocation, TradeoffChoice } from '../../types/mission';
import { INITIAL_DILEMMA_CARDS, getDilemmaDeckForSite } from '../../data/scenarios';
import { KID_SCIENCE_GLOSSARY, VERIFIED_NASA_WEATHER_EVENTS as POOL } from '../../data/nasa-datasets';
import {
  DEFAULT_POWER_ALLOCATION,
  advanceMissionTurn,
  createInitialMissionState,
  evaluateCommanderPerformance,
  getCrewReaction,
  getCrewStatus,
  selectNextWeather,
  selectStartingWeather,
} from '../simulationEngine';

const SITES = ['moon-shackleton', 'mars-jezero'] as const;
const KEYS: (keyof CoreResources)[] = [
  'power', 'lifeSupport', 'food', 'shielding', 'crewHealth', 'radiationDoseMsv', 'sciencePoints',
];

/**
 * Términos que las tarjetas resaltan y que el Bloque B todavía debe añadir al glosario.
 * TAREA BLOQUE B: añadirlos a KID_SCIENCE_GLOSSARY y vaciar esta lista.
 */
const PENDING_GLOSSARY_IDS: string[] = [];

type Strategy = {
  alloc: (s: MissionState) => PowerAllocation;
  pick: (s: MissionState, rnd: () => number) => TradeoffChoice;
};

function lcg(seed: number) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function playMission(site: (typeof SITES)[number], seed: number, strat: Strategy): MissionState {
  const rnd = lcg(seed + 7);
  let s = createInitialMissionState(site, selectStartingWeather(site, POOL, seed), seed);
  let guard = 0;
  while (s.status === 'playing' && guard++ < 20) {
    s = advanceMissionTurn(s, strat.pick(s, rnd), selectNextWeather(s, POOL), strat.alloc(s));
  }
  return s;
}

const worstVital = (s: MissionState, c: TradeoffChoice) => {
  const d = c.resourceDelta;
  const n = c.nextTurnEffect?.resourceDelta ?? {};
  return Math.min(
    ...(['power', 'lifeSupport', 'food', 'crewHealth'] as const).map(
      (k) => s.resources[k] + (d[k] ?? 0) + (n[k] ?? 0)
    )
  );
};

const randomPick: Strategy['pick'] = (s, rnd) =>
  s.currentDilemma!.choices[Math.floor(rnd() * s.currentDilemma!.choices.length)];

const STRATEGIES: Record<string, Strategy> = {
  balanced: {
    alloc: (s) => {
      const storm = s.currentWeather.radiationMultiplier > 1.5;
      const dim = s.currentWeather.solarEfficiencyMultiplier < 0.7;
      return {
        lifeSupportAlloc: s.resources.lifeSupport < 50 ? 35 : 25,
        shieldingAlloc: storm ? 35 : 20,
        greenhouseAlloc: s.resources.food < 50 ? 30 : 25,
        scienceAndCommsAlloc: storm || dim || s.resources.power < 40 ? 10 : 20,
      };
    },
    pick: (s) => [...s.currentDilemma!.choices].sort((a, b) => worstVital(s, b) - worstVital(s, a))[0],
  },
  randomDefault: { alloc: () => DEFAULT_POWER_ALLOCATION, pick: randomPick },
  recklessScience: {
    alloc: () => ({ lifeSupportAlloc: 30, shieldingAlloc: 20, greenhouseAlloc: 25, scienceAndCommsAlloc: 50 }),
    pick: (s) =>
      [...s.currentDilemma!.choices].sort(
        (a, b) => (b.resourceDelta.sciencePoints ?? 0) - (a.resourceDelta.sciencePoints ?? 0)
      )[0],
  },
};

function winRate(site: (typeof SITES)[number], strat: Strategy, n = 400): number {
  let won = 0;
  for (let i = 0; i < n; i++) if (playMission(site, i * 97 + 13, strat).status === 'won') won++;
  return won / n;
}

describe('tarjetas de dilemas (regla NASA: ninguna opción es gratis)', () => {
  it('cada opción tiene al menos un beneficio y un costo', () => {
    const free: string[] = [];
    for (const card of INITIAL_DILEMMA_CARDS) {
      for (const ch of card.choices) {
        let benefit = false;
        let cost = false;
        for (const d of [ch.resourceDelta, ch.nextTurnEffect?.resourceDelta ?? {}]) {
          for (const k of KEYS) {
            const v = d[k];
            if (!v) continue;
            if (k === 'radiationDoseMsv' ? v < 0 : v > 0) benefit = true;
            else cost = true;
          }
        }
        if (!benefit || !cost) free.push(`${card.id}/${ch.id}`);
      }
    }
    expect(free).toEqual([]);
  });

  it('ids únicos, textos bilingües y referencia NASA en cada opción', () => {
    const cardIds = INITIAL_DILEMMA_CARDS.map((c) => c.id);
    const choiceIds = INITIAL_DILEMMA_CARDS.flatMap((c) => c.choices.map((ch) => ch.id));
    expect(new Set(cardIds).size).toBe(cardIds.length);
    expect(new Set(choiceIds).size).toBe(choiceIds.length);
    for (const card of INITIAL_DILEMMA_CARDS) {
      expect(card.choices.length).toBeGreaterThanOrEqual(2);
      for (const ch of card.choices) {
        for (const text of [ch.label, ch.description, ch.tradeoffWarning, ch.outcomeFeedback]) {
          expect(text.es.length).toBeGreaterThan(0);
          expect(text.en.length).toBeGreaterThan(0);
        }
        expect(ch.nasaDataReference).toMatch(/NASA/);
      }
    }
  });

  it.each(SITES)('%s tiene al menos 10 tarjetas, más de las 8 que dura la misión', (site) => {
    expect(getDilemmaDeckForSite(site).length).toBeGreaterThanOrEqual(10);
  });

  it('cada término resaltado existe en el glosario (salvo los pendientes del Bloque B)', () => {
    const glossary = new Set(KID_SCIENCE_GLOSSARY.map((g) => g.id));
    const missing = [
      ...new Set(
        INITIAL_DILEMMA_CARDS.map((c) => c.highlightedTermId).filter(
          (id): id is string => !!id && !glossary.has(id)
        )
      ),
    ];
    expect(missing.filter((id) => !PENDING_GLOSSARY_IDS.includes(id))).toEqual([]);
  });
});

describe('motor de simulación', () => {
  it('es determinista con la misma semilla', () => {
    const a = playMission('mars-jezero', 42, STRATEGIES.randomDefault);
    const b = playMission('mars-jezero', 42, STRATEGIES.randomDefault);
    expect(a.resources).toEqual(b.resources);
    expect(a.engine?.history).toEqual(b.engine?.history);
  });

  it.each(SITES)('%s: recursos en rango, sin tarjetas repetidas y fin en ≤ 8 días', (site) => {
    for (let seed = 0; seed < 150; seed++) {
      const s = playMission(site, seed, STRATEGIES.randomDefault);
      expect(s.status).not.toBe('playing');
      expect(s.currentDay).toBeLessThanOrEqual(s.totalDays);
      for (const k of ['power', 'lifeSupport', 'food', 'shielding', 'crewHealth'] as const) {
        expect(s.resources[k]).toBeGreaterThanOrEqual(0);
        expect(s.resources[k]).toBeLessThanOrEqual(100);
      }
      const cards = s.engine!.history.map((h) => h.cardId);
      expect(new Set(cards).size).toBe(cards.length);
      const score = evaluateCommanderPerformance(s).score;
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  it('en la Luna nunca hay tormentas de polvo y las tarjetas de clima coinciden con el clima', () => {
    for (let seed = 0; seed < 150; seed++) {
      let s = createInitialMissionState('moon-shackleton', selectStartingWeather('moon-shackleton', POOL, seed), seed);
      const rnd = lcg(seed);
      while (s.status === 'playing') {
        expect(s.currentWeather.type).not.toBe('DUST_STORM');
        const trigger = s.currentDilemma!.triggeredByWeather;
        if (trigger) expect(trigger).toContain(s.currentWeather.type);
        s = advanceMissionTurn(s, randomPick(s, rnd), selectNextWeather(s, POOL), s.powerAllocation);
      }
    }
  });
});

describe('balance (Monte Carlo)', () => {
  it.each(SITES)('%s: equilibrar gana, jugar al azar es arriesgado y todo-a-ciencia fracasa', (site) => {
    const balanced = winRate(site, STRATEGIES.balanced);
    const random = winRate(site, STRATEGIES.randomDefault);
    const reckless = winRate(site, STRATEGIES.recklessScience);
    console.log(site, { balanced, random, reckless });
    expect(balanced).toBeGreaterThanOrEqual(0.9);
    expect(random).toBeGreaterThanOrEqual(0.55);
    expect(random).toBeLessThanOrEqual(0.97);
    expect(reckless).toBeLessThanOrEqual(0.15);
  });
});

describe('rango máximo (Comandante Estelar)', () => {
  const starRate = (site: (typeof SITES)[number], strat: Strategy, n = 400) => {
    let stars = 0;
    for (let i = 0; i < n; i++) {
      const s = playMission(site, i * 97 + 13, strat);
      if (evaluateCommanderPerformance(s).rank.id === 'star-commander') stars++;
    }
    return stars / n;
  };

  // Alterna opciones sin mirar: primera, segunda, primera…
  let turn = 0;
  const alternate: Strategy = {
    alloc: () => DEFAULT_POWER_ALLOCATION,
    pick: (s) => s.currentDilemma!.choices[turn++ % s.currentDilemma!.choices.length],
  };

  it.each(SITES)('%s: no se consigue jugando al azar ni alternando opciones', (site) => {
    expect(starRate(site, STRATEGIES.randomDefault)).toBeLessThanOrEqual(0.05);
    expect(starRate(site, alternate)).toBeLessThanOrEqual(0.05);
  });

  it.each(SITES)('%s: sí es alcanzable planificando (búsqueda de la mejor ruta)', (site) => {
    const presets: PowerAllocation[] = [
      DEFAULT_POWER_ALLOCATION,
      { lifeSupportAlloc: 25, shieldingAlloc: 40, greenhouseAlloc: 20, scienceAndCommsAlloc: 10 },
      { lifeSupportAlloc: 20, shieldingAlloc: 20, greenhouseAlloc: 20, scienceAndCommsAlloc: 15 },
      { lifeSupportAlloc: 35, shieldingAlloc: 20, greenhouseAlloc: 35, scienceAndCommsAlloc: 10 },
    ];
    const heuristic = (s: MissionState) => {
      const r = s.resources;
      return (
        evaluateCommanderPerformance(s).score +
        Math.min(r.power, r.lifeSupport, r.food, r.crewHealth) * 0.5
      );
    };
    const seeds = 12;
    let reachable = 0;
    for (let i = 0; i < seeds; i++) {
      const seed = i * 97 + 13;
      let beam = [createInitialMissionState(site, selectStartingWeather(site, POOL, seed), seed)];
      const finished: MissionState[] = [];
      while (beam.length > 0) {
        const next: MissionState[] = [];
        for (const s of beam) {
          for (const choice of s.currentDilemma!.choices) {
            for (const alloc of presets) {
              const n = advanceMissionTurn(s, choice, selectNextWeather(s, POOL), alloc);
              (n.status === 'playing' ? next : finished).push(n);
            }
          }
        }
        beam = next.sort((a, b) => heuristic(b) - heuristic(a)).slice(0, 80);
      }
      if (finished.some((s) => evaluateCommanderPerformance(s).rank.id === 'star-commander')) {
        reachable++;
      }
    }
    expect(reachable / seeds).toBeGreaterThanOrEqual(0.5);
  });

  it('explica qué requisito faltó', () => {
    const s = playMission('moon-shackleton', 5, STRATEGIES.recklessScience);
    const ev = evaluateCommanderPerformance(s);
    expect(ev.rank.id).not.toBe('star-commander');
    expect(ev.topRankChecks.some((c) => !c.met)).toBe(true);
  });
});

describe('tripulación', () => {
  it('cada tripulante vigila un sistema y siempre tiene frase en los dos idiomas', () => {
    const s = createInitialMissionState('mars-jezero', POOL[0], 1);
    const crew = getCrewStatus(s);
    expect(crew.map((c) => c.member.id)).toEqual(['commander', 'engineer', 'botanist', 'medic']);
    for (const c of crew) {
      expect(c.line.es.length).toBeGreaterThan(0);
      expect(c.line.en.length).toBeGreaterThan(0);
      expect(c.line.es.length).toBeLessThanOrEqual(90);
    }
  });

  it('el ánimo empeora cuando su sistema cae', () => {
    const s = createInitialMissionState('moon-shackleton', POOL[0], 1);
    const low = { ...s, resources: { ...s.resources, power: 10, food: 30 } };
    const crew = getCrewStatus(low);
    expect(crew.find((c) => c.member.id === 'engineer')!.mood).toBe('critical');
    expect(crew.find((c) => c.member.id === 'botanist')!.mood).toBe('worried');
  });

  it('comenta el turno quien más cambió, o nadie si no cambió nada', () => {
    const s = createInitialMissionState('moon-shackleton', POOL[0], 1);
    const after = { ...s.resources, power: s.resources.power - 20, food: s.resources.food - 4 };
    expect(getCrewReaction(s.resources, after)?.member.id).toBe('engineer');
    expect(getCrewReaction(s.resources, s.resources)).toBeNull();
  });
});

describe('insignias (F04: exigen misión completada y ganada)', () => {
  it('solar-guardian, star-scientist e isru-pioneer no se otorgan en misiones abortadas o en curso', () => {
    const base = createInitialMissionState('moon-shackleton', POOL[0], 7);
    const qualifiedMidMission: MissionState = {
      ...base,
      status: 'playing',
      resources: {
        ...base.resources,
        sciencePoints: base.resources.sciencePoints + 160,
      },
      engine: {
        ...base.engine!,
        stormDays: 2,
        shieldedStormDays: 2,
        history: [
          {
            day: 1,
            cardId: 'card-1',
            choiceId: 'launch-eva',
            weatherType: 'FLR',
          },
          {
            day: 2,
            cardId: 'card-2',
            choiceId: 'psr-rover-ice-run',
            weatherType: 'SEP',
          },
        ],
      },
    };

    const gatedIds = ['solar-guardian', 'star-scientist', 'isru-pioneer'] as const;

    const playingEval = evaluateCommanderPerformance(qualifiedMidMission);
    for (const id of gatedIds) {
      expect(playingEval.badges.find((b) => b.id === id)?.earned).toBe(false);
    }

    const failedEval = evaluateCommanderPerformance({
      ...qualifiedMidMission,
      status: 'failed',
    });
    expect(failedEval.badges.every((b) => !b.earned)).toBe(true);

    const wonEval = evaluateCommanderPerformance({
      ...qualifiedMidMission,
      status: 'won',
    });
    for (const id of gatedIds) {
      expect(wonEval.badges.find((b) => b.id === id)?.earned).toBe(true);
    }
  });
});
