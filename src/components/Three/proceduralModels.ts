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
    if (obj instanceof THREE.InstancedMesh) {
      obj.dispose();
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

// ============================================================================
// M01–M02 (feat/interactive-3d-world): MUNDO 3D DE LA COLONIA
// Horizonte de apariencia infinita (terreno 2000x2000 + FogExp2 del mismo color
// que el cielo), atmósfera por astro (Luna / Marte), módulos interactivos con
// Raycasting y límites de cámara invisibles.
// ============================================================================

export type ColonyWorldModuleId =
  | 'power-grid'
  | 'oxygen-module'
  | 'greenhouse'
  | 'comms-array'
  | 'rover-moxie';

export const COLONY_WORLD_MODULE_IDS: readonly ColonyWorldModuleId[] = [
  'power-grid',
  'oxygen-module',
  'greenhouse',
  'comms-array',
  'rover-moxie',
];

export interface ColonyWorldModuleMeta {
  id: ColonyWorldModuleId;
  label: LocalizedText;
  /** Posición (x, z) del módulo en unidades de mundo, siempre dentro del perímetro [-22, 22] */
  position: [number, number];
  /** Altura de la etiqueta táctica flotante sobre el módulo */
  labelHeight: number;
  /** Radio del anillo de selección en el suelo */
  outlineRadius: number;
}

export const COLONY_WORLD_MODULES: Record<ColonyWorldModuleId, ColonyWorldModuleMeta> = {
  'power-grid': {
    id: 'power-grid',
    label: { es: 'Matriz de paneles solares', en: 'Solar array field' },
    position: [-13, 4],
    labelHeight: 6.2,
    outlineRadius: 5.6,
  },
  'oxygen-module': {
    id: 'oxygen-module',
    label: { es: 'Hábitat y soporte vital ECLSS', en: 'Habitat and ECLSS life support' },
    position: [0, 0],
    labelHeight: 7.2,
    outlineRadius: 6.6,
  },
  greenhouse: {
    id: 'greenhouse',
    label: { es: 'Invernadero hidropónico', en: 'Hydroponic greenhouse' },
    position: [12.5, 3],
    labelHeight: 4.4,
    outlineRadius: 4.3,
  },
  'comms-array': {
    id: 'comms-array',
    label: { es: 'Antena de comunicaciones', en: 'Communications antenna' },
    position: [-6, -13],
    labelHeight: 8.4,
    outlineRadius: 3.2,
  },
  'rover-moxie': {
    id: 'rover-moxie',
    label: { es: 'Rover con unidad MOXIE', en: 'Rover with MOXIE unit' },
    position: [9, 12.5],
    labelHeight: 4.2,
    outlineRadius: 3.0,
  },
};

/** Color técnico de resaltado al pasar el cursor (cian NASA HUD) */
export const COLONY_HIGHLIGHT_HEX = 0x38bdf8;

export const COLONY_CAMERA_LIMITS = {
  boundsMin: -22,
  boundsMax: 22,
  /** Margen máximo que la vista puede ceder antes del retorno amortiguado */
  overshoot: 2.5,
  minDistance: 8,
  maxDistance: 45,
  minPolarAngle: 0.18,
  maxPolarAngle: Math.PI / 2 - 0.06,
  minTargetY: 0.8,
  maxTargetY: 6,
} as const;

export function clampToColonyBounds(value: number): number {
  return Math.max(COLONY_CAMERA_LIMITS.boundsMin, Math.min(COLONY_CAMERA_LIMITS.boundsMax, value));
}

/**
 * Amortiguación suave del objetivo de cámara: si el jugador arrastra la vista fuera
 * del perímetro [-22, 22], el objetivo regresa suavemente sin muros visibles.
 */
export function softClampColonyTarget(
  x: number,
  z: number,
  alpha: number,
): { x: number; z: number; wasOutside: boolean } {
  const { boundsMin, boundsMax, overshoot } = COLONY_CAMERA_LIMITS;
  const a = Math.max(0, Math.min(1, alpha));
  const cx = clampToColonyBounds(x);
  const cz = clampToColonyBounds(z);
  const wasOutside = cx !== x || cz !== z;
  let nx = x + (cx - x) * a;
  let nz = z + (cz - z) * a;
  nx = Math.max(boundsMin - overshoot, Math.min(boundsMax + overshoot, nx));
  nz = Math.max(boundsMin - overshoot, Math.min(boundsMax + overshoot, nz));
  return { x: nx, z: nz, wasOutside };
}

export function clampColonyCameraDistance(distance: number): number {
  return Math.max(
    COLONY_CAMERA_LIMITS.minDistance,
    Math.min(COLONY_CAMERA_LIMITS.maxDistance, distance),
  );
}

export function clampColonyPolarAngle(phi: number): number {
  return Math.max(
    COLONY_CAMERA_LIMITS.minPolarAngle,
    Math.min(COLONY_CAMERA_LIMITS.maxPolarAngle, phi),
  );
}

export interface ColonyCameraPose {
  target: [number, number, number];
  cameraPos: [number, number, number];
}

function poseFromSpherical(
  target: [number, number, number],
  radius: number,
  phi: number,
  theta: number,
): ColonyCameraPose {
  const r = clampColonyCameraDistance(radius);
  const p = clampColonyPolarAngle(phi);
  const sinP = Math.sin(p);
  return {
    target,
    cameraPos: [
      target[0] + r * sinP * Math.sin(theta),
      target[1] + r * Math.cos(p),
      target[2] + r * sinP * Math.cos(theta),
    ],
  };
}

export const COLONY_DEFAULT_POSE: ColonyCameraPose = poseFromSpherical([0, 2.4, 0], 33, 1.24, 0.45);

export function computeColonyFocusPose(
  moduleId: ColonyWorldModuleId,
  currentOffset?: { x: number; y: number; z: number },
  anchorOverride?: { x: number; z: number },
): ColonyCameraPose {
  const meta = COLONY_WORLD_MODULES[moduleId];
  const ax = anchorOverride?.x ?? meta.position[0];
  const az = anchorOverride?.z ?? meta.position[1];
  const target: [number, number, number] = [clampToColonyBounds(ax), 1.6, clampToColonyBounds(az)];
  const ox = currentOffset?.x ?? 0.45;
  const oy = currentOffset?.y ?? 0.52;
  const oz = currentOffset?.z ?? 0.72;
  const len = Math.hypot(ox, oy, oz) || 1;
  const theta = Math.atan2(ox / len, oz / len);
  const phi = Math.max(0.55, Math.min(1.18, Math.acos(Math.max(-1, Math.min(1, oy / len)))));
  const radius = Math.max(12, Math.min(26, meta.outlineRadius * 3.1));
  return poseFromSpherical(target, radius, phi, theta);
}

export type WorldAtmosphereKind = 'lunar' | 'mars';

export interface WorldAtmosphere {
  kind: WorldAtmosphereKind;
  skyColor: number;
  /** Siempre igual a `skyColor` para que el horizonte se funda sin corte visible */
  fogColor: number;
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  sunDirection: [number, number, number];
  ambientColor: number;
  ambientIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  terrainBase: number;
  terrainLight: number;
  terrainDark: number;
  rockColor: number;
  gridColor: number;
  wireTint: number;
  hullColor: number;
  accentColor: number;
  showStars: boolean;
  showEarth: boolean;
  dustBaseCount: number;
  dustStormCount: number;
  dustColor: number;
}

export const WORLD_ATMOSPHERES: Record<WorldAtmosphereKind, WorldAtmosphere> = {
  lunar: {
    kind: 'lunar',
    skyColor: 0x03060c,
    fogColor: 0x03060c,
    fogDensity: 0.0028,
    sunColor: 0xfff8ee,
    sunIntensity: 3.1,
    sunDirection: [0.78, 0.14, -0.6],
    ambientColor: 0x9fb4d0,
    ambientIntensity: 0.16,
    hemiSkyColor: 0x26334a,
    hemiGroundColor: 0x0b0d10,
    hemiIntensity: 0.3,
    terrainBase: 0x6b6e73,
    terrainLight: 0x8f9296,
    terrainDark: 0x45484d,
    rockColor: 0x55585d,
    gridColor: 0x1e3552,
    wireTint: 0x93c5fd,
    hullColor: 0xe8e2d5,
    accentColor: 0x0b3d91,
    showStars: true,
    showEarth: true,
    dustBaseCount: 0,
    dustStormCount: 0,
    dustColor: 0xcbd5e1,
  },
  mars: {
    kind: 'mars',
    skyColor: 0x2d160e,
    fogColor: 0x2d160e,
    fogDensity: 0.0044,
    sunColor: 0xffd9b0,
    sunIntensity: 1.55,
    sunDirection: [0.42, 0.62, 0.3],
    ambientColor: 0xc98a5e,
    ambientIntensity: 0.32,
    hemiSkyColor: 0xc77d4f,
    hemiGroundColor: 0x3a1a0e,
    hemiIntensity: 0.78,
    terrainBase: 0xa4492a,
    terrainLight: 0xc0603a,
    terrainDark: 0x6e2d18,
    rockColor: 0x5b2716,
    gridColor: 0x452014,
    wireTint: 0xfdba74,
    hullColor: 0xf2ebdd,
    accentColor: 0xfc3d21,
    showStars: false,
    showEarth: false,
    dustBaseCount: 900,
    dustStormCount: 2600,
    dustColor: 0xd99a6c,
  },
};

export function getWorldAtmosphere(siteId?: OutpostSiteId): WorldAtmosphere {
  return siteId === 'mars-jezero' ? WORLD_ATMOSPHERES.mars : WORLD_ATMOSPHERES.lunar;
}

export const WORLD_TERRAIN_SIZE = 2000;
export const WORLD_TERRAIN_SEGMENTS = 240;
const BASE_PAD_RADIUS = 27;

function hash01(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface CraterSpec {
  x: number;
  z: number;
  r: number;
  depth: number;
}

const craterCache: Partial<Record<WorldAtmosphereKind, CraterSpec[]>> = {};

function getCraters(kind: WorldAtmosphereKind): CraterSpec[] {
  const cached = craterCache[kind];
  if (cached) return cached;
  const isLunar = kind === 'lunar';
  const list: CraterSpec[] = [];
  const count = isLunar ? 46 : 14;
  for (let i = 0; i < count; i++) {
    const angle = hash01(i * 3.1 + (isLunar ? 0 : 50)) * Math.PI * 2;
    const dist = 48 + Math.pow(hash01(i * 7.7 + 1), 0.8) * 620;
    const r = (isLunar ? 6 : 5) + Math.pow(hash01(i * 1.9 + 2), 2) * (isLunar ? 46 : 26);
    list.push({
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      r,
      depth: r * (isLunar ? 0.18 : 0.1),
    });
  }
  if (isLunar) {
    for (let i = 0; i < 7; i++) {
      const angle = hash01(i * 11.3 + 90) * Math.PI * 2;
      const dist = 33 + hash01(i * 5.1 + 91) * 14;
      const r = 2.4 + hash01(i * 2.7 + 92) * 3.2;
      list.push({ x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, r, depth: r * 0.22 });
    }
  }
  craterCache[kind] = list;
  return list;
}

/** Altura determinista del terreno en (x, z); la plaza de la base queda nivelada (y = 0). */
export function sampleWorldTerrainHeight(x: number, z: number, siteId?: OutpostSiteId): number {
  const kind: WorldAtmosphereKind = siteId === 'mars-jezero' ? 'mars' : 'lunar';
  const r = Math.hypot(x, z);
  const outside = smoothstep(BASE_PAD_RADIUS, BASE_PAD_RADIUS + 16, r);
  if (outside <= 0) return 0;
  const angle = Math.atan2(z, x);

  let h =
    Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.35 +
    Math.sin(x * 0.041 + z * 0.027) * 1.2 +
    Math.sin((x - z) * 0.23) * 0.18;

  for (const c of getCraters(kind)) {
    const dx = x - c.x;
    const dz = z - c.z;
    const dd = dx * dx + dz * dz;
    const lim = c.r * 1.6;
    if (dd > lim * lim) continue;
    const d = Math.sqrt(dd) / c.r;
    if (d < 1) h -= c.depth * (1 - d * d);
    h += c.depth * 0.42 * Math.exp(-Math.pow((d - 1) / 0.2, 2));
  }

  if (kind === 'lunar') {
    h +=
      smoothstep(240, 620, r) *
      (28 + 14 * Math.sin(angle * 5 + 0.7) + 8 * Math.sin(angle * 13 + 2.1) + 4 * Math.sin(angle * 29));
  } else {
    const dunes =
      smoothstep(40, 90, r) *
      (1 - smoothstep(260, 420, r)) *
      (Math.sin(x * 0.085 + Math.sin(z * 0.031) * 2.2) * 1.4 + 0.6);
    const mesaMask = Math.max(0, Math.sin(angle * 3 + 1.3) * 0.65 + Math.sin(angle * 7 + 0.4) * 0.45);
    const mesa = Math.min(40, smoothstep(240, 360, r) * mesaMask * 65);
    const farHills = smoothstep(500, 800, r) * (20 + 9 * Math.sin(angle * 4 + 0.2));
    h += dunes + mesa + farHills;
  }

  return h * outside;
}

function warpGridCoord(t: number): number {
  const half = WORLD_TERRAIN_SIZE / 2;
  return half * (0.06 * t + 0.94 * t * t * t);
}

function buildWorldTerrain(atmo: WorldAtmosphere, siteId: OutpostSiteId): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(2, 2, WORLD_TERRAIN_SEGMENTS, WORLD_TERRAIN_SEGMENTS);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const cBase = new THREE.Color(atmo.terrainBase);
  const cLight = new THREE.Color(atmo.terrainLight);
  const cDark = new THREE.Color(atmo.terrainDark);
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = warpGridCoord(pos.getX(i));
    const z = warpGridCoord(pos.getZ(i));
    const y = sampleWorldTerrainHeight(x, z, siteId);
    pos.setXYZ(i, x, y, z);

    const patch = 0.5 + 0.5 * Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.07 - 0.4);
    tmp.copy(cBase).lerp(cLight, patch * 0.6);
    if (y < -0.4) tmp.lerp(cDark, Math.min(1, -y / 6));
    if (atmo.kind === 'mars' && y > 18) tmp.lerp(cDark, Math.min(0.5, (y - 18) / 60));
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.02,
    flatShading: true,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'world-terrain';
  mesh.receiveShadow = true;
  mesh.raycast = () => undefined;
  return mesh;
}

function buildRockField(atmo: WorldAtmosphere, siteId: OutpostSiteId): THREE.InstancedMesh {
  const count = 260;
  const geo = new THREE.DodecahedronGeometry(1, 0);
  const mat = new THREE.MeshStandardMaterial({ color: atmo.rockColor, roughness: 0.92, flatShading: true });
  const rocks = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let placed = 0;
  for (let i = 0; placed < count && i < count * 4; i++) {
    const angle = hash01(i * 4.3 + 7) * Math.PI * 2;
    const dist = 9 + Math.pow(hash01(i * 2.1 + 3), 1.6) * 170;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    let blocked = false;
    for (const id of COLONY_WORLD_MODULE_IDS) {
      const meta = COLONY_WORLD_MODULES[id];
      if (Math.hypot(x - meta.position[0], z - meta.position[1]) < meta.outlineRadius + 2.2) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    const scale = (0.18 + hash01(i * 9.1) * 0.9) * (dist > 60 ? 2.6 : 1);
    e.set(hash01(i * 1.3) * 3, hash01(i * 2.9) * 3, hash01(i * 3.7) * 3);
    q.setFromEuler(e);
    s.set(scale, scale * (0.55 + hash01(i * 6.6) * 0.4), scale);
    p.set(x, sampleWorldTerrainHeight(x, z, siteId) + scale * 0.2, z);
    m.compose(p, q, s);
    rocks.setMatrixAt(placed, m);
    placed++;
  }
  rocks.count = placed;
  rocks.instanceMatrix.needsUpdate = true;
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  rocks.raycast = () => undefined;
  return rocks;
}

function buildStarField(): THREE.Points {
  const count = 1600;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = hash01(i * 12.9898 + 4);
    const v = hash01(i * 78.233 + 9);
    const theta = u * Math.PI * 2;
    const y = -0.06 + v * 1.06;
    const ring = Math.sqrt(Math.max(0, 1 - y * y));
    positions[i * 3] = Math.cos(theta) * ring * 1400;
    positions[i * 3 + 1] = y * 1400;
    positions[i * 3 + 2] = Math.sin(theta) * ring * 1400;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xf8fafc,
    size: 1.6,
    sizeAttenuation: false,
    fog: false,
  });
  const stars = new THREE.Points(geo, mat);
  stars.name = 'world-stars';
  stars.raycast = () => undefined;
  return stars;
}

export const WORLD_EARTH_DIRECTION: [number, number, number] = [-0.38, 0.095, -0.92];

function buildEarth(): THREE.Group {
  const earth = new THREE.Group();
  earth.name = 'world-earth';
  const dir = new THREE.Vector3(...WORLD_EARTH_DIRECTION).normalize().multiplyScalar(1200);
  earth.position.copy(dir);
  const ocean = new THREE.Mesh(
    new THREE.SphereGeometry(42, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, fog: false }),
  );
  const land = new THREE.Mesh(
    new THREE.SphereGeometry(42.2, 18, 12, 0.6, 1.4, 0.7, 1.1),
    new THREE.MeshBasicMaterial({ color: 0x4ade80, fog: false }),
  );
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(43.2, 24, 16),
    new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.34,
      fog: false,
      depthWrite: false,
    }),
  );
  ocean.raycast = () => undefined;
  land.raycast = () => undefined;
  clouds.raycast = () => undefined;
  earth.add(ocean, land, clouds);
  return earth;
}

function buildSunDisc(atmo: WorldAtmosphere): THREE.Mesh {
  const dir = new THREE.Vector3(...atmo.sunDirection).normalize().multiplyScalar(1300);
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(atmo.kind === 'mars' ? 11 : 16, 20, 12),
    new THREE.MeshBasicMaterial({ color: atmo.kind === 'mars' ? 0xfff1dc : 0xfffbeb, fog: false }),
  );
  sun.position.copy(dir);
  sun.name = 'world-sun';
  sun.raycast = () => undefined;
  return sun;
}

function createWorldParticles(capacity: number, color: number, size: number): THREE.Points {
  const positions = new Float32Array(capacity * 3);
  for (let i = 0; i < capacity; i++) {
    positions[i * 3] = (hash01(i * 3.3 + 1) - 0.5) * 140;
    positions[i * 3 + 1] = 0.3 + hash01(i * 5.7 + 2) * 26;
    positions[i * 3 + 2] = (hash01(i * 8.1 + 3) - 0.5) * 140;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setDrawRange(0, 0);
  const mat = new THREE.PointsMaterial({
    color,
    size,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.raycast = () => undefined;
  return pts;
}

function addWorldMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  wireColor: number,
  opts?: Parameters<typeof addCadMesh>[4] & { partId?: string },
): THREE.Mesh {
  const mesh = addCadMesh(parent, geometry, color, wireColor, opts);
  mesh.castShadow = !(opts?.opacity !== undefined && opts.opacity < 1);
  mesh.receiveShadow = true;
  if (opts?.partId) mesh.userData.partId = opts.partId;
  return mesh;
}

function addConnector(
  parent: THREE.Object3D,
  from: [number, number, number],
  to: [number, number, number],
  radius: number,
  color: number,
  wire: number,
): void {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const mesh = addWorldMesh(parent, new THREE.CylinderGeometry(radius, radius, len, 12), color, wire);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
}

function createCornerBracketGeometry(box: THREE.Box3, armRatio = 0.22): THREE.BufferGeometry {
  const pts: number[] = [];
  const min = box.min;
  const max = box.max;
  const size = new THREE.Vector3();
  box.getSize(size);
  const ax = size.x * armRatio;
  const ay = size.y * armRatio;
  const az = size.z * armRatio;
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        const sx = x === min.x ? 1 : -1;
        const sy = y === min.y ? 1 : -1;
        const sz = z === min.z ? 1 : -1;
        pts.push(x, y, z, x + sx * ax, y, z);
        pts.push(x, y, z, x, y + sy * ay, z);
        pts.push(x, y, z, x, y, z + sz * az);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return geo;
}

export interface ColonyWorldStateOptions extends Model3DStateOptions {
  /** Alerta ambiental de entrenamiento (p. ej. caída térmica del onboarding) */
  isEnvironmentalAlert?: boolean;
  /** Transmisión activa hacia la Tierra (simulador de retraso) */
  commsActive?: boolean;
  /** Retraso de señal en segundos para la etiqueta de la antena */
  commDelaySeconds?: number;
}

export function isStormShieldDeployed(opts: ColonyWorldStateOptions): boolean {
  return Boolean(
    (opts.shieldingAllocPercent ?? 0) >= 35 || opts.isSolarStorm || opts.isEnvironmentalAlert,
  );
}

export type ColonyStatusTone = 'ok' | 'warn' | 'crit';

export function getColonyModuleStatus(
  moduleId: ColonyWorldModuleId,
  opts: ColonyWorldStateOptions,
  lang: Language,
): { text: string; tone: ColonyStatusTone } {
  const es = lang === 'es';
  const tone = (v: number): ColonyStatusTone => (v < 25 ? 'crit' : v < 45 ? 'warn' : 'ok');
  const isMars = opts.siteId === 'mars-jezero';
  switch (moduleId) {
    case 'power-grid': {
      const p = Math.round(opts.powerPercent ?? 0);
      const stowed = isStormShieldDeployed(opts) || opts.isDustStorm;
      return {
        text: es
          ? `Batería ${p} % · ${stowed ? 'paneles protegidos' : 'siguiendo al Sol'}`
          : `Battery ${p}% · ${stowed ? 'panels stowed' : 'tracking the Sun'}`,
        tone: tone(p),
      };
    }
    case 'oxygen-module': {
      const ls = Math.round(opts.lifeSupportPercent ?? 0);
      const deployed = isStormShieldDeployed(opts);
      return {
        text: es
          ? `O₂ y agua ${ls} % · escudo ${deployed ? 'desplegado' : 'plegado'}`
          : `O₂ and water ${ls}% · shield ${deployed ? 'deployed' : 'retracted'}`,
        tone: opts.isEnvironmentalAlert ? 'warn' : tone(ls),
      };
    }
    case 'greenhouse': {
      const f = Math.round(opts.foodPercent ?? 0);
      return {
        text: es
          ? `Cosecha ${f} %${opts.isGreenhouseWilted ? ' · cultivos marchitos' : ''}`
          : `Harvest ${f}%${opts.isGreenhouseWilted ? ' · crops wilting' : ''}`,
        tone: tone(f),
      };
    }
    case 'comms-array': {
      const sec = opts.commDelaySeconds ?? (isMars ? 720 : 1.3);
      const delay = sec < 60 ? `${sec.toFixed(1)} s` : `${(sec / 60).toFixed(1)} min`;
      return {
        text: opts.commsActive
          ? es
            ? `Transmitiendo · retraso ${delay}`
            : `Transmitting · ${delay} delay`
          : es
            ? `Enlace con la Tierra · ${delay}`
            : `Earth link · ${delay}`,
        tone: 'ok',
      };
    }
    case 'rover-moxie': {
      if (opts.isLowPowerBlackout) {
        return { text: es ? 'Detenido · sin energía' : 'Halted · no power', tone: 'crit' };
      }
      return {
        text: isMars
          ? es
            ? 'MOXIE produciendo O₂'
            : 'MOXIE making O₂'
          : es
            ? 'Explorando el regolito'
            : 'Surveying the regolith',
        tone: 'ok',
      };
    }
  }
}

interface ColonyModuleRuntime {
  group: THREE.Group;
  motionRoot: THREE.Group;
  visual: THREE.Group;
  brackets: THREE.LineSegments;
  ring: THREE.Mesh;
  pulseT: number;
}

export interface ColonyWorldHandle {
  group: THREE.Group;
  fog: THREE.FogExp2;
  atmosphere: WorldAtmosphere;
  pickables: THREE.Object3D[];
  modules: Record<ColonyWorldModuleId, THREE.Group>;
  updateState: (next: ColonyWorldStateOptions) => void;
  setHovered: (id: ColonyWorldModuleId | null) => void;
  setSelected: (id: ColonyWorldModuleId | null) => void;
  pulse: (id: ColonyWorldModuleId) => void;
  getModuleAnchor: (id: ColonyWorldModuleId, out: THREE.Vector3) => THREE.Vector3;
  replaceModuleVisual: (id: ColonyWorldModuleId, object: THREE.Object3D) => void;
  animate: (elapsedSec: number, dtSec: number) => void;
}

export function findColonyModuleId(obj: THREE.Object3D | null): ColonyWorldModuleId | null {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    const id = cur.userData?.worldModuleId as ColonyWorldModuleId | undefined;
    if (id) return id;
    cur = cur.parent;
  }
  return null;
}

export function buildColonyWorld(options: ColonyWorldStateOptions = {}): ColonyWorldHandle {
  const siteId: OutpostSiteId = options.siteId ?? 'moon-shackleton';
  const atmo = getWorldAtmosphere(siteId);
  const isLunar = atmo.kind === 'lunar';
  const wire = atmo.wireTint;
  const root = new THREE.Group();
  root.name = `colony-world-${atmo.kind}`;

  const fog = new THREE.FogExp2(atmo.fogColor, atmo.fogDensity);

  const ambient = new THREE.AmbientLight(atmo.ambientColor, atmo.ambientIntensity);
  const hemi = new THREE.HemisphereLight(atmo.hemiSkyColor, atmo.hemiGroundColor, atmo.hemiIntensity);
  const sun = new THREE.DirectionalLight(atmo.sunColor, atmo.sunIntensity);
  const sunDir = new THREE.Vector3(...atmo.sunDirection).normalize();
  sun.position.copy(sunDir).multiplyScalar(80);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -42;
  sun.shadow.camera.right = 42;
  sun.shadow.camera.top = 42;
  sun.shadow.camera.bottom = -42;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0008;
  root.add(ambient, hemi, sun);

  if (atmo.showStars) root.add(buildStarField());
  if (atmo.showEarth) root.add(buildEarth());
  root.add(buildSunDisc(atmo));

  root.add(buildWorldTerrain(atmo, siteId));
  root.add(buildRockField(atmo, siteId));
  const grid = new THREE.GridHelper(48, 24, wire, atmo.gridColor);
  const gridMat = grid.material as THREE.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.22;
  grid.position.y = 0.03;
  grid.raycast = () => undefined;
  root.add(grid);

  const connectors = new THREE.Group();
  addConnector(connectors, [4.6, 0.9, 1.4], [9.4, 0.9, 2.4], 0.8, atmo.hullColor, wire);
  addConnector(connectors, [-4.8, 0.15, 1.2], [-9.4, 0.15, 4.2], 0.14, 0x475569, wire);
  addConnector(connectors, [-2.6, 0.15, -4.2], [-5.4, 0.15, -11.6], 0.14, 0x475569, wire);
  connectors.traverse((o) => {
    o.raycast = () => undefined;
  });
  root.add(connectors);

  const runtimes = {} as Record<ColonyWorldModuleId, ColonyModuleRuntime>;
  const modules = {} as Record<ColonyWorldModuleId, THREE.Group>;

  const createModuleShell = (id: ColonyWorldModuleId): ColonyModuleRuntime => {
    const meta = COLONY_WORLD_MODULES[id];
    const group = new THREE.Group();
    group.name = `module-${id}`;
    group.position.set(meta.position[0], 0, meta.position[1]);
    const motionRoot = new THREE.Group();
    const visual = new THREE.Group();
    visual.userData.proceduralVisual = true;
    motionRoot.add(visual);
    group.add(motionRoot);
    return {
      group,
      motionRoot,
      visual,
      brackets: new THREE.LineSegments(),
      ring: new THREE.Mesh(),
      pulseT: 0,
    };
  };

  // 1. MATRIZ DE PANELES SOLARES (power-grid)
  const power = createModuleShell('power-grid');
  const panelPivots: Array<{ yaw: THREE.Group; tilt: THREE.Group }> = [];
  for (const [px, pz] of [
    [-3.3, -2.2],
    [0, -2.2],
    [3.3, -2.2],
    [-3.3, 1.7],
    [0, 1.7],
    [3.3, 1.7],
  ] as Array<[number, number]>) {
    addWorldMesh(power.visual, new THREE.CylinderGeometry(0.14, 0.22, 3.4, 8), 0x9aa5b4, wire, {
      pos: [px, 1.7, pz],
    });
    const yaw = new THREE.Group();
    yaw.position.set(px, 3.4, pz);
    const tilt = new THREE.Group();
    yaw.add(tilt);
    addWorldMesh(tilt, new THREE.BoxGeometry(2.9, 0.09, 1.75), 0x1e3a8a, 0x93c5fd, {
      emissive: 0x0b3d91,
      emissiveIntensity: 0.22,
    });
    addWorldMesh(tilt, new THREE.BoxGeometry(2.9, 0.1, 0.05), 0x93c5fd, 0x93c5fd, { pos: [0, 0.02, 0] });
    power.visual.add(yaw);
    panelPivots.push({ yaw, tilt });
  }
  const batteryMesh = addWorldMesh(power.visual, new THREE.BoxGeometry(3.4, 1.2, 1.4), 0x2e7d4f, wire, {
    pos: [0, 0.6, 4.3],
    emissive: 0x2e7d4f,
    emissiveIntensity: 0.3,
  });
  runtimes['power-grid'] = power;

  // 2. HÁBITAT + SOPORTE VITAL ECLSS + ESCUDO (oxygen-module)
  const hab = createModuleShell('oxygen-module');
  addWorldMesh(hab.visual, new THREE.CylinderGeometry(4.7, 5.0, 0.6, 28), 0x3b4656, wire, { pos: [0, 0.3, 0] });
  addWorldMesh(
    hab.visual,
    new THREE.SphereGeometry(4.1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
    atmo.hullColor,
    wire,
    { pos: [0, 0.6, 0], edgeThreshold: 28 },
  );
  addWorldMesh(hab.visual, new THREE.CylinderGeometry(4.16, 4.16, 0.35, 28), atmo.accentColor, wire, {
    pos: [0, 0.78, 0],
  });
  addWorldMesh(hab.visual, new THREE.BoxGeometry(2.0, 2.0, 2.6), 0x56657a, wire, { pos: [0, 1.0, 4.6] });
  addWorldMesh(hab.visual, new THREE.BoxGeometry(1.1, 1.4, 0.1), atmo.accentColor, wire, {
    pos: [0, 1.0, 5.92],
  });
  addWorldMesh(hab.visual, new THREE.CylinderGeometry(0.6, 0.6, 2.6, 14), 0x0b3d91, wire, {
    pos: [-3.9, 1.3, -2.8],
  });
  addWorldMesh(hab.visual, new THREE.CylinderGeometry(0.6, 0.6, 2.6, 14), isLunar ? 0x0b3d91 : 0xd97706, wire, {
    pos: [-2.4, 1.3, -3.9],
    emissive: isLunar ? 0x000000 : 0xd97706,
    emissiveIntensity: isLunar ? 0 : 0.25,
  });
  const radiators: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) {
    radiators.push(
      addWorldMesh(hab.visual, new THREE.BoxGeometry(0.12, 1.7, 3.2), 0xf2ebdd, wire, {
        pos: [sx * 5.6, 1.25, -1.0],
      }),
    );
  }
  const portholes: THREE.Mesh[] = [];
  for (const a of [0.7, 1.6, 2.5, -0.7, -1.6, -2.5]) {
    portholes.push(
      addWorldMesh(hab.visual, new THREE.BoxGeometry(0.8, 0.5, 0.2), 0xf8f3e8, 0x1b1f2a, {
        pos: [Math.sin(a) * 3.98, 1.6, Math.cos(a) * 3.98],
        rot: [0, a, 0],
        emissive: 0xfef08a,
        emissiveIntensity: 0.8,
      }),
    );
  }
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) < 0.42) continue;
    addWorldMesh(hab.visual, new THREE.BoxGeometry(1.5, 0.7, 0.8), 0x64748b, wire, {
      pos: [Math.sin(a) * 6.2, 0.35, Math.cos(a) * 6.2],
      rot: [0, a, 0],
    });
  }
  const shieldMat = new THREE.MeshStandardMaterial({
    color: 0x00e5ff,
    emissive: 0x00e5ff,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.22,
    roughness: 0.3,
    metalness: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shieldGeo = new THREE.SphereGeometry(5.5, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const shieldDome = new THREE.Mesh(shieldGeo, shieldMat);
  shieldDome.position.y = 0.2;
  const shieldWireMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.7 });
  const shieldWire = new THREE.LineSegments(new THREE.EdgesGeometry(shieldGeo, 1), shieldWireMat);
  shieldWire.raycast = () => undefined;
  shieldDome.add(shieldWire);
  shieldDome.scale.set(1, 0.06, 1);
  hab.visual.add(shieldDome);
  runtimes['oxygen-module'] = hab;

  // 3. INVERNADERO HIDROPÓNICO (greenhouse)
  const gh = createModuleShell('greenhouse');
  addWorldMesh(gh.visual, new THREE.BoxGeometry(6.4, 0.5, 3.6), 0x334155, wire, { pos: [0, 0.25, 0] });
  const cropMesh = addWorldMesh(gh.visual, new THREE.BoxGeometry(5.2, 0.5, 2.4), 0x2e7d4f, 0x14532d, {
    pos: [0, 0.75, 0],
    emissive: 0x2e7d4f,
    emissiveIntensity: 0.5,
  });
  addWorldMesh(
    gh.visual,
    new THREE.CylinderGeometry(1.75, 1.75, 6.0, 18, 1, false, 0, Math.PI),
    0xdbeafe,
    COLONY_HIGHLIGHT_HEX,
    { pos: [0, 0.5, 0], rot: [0, 0, Math.PI / 2], opacity: 0.3 },
  );
  const ledMeshes: THREE.Mesh[] = [];
  for (const lz of [-0.55, 0.55]) {
    ledMeshes.push(
      addWorldMesh(gh.visual, new THREE.BoxGeometry(5.0, 0.08, 0.12), 0xf0abfc, 0xf0abfc, {
        pos: [0, 1.95, lz],
        emissive: 0xd946ef,
        emissiveIntensity: 1.1,
      }),
    );
  }
  const growLight = new THREE.PointLight(0xd946ef, 2.4, 10, 2);
  growLight.position.set(0, 1.4, 0);
  gh.visual.add(growLight);
  runtimes.greenhouse = gh;

  // 4. ANTENA DE COMUNICACIONES (comms-array)
  const comms = createModuleShell('comms-array');
  addWorldMesh(comms.visual, new THREE.CylinderGeometry(1.6, 1.8, 0.35, 16), 0x475569, wire, {
    pos: [0, 0.18, 0],
  });
  addWorldMesh(comms.visual, new THREE.CylinderGeometry(0.22, 0.38, 4.8, 10), 0xcbd5e1, wire, {
    pos: [0, 2.75, 0],
  });
  const dishYaw = new THREE.Group();
  dishYaw.position.set(0, 5.2, 0);
  const dishElev = new THREE.Group();
  dishElev.rotation.x = 0.9;
  dishYaw.add(dishElev);
  const dishPts: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const r = (2.4 * i) / 10;
    dishPts.push(new THREE.Vector2(r, (r * r) / (4 * 1.3)));
  }
  const dishMesh = addWorldMesh(dishElev, new THREE.LatheGeometry(dishPts, 24), atmo.hullColor, wire, {
    edgeThreshold: 30,
  });
  (dishMesh.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const strut = addWorldMesh(dishElev, new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), 0x94a3b8, wire);
    strut.position.set(Math.cos(a) * 0.9, 1.0, Math.sin(a) * 0.9);
    strut.lookAt(new THREE.Vector3(0, 1.9, 0).add(dishElev.position));
    strut.rotateX(Math.PI / 2);
  }
  addWorldMesh(dishElev, new THREE.CylinderGeometry(0.12, 0.2, 0.45, 10), 0x334155, wire, { pos: [0, 1.75, 0] });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: atmo.accentColor,
    emissive: atmo.accentColor,
    emissiveIntensity: 1,
  });
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), beaconMat);
  beacon.position.set(0, 2.05, 0);
  dishElev.add(beacon);
  comms.visual.add(dishYaw);
  runtimes['comms-array'] = comms;

  // 5. ROVER CON UNIDAD MOXIE (rover-moxie)
  const rover = createModuleShell('rover-moxie');
  addWorldMesh(rover.visual, new THREE.BoxGeometry(2.6, 0.75, 1.7), 0xf2ebdd, wire, { pos: [0, 1.15, 0] });
  addWorldMesh(rover.visual, new THREE.BoxGeometry(1.9, 0.12, 1.4), 0x334155, COLONY_HIGHLIGHT_HEX, {
    pos: [0, 1.58, 0],
  });
  const moxieMesh = addWorldMesh(rover.visual, new THREE.BoxGeometry(0.8, 0.5, 0.75), 0xffb300, 0x00e5ff, {
    pos: [0.1, 1.88, 0],
    emissive: 0xffb300,
    emissiveIntensity: 0.6,
    partId: 'moxie-unit',
  });
  addWorldMesh(rover.visual, new THREE.CylinderGeometry(0.32, 0.38, 1.0, 10), 0x1e293b, 0xfc3d21, {
    pos: [-1.55, 1.35, 0],
    rot: [0, 0, 0.5],
    partId: 'mmrtg',
  });
  addWorldMesh(rover.visual, new THREE.CylinderGeometry(0.08, 0.1, 1.6, 8), 0xf8f3e8, wire, {
    pos: [0.95, 2.4, 0.55],
  });
  addWorldMesh(rover.visual, new THREE.BoxGeometry(0.45, 0.32, 0.4), 0xf8f3e8, 0x00e5ff, {
    pos: [1.0, 3.25, 0.55],
    partId: 'mastcam-z',
  });
  addWorldMesh(rover.visual, new THREE.BoxGeometry(1.2, 0.12, 0.12), 0x94a3b8, wire, {
    pos: [1.75, 1.05, -0.35],
    rot: [0, 0, -0.4],
  });
  addWorldMesh(rover.visual, new THREE.CylinderGeometry(0.18, 0.18, 0.22, 8), 0xfc3d21, 0xf2ebdd, {
    pos: [2.3, 0.8, -0.35],
    rot: [Math.PI / 2, 0, 0],
  });
  const wheels: THREE.Mesh[] = [];
  for (const side of [-1.05, 1.05]) {
    addWorldMesh(rover.visual, new THREE.BoxGeometry(2.2, 0.1, 0.1), 0x64748b, wire, { pos: [0, 0.85, side] });
    for (const wx of [-0.95, 0, 0.95]) {
      wheels.push(
        addWorldMesh(rover.visual, new THREE.CylinderGeometry(0.42, 0.42, 0.38, 16), 0x1f2937, 0xfdba74, {
          pos: [wx, 0.42, side],
          rot: [Math.PI / 2, 0, 0],
        }),
      );
    }
  }
  runtimes['rover-moxie'] = rover;

  const bracketMats: THREE.LineBasicMaterial[] = [];
  for (const id of COLONY_WORLD_MODULE_IDS) {
    const rt = runtimes[id];
    const meta = COLONY_WORLD_MODULES[id];
    rt.group.userData.worldModuleId = id;
    rt.group.traverse((o) => {
      o.userData.worldModuleId = id;
    });

    rt.group.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(rt.visual);
    box.translate(rt.group.position.clone().negate());
    box.expandByScalar(0.35);
    const bracketMat = new THREE.LineBasicMaterial({
      color: COLONY_HIGHLIGHT_HEX,
      transparent: true,
      opacity: 1,
      depthTest: false,
      fog: false,
    });
    bracketMats.push(bracketMat);
    const brackets = new THREE.LineSegments(createCornerBracketGeometry(box), bracketMat);
    brackets.renderOrder = 10;
    brackets.visible = false;
    brackets.raycast = () => undefined;

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(meta.outlineRadius, meta.outlineRadius + 0.3, 56),
      new THREE.MeshBasicMaterial({
        color: COLONY_HIGHLIGHT_HEX,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.07;
    ring.visible = false;
    ring.raycast = () => undefined;

    rt.motionRoot.add(brackets, ring);
    rt.brackets = brackets;
    rt.ring = ring;
    modules[id] = rt.group;
    root.add(rt.group);
  }

  const dust = createWorldParticles(Math.max(1, atmo.dustStormCount), atmo.dustColor, 0.32);
  const radiation = createWorldParticles(1400, 0xfc3d21, 0.26);
  root.add(dust, radiation);

  let hoveredId: ColonyWorldModuleId | null = null;
  let selectedId: ColonyWorldModuleId | null = null;
  let state: ColonyWorldStateOptions = { ...options, siteId };
  let shieldTarget = 0.06;
  let panelTiltTarget = isLunar ? 1.35 : 0.38;
  let dustTarget = atmo.dustBaseCount;
  let radiationTarget = 0;
  let dustCurrent = atmo.dustBaseCount;
  let radiationCurrent = 0;
  let fogTarget = atmo.fogDensity;
  let sunTarget = atmo.sunIntensity;
  let roverAngle = 0;
  let roverMoving = true;

  const applyBaseEmissive = (mat: THREE.MeshStandardMaterial, hex: number, intensity: number, owner: ColonyWorldModuleId) => {
    mat.userData.baseEmissive = { hex, intensity };
    if (hoveredId !== owner) {
      mat.emissive.setHex(hex);
      mat.emissiveIntensity = intensity;
    }
  };

  const applyHoverTint = (id: ColonyWorldModuleId, on: boolean) => {
    runtimes[id].visual.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (!mat || !mat.isMeshStandardMaterial) return;
      if (!mat.userData.baseEmissive) {
        mat.userData.baseEmissive = { hex: mat.emissive.getHex(), intensity: mat.emissiveIntensity };
      }
      if (on) {
        mat.emissive.setHex(COLONY_HIGHLIGHT_HEX);
        mat.emissiveIntensity = Math.max(0.3, (mat.userData.baseEmissive.intensity as number) * 0.6);
      } else {
        mat.emissive.setHex(mat.userData.baseEmissive.hex as number);
        mat.emissiveIntensity = mat.userData.baseEmissive.intensity as number;
      }
    });
  };

  const refreshHighlights = () => {
    for (const id of COLONY_WORLD_MODULE_IDS) {
      const rt = runtimes[id];
      const isHover = hoveredId === id;
      const isSel = selectedId === id;
      rt.brackets.visible = isHover || rt.pulseT > 0;
      rt.ring.visible = isHover || isSel;
      (rt.ring.material as THREE.MeshBasicMaterial).opacity = isHover ? 0.9 : 0.55;
    }
  };

  const updateState = (next: ColonyWorldStateOptions) => {
    state = { ...state, ...next, siteId };
    const deployed = isStormShieldDeployed(state);
    const powerVal = state.powerPercent ?? 80;
    const isBlackout = Boolean(state.isLowPowerBlackout);

    shieldTarget = deployed ? 1 : 0.06;
    const alertHex = state.isSolarStorm || state.isEnvironmentalAlert ? 0xffb300 : 0x00e5ff;
    shieldMat.color.setHex(alertHex);
    shieldMat.emissive.setHex(alertHex);
    shieldMat.emissiveIntensity = deployed ? 0.5 : 0.25;
    shieldWireMat.color.setHex(alertHex);
    shieldMat.userData.baseEmissive = { hex: alertHex, intensity: shieldMat.emissiveIntensity };

    const stow = deployed || Boolean(state.isDustStorm);
    if (stow) {
      panelTiltTarget = isLunar ? 0.12 : 1.45;
    } else if (state.isRimShadowPass) {
      panelTiltTarget = 1.5;
    } else {
      panelTiltTarget = isLunar ? 1.35 : 0.38;
    }

    const battHex = powerVal < 15 ? 0xfc3d21 : powerVal < 40 ? 0xd97706 : 0x2e7d4f;
    const battMat = batteryMesh.material as THREE.MeshStandardMaterial;
    battMat.color.setHex(battHex);
    applyBaseEmissive(battMat, battHex, 0.35, 'power-grid');

    for (const w of portholes) {
      const mat = w.material as THREE.MeshStandardMaterial;
      mat.color.setHex(isBlackout ? 0x0f172a : 0xf8f3e8);
      applyBaseEmissive(mat, 0xfef08a, isBlackout ? 0.02 : 0.8, 'oxygen-module');
    }
    for (const rad of radiators) {
      const mat = rad.material as THREE.MeshStandardMaterial;
      applyBaseEmissive(mat, state.isEnvironmentalAlert ? 0xffb300 : 0x000000, state.isEnvironmentalAlert ? 0.6 : 0, 'oxygen-module');
    }

    const wilted = Boolean(state.isGreenhouseWilted);
    const cropMat = cropMesh.material as THREE.MeshStandardMaterial;
    cropMat.color.setHex(wilted ? 0x991b1b : 0x2e7d4f);
    applyBaseEmissive(cropMat, wilted ? 0xfc3d21 : 0x2e7d4f, wilted ? 0.3 : 0.55, 'greenhouse');
    growLight.intensity = isBlackout ? 0 : 2.4;
    for (const led of ledMeshes) {
      applyBaseEmissive(led.material as THREE.MeshStandardMaterial, 0xd946ef, isBlackout ? 0.05 : 1.1, 'greenhouse');
    }

    const moxieMat = moxieMesh.material as THREE.MeshStandardMaterial;
    applyBaseEmissive(moxieMat, 0xffb300, isBlackout ? 0.05 : 0.6, 'rover-moxie');
    roverMoving = !isBlackout;

    dustTarget = state.isDustStorm ? atmo.dustStormCount : atmo.dustBaseCount;
    radiationTarget = state.isSolarStorm ? 1400 : state.isEnvironmentalAlert ? 700 : 0;
    (radiation.material as THREE.PointsMaterial).color.setHex(state.isSolarStorm ? 0xfc3d21 : 0xffb300);
    fogTarget = atmo.fogDensity * (state.isDustStorm ? 1.9 : 1);
    sunTarget = atmo.sunIntensity * (state.isDustStorm ? 0.45 : state.isRimShadowPass ? 0.35 : 1);
  };

  updateState(state);
  refreshHighlights();
  shieldDome.scale.y = shieldTarget;
  for (const p of panelPivots) p.tilt.rotation.x = panelTiltTarget;
  dustCurrent = dustTarget;
  radiationCurrent = radiationTarget;
  dust.geometry.setDrawRange(0, Math.round(dustCurrent));
  radiation.geometry.setDrawRange(0, Math.round(radiationCurrent));
  fog.density = fogTarget;
  sun.intensity = sunTarget;

  const setHovered = (id: ColonyWorldModuleId | null) => {
    if (id === hoveredId) return;
    const prev = hoveredId;
    hoveredId = id;
    if (prev) applyHoverTint(prev, false);
    if (id) applyHoverTint(id, true);
    refreshHighlights();
  };

  const setSelected = (id: ColonyWorldModuleId | null) => {
    selectedId = id;
    refreshHighlights();
  };

  const pulse = (id: ColonyWorldModuleId) => {
    runtimes[id].pulseT = 0.7;
    refreshHighlights();
  };

  const getModuleAnchor = (id: ColonyWorldModuleId, out: THREE.Vector3) => {
    runtimes[id].motionRoot.getWorldPosition(out);
    out.y += COLONY_WORLD_MODULES[id].labelHeight;
    return out;
  };

  const replaceModuleVisual = (id: ColonyWorldModuleId, object: THREE.Object3D) => {
    const rt = runtimes[id];
    const meta = COLONY_WORLD_MODULES[id];
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.z, 0.001);
    const scale = (meta.outlineRadius * 1.7) / maxDim;
    object.scale.setScalar(scale);
    object.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    object.traverse((o) => {
      o.userData.worldModuleId = id;
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    rt.motionRoot.remove(rt.visual);
    disposeObject3D(rt.visual);
    const wrapper = new THREE.Group();
    wrapper.userData.worldModuleId = id;
    wrapper.add(object);
    rt.visual = wrapper;
    rt.motionRoot.add(wrapper);
  };

  const animate = (elapsedSec: number, dtSec: number) => {
    const k = Math.min(1, dtSec * 3);

    shieldDome.scale.y += (shieldTarget - shieldDome.scale.y) * k;
    shieldMat.opacity = shieldTarget > 0.5 ? 0.24 + Math.sin(elapsedSec * 4) * 0.06 : 0.18;

    for (let i = 0; i < panelPivots.length; i++) {
      const p = panelPivots[i];
      p.tilt.rotation.x += (panelTiltTarget - p.tilt.rotation.x) * k;
      const trackYaw = isLunar ? Math.atan2(sunDir.x, sunDir.z) - Math.PI : Math.sin(elapsedSec * 0.05) * 0.5;
      p.yaw.rotation.y += (trackYaw - p.yaw.rotation.y) * Math.min(1, dtSec * 0.8);
    }

    const earthYaw = Math.atan2(WORLD_EARTH_DIRECTION[0], WORLD_EARTH_DIRECTION[2]);
    const yawGoal = state.commsActive ? earthYaw : earthYaw + Math.sin(elapsedSec * 0.25) * 0.6;
    dishYaw.rotation.y += (yawGoal - dishYaw.rotation.y) * Math.min(1, dtSec * (state.commsActive ? 3 : 0.8));
    const blink = state.commsActive ? Math.sin(elapsedSec * 14) > 0 : Math.sin(elapsedSec * 3) > 0.6;
    beaconMat.emissiveIntensity = blink ? 1.4 : 0.15;

    if (roverMoving) {
      roverAngle += dtSec * 0.09;
      const rx = Math.cos(roverAngle) * 2.4;
      const rz = Math.sin(roverAngle) * 1.6;
      const tx = -Math.sin(roverAngle) * 2.4;
      const tz = Math.cos(roverAngle) * 1.6;
      rover.motionRoot.position.set(rx, 0, rz);
      rover.visual.rotation.y = Math.atan2(-tz, tx);
      for (const w of wheels) w.rotation.y -= dtSec * 1.8;
    }

    for (const id of COLONY_WORLD_MODULE_IDS) {
      const rt = runtimes[id];
      if (rt.pulseT > 0) {
        rt.pulseT = Math.max(0, rt.pulseT - dtSec);
        const s = 1 + Math.sin((rt.pulseT / 0.7) * Math.PI) * 0.06;
        rt.visual.scale.setScalar(s);
        if (rt.pulseT === 0) {
          rt.visual.scale.setScalar(1);
          refreshHighlights();
        }
      }
    }
    for (const m of bracketMats) {
      m.opacity = 0.7 + Math.sin(elapsedSec * 6) * 0.3;
    }

    dustCurrent += (dustTarget - dustCurrent) * k;
    radiationCurrent += (radiationTarget - radiationCurrent) * k;
    dust.geometry.setDrawRange(0, Math.round(dustCurrent));
    radiation.geometry.setDrawRange(0, Math.round(radiationCurrent));
    if (dustCurrent > 1) {
      const arr = (dust.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const speed = state.isDustStorm ? 9 : 1.6;
      const n = Math.round(dustCurrent) * 3;
      for (let i = 0; i < n; i += 3) {
        arr[i] += dtSec * speed;
        arr[i + 1] += Math.sin(elapsedSec + i) * dtSec * 0.2;
        if (arr[i] > 70) arr[i] = -70;
      }
      dust.geometry.attributes.position.needsUpdate = true;
    }
    if (radiationCurrent > 1) {
      const arr = (radiation.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const n = Math.round(radiationCurrent) * 3;
      for (let i = 0; i < n; i += 3) {
        arr[i + 1] -= dtSec * 14;
        if (arr[i + 1] < 0.3) arr[i + 1] = 26;
      }
      radiation.geometry.attributes.position.needsUpdate = true;
    }

    fog.density += (fogTarget - fog.density) * k;
    sun.intensity += (sunTarget - sun.intensity) * k;
  };

  return {
    group: root,
    fog,
    atmosphere: atmo,
    pickables: COLONY_WORLD_MODULE_IDS.map((id) => runtimes[id].group),
    modules,
    updateState,
    setHovered,
    setSelected,
    pulse,
    getModuleAnchor,
    replaceModuleVisual,
    animate,
  };
}

/**
 * Catálogo opcional de `.glb`/`.gltf` por módulo del mundo en `public/models/`.
 * Vacío por defecto: el mundo usa geometría procedural y cero peticiones (sin 404).
 */
export const COLONY_WORLD_GLB_ASSETS: Partial<Record<ColonyWorldModuleId, string>> = {};

export function resolveColonyModuleGlbUrl(
  moduleId: ColonyWorldModuleId,
  baseUrlOverride?: string,
): string | null {
  const file = COLONY_WORLD_GLB_ASSETS[moduleId];
  if (!file) return null;
  return resolveExternalModelUrl('colony-base', file, baseUrlOverride);
}
