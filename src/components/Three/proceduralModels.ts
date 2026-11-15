import * as THREE from 'three';
import type { Language, LocalizedText, OutpostSiteId, SpaceWeatherEvent } from '../../types/mission';

export type Model3DId = 'colony-base' | 'rover-moxie' | 'habitat-shield' | 'planet-globe';

export type ColonyModule3DId = 'solar' | 'eclss' | 'shielding' | 'greenhouse' | 'comms';

export interface ModelHotspot3D {
  id: string;
  label: LocalizedText;
  /** Máximo 15 palabras por idioma */
  explanation: LocalizedText;
  focusTarget: [number, number, number];
  cameraPos: [number, number, number];
}

export interface Model3DStateOptions {
  siteId?: OutpostSiteId;
  powerPercent?: number;
  lifeSupportPercent?: number;
  shieldingPercent?: number;
  foodPercent?: number;
  solarAllocPercent?: number;
  shieldingAllocPercent?: number;
  weatherType?: SpaceWeatherEvent['type'];
  isDustStorm?: boolean;
  isSolarStorm?: boolean;
  isRimShadowPass?: boolean;
  isLowPowerBlackout?: boolean;
  isGreenhouseWilted?: boolean;
  selectedModule?: ColonyModule3DId;
}

export interface ProceduralModelHandle {
  group: THREE.Group;
  defaultTarget: [number, number, number];
  defaultCameraPos: [number, number, number];
  updateState?: (next: Model3DStateOptions) => void;
  animate?: (elapsedSec: number, dtSec: number) => void;
}

/**
 * Catálogo explícito de archivos `.glb`/`.gltf` disponibles en `public/models/`.
 * Mantener vacío mientras se use geometría CAD procedural para evitar peticiones 404.
 * Al agregar un modelo real en `public/models/<nombre>.glb`, basta declararlo aquí.
 */
export const EXTERNAL_GLB_ASSETS: Partial<Record<Model3DId, string>> = {};

export function resolveExternalModelUrl(
  modelId: Model3DId,
  explicitGlbFile?: string,
  baseUrlOverride?: string,
): string | null {
  const file = (explicitGlbFile ?? EXTERNAL_GLB_ASSETS[modelId] ?? '').trim();
  if (!file) return null;
  if (/^https?:\/\//i.test(file) || file.startsWith('data:')) {
    return file;
  }
  const rawBase =
    baseUrlOverride ??
    (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL
      : './');
  const normalizedBase = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;
  const cleanFile = file.replace(/^\/+/, '').replace(/^models\//, '');
  return `${normalizedBase}models/${cleanFile}`;
}

export const HARDWARE_MODEL_HOTSPOTS: Record<'rover-moxie' | 'habitat-shield', ModelHotspot3D[]> = {
  'rover-moxie': [
    {
      id: 'moxie-unit',
      label: { es: 'Reactor MOXIE', en: 'MOXIE Reactor' },
      explanation: {
        es: 'Toma CO₂ marciano y lo calienta a 800 °C para producir oxígeno puro respirable.',
        en: 'Draws Martian CO₂ and heats it to 800 °C to produce breathable oxygen.',
      },
      focusTarget: [0.0, 0.72, 0.0],
      cameraPos: [2.2, 2.0, 2.3],
    },
    {
      id: 'optical-mast',
      label: { es: 'Mástil SuperCam', en: 'SuperCam Mast' },
      explanation: {
        es: 'Dispara láseres a rocas lejanas e inspecciona minerales del Cráter Jezero sin perforar.',
        en: 'Fires lasers at distant rocks and analyzes Jezero Crater minerals before drilling.',
      },
      focusTarget: [0.72, 1.5, 0.48],
      cameraPos: [2.6, 2.2, 2.5],
    },
    {
      id: 'rocker-bogie',
      label: { es: 'Ruedas y brazo', en: 'Wheels & Arm' },
      explanation: {
        es: 'Seis ruedas metálicas con suspensión articulada superan piedras de hasta medio metro.',
        en: 'Six metal wheels with rocker-bogie suspension climb rocks half a meter tall.',
      },
      focusTarget: [-0.25, 0.35, 0.75],
      cameraPos: [-2.6, 1.35, 2.8],
    },
  ],
  'habitat-shield': [
    {
      id: 'regolith-shell',
      label: { es: 'Capa de regolito', en: 'Regolith Shield' },
      explanation: {
        es: 'Suelo lunar o marciano compactado frena impactos y reduce la radiación solar extrema.',
        en: 'Compacted lunar or Martian soil blocks impacts and cuts extreme solar radiation.',
      },
      focusTarget: [0.0, 1.32, -0.3],
      cameraPos: [2.9, 2.45, 2.9],
    },
    {
      id: 'water-jacket',
      label: { es: 'Muro de agua H₂O', en: 'H₂O Water Jacket' },
      explanation: {
        es: 'El hidrógeno del agua reciclada desvía protones energéticos solares mejor que el plomo.',
        en: 'Hydrogen in recycled water deflects high-energy solar protons better than heavy lead.',
      },
      focusTarget: [0.55, 0.92, 0.15],
      cameraPos: [2.4, 1.85, 2.55],
    },
    {
      id: 'pressurized-core',
      label: { es: 'Cabina ECLSS', en: 'ECLSS Cabin' },
      explanation: {
        es: 'Núcleo presurizado con reciclaje del 98 % de agua y control térmico de tripulación.',
        en: 'Pressurized crew core with 98% water recycling and active thermal control.',
      },
      focusTarget: [-0.25, 0.48, 0.5],
      cameraPos: [-2.3, 1.45, 2.85],
    },
  ],
};

function makeCadMaterial(
  color: number,
  wireColor: number,
  opts?: {
    opacity?: number;
    emissive?: number;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
  },
): { solidMat: THREE.MeshStandardMaterial; edgeMat: THREE.LineBasicMaterial } {
  const transparent = opts?.opacity !== undefined && opts.opacity < 1;
  const solidMat = new THREE.MeshStandardMaterial({
    color,
    roughness: opts?.roughness ?? 0.56,
    metalness: opts?.metalness ?? 0.22,
    transparent,
    opacity: opts?.opacity ?? 1,
    emissive: opts?.emissive ?? 0x000000,
    emissiveIntensity: opts?.emissiveIntensity ?? 0,
    flatShading: true,
    depthWrite: !transparent,
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: wireColor,
    transparent: true,
    opacity: transparent ? 0.65 : 0.45,
  });
  return { solidMat, edgeMat };
}

function addCadMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  wireColor: number,
  opts?: {
    pos?: [number, number, number];
    rot?: [number, number, number];
    scale?: [number, number, number];
    opacity?: number;
    emissive?: number;
    emissiveIntensity?: number;
    edgeThreshold?: number;
    moduleId?: ColonyModule3DId;
    name?: string;
  },
): THREE.Mesh {
  const { solidMat, edgeMat } = makeCadMaterial(color, wireColor, opts);
  const mesh = new THREE.Mesh(geometry, solidMat);
  if (opts?.pos) mesh.position.set(...opts.pos);
  if (opts?.rot) mesh.rotation.set(...opts.rot);
  if (opts?.scale) mesh.scale.set(...opts.scale);
  if (opts?.moduleId) mesh.userData.moduleId = opts.moduleId;
  if (opts?.name) mesh.name = opts.name;

  const edges = new THREE.EdgesGeometry(geometry, opts?.edgeThreshold ?? 22);
  const line = new THREE.LineSegments(edges, edgeMat);
  line.raycast = () => undefined;
  mesh.add(line);

  parent.add(mesh);
  return mesh;
}

function tagModuleTree(root: THREE.Object3D, moduleId: ColonyModule3DId): void {
  root.userData.moduleId = moduleId;
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.userData.moduleId = moduleId;
    }
  });
}

function createParticleField(count: number, boundsX: number, boundsY: number, boundsZ: number, color: number): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    // Determinista pseudo-aleatorio para evitar variación brusca entre montajes
    const s1 = Math.sin(i * 12.9898) * 43758.5453;
    const s2 = Math.sin(i * 78.233) * 43758.5453;
    const s3 = Math.sin(i * 45.164) * 43758.5453;
    const f1 = s1 - Math.floor(s1);
    const f2 = s2 - Math.floor(s2);
    const f3 = s3 - Math.floor(s3);
    positions[i * 3] = (f1 - 0.5) * boundsX;
    positions[i * 3 + 1] = 0.25 + f2 * boundsY;
    positions[i * 3 + 2] = (f3 - 0.5) * boundsZ;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color,
    size: 0.11,
    transparent: true,
    opacity: 0.78,
  });
  const points = new THREE.Points(geo, mat);
  points.raycast = () => undefined;
  return points;
}

function buildColonyBase(options: Model3DStateOptions): ProceduralModelHandle {
  const group = new THREE.Group();
  const isLunar = (options.siteId ?? 'moon-shackleton') === 'moon-shackleton';
  const wireTint = isLunar ? 0x93c5fd : 0xfdba74;
  const terrainColor = isLunar ? 0x263850 : 0x5d2d1d;
  const hullColor = isLunar ? 0xe8e2d5 : 0xf2ebdd;
  const accentColor = isLunar ? 0x0b3d91 : 0xfc3d21;

  // 1. Terreno craterizado con malla topográfica CAD
  const terrainGeo = new THREE.PlaneGeometry(13.5, 9.5, 28, 20);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const radial = Math.sqrt(x * x + z * z);
    const craterRim = Math.exp(-Math.pow((radial - 5.2) / 1.35, 2)) * (isLunar ? 0.65 : 0.42);
    const smallBasin = -Math.exp(-((x - 3.6) ** 2 + (z + 2.4) ** 2) / 1.2) * 0.28;
    const mesa = !isLunar ? Math.max(0, Math.sin(x * 0.45) * Math.cos(z * 0.55) * 0.22) : 0;
    const flatCenter = radial < 4.3 ? 0.12 : 1.0;
    posAttr.setY(i, (craterRim + smallBasin + mesa) * flatCenter);
  }
  terrainGeo.computeVertexNormals();
  const terrainMat = new THREE.MeshStandardMaterial({
    color: terrainColor,
    roughness: 0.9,
    metalness: 0.08,
    flatShading: true,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  group.add(terrainMesh);

  const gridHelper = new THREE.GridHelper(13, 18, wireTint, isLunar ? 0x1e3552 : 0x452014);
  gridHelper.position.y = 0.02;
  group.add(gridHelper);

  // 2. Domo Central Presurizado + Módulos ECLSS + Túneles
  const eclssGroup = new THREE.Group();
  addCadMesh(
    eclssGroup,
    new THREE.CylinderGeometry(1.75, 1.88, 0.24, 16),
    0x334155,
    wireTint,
    { pos: [0, 0.12, 0] },
  );
  addCadMesh(
    eclssGroup,
    new THREE.SphereGeometry(1.52, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52),
    hullColor,
    wireTint,
    { pos: [0, 0.22, 0] },
  );
  // Esclusa delantera
  addCadMesh(eclssGroup, new THREE.BoxGeometry(0.68, 0.62, 0.85), 0x475569, wireTint, {
    pos: [0, 0.4, 1.62],
  });
  // Tanques de oxígeno y agua reciclada ECLSS (o reactor MOXIE en Marte)
  addCadMesh(eclssGroup, new THREE.CylinderGeometry(0.24, 0.24, 1.05, 12), 0x0b3d91, wireTint, {
    pos: [-1.1, 0.65, -0.9],
  });
  addCadMesh(
    eclssGroup,
    new THREE.CylinderGeometry(0.24, 0.24, 1.05, 12),
    isLunar ? 0x0b3d91 : 0xd97706,
    wireTint,
    { pos: [-0.55, 0.65, -1.2] },
  );
  // Ventanas iluminadas del hábitat (se apagan si power < 15)
  const portholes: THREE.Mesh[] = [];
  for (const angle of [-0.55, 0.55, 2.3, -2.3]) {
    const winMesh = addCadMesh(
      eclssGroup,
      new THREE.BoxGeometry(0.32, 0.22, 0.12),
      0xf8f3e8,
      0x1b1f2a,
      {
        pos: [Math.sin(angle) * 1.48, 0.68, Math.cos(angle) * 1.48],
        rot: [0, angle, 0],
        emissive: 0xfef08a,
        emissiveIntensity: 0.7,
      },
    );
    portholes.push(winMesh);
  }
  tagModuleTree(eclssGroup, 'eclss');
  group.add(eclssGroup);

  // 3. Domo Exterior Protector de Agua y Regolito (Shielding)
  const shieldingGroup = new THREE.Group();
  const shieldShellMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.25,
    transparent: true,
    opacity: 0.2,
    roughness: 0.25,
    metalness: 0.4,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shieldDomeGeo = new THREE.SphereGeometry(2.08, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
  const shieldDomeMesh = new THREE.Mesh(shieldDomeGeo, shieldShellMat);
  shieldDomeMesh.position.y = 0.14;
  shieldDomeMesh.userData.moduleId = 'shielding';
  shieldingGroup.add(shieldDomeMesh);

  const shieldWireGeo = new THREE.EdgesGeometry(shieldDomeGeo, 1);
  const shieldWireMat = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.65,
  });
  const shieldWire = new THREE.LineSegments(shieldWireGeo, shieldWireMat);
  shieldWire.raycast = () => undefined;
  shieldDomeMesh.add(shieldWire);

  // Anillo protector de sacos de regolito
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.3;
    if (Math.abs(Math.sin(a) - 1) < 0.22) continue;
    addCadMesh(shieldingGroup, new THREE.BoxGeometry(0.65, 0.36, 0.35), 0x64748b, wireTint, {
      pos: [Math.cos(a) * 2.25, 0.18, Math.sin(a) * 2.25],
      rot: [0, -a + Math.PI / 2, 0],
      moduleId: 'shielding',
    });
  }
  tagModuleTree(shieldingGroup, 'shielding');
  group.add(shieldingGroup);

  // 4. Granja Solar Rotatoria y Banco de Baterías (Solar)
  const solarGroup = new THREE.Group();
  solarGroup.position.set(-3.9, 0, 0.35);

  // Túnel/conducto de potencia al núcleo
  addCadMesh(group, new THREE.CylinderGeometry(0.11, 0.11, 2.35, 8), 0x475569, wireTint, {
    pos: [-2.75, 0.14, 0.15],
    rot: [0, 0, Math.PI / 2],
    moduleId: 'solar',
  });

  // Torreta soporte + banco de baterías
  addCadMesh(solarGroup, new THREE.CylinderGeometry(0.14, 0.2, 1.55, 8), 0x94a3b8, wireTint, {
    pos: [0, 0.78, 0],
  });
  const batteryBarMesh = addCadMesh(
    solarGroup,
    new THREE.BoxGeometry(1.15, 0.42, 0.68),
    0x2e7d4f,
    wireTint,
    {
      pos: [0, 0.22, 0.72],
      emissive: 0x2e7d4f,
      emissiveIntensity: 0.35,
    },
  );

  // Alas solares articuladas
  const solarWingPivot = new THREE.Group();
  solarWingPivot.position.set(0, 1.48, 0);
  addCadMesh(solarWingPivot, new THREE.BoxGeometry(2.6, 0.07, 0.95), 0x1e3a8a, 0x93c5fd, {
    emissive: 0x0b3d91,
    emissiveIntensity: 0.25,
  });
  solarGroup.add(solarWingPivot);
  tagModuleTree(solarGroup, 'solar');
  group.add(solarGroup);

  // 5. Invernadero Hidropónico Veggie + Túnel Conector + Micro-Rover (Greenhouse)
  const greenhouseGroup = new THREE.Group();
  greenhouseGroup.position.set(3.65, 0, 0.2);

  // Túnel presurizado que conecta el domo central con el invernadero
  addCadMesh(group, new THREE.CylinderGeometry(0.28, 0.28, 2.0, 10), hullColor, wireTint, {
    pos: [2.32, 0.32, 0.1],
    rot: [0, 0, Math.PI / 2],
    moduleId: 'greenhouse',
  });

  addCadMesh(greenhouseGroup, new THREE.BoxGeometry(2.2, 0.22, 1.35), 0x334155, wireTint, {
    pos: [0, 0.11, 0],
  });
  const cropLightMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d4f,
    emissive: 0x2e7d4f,
    emissiveIntensity: 0.5,
    roughness: 0.4,
  });
  const cropBedsMesh = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.28, 0.85), cropLightMat);
  cropBedsMesh.position.set(0, 0.34, 0);
  cropBedsMesh.userData.moduleId = 'greenhouse';
  greenhouseGroup.add(cropBedsMesh);

  // Cúpula translúcida del invernadero
  addCadMesh(
    greenhouseGroup,
    new THREE.CylinderGeometry(0.66, 0.66, 2.15, 10, 1, false, 0, Math.PI),
    0xdbeafe,
    0x38bdf8,
    {
      pos: [0, 0.22, 0],
      rot: [0, 0, Math.PI / 2],
      opacity: 0.28,
    },
  );
  tagModuleTree(greenhouseGroup, 'greenhouse');
  group.add(greenhouseGroup);

  // 6. Antena de Comunicaciones DSN (Comms)
  const commsGroup = new THREE.Group();
  commsGroup.position.set(-1.95, 0, -2.05);
  addCadMesh(commsGroup, new THREE.CylinderGeometry(0.08, 0.14, 1.35, 8), 0xcbd5e1, wireTint, {
    pos: [0, 0.68, 0],
  });
  const dishPivot = new THREE.Group();
  dishPivot.position.set(0, 1.35, 0);
  addCadMesh(
    dishPivot,
    new THREE.CylinderGeometry(0.58, 0.12, 0.28, 12, 1, false),
    hullColor,
    wireTint,
    { rot: [Math.PI * 0.28, 0, 0] },
  );
  const beaconMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 0.9,
  });
  const beaconTip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), beaconMat);
  beaconTip.position.set(0, 0.34, 0.22);
  dishPivot.add(beaconTip);
  commsGroup.add(dishPivot);
  tagModuleTree(commsGroup, 'comms');
  group.add(commsGroup);

  // 7. Anillo indicador de selección en el suelo
  const selectionRingMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const selectionRing = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.28, 28), selectionRingMat);
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.04;
  selectionRing.raycast = () => undefined;
  group.add(selectionRing);

  // 8. Nube de partículas ambientales (Tormenta de polvo o tormenta solar)
  const stormParticles = createParticleField(180, 12.5, 3.6, 8.5, 0xfdba74);
  stormParticles.visible = false;
  group.add(stormParticles);

  const solarParticles = createParticleField(120, 10.5, 4.2, 8.0, 0xfc3d21);
  solarParticles.visible = false;
  group.add(solarParticles);

  let targetSolarTilt = 0.25;

  const updateState = (next: Model3DStateOptions) => {
    const solarAlloc = next.solarAllocPercent ?? 25;
    const shieldAlloc = next.shieldingAllocPercent ?? 25;
    const powerVal = next.powerPercent ?? 80;
    const shieldVal = next.shieldingPercent ?? 70;
    const isStormMode = shieldAlloc >= 35;
    const isSolarStorm = Boolean(next.isSolarStorm);
    const isDustStorm = Boolean(next.isDustStorm);
    const isBlackout = Boolean(next.isLowPowerBlackout);
    const isWilted = Boolean(next.isGreenhouseWilted);
    const isShadow = Boolean(next.isRimShadowPass);

    // Rotación de paneles solares según asignación / sombra
    targetSolarTilt = isShadow ? 1.1 : 0.12 + (solarAlloc / 100) * 0.75;
    if (Math.abs(solarWingPivot.rotation.x - targetSolarTilt) < 0.001) {
      solarWingPivot.rotation.x = targetSolarTilt;
    }

    // Domo de escudo: ámbar durante Escudo Tormenta / Tormenta Solar; cian si activo nominal; rojo tenue si crítico
    if (isSolarStorm || isStormMode) {
      const alertHex = isSolarStorm ? 0xffb300 : 0x00e5ff;
      shieldShellMat.color.setHex(alertHex);
      shieldShellMat.emissive.setHex(alertHex);
      shieldShellMat.emissiveIntensity = isSolarStorm ? 0.55 : 0.42;
      shieldShellMat.opacity = isSolarStorm ? 0.34 : 0.28;
      shieldWireMat.color.setHex(alertHex);
      shieldWireMat.opacity = 0.85;
    } else if (shieldVal < 35) {
      shieldShellMat.color.setHex(0xfc3d21);
      shieldShellMat.emissive.setHex(0xfc3d21);
      shieldShellMat.emissiveIntensity = 0.25;
      shieldShellMat.opacity = 0.14;
      shieldWireMat.color.setHex(0xfc3d21);
      shieldWireMat.opacity = 0.5;
    } else {
      shieldShellMat.color.setHex(0x00e5ff);
      shieldShellMat.emissive.setHex(0x00e5ff);
      shieldShellMat.emissiveIntensity = 0.22;
      shieldShellMat.opacity = 0.2;
      shieldWireMat.color.setHex(0x00e5ff);
      shieldWireMat.opacity = 0.58;
    }

    // Color banco baterías
    const battMat = batteryBarMesh.material as THREE.MeshStandardMaterial;
    const battHex = powerVal < 15 ? 0xfc3d21 : powerVal < 40 ? 0xd97706 : 0x2e7d4f;
    battMat.color.setHex(battHex);
    battMat.emissive.setHex(battHex);

    // Escotillas apagadas en blackout
    for (const w of portholes) {
      const mat = w.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = isBlackout ? 0.02 : 0.8;
      mat.color.setHex(isBlackout ? 0x0f172a : 0xf8f3e8);
    }

    // Cultivos del invernadero
    cropLightMat.color.setHex(isWilted ? 0x991b1b : 0x2e7d4f);
    cropLightMat.emissive.setHex(isWilted ? 0xfc3d21 : 0x2e7d4f);
    cropLightMat.emissiveIntensity = isWilted ? 0.3 : 0.55;

    // Tormentas de polvo / radiación solar
    stormParticles.visible = isDustStorm;
    solarParticles.visible = isSolarStorm;

    // Anillo selector del módulo activo
    const mod = next.selectedModule ?? 'shielding';
    if (mod === 'solar') {
      selectionRing.position.set(-3.9, 0.04, 0.35);
      selectionRing.scale.setScalar(1.25);
    } else if (mod === 'greenhouse') {
      selectionRing.position.set(3.65, 0.04, 0.2);
      selectionRing.scale.setScalar(1.2);
    } else if (mod === 'comms') {
      selectionRing.position.set(-1.95, 0.04, -2.05);
      selectionRing.scale.setScalar(0.75);
    } else if (mod === 'eclss') {
      selectionRing.position.set(0, 0.04, 0);
      selectionRing.scale.setScalar(1.55);
    } else {
      selectionRing.position.set(0, 0.04, 0);
      selectionRing.scale.setScalar(1.9);
    }
  };

  updateState(options);

  const animate = (elapsedSec: number, dtSec: number) => {
    // Interpolación suave de alas solares
    solarWingPivot.rotation.x += (targetSolarTilt - solarWingPivot.rotation.x) * Math.min(1, dtSec * 4);
    solarWingPivot.rotation.y = Math.sin(elapsedSec * 0.45) * 0.14;
    dishPivot.rotation.y = Math.sin(elapsedSec * 0.35) * 0.22;

    if (stormParticles.visible) {
      const arr = (stormParticles.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] += dtSec * 3.8;
        if (arr[i] > 6.25) arr[i] = -6.25;
      }
      stormParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (solarParticles.visible) {
      const arr = (solarParticles.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= dtSec * 2.4;
        if (arr[i + 1] < 0.2) arr[i + 1] = 4.2;
      }
      solarParticles.geometry.attributes.position.needsUpdate = true;
      shieldShellMat.opacity = 0.24 + Math.sin(elapsedSec * 4.5) * 0.1;
    }
  };

  return {
    group,
    defaultTarget: [0, 0.65, 0],
    defaultCameraPos: [0.4, 5.2, 8.6],
    updateState,
    animate,
  };
}

function buildRoverMoxie(): ProceduralModelHandle {
  const group = new THREE.Group();
  const wireTint = 0xfdba74;
  const cyanTint = 0x00e5ff;
  const amberTint = 0xffb300;

  // Plataforma CAD giratoria de calibración
  addCadMesh(group, new THREE.CylinderGeometry(2.35, 2.45, 0.1, 32), 0x1e293b, 0x38bdf8, {
    pos: [0, -0.05, 0],
  });

  // Chasis principal del rover
  addCadMesh(group, new THREE.BoxGeometry(1.7, 0.56, 1.15), 0xf2ebdd, wireTint, {
    pos: [0, 0.68, 0],
  });
  // Placa superior abierta mostrando bahía MOXIE
  addCadMesh(group, new THREE.BoxGeometry(1.15, 0.12, 0.92), 0x334155, cyanTint, {
    pos: [-0.15, 0.99, 0],
  });

  // Unidad interna MOXIE resaltada en ámbar/cian
  const moxieCore = addCadMesh(group, new THREE.BoxGeometry(0.62, 0.36, 0.64), amberTint, cyanTint, {
    pos: [0.05, 0.78, 0],
    emissive: amberTint,
    emissiveIntensity: 0.65,
  });
  addCadMesh(group, new THREE.CylinderGeometry(0.11, 0.11, 0.52, 12), cyanTint, 0xffffff, {
    pos: [0.22, 0.85, 0.18],
    rot: [0, 0, Math.PI / 2],
    emissive: cyanTint,
    emissiveIntensity: 0.55,
  });

  // Mástil óptico SuperCam
  addCadMesh(group, new THREE.CylinderGeometry(0.06, 0.08, 0.75, 10), 0xf8f3e8, wireTint, {
    pos: [0.68, 1.25, 0.42],
  });
  addCadMesh(group, new THREE.BoxGeometry(0.32, 0.24, 0.3), 0xf8f3e8, cyanTint, {
    pos: [0.72, 1.65, 0.44],
  });
  addCadMesh(group, new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12), cyanTint, 0xffffff, {
    pos: [0.88, 1.66, 0.44],
    rot: [0, 0, Math.PI / 2],
    emissive: cyanTint,
    emissiveIntensity: 0.8,
  });

  // Brazo robótico delantero de muestreo + torreta taladro
  addCadMesh(group, new THREE.BoxGeometry(0.75, 0.1, 0.1), 0x94a3b8, wireTint, {
    pos: [1.1, 0.68, -0.25],
    rot: [0, 0.18, -0.32],
  });
  addCadMesh(group, new THREE.CylinderGeometry(0.16, 0.16, 0.2, 8), 0xfc3d21, 0xf2ebdd, {
    pos: [1.48, 0.48, -0.34],
    rot: [Math.PI / 2, 0, 0],
  });

  // RTG trasero con aletas térmicas
  addCadMesh(group, new THREE.CylinderGeometry(0.22, 0.26, 0.65, 8), 0x1e293b, 0xfc3d21, {
    pos: [-1.05, 0.78, 0],
    rot: [0, 0, 0.42],
  });

  // 6 ruedas metálicas con suspensión rocker-bogie
  const wheelX = [-0.72, 0.0, 0.72];
  for (const side of [-0.78, 0.78]) {
    addCadMesh(group, new THREE.BoxGeometry(1.5, 0.08, 0.08), 0x64748b, wireTint, {
      pos: [0, 0.36, side * 0.85],
    });
    for (const wx of wheelX) {
      addCadMesh(group, new THREE.CylinderGeometry(0.25, 0.25, 0.22, 14), 0x1f2937, 0xfdba74, {
        pos: [wx, 0.25, side],
        rot: [Math.PI / 2, 0, 0],
      });
    }
  }

  const animate = (elapsedSec: number) => {
    const mat = moxieCore.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.55 + Math.sin(elapsedSec * 3.0) * 0.2;
  };

  return {
    group,
    defaultTarget: [0.05, 0.72, 0],
    defaultCameraPos: [2.75, 2.05, 3.05],
    animate,
  };
}

function buildHabitatShield(): ProceduralModelHandle {
  const group = new THREE.Group();
  const cyanTint = 0x00e5ff;

  // Base de cimentación del corte esquemático
  addCadMesh(group, new THREE.CylinderGeometry(2.25, 2.35, 0.18, 24), 0x1e293b, 0x93c5fd, {
    pos: [0, 0.09, 0],
  });

  // 1. Capa externa gruesa de regolito sinterizado (sección en corte 225 grados para ver el interior)
  addCadMesh(
    group,
    new THREE.SphereGeometry(2.05, 20, 12, Math.PI * 0.42, Math.PI * 1.38, 0, Math.PI * 0.5),
    0x786552,
    0xfdba74,
    { pos: [0, 0.18, 0] },
  );

  // 2. Camisa intermedia de agua reciclada ECLSS (muro de hidrógeno anti-radiación)
  const waterJacket = addCadMesh(
    group,
    new THREE.SphereGeometry(1.68, 18, 12, Math.PI * 0.36, Math.PI * 1.48, 0, Math.PI * 0.5),
    0x0284c7,
    cyanTint,
    {
      pos: [0, 0.18, 0],
      opacity: 0.42,
      emissive: cyanTint,
      emissiveIntensity: 0.35,
    },
  );

  // 3. Núcleo interior presurizado de aluminio + consola y camas
  addCadMesh(
    group,
    new THREE.SphereGeometry(1.32, 16, 10, Math.PI * 0.25, Math.PI * 1.5, 0, Math.PI * 0.5),
    0xf2ebdd,
    0x0b3d91,
    { pos: [0, 0.18, 0] },
  );
  // Piso interior + consola científica + tanque O2
  addCadMesh(group, new THREE.CylinderGeometry(1.28, 1.28, 0.08, 18), 0x475569, cyanTint, {
    pos: [0, 0.22, 0],
  });
  addCadMesh(group, new THREE.BoxGeometry(0.58, 0.42, 0.35), 0x0b3d91, cyanTint, {
    pos: [-0.35, 0.46, 0.35],
    emissive: cyanTint,
    emissiveIntensity: 0.22,
  });
  addCadMesh(group, new THREE.CylinderGeometry(0.16, 0.16, 0.68, 10), 0x2e7d4f, 0xf2ebdd, {
    pos: [0.45, 0.58, 0.25],
  });

  // Flechas esquemáticas de partículas solares (DONKI SEP) desviándose en la capa de regolito/agua
  const rayGroup = new THREE.Group();
  for (const offset of [-0.6, 0.0, 0.6]) {
    addCadMesh(rayGroup, new THREE.CylinderGeometry(0.03, 0.03, 1.0, 6), 0xfc3d21, 0xfc3d21, {
      pos: [offset, 2.52, -0.35],
      rot: [0.45, 0, 0.2],
      emissive: 0xfc3d21,
      emissiveIntensity: 0.7,
    });
    addCadMesh(rayGroup, new THREE.ConeGeometry(0.09, 0.22, 6), 0xfc3d21, 0xfc3d21, {
      pos: [offset - 0.1, 2.08, -0.14],
      rot: [Math.PI + 0.45, 0, -0.2],
      emissive: 0xfc3d21,
      emissiveIntensity: 0.85,
    });
  }
  group.add(rayGroup);

  const animate = (elapsedSec: number) => {
    const waterMat = waterJacket.material as THREE.MeshStandardMaterial;
    waterMat.emissiveIntensity = 0.28 + Math.sin(elapsedSec * 2.4) * 0.12;
    rayGroup.position.y = Math.sin(elapsedSec * 3.5) * 0.06;
  };

  return {
    group,
    defaultTarget: [0, 0.78, 0],
    defaultCameraPos: [2.85, 2.05, 3.1],
    animate,
  };
}

function buildPlanetGlobe(options: Model3DStateOptions): ProceduralModelHandle {
  const group = new THREE.Group();
  let currentSite: OutpostSiteId = options.siteId ?? 'moon-shackleton';
  const isMars = currentSite === 'mars-jezero';

  // Esfera planetaria con relieve de cráteres procedimental
  const radius = 1.48;
  const sphereGeo = new THREE.SphereGeometry(radius, 28, 20);
  const posAttr = sphereGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const bump = 1 + 0.025 * Math.sin(x * 3.5) * Math.cos(y * 4.2) * Math.sin(z * 3.8);
    posAttr.setXYZ(i, x * bump, y * bump, z * bump);
  }
  sphereGeo.computeVertexNormals();

  const planetMat = new THREE.MeshStandardMaterial({
    color: isMars ? 0xb44c27 : 0x6b7c93,
    roughness: 0.82,
    metalness: 0.08,
    flatShading: true,
  });
  const planetMesh = new THREE.Mesh(sphereGeo, planetMat);
  group.add(planetMesh);

  // Graticula CAD orbital alrededor del planeta
  const wireMat = new THREE.LineBasicMaterial({
    color: isMars ? 0xfdba74 : 0x93c5fd,
    transparent: true,
    opacity: 0.28,
  });
  const sphereWire = new THREE.LineSegments(new THREE.WireframeGeometry(sphereGeo), wireMat);
  sphereWire.raycast = () => undefined;
  planetMesh.add(sphereWire);

  // Anillo orbital de referencia NASA
  const orbitRingMat = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.45,
  });
  const orbitRingGeo = new THREE.EdgesGeometry(new THREE.TorusGeometry(1.88, 0.008, 4, 48));
  const orbitRing = new THREE.LineSegments(orbitRingGeo, orbitRingMat);
  orbitRing.rotation.x = Math.PI * 0.42;
  orbitRing.rotation.y = 0.25;
  group.add(orbitRing);

  // Marcador luminoso de la zona de aterrizaje
  const beaconGroup = new THREE.Group();
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xfc3d21,
    emissive: 0xfc3d21,
    emissiveIntensity: 0.9,
  });
  const beaconRingMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    side: THREE.DoubleSide,
  });

  const pinHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), beaconMat);
  pinHead.position.y = 0.26;
  const pinStem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.26, 6), beaconMat);
  pinStem.position.y = 0.13;
  const targetRing = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 20), beaconRingMat);
  targetRing.rotation.x = -Math.PI / 2;
  targetRing.position.y = 0.02;

  beaconGroup.add(pinStem, pinHead, targetRing);
  planetMesh.add(beaconGroup);

  const orientSite = (site: OutpostSiteId) => {
    currentSite = site;
    const mars = site === 'mars-jezero';
    planetMat.color.setHex(mars ? 0xb44c27 : 0x6b7c93);
    wireMat.color.setHex(mars ? 0xfdba74 : 0x93c5fd);

    if (mars) {
      // Cráter Jezero (18.38° N) mirando al frente
      const lat = (18.38 * Math.PI) / 180;
      const lon = 0.35;
      const r = radius + 0.02;
      const pos = new THREE.Vector3(
        r * Math.cos(lat) * Math.sin(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.cos(lon),
      );
      beaconGroup.position.copy(pos);
      beaconGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      planetMesh.rotation.set(0.1, -0.25, 0);
    } else {
      // Polo Sur Lunar (Cráter Shackleton 89.9° S): inclinamos ligeramente hacia la cámara para que se vea claro
      const lat = (-78 * Math.PI) / 180;
      const lon = 0.15;
      const r = radius + 0.02;
      const pos = new THREE.Vector3(
        r * Math.cos(lat) * Math.sin(lon),
        r * Math.sin(lat),
        r * Math.cos(lat) * Math.cos(lon),
      );
      beaconGroup.position.copy(pos);
      beaconGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());
      planetMesh.rotation.set(-0.62, 0, 0);
    }
  };

  orientSite(currentSite);

  const updateState = (next: Model3DStateOptions) => {
    if (next.siteId && next.siteId !== currentSite) {
      orientSite(next.siteId);
    }
  };

  const animate = (elapsedSec: number) => {
    const pulse = 1 + Math.sin(elapsedSec * 4) * 0.16;
    targetRing.scale.set(pulse, pulse, 1);
    orbitRing.rotation.z = elapsedSec * 0.18;
  };

  return {
    group,
    defaultTarget: [0, 0, 0],
    defaultCameraPos: [0, 0.35, 3.95],
    updateState,
    animate,
  };
}

export function buildProceduralModel(
  modelId: Model3DId,
  options: Model3DStateOptions = {},
): ProceduralModelHandle {
  switch (modelId) {
    case 'colony-base':
      return buildColonyBase(options);
    case 'rover-moxie':
      return buildRoverMoxie();
    case 'habitat-shield':
      return buildHabitatShield();
    case 'planet-globe':
      return buildPlanetGlobe(options);
  }
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh & THREE.LineSegments & THREE.Points;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = mesh.material;
    if (Array.isArray(mat)) {
      mat.forEach((m) => disposeMaterialTextures(m));
    } else if (mat) {
      disposeMaterialTextures(mat);
    }
  });
}

function disposeMaterialTextures(mat: THREE.Material): void {
  const anyMat = mat as unknown as Record<string, unknown>;
  for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'alphaMap']) {
    const tex = anyMat[key];
    if (tex instanceof THREE.Texture) {
      tex.dispose();
    }
  }
  mat.dispose();
}

export function getModelTitle(modelId: Model3DId, lang: Language, siteId?: OutpostSiteId): string {
  switch (modelId) {
    case 'colony-base':
      return siteId === 'mars-jezero'
        ? lang === 'es'
          ? 'Base Marciana Jezero (CAD 3D)'
          : 'Martian Jezero Outpost (3D CAD)'
        : lang === 'es'
          ? 'Base Lunar Artemis Shackleton (CAD 3D)'
          : 'Artemis Shackleton Base (3D CAD)';
    case 'rover-moxie':
      return lang === 'es'
        ? 'Rover Perseverance + Unidad MOXIE'
        : 'Perseverance Rover + MOXIE Unit';
    case 'habitat-shield':
      return lang === 'es'
        ? 'Corte 3D: Hábitat con Blindaje de Regolito'
        : '3D Cutaway: Regolith-Shielded Habitat';
    case 'planet-globe':
      return siteId === 'mars-jezero'
        ? lang === 'es'
          ? 'Marte · Cráter Jezero'
          : 'Mars · Jezero Crater'
        : lang === 'es'
          ? 'Luna · Cráter Shackleton'
          : 'Moon · Shackleton Crater';
  }
}
