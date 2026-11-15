import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { getGlossaryTerm } from '../../../data/nasa-datasets';
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
});
