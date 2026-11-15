import * as THREE from 'three';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { getGlossaryTerm, VERIFIED_NASA_WEATHER_EVENTS } from '../../../data/nasa-datasets';
import { OUTPOST_SITES } from '../../../data/scenarios';
import {
  advanceMissionTurn,
  createInitialMissionState,
  DEFAULT_POWER_ALLOCATION,
  evaluateCommanderPerformance,
  getScienceBonusTier,
  projectSystemsTurn,
} from '../../../engine/simulationEngine';
import { applySampleCollectToMission } from '../../../hooks/useMission';
import { CommanderCertificate } from '../../MissionHUD/CommanderCertificate';
import { ResourcePanel } from '../../MissionHUD/ResourcePanel';
import { TurnReport } from '../../MissionHUD/TurnReport';
import {
  disposeObject3D,
  generateTurnAnomalies,
  sampleWorldTerrainHeight,
} from '../proceduralModels';
import {
  createSampleVisualRuntime,
  findSampleId,
  formatSampleBadge,
  generateTurnSamples,
  SAMPLE_CATALOG,
  type SurfaceSampleKind,
} from '../sampleManager';

const EMOJI_REGEX = /\p{Extended_Pictographic}/u;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

describe('sampleManager (R05 procedural surface samples)', () => {
  it('genera de 4 a 6 muestras deterministas por día/sol y astro respetando valores NASA exactos', () => {
    const moonA = generateTurnSamples('moon-shackleton', 20260415, 1, {
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'moon-shackleton', 20260415),
    });
    const moonB = generateTurnSamples('moon-shackleton', 20260415, 1, {
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'moon-shackleton', 20260415),
    });
    expect(moonA).toEqual(moonB);
    expect(moonA.length).toBeGreaterThanOrEqual(4);
    expect(moonA.length).toBeLessThanOrEqual(6);

    const moonDay2 = generateTurnSamples('moon-shackleton', 20260415, 2);
    expect(moonDay2[0].id).not.toBe(moonA[0].id);

    const moonAltSeed = generateTurnSamples('moon-shackleton', 98765, 1);
    expect(moonAltSeed[0].position).not.toEqual(moonA[0].position);

    const marsA = generateTurnSamples('mars-jezero', 20260415, 1, {
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'mars-jezero', 20260415),
    });
    expect(marsA.length).toBeGreaterThanOrEqual(4);
    expect(marsA.length).toBeLessThanOrEqual(6);

    const moonKinds = new Set(moonA.map((s) => s.kind));
    expect(moonKinds.has('lunar-ice-core')).toBe(true);
    expect(moonKinds.has('lunar-ilmenite-basalt')).toBe(true);
    expect(moonKinds.has('lunar-impact-glass')).toBe(true);

    const marsKinds = new Set(marsA.map((s) => s.kind));
    expect(marsKinds.has('mars-hematite-spherules')).toBe(true);
    expect(marsKinds.has('mars-sulfate-vein')).toBe(true);
    expect(marsKinds.has('mars-biosignature-clay')).toBe(true);

    expect(SAMPLE_CATALOG['lunar-ice-core'].points).toBe(15);
    expect(SAMPLE_CATALOG['lunar-ilmenite-basalt'].points).toBe(10);
    expect(SAMPLE_CATALOG['lunar-impact-glass'].points).toBe(20);
    expect(SAMPLE_CATALOG['mars-hematite-spherules'].points).toBe(15);
    expect(SAMPLE_CATALOG['mars-sulfate-vein'].points).toBe(10);
    expect(SAMPLE_CATALOG['mars-biosignature-clay'].points).toBe(25);
  });

  it('mantiene todas las muestras fuera de módulos, spawn del rover, anomalías y separadas entre sí', () => {
    for (const siteId of ['moon-shackleton', 'mars-jezero'] as const) {
      for (const seed of [20260415, 424242, 771133]) {
        for (let day = 1; day <= 4; day++) {
          const anomalies = generateTurnAnomalies(siteId, seed, day);
          const samples = generateTurnSamples(siteId, seed, day, {
            getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, siteId, seed),
            avoidPositions: anomalies.map((a) => ({
              x: a.position[0],
              z: a.position[2],
              minDist: 4.6,
            })),
          });
          expect(samples.length).toBeGreaterThanOrEqual(4);
          expect(samples.length).toBeLessThanOrEqual(6);

          for (let i = 0; i < samples.length; i++) {
            const s = samples[i];
            expect(Math.abs(s.position[0])).toBeLessThanOrEqual(19.25);
            expect(Math.abs(s.position[2])).toBeLessThanOrEqual(19.25);
            // Fuera del domo central y spawn del rover (11.4, 12.5)
            expect(Math.hypot(s.position[0], s.position[2])).toBeGreaterThanOrEqual(8.2);
            expect(Math.hypot(s.position[0] - 11.4, s.position[2] - 12.5)).toBeGreaterThanOrEqual(4.0);
            for (const a of anomalies) {
              expect(
                Math.hypot(s.position[0] - a.position[0], s.position[2] - a.position[2]),
              ).toBeGreaterThanOrEqual(4.4);
            }
            for (let j = i + 1; j < samples.length; j++) {
              expect(
                Math.hypot(s.position[0] - samples[j].position[0], s.position[2] - samples[j].position[2]),
              ).toBeGreaterThanOrEqual(4.8);
            }
          }
        }
      }
    }
  });

  it('cumple AGENTS.md en todo el catálogo (ES/EN <= 15 palabras, cero emoji, glosario NASA válido)', () => {
    for (const kind of Object.keys(SAMPLE_CATALOG) as SurfaceSampleKind[]) {
      const entry = SAMPLE_CATALOG[kind];
      expect(getGlossaryTerm(entry.glossaryTermId)).toBeTruthy();
      for (const lang of ['es', 'en'] as const) {
        expect(EMOJI_REGEX.test(entry.title[lang])).toBe(false);
        expect(EMOJI_REGEX.test(entry.finding[lang])).toBe(false);
        expect(countWords(entry.finding[lang])).toBeLessThanOrEqual(15);
      }
    }
    const moonSample = generateTurnSamples('moon-shackleton', 100, 1)[0];
    expect(formatSampleBadge(moonSample, 'es')).toBe(`MUESTRA +${moonSample.points} PTS`);
    expect(formatSampleBadge(moonSample, 'en')).toBe(`SAMPLE +${moonSample.points} PTS`);
  });

  it('construye los 6 especímenes 3D con baliza vertical pulsante, findSampleId y dispose limpio', () => {
    const kinds = Object.keys(SAMPLE_CATALOG) as SurfaceSampleKind[];
    kinds.forEach((kind, idx) => {
      const entry = SAMPLE_CATALOG[kind];
      const spec = {
        id: `test-${kind}`,
        kind,
        siteId: entry.siteId,
        day: 1,
        position: [12, 0.4, -8] as [number, number, number],
        points: entry.points,
        code: entry.code,
        title: entry.title,
        finding: entry.finding,
        glossaryTermId: entry.glossaryTermId,
        nasaSource: entry.nasaSource,
        accentHex: entry.accentHex,
      };
      const rt = createSampleVisualRuntime(spec, 0x38bdf8, idx);
      expect(rt.rockGroup.children.length).toBeGreaterThanOrEqual(2);
      expect(rt.beaconBeam.geometry).toBeInstanceOf(THREE.CylinderGeometry);
      expect(rt.beaconDiamond.geometry).toBeInstanceOf(THREE.OctahedronGeometry);
      expect(rt.ring.geometry).toBeInstanceOf(THREE.RingGeometry);
      expect(findSampleId(rt.rockGroup.children[0])).toBe(spec.id);
      expect(findSampleId(rt.beaconDiamond)).toBe(spec.id);

      const beamSpy = vi.spyOn(rt.beaconBeam.geometry, 'dispose');
      const matSpy = vi.spyOn(rt.beaconMat, 'dispose');
      disposeObject3D(rt.group);
      expect(beamSpy).toHaveBeenCalledTimes(1);
      expect(matSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('R06: applySampleCollectToMission suma sciencePoints de forma idempotente y persiste entre turnos', () => {
    const base = createInitialMissionState('moon-shackleton', VERIFIED_NASA_WEATHER_EVENTS[0], 20260415);
    const samples = generateTurnSamples('moon-shackleton', 20260415, 1);
    expect(base.roverSamplesCollected).toBe(0);
    expect(base.collectedSampleIds).toEqual([]);

    const afterFirst = applySampleCollectToMission(base, samples[0]);
    expect(afterFirst.resources.sciencePoints).toBe(base.resources.sciencePoints + samples[0].points);
    expect(afterFirst.roverSamplesCollected).toBe(1);
    expect(afterFirst.roverScienceEarned).toBe(samples[0].points);
    expect(afterFirst.collectedSampleIds).toEqual([samples[0].id]);
    expect(afterFirst.logs[0].nasaTag).toBe('ARTEMIS / LRO');

    // Idempotencia: recolectar el mismo ID no vuelve a sumar
    const afterDuplicate = applySampleCollectToMission(afterFirst, samples[0]);
    expect(afterDuplicate).toBe(afterFirst);

    // Recolectar varias muestras conserva el historial al avanzar de turno
    let accumulated = afterFirst;
    for (const smp of samples.slice(1)) {
      accumulated = applySampleCollectToMission(accumulated, smp);
    }
    const nextTurn = advanceMissionTurn(
      accumulated,
      accumulated.currentDilemma!.choices[0],
      VERIFIED_NASA_WEATHER_EVENTS[0],
      DEFAULT_POWER_ALLOCATION,
    );
    expect(nextTurn.roverSamplesCollected).toBe(samples.length);
    expect(nextTurn.collectedSampleIds).toHaveLength(samples.length);
  });

  it('R06: HUD, TurnReport y CommanderCertificate destacan ciencia del Rover y bonos en ES/EN sin emoji', () => {
    const base = createInitialMissionState('mars-jezero', VERIFIED_NASA_WEATHER_EVENTS[0], 20260415);
    const samples = generateTurnSamples('mars-jezero', 20260415, 1);
    let active = base;
    for (const smp of samples) active = applySampleCollectToMission(active, smp);
    active = { ...active, resources: { ...active.resources, sciencePoints: 90 } };
    const bonus = getScienceBonusTier(active.resources.sciencePoints);
    expect(bonus.tier).toBe(1);

    const projection = projectSystemsTurn(active, DEFAULT_POWER_ALLOCATION);
    const evaluation = evaluateCommanderPerformance(active);

    const hudEs = renderToStaticMarkup(
      React.createElement(ResourcePanel, {
        lang: 'es',
        resources: active.resources,
        allocation: DEFAULT_POWER_ALLOCATION,
        projection,
        hoveredChoice: null,
        pendingEffects: [],
        evaluation,
        onChangeAllocation: () => {},
        onOpenBadgesModal: () => {},
        scienceBonus: bonus,
        roverSamplesCollected: active.roverSamplesCollected,
        roverScienceEarned: active.roverScienceEarned,
      }),
    );
    expect(hudEs).toContain('data-testid="science-bonus-hud"');
    expect(hudEs).toContain(bonus.title.es);
    expect(hudEs).toContain(`Muestras Rover: ${samples.length}`);
    expect(EMOJI_REGEX.test(hudEs)).toBe(false);

    const reportEn = renderToStaticMarkup(
      React.createElement(TurnReport, {
        lang: 'en',
        previous: base.resources,
        current: active.resources,
        logs: active.logs,
        onContinue: () => {},
        scienceBonus: bonus,
        roverSamplesCollected: active.roverSamplesCollected,
        roverScienceEarned: active.roverScienceEarned,
      }),
    );
    expect(reportEn).toContain('data-testid="turn-science-bonus"');
    expect(reportEn).toContain('data-testid="turn-rover-samples"');
    expect(reportEn).toContain(bonus.title.en);
    expect(EMOJI_REGEX.test(reportEn)).toBe(false);

    const certEs = renderToStaticMarkup(
      React.createElement(CommanderCertificate, {
        lang: 'es',
        isOpen: true,
        onClose: () => {},
        evaluation,
        site: OUTPOST_SITES['mars-jezero'],
        currentDay: 4,
        totalDays: 8,
        missionStatus: 'playing',
        onRestartMission: () => {},
        sciencePoints: active.resources.sciencePoints,
        scienceBonus: bonus,
        roverSamplesCollected: active.roverSamplesCollected,
        roverScienceEarned: active.roverScienceEarned,
      }),
    );
    expect(certEs).toContain('data-testid="cert-rover-science"');
    expect(certEs).toContain(`Muestras: ${samples.length}`);
    expect(certEs).toContain(`Ciencia total: ${active.resources.sciencePoints} pts`);
    expect(EMOJI_REGEX.test(certEs)).toBe(false);
  });

  it('S01–S03: regenerar topografía (nueva semilla) preserva ranuras recolectadas (2/N y N/N) y bloquea exploit de ciencia infinita', () => {
    const initialSeed = 20260415;
    const bumpedSeedA = 20260415 + 7919;
    const bumpedSeedB = 20260415 + 7919 * 2;

    const base = createInitialMissionState(
      'moon-shackleton',
      VERIFIED_NASA_WEATHER_EVENTS[0],
      initialSeed,
    );
    const initialSamples = generateTurnSamples('moon-shackleton', initialSeed, 1, {
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'moon-shackleton', initialSeed),
    });
    const maxSol1Science =
      base.resources.sciencePoints + initialSamples.reduce((acc, s) => acc + s.points, 0);

    // 1. Recolectar 2 muestras en Sol 1 y pulsar "Nueva topografía" (bumpedSeedA)
    let stateAfter2 = applySampleCollectToMission(base, initialSamples[0]);
    stateAfter2 = applySampleCollectToMission(stateAfter2, initialSamples[1]);
    expect(stateAfter2.roverSamplesCollected).toBe(2);

    const regenAfter2 = generateTurnSamples('moon-shackleton', bumpedSeedA, 1, {
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'moon-shackleton', bumpedSeedA),
      collectedSampleIds: [
        ...(stateAfter2.collectedSampleIds ?? []),
        ...(stateAfter2.collectedSampleSlots ?? []),
      ],
    });
    expect(regenAfter2).toHaveLength(initialSamples.length);
    // Coordenadas (x, z) cambian con la nueva topografía, pero las ranuras 0 y 1 siguen recolectadas (2/N)
    expect(regenAfter2[0].position).not.toEqual(initialSamples[0].position);
    expect(regenAfter2[0].collected).toBe(true);
    expect(regenAfter2[1].collected).toBe(true);
    expect(regenAfter2.filter((s) => s.collected)).toHaveLength(2);

    // Intentar recolectar de nuevo las ranuras 0 y 1 con los nuevos IDs de topografía NO suma ciencia
    const afterExploitAttemptPartial = applySampleCollectToMission(
      applySampleCollectToMission(stateAfter2, regenAfter2[0]),
      regenAfter2[1],
    );
    expect(afterExploitAttemptPartial.resources.sciencePoints).toBe(
      stateAfter2.resources.sciencePoints,
    );
    expect(afterExploitAttemptPartial.roverSamplesCollected).toBe(2);

    // 2. Completar todas las muestras del Sol 1 (N/N) y volver a pulsar "Nueva topografía" (bumpedSeedB)
    let stateAllCollected = stateAfter2;
    for (const smp of regenAfter2.slice(2)) {
      stateAllCollected = applySampleCollectToMission(stateAllCollected, smp);
    }
    expect(stateAllCollected.resources.sciencePoints).toBe(maxSol1Science);
    expect(stateAllCollected.roverSamplesCollected).toBe(initialSamples.length);

    const regenAfterAll = generateTurnSamples('moon-shackleton', bumpedSeedB, 1, {
      getTerrainHeight: (x, z) => sampleWorldTerrainHeight(x, z, 'moon-shackleton', bumpedSeedB),
      collectedSampleIds: [
        ...(stateAllCollected.collectedSampleIds ?? []),
        ...(stateAllCollected.collectedSampleSlots ?? []),
      ],
    });
    expect(regenAfterAll).toHaveLength(initialSamples.length);
    expect(regenAfterAll.every((s) => s.collected === true)).toBe(true);

    // Intentar recolectar cualquiera de las muestras regeneradas en el mismo Sol mantiene sciencePoints en el máximo del Sol 1
    let stateAfterFullExploitAttempt = stateAllCollected;
    for (const smp of regenAfterAll) {
      stateAfterFullExploitAttempt = applySampleCollectToMission(
        stateAfterFullExploitAttempt,
        smp,
      );
    }
    expect(stateAfterFullExploitAttempt.resources.sciencePoints).toBe(maxSol1Science);
    expect(stateAfterFullExploitAttempt.roverSamplesCollected).toBe(initialSamples.length);
  });
});


