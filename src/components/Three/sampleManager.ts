import * as THREE from 'three';
import type { Language, LocalizedText, OutpostSiteId } from '../../types/mission';

export const SAMPLE_COLLECT_RADIUS = 2.2;
export const SAMPLE_MANUAL_RADIUS = 3.8;
export const SAMPLE_COLLECTION_DURATION = 0.88;

export type SurfaceSampleKind =
  | 'lunar-ice-core'
  | 'lunar-ilmenite-basalt'
  | 'lunar-impact-glass'
  | 'mars-hematite-spherules'
  | 'mars-sulfate-vein'
  | 'mars-biosignature-clay';

export interface SurfaceSampleSpec {
  id: string;
  /** Índice estable de ranura dentro del Sol actual (0 .. N-1), independiente de localSeedBump */
  slotIndex?: number;
  /** ID canónico de ranura por Sol (ej. "sol-1-slot-0"), independiente de la semilla de terreno */
  slotId?: string;
  /** Estado de recolección preservado al cambiar la topografía en el mismo Sol */
  collected?: boolean;
  kind: SurfaceSampleKind;
  siteId: OutpostSiteId;
  day: number;
  position: [number, number, number];
  points: 10 | 15 | 20 | 25;
  code: string;
  title: LocalizedText;
  /** Hallazgo científico breve (<= 15 palabras por idioma) */
  finding: LocalizedText;
  glossaryTermId: string;
  nasaSource: 'ARTEMIS' | 'MARS';
  accentHex: number;
}

export function formatSampleSlotId(day: number, slotIndex: number): string {
  const normDay = Math.max(1, Math.round(day));
  const normSlot = Math.max(0, Math.round(slotIndex));
  return `sol-${normDay}-slot-${normSlot}`;
}

export function formatMissionSampleSlotKey(day: number, slotIndex: number): string {
  const normDay = Math.max(1, Math.round(day));
  const normSlot = Math.max(0, Math.round(slotIndex));
  return `day-${normDay}-slot-${normSlot}`;
}

export function parseSampleDayAndSlot(
  input: Pick<SurfaceSampleSpec, 'id' | 'day' | 'slotIndex' | 'slotId'> | string | null | undefined,
  fallbackDay?: number,
): { day: number; slotIndex: number } | null {
  if (!input) return null;
  if (typeof input === 'object') {
    const day = Math.max(1, Math.round(input.day || fallbackDay || 1));
    if (typeof input.slotIndex === 'number' && Number.isFinite(input.slotIndex)) {
      return { day, slotIndex: Math.max(0, Math.round(input.slotIndex)) };
    }
    if (typeof input.slotId === 'string') {
      const parsedFromSlotId = parseSampleDayAndSlot(input.slotId, day);
      if (parsedFromSlotId) return parsedFromSlotId;
    }
    return parseSampleDayAndSlot(input.id, day);
  }

  const raw = input.trim();
  if (!raw) return null;

  const canonicalMatch = raw.match(/(?:^|-)(?:sol|day)-(\d+)-slot-(\d+)(?:$|-)/i);
  if (canonicalMatch) {
    return {
      day: Math.max(1, Number(canonicalMatch[1])),
      slotIndex: Math.max(0, Number(canonicalMatch[2])),
    };
  }

  const dSlotMatch = raw.match(/-d(\d+)-slot-(\d+)(?:$|-)/i);
  if (dSlotMatch) {
    return {
      day: Math.max(1, Number(dSlotMatch[1])),
      slotIndex: Math.max(0, Number(dSlotMatch[2])),
    };
  }

  const legacyMatch = raw.match(/-d(\d+)-smp(\d+)(?:$|-)/i);
  if (legacyMatch) {
    return {
      day: Math.max(1, Number(legacyMatch[1])),
      slotIndex: Math.max(0, Number(legacyMatch[2]) - 1),
    };
  }

  return null;
}

export function resolveSampleSlotId(
  input: Pick<SurfaceSampleSpec, 'id' | 'day' | 'slotIndex' | 'slotId'> | string | null | undefined,
  fallbackDay?: number,
): string | null {
  const parsed = parseSampleDayAndSlot(input, fallbackDay);
  if (!parsed) return null;
  return formatSampleSlotId(parsed.day, parsed.slotIndex);
}

export function isSampleSlotCollected(
  sample: Pick<SurfaceSampleSpec, 'id' | 'day' | 'slotIndex' | 'slotId' | 'collected'>,
  collectedIdsOrSlots?: Iterable<string | number> | null,
): boolean {
  if (sample.collected) return true;
  if (!collectedIdsOrSlots) return false;

  const targetParsed = parseSampleDayAndSlot(sample, sample.day);
  const targetSlotId = targetParsed
    ? formatSampleSlotId(targetParsed.day, targetParsed.slotIndex)
    : sample.slotId ?? null;
  const targetMissionKey = targetParsed
    ? formatMissionSampleSlotKey(targetParsed.day, targetParsed.slotIndex)
    : null;

  for (const entry of collectedIdsOrSlots) {
    if (typeof entry === 'number') {
      if (targetParsed && entry === targetParsed.slotIndex) return true;
      continue;
    }
    if (typeof entry !== 'string') continue;
    if (
      entry === sample.id ||
      (targetSlotId !== null && entry === targetSlotId) ||
      (targetMissionKey !== null && entry === targetMissionKey)
    ) {
      return true;
    }
    if (targetParsed) {
      const entryParsed = parseSampleDayAndSlot(entry, sample.day);
      if (
        entryParsed &&
        entryParsed.day === targetParsed.day &&
        entryParsed.slotIndex === targetParsed.slotIndex
      ) {
        return true;
      }
    }
  }
  return false;
}

interface SampleCatalogEntry {
  kind: SurfaceSampleKind;
  siteId: OutpostSiteId;
  points: 10 | 15 | 20 | 25;
  code: string;
  title: LocalizedText;
  finding: LocalizedText;
  glossaryTermId: string;
  nasaSource: 'ARTEMIS' | 'MARS';
  accentHex: number;
}

export const SAMPLE_CATALOG: Record<SurfaceSampleKind, SampleCatalogEntry> = {
  'lunar-ice-core': {
    kind: 'lunar-ice-core',
    siteId: 'moon-shackleton',
    points: 15,
    code: 'ICE-15',
    title: {
      es: 'Núcleo de hielo polar',
      en: 'Polar ice core',
    },
    finding: {
      es: 'La misión NASA LCROSS confirmó hielo en cráteres lunares para producir agua y oxígeno.',
      en: 'NASA LCROSS confirmed lunar crater ice exists to make drinking water and oxygen.',
    },
    glossaryTermId: 'shackleton',
    nasaSource: 'ARTEMIS',
    accentHex: 0x00e5ff,
  },
  'lunar-ilmenite-basalt': {
    kind: 'lunar-ilmenite-basalt',
    siteId: 'moon-shackleton',
    points: 10,
    code: 'ILM-10',
    title: {
      es: 'Basalto con ilmenita',
      en: 'Ilmenite-rich basalt',
    },
    finding: {
      es: 'Rocas Apolo mostraron ilmenita rica en titanio útil para extraer oxígeno lunar.',
      en: 'Apollo rocks revealed titanium-rich ilmenite useful for extracting breathable lunar oxygen.',
    },
    glossaryTermId: 'isru',
    nasaSource: 'ARTEMIS',
    accentHex: 0xffb300,
  },
  'lunar-impact-glass': {
    kind: 'lunar-impact-glass',
    siteId: 'moon-shackleton',
    points: 20,
    code: 'VIT-20',
    title: {
      es: 'Regolito vitrificado',
      en: 'Vitrified regolith',
    },
    finding: {
      es: 'Sondas LRO y Apolo hallaron vidrio lunar que conserva historia del viento solar.',
      en: 'Apollo and LRO data show impact glass beads preserve ancient solar wind records.',
    },
    glossaryTermId: 'micrometeorite',
    nasaSource: 'ARTEMIS',
    accentHex: 0x00e5ff,
  },
  'mars-hematite-spherules': {
    kind: 'mars-hematite-spherules',
    siteId: 'mars-jezero',
    points: 15,
    code: 'HEM-15',
    title: {
      es: 'Esférulas de hematita',
      en: 'Hematite concretions',
    },
    finding: {
      es: 'El rover Opportunity encontró esférulas de hematita formadas en antigua agua líquida marciana.',
      en: 'NASA rover Opportunity found hematite spheres formed in ancient liquid Martian water.',
    },
    glossaryTermId: 'jezero',
    nasaSource: 'MARS',
    accentHex: 0xffb300,
  },
  'mars-sulfate-vein': {
    kind: 'mars-sulfate-vein',
    siteId: 'mars-jezero',
    points: 10,
    code: 'SUL-10',
    title: {
      es: 'Vena de sulfato hidratado',
      en: 'Hydrated sulfate vein',
    },
    finding: {
      es: 'El rover Curiosity halló venas de sulfato con agua atrapada en rocas marcianas.',
      en: 'NASA Curiosity found sulfate mineral veins trapping water inside Martian bedrock fractures.',
    },
    glossaryTermId: 'regolith',
    nasaSource: 'MARS',
    accentHex: 0x00e5ff,
  },
  'mars-biosignature-clay': {
    kind: 'mars-biosignature-clay',
    siteId: 'mars-jezero',
    points: 25,
    code: 'BIO-25',
    title: {
      es: 'Testigo de arcilla biofirma',
      en: 'Biosignature clay core',
    },
    finding: {
      es: 'Perseverance perfora arcillas del cráter Jezero buscando señales químicas de vida microbiana antigua.',
      en: 'NASA Perseverance cores Jezero Crater clay searching for ancient Martian biosignature clues.',
    },
    glossaryTermId: 'jezero',
    nasaSource: 'MARS',
    accentHex: 0xffb300,
  },
};

export interface GenerateTurnSamplesOptions {
  getTerrainHeight?: (x: number, z: number) => number;
  avoidPositions?: ReadonlyArray<{ x: number; z: number; minDist?: number }>;
  /** IDs o ranuras ya recolectadas para preservar collected: true al regenerar topografía */
  collectedSampleIds?: ReadonlyArray<string>;
  collectedSlots?: ReadonlyArray<string | number>;
}

const DEFAULT_KEEP_OUT_ZONES: ReadonlyArray<{ x: number; z: number; r: number }> = [
  { x: 0, z: 0, r: 8.4 }, // oxygen-module dome
  { x: -13, z: 4, r: 7.5 }, // power-grid array
  { x: 12.5, z: 3, r: 6.5 }, // greenhouse wing
  { x: -6, z: -13, r: 4.8 }, // comms-array pad
  { x: 9, z: 12.5, r: 5.0 }, // rover home depot
  { x: 11.4, z: 12.5, r: 4.2 }, // rover spawn position
  { x: 4.8, z: 8.8, r: 2.8 }, // airlock spur
];

function createSamplePrng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTurnSamples(
  siteId: OutpostSiteId | undefined,
  terrainSeed = 20260415,
  day = 1,
  options: GenerateTurnSamplesOptions = {},
): SurfaceSampleSpec[] {
  const normSite: OutpostSiteId = siteId === 'mars-jezero' ? 'mars-jezero' : 'moon-shackleton';
  const isMars = normSite === 'mars-jezero';
  const normSeed = (Math.abs(Math.round(terrainSeed)) || 20260415) >>> 0;
  const normDay = Math.max(1, Math.round(day));

  // El número de ranuras (4..6) y los tipos de muestra dependen solo del astro y Sol/Día actual,
  // manteniéndose estables aunque el jugador pulse "Nueva topografía" (localSeedBump / reseedTerrain).
  const daySlotSeed =
    (Math.imul(normDay, 0x85ebca6b) ^ (isMars ? 0xc2b2ae35 : 0x27d4eb2f)) >>> 0;
  const slotRng = createSamplePrng(daySlotSeed);

  // Las coordenadas (x, z) en la superficie sí se recalculan con la semilla de topografía activa.
  const posPrngSeed =
    (normSeed ^
      Math.imul(normDay, 0x85ebca6b) ^
      (isMars ? 0xc2b2ae35 : 0x27d4eb2f)) >>>
    0;
  const rng = createSamplePrng(posPrngSeed);

  const siteKinds: SurfaceSampleKind[] = isMars
    ? ['mars-hematite-spherules', 'mars-sulfate-vein', 'mars-biosignature-clay']
    : ['lunar-ice-core', 'lunar-ilmenite-basalt', 'lunar-impact-glass'];

  const sampleCount = 4 + Math.floor(slotRng() * 3); // 4..6 samples per Day/Sol
  const kindsQueue: SurfaceSampleKind[] = [...siteKinds];
  while (kindsQueue.length < sampleCount) {
    kindsQueue.push(siteKinds[Math.floor(slotRng() * siteKinds.length)]);
  }
  for (let i = kindsQueue.length - 1; i > 0; i--) {
    const j = Math.floor(slotRng() * (i + 1));
    [kindsQueue[i], kindsQueue[j]] = [kindsQueue[j], kindsQueue[i]];
  }

  const baseAngle = rng() * Math.PI * 2;
  const extraAvoid = options.avoidPositions ?? [];
  const collectedEntries: Array<string | number> = [
    ...(options.collectedSampleIds ?? []),
    ...(options.collectedSlots ?? []),
  ];
  const placed: Array<{ x: number; z: number }> = [];
  const specs: SurfaceSampleSpec[] = [];

  const safeFallbacks: ReadonlyArray<[number, number]> = [
    [-17.2, -16.8],
    [16.8, -16.5],
    [-17.8, 16.5],
    [17.5, -3.5],
    [-1.5, -18.2],
    [1.8, 17.8],
  ];

  for (let slot = 0; slot < sampleCount; slot++) {
    const kind = kindsQueue[slot];
    const entry = SAMPLE_CATALOG[kind];
    const fb = safeFallbacks[slot % safeFallbacks.length];
    let chosenX = fb[0];
    let chosenZ = fb[1];

    const sectorAngle = baseAngle + (slot / sampleCount) * Math.PI * 2;
    for (let attempt = 0; attempt < 72; attempt++) {
      const a =
        attempt < 28
          ? sectorAngle + attempt * 0.27 + (rng() - 0.5) * 0.45
          : rng() * Math.PI * 2;
      const radial =
        attempt < 28
          ? 10.5 + ((attempt * 1.45 + rng() * 9.5) % 10.0)
          : 9.8 + rng() * 11.4;
      const candX = Math.max(-19.2, Math.min(19.2, Math.cos(a) * radial));
      const candZ = Math.max(-19.2, Math.min(19.2, Math.sin(a) * radial));

      let valid = true;
      for (const zone of DEFAULT_KEEP_OUT_ZONES) {
        if (Math.hypot(candX - zone.x, candZ - zone.z) < zone.r) {
          valid = false;
          break;
        }
      }
      if (valid) {
        for (const extra of extraAvoid) {
          if (Math.hypot(candX - extra.x, candZ - extra.z) < (extra.minDist ?? 4.6)) {
            valid = false;
            break;
          }
        }
      }
      if (valid) {
        for (const prev of placed) {
          if (Math.hypot(candX - prev.x, candZ - prev.z) < 5.0) {
            valid = false;
            break;
          }
        }
      }

      if (valid) {
        chosenX = candX;
        chosenZ = candZ;
        break;
      }
    }

    placed.push({ x: chosenX, z: chosenZ });
    const groundY = options.getTerrainHeight ? options.getTerrainHeight(chosenX, chosenZ) : 0;
    const slotId = formatSampleSlotId(normDay, slot);
    const id = `${normSite}-s${normSeed}-d${normDay}-smp${slot + 1}-${kind}`;
    const alreadyCollected =
      collectedEntries.length > 0 &&
      isSampleSlotCollected(
        { id, day: normDay, slotIndex: slot, slotId },
        collectedEntries,
      );

    specs.push({
      id,
      slotIndex: slot,
      slotId,
      collected: alreadyCollected,
      kind,
      siteId: normSite,
      day: normDay,
      position: [
        Number(chosenX.toFixed(2)),
        Number(groundY.toFixed(2)),
        Number(chosenZ.toFixed(2)),
      ],
      points: entry.points,
      code: entry.code,
      title: entry.title,
      finding: entry.finding,
      glossaryTermId: entry.glossaryTermId,
      nasaSource: entry.nasaSource,
      accentHex: entry.accentHex,
    });
  }

  return specs;
}

export function findSampleId(obj: THREE.Object3D | null): string | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    const id = cur.userData?.sampleId as string | undefined;
    if (id) return id;
    cur = cur.parent;
  }
  return null;
}

export function formatSampleBadge(spec: SurfaceSampleSpec, lang: Language): string {
  return lang === 'es'
    ? `MUESTRA +${spec.points} PTS`
    : `SAMPLE +${spec.points} PTS`;
}

export interface SampleVisualRuntime {
  spec: SurfaceSampleSpec;
  group: THREE.Group;
  rockGroup: THREE.Group;
  beaconBeam: THREE.Mesh;
  beaconDiamond: THREE.Mesh;
  ring: THREE.Mesh;
  beaconMat: THREE.MeshBasicMaterial;
  diamondMat: THREE.MeshStandardMaterial;
  ringMat: THREE.MeshBasicMaterial;
  collected: boolean;
  animPhase: number;
}

function makeSpecimenPart(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  wireColor: number,
  opts?: {
    pos?: [number, number, number];
    rot?: [number, number, number];
    scale?: [number, number, number];
    emissive?: number;
    emissiveIntensity?: number;
    opacity?: number;
    metalness?: number;
    roughness?: number;
  },
): THREE.Mesh {
  const transparent = opts?.opacity !== undefined && opts.opacity < 1;
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts?.roughness ?? 0.62,
    metalness: opts?.metalness ?? 0.18,
    emissive: opts?.emissive ?? 0x000000,
    emissiveIntensity: opts?.emissiveIntensity ?? 0,
    transparent,
    opacity: opts?.opacity ?? 1,
    flatShading: true,
    depthWrite: !transparent,
  });
  const mesh = new THREE.Mesh(geometry, mat);
  if (opts?.pos) mesh.position.set(...opts.pos);
  if (opts?.rot) mesh.rotation.set(...opts.rot);
  if (opts?.scale) mesh.scale.set(...opts.scale);
  mesh.castShadow = !transparent;
  mesh.receiveShadow = true;

  const edges = new THREE.EdgesGeometry(geometry, 24);
  const wire = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({
      color: wireColor,
      transparent: true,
      opacity: 0.48,
    }),
  );
  wire.raycast = () => undefined;
  mesh.add(wire);
  parent.add(mesh);
  return mesh;
}

export function createSampleVisualRuntime(
  spec: SurfaceSampleSpec,
  wireTint: number,
  phaseIndex = 0,
): SampleVisualRuntime {
  const group = new THREE.Group();
  group.name = `sample-${spec.id}`;
  group.position.set(...spec.position);

  const rockGroup = new THREE.Group();
  rockGroup.name = `sample-rock-${spec.id}`;
  group.add(rockGroup);

  switch (spec.kind) {
    case 'lunar-ice-core': {
      makeSpecimenPart(rockGroup, new THREE.DodecahedronGeometry(0.46, 0), 0x475569, wireTint, {
        pos: [0, 0.14, 0],
        scale: [1.35, 0.5, 1.15],
        roughness: 0.9,
      });
      for (const [cx, cz, h, tilt] of [
        [0, 0, 0.88, 0.08],
        [-0.22, 0.16, 0.64, -0.28],
        [0.24, -0.14, 0.72, 0.25],
      ] as Array<[number, number, number, number]>) {
        makeSpecimenPart(
          rockGroup,
          new THREE.CylinderGeometry(0.11, 0.17, h, 6),
          0x7dd3fc,
          0x00e5ff,
          {
            pos: [cx, 0.22 + h * 0.42, cz],
            rot: [tilt, cx * 2.5, -tilt * 0.7],
            emissive: 0x00e5ff,
            emissiveIntensity: 0.48,
            opacity: 0.88,
            roughness: 0.18,
          },
        );
      }
      break;
    }

    case 'lunar-ilmenite-basalt': {
      makeSpecimenPart(rockGroup, new THREE.DodecahedronGeometry(0.56, 0), 0x334155, wireTint, {
        pos: [0, 0.26, 0],
        scale: [1.35, 0.74, 1.05],
        roughness: 0.85,
      });
      for (const [cx, cy, cz, rx, ry] of [
        [-0.18, 0.56, 0.12, 0.4, 0.6],
        [0.2, 0.52, -0.14, -0.35, 1.1],
        [0.05, 0.62, 0.22, 0.2, -0.5],
      ] as Array<[number, number, number, number, number]>) {
        makeSpecimenPart(rockGroup, new THREE.BoxGeometry(0.24, 0.24, 0.24), 0xfbbf24, 0xffb300, {
          pos: [cx, cy, cz],
          rot: [rx, ry, 0.2],
          emissive: 0xffb300,
          emissiveIntensity: 0.36,
          metalness: 0.72,
          roughness: 0.25,
        });
      }
      break;
    }

    case 'lunar-impact-glass': {
      makeSpecimenPart(rockGroup, new THREE.CylinderGeometry(0.56, 0.7, 0.2, 9), 0x4b5563, wireTint, {
        pos: [0, 0.1, 0],
        roughness: 0.92,
      });
      makeSpecimenPart(rockGroup, new THREE.IcosahedronGeometry(0.32, 0), 0x0f172a, 0x00e5ff, {
        pos: [0, 0.42, 0],
        emissive: 0x0284c7,
        emissiveIntensity: 0.52,
        metalness: 0.55,
        roughness: 0.15,
      });
      for (const [cx, cz, rz] of [
        [-0.28, 0.12, 0.45],
        [0.26, -0.18, -0.4],
        [0.08, 0.28, 0.3],
      ] as Array<[number, number, number]>) {
        makeSpecimenPart(rockGroup, new THREE.TetrahedronGeometry(0.22, 0), 0x38bdf8, 0xe0f2fe, {
          pos: [cx, 0.36, cz],
          rot: [rz * 0.6, cx * 3, rz],
          emissive: 0x00e5ff,
          emissiveIntensity: 0.45,
          opacity: 0.9,
        });
      }
      break;
    }

    case 'mars-hematite-spherules': {
      makeSpecimenPart(rockGroup, new THREE.DodecahedronGeometry(0.55, 0), 0xb45339, wireTint, {
        pos: [0, 0.22, 0],
        scale: [1.3, 0.6, 1.15],
        roughness: 0.92,
      });
      for (const [bx, by, bz] of [
        [-0.22, 0.46, 0.16],
        [0.2, 0.48, 0.12],
        [0, 0.55, -0.05],
        [-0.08, 0.44, -0.22],
        [0.25, 0.4, -0.18],
      ] as Array<[number, number, number]>) {
        makeSpecimenPart(rockGroup, new THREE.SphereGeometry(0.14, 10, 8), 0x475569, 0xffb300, {
          pos: [bx, by, bz],
          emissive: 0xd97706,
          emissiveIntensity: 0.32,
          metalness: 0.68,
          roughness: 0.28,
        });
      }
      break;
    }

    case 'mars-sulfate-vein': {
      makeSpecimenPart(rockGroup, new THREE.DodecahedronGeometry(0.5, 0), 0x9a3412, wireTint, {
        pos: [0, 0.2, 0],
        scale: [1.35, 0.56, 1.05],
        roughness: 0.92,
      });
      for (const [vx, vz, ry, h] of [
        [0, 0, 0.25, 0.72],
        [-0.14, 0.1, 1.25, 0.56],
        [0.16, -0.08, -0.7, 0.62],
      ] as Array<[number, number, number, number]>) {
        makeSpecimenPart(rockGroup, new THREE.BoxGeometry(0.66, h, 0.11), 0xe0f2fe, 0x00e5ff, {
          pos: [vx, 0.24 + h * 0.36, vz],
          rot: [0.08, ry, -0.06],
          emissive: 0x00e5ff,
          emissiveIntensity: 0.44,
          opacity: 0.92,
          roughness: 0.24,
        });
      }
      break;
    }

    case 'mars-biosignature-clay': {
      makeSpecimenPart(rockGroup, new THREE.CylinderGeometry(0.56, 0.68, 0.24, 10), 0x8d4026, wireTint, {
        pos: [0, 0.12, 0],
        roughness: 0.9,
      });
      makeSpecimenPart(rockGroup, new THREE.CylinderGeometry(0.28, 0.34, 0.52, 10), 0xd97706, 0xffb300, {
        pos: [0, 0.44, 0],
        emissive: 0xd97706,
        emissiveIntensity: 0.34,
        roughness: 0.7,
      });
      makeSpecimenPart(rockGroup, new THREE.TorusGeometry(0.26, 0.065, 6, 14), 0xfef08a, 0xffb300, {
        pos: [0, 0.66, 0],
        rot: [Math.PI / 2, 0, 0],
        emissive: 0xffb300,
        emissiveIntensity: 0.58,
      });
      break;
    }
  }

  // Baliza técnica vertical pulsante (cian/ámbar) visible durante la conducción
  const beaconMat = new THREE.MeshBasicMaterial({
    color: spec.accentHex,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    fog: false,
  });
  const beaconBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.11, 3.8, 10, 1, true),
    beaconMat,
  );
  beaconBeam.name = `sample-beacon-beam-${spec.id}`;
  beaconBeam.position.set(0, 1.98, 0);
  beaconBeam.raycast = () => undefined;
  group.add(beaconBeam);

  const diamondMat = new THREE.MeshStandardMaterial({
    color: spec.accentHex,
    emissive: spec.accentHex,
    emissiveIntensity: 0.95,
    roughness: 0.22,
    fog: false,
  });
  const beaconDiamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.27, 0), diamondMat);
  beaconDiamond.name = `sample-beacon-diamond-${spec.id}`;
  beaconDiamond.position.set(0, 3.95, 0);
  group.add(beaconDiamond);

  const ringMat = new THREE.MeshBasicMaterial({
    color: spec.accentHex,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.12, 1.4, 28), ringMat);
  ring.name = `sample-ring-${spec.id}`;
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.08;
  ring.raycast = () => undefined;
  group.add(ring);

  group.userData.sampleId = spec.id;
  group.traverse((o) => {
    o.userData.sampleId = spec.id;
  });

  return {
    spec,
    group,
    rockGroup,
    beaconBeam,
    beaconDiamond,
    ring,
    beaconMat,
    diamondMat,
    ringMat,
    collected: Boolean(spec.collected),
    animPhase: phaseIndex * 1.15,
  };
}
