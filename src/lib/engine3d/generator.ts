export type PrimitiveShape =
  | 'box'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'torus'
  | 'capsule'
  | 'octahedron'
  | 'dodecahedron';

export interface MeshPart {
  id: string;
  name: string;
  segmentLabel: string;
  shape: PrimitiveShape;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
  segmentColor: string;
  roughness: number;
  metalness: number;
  emissive?: string;
  boneName?: string;
}

export interface BoneNode {
  name: string;
  parent: string | null;
  position: [number, number, number];
}

export interface ProceduralMeshData {
  version: number;
  archetype: string;
  category: string;
  parts: MeshPart[];
  bones: BoneNode[];
  animations: string[];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    dimensions: [number, number, number];
  };
  pbrMaps?: {
    albedoTint: string;
    roughnessBase: number;
    metalnessBase: number;
    normalStrength: number;
    resolution: '2K' | '4K' | '8K';
    pattern: 'metallic_armor' | 'organic_skin' | 'stylized_cel' | 'cyber_neon' | 'stone_weathered' | 'wood_grain';
  };
  uvUnwrapped?: boolean;
  uvIslands?: number;
  uvCoverage?: number;
  originalFaces?: number;
  originalVertices?: number;
  customVertices?: number[][];
  customFaces?: number[][];
}

const SEGMENT_PALETTE = [
  '#f5c518', // Gold
  '#38bdf8', // Cyan
  '#f43f5e', // Rose
  '#22c55e', // Emerald
  '#a855f7', // Purple
  '#fb923c', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function pickPalette(prompt: string): {
  primary: string;
  secondary: string;
  accent: string;
  dark: string;
  roughness: number;
  metalness: number;
} {
  const p = prompt.toLowerCase();
  if (p.includes('gold') || p.includes('paladin') || p.includes('royal') || p.includes('sun')) {
    return { primary: '#d4af37', secondary: '#2c3545', accent: '#ffe14d', dark: '#171923', roughness: 0.25, metalness: 0.85 };
  }
  if (p.includes('cyber') || p.includes('neon') || p.includes('mecha') || p.includes('sci-fi') || p.includes('robot')) {
    return { primary: '#1e293b', secondary: '#0ea5e9', accent: '#38bdf8', dark: '#0f172a', roughness: 0.2, metalness: 0.88 };
  }
  if (p.includes('dragon') || p.includes('lava') || p.includes('fire') || p.includes('demon') || p.includes('crimson')) {
    return { primary: '#991b1b', secondary: '#450a0a', accent: '#f97316', dark: '#1c1917', roughness: 0.48, metalness: 0.35 };
  }
  if (p.includes('forest') || p.includes('elf') || p.includes('nature') || p.includes('moss') || p.includes('jade')) {
    return { primary: '#166534', secondary: '#78350f', accent: '#4ade80', dark: '#14532d', roughness: 0.65, metalness: 0.15 };
  }
  if (p.includes('ice') || p.includes('crystal') || p.includes('frost') || p.includes('magic') || p.includes('arcane')) {
    return { primary: '#6366f1', secondary: '#312e81', accent: '#67e8f9', dark: '#1e1b4b', roughness: 0.15, metalness: 0.7 };
  }
  const seed = hashSeed(prompt);
  const hues = [
    { primary: '#64748b', secondary: '#334155', accent: '#f5c518', dark: '#1e293b', roughness: 0.35, metalness: 0.65 },
    { primary: '#7c2d12', secondary: '#431407', accent: '#fbbf24', dark: '#1c1917', roughness: 0.55, metalness: 0.3 },
    { primary: '#3b82f6', secondary: '#1d4ed8', accent: '#facc15', dark: '#172554', roughness: 0.3, metalness: 0.6 },
    { primary: '#52525b', secondary: '#27272a', accent: '#a855f7', dark: '#18181b', roughness: 0.28, metalness: 0.78 },
  ];
  return hues[seed % hues.length];
}

export function inferCategoryFromPrompt(prompt: string, fallback = 'character'): string {
  const p = prompt.toLowerCase();
  if (p.includes('car') || p.includes('ship') || p.includes('mech') || p.includes('vehicle') || p.includes('racing') || p.includes('rover')) return 'vehicle';
  if (p.includes('dragon') || p.includes('wolf') || p.includes('tiger') || p.includes('cat') || p.includes('creature') || p.includes('monster')) return 'animal';
  if (p.includes('castle') || p.includes('house') || p.includes('tower') || p.includes('temple') || p.includes('building') || p.includes('shrine')) return 'architecture';
  if (p.includes('sword') || p.includes('blade') || p.includes('axe') || p.includes('bow') || p.includes('shield') || p.includes('rifle') || p.includes('weapon')) return 'weapon';
  if (p.includes('chair') || p.includes('sofa') || p.includes('table') || p.includes('lamp') || p.includes('desk')) return 'furniture';
  if (p.includes('chest') || p.includes('potion') || p.includes('crate') || p.includes('barrel') || p.includes('relic')) return 'props';
  if (p.includes('print') || p.includes('miniature') || p.includes('figurine')) return '3d_printing';
  if (p.includes('tree') || p.includes('rock') || p.includes('flower') || p.includes('crystal')) return 'nature';
  return fallback;
}

const HUMANOID_BONES: BoneNode[] = [
  { name: 'Hips', parent: null, position: [0, 0.95, 0] },
  { name: 'Spine', parent: 'Hips', position: [0, 1.35, 0] },
  { name: 'Chest', parent: 'Spine', position: [0, 1.65, 0] },
  { name: 'Neck', parent: 'Chest', position: [0, 1.9, 0] },
  { name: 'Head', parent: 'Neck', position: [0, 2.1, 0] },
  { name: 'LeftShoulder', parent: 'Chest', position: [-0.35, 1.72, 0] },
  { name: 'LeftArm', parent: 'LeftShoulder', position: [-0.55, 1.4, 0] },
  { name: 'LeftHand', parent: 'LeftArm', position: [-0.62, 1.05, 0] },
  { name: 'RightShoulder', parent: 'Chest', position: [0.35, 1.72, 0] },
  { name: 'RightArm', parent: 'RightShoulder', position: [0.55, 1.4, 0] },
  { name: 'RightHand', parent: 'RightArm', position: [0.62, 1.05, 0] },
  { name: 'LeftUpLeg', parent: 'Hips', position: [-0.2, 0.85, 0] },
  { name: 'LeftLeg', parent: 'LeftUpLeg', position: [-0.22, 0.45, 0] },
  { name: 'LeftFoot', parent: 'LeftLeg', position: [-0.22, 0.08, 0.08] },
  { name: 'RightUpLeg', parent: 'Hips', position: [0.2, 0.85, 0] },
  { name: 'RightLeg', parent: 'RightUpLeg', position: [0.22, 0.45, 0] },
  { name: 'RightFoot', parent: 'RightLeg', position: [0.22, 0.08, 0.08] },
];

export function synthesizeProceduralMesh(options: {
  prompt: string;
  category?: string;
  generationMode?: 'HD_MODEL' | 'SMART_MESH' | string;
  topology?: 'TRIANGLE' | 'QUAD' | string;
  targetPolycount?: number;
  textureQuality?: '2K' | '4K' | '8K' | 'NONE' | string;
  hasPbr?: boolean;
  isSegmented?: boolean;
  isRigged?: boolean;
}): {
  meshData: ProceduralMeshData;
  vertices: number;
  faces: number;
} {
  const category = options.category || inferCategoryFromPrompt(options.prompt);
  const pal = pickPalette(options.prompt);
  const parts: MeshPart[] = [];

  const addPart = (
    name: string,
    segmentLabel: string,
    shape: PrimitiveShape,
    position: [number, number, number],
    rotation: [number, number, number],
    scale: [number, number, number],
    color: string,
    boneName?: string,
    emissive?: string
  ) => {
    const idx = parts.length;
    parts.push({
      id: `part_${idx + 1}`,
      name,
      segmentLabel,
      shape,
      position,
      rotation,
      scale,
      color,
      segmentColor: SEGMENT_PALETTE[idx % SEGMENT_PALETTE.length],
      roughness: pal.roughness,
      metalness: pal.metalness,
      boneName,
      emissive,
    });
  };

  if (category === 'vehicle' || category === 'machine') {
    addPart('Chassis Core', 'Chassis', 'box', [0, 0.55, 0], [0, 0, 0], [1.2, 0.42, 2.3], pal.primary, 'Hips');
    addPart('Aero Cockpit Canopy', 'Cockpit', 'sphere', [0, 0.85, -0.1], [0, 0, 0], [0.82, 0.38, 1.15], pal.accent, 'Chest', pal.accent);
    addPart('Front Nose Splitter', 'FrontBumper', 'cone', [0, 0.48, 1.35], [Math.PI / 2, 0, 0], [0.95, 0.65, 0.35], pal.secondary, 'Spine');
    addPart('Rear Thruster Turbine L', 'ThrusterL', 'cylinder', [-0.35, 0.58, -1.25], [Math.PI / 2, 0, 0], [0.24, 0.35, 0.24], pal.accent, 'Hips', pal.accent);
    addPart('Rear Thruster Turbine R', 'ThrusterR', 'cylinder', [0.35, 0.58, -1.25], [Math.PI / 2, 0, 0], [0.24, 0.35, 0.24], pal.accent, 'Hips', pal.accent);
    addPart('Rear Spoiler Wing', 'Spoiler', 'box', [0, 0.98, -1.05], [-0.15, 0, 0], [1.45, 0.08, 0.42], pal.secondary, 'Chest');
    addPart('Wheel Front Left', 'WheelFL', 'cylinder', [-0.68, 0.32, 0.75], [0, 0, Math.PI / 2], [0.32, 0.24, 0.32], pal.dark, 'LeftLeg');
    addPart('Wheel Front Right', 'WheelFR', 'cylinder', [0.68, 0.32, 0.75], [0, 0, Math.PI / 2], [0.32, 0.24, 0.32], pal.dark, 'RightLeg');
    addPart('Wheel Rear Left', 'WheelRL', 'cylinder', [-0.68, 0.34, -0.75], [0, 0, Math.PI / 2], [0.35, 0.26, 0.35], pal.dark, 'LeftFoot');
    addPart('Wheel Rear Right', 'WheelRR', 'cylinder', [0.68, 0.34, -0.75], [0, 0, Math.PI / 2], [0.35, 0.26, 0.35], pal.dark, 'RightFoot');
  } else if (category === 'weapon') {
    addPart('Pommel Gemstone', 'Pommel', 'octahedron', [0, 0.18, 0], [0, 0, 0], [0.16, 0.2, 0.16], pal.accent, 'Hips', pal.accent);
    addPart('Wrapped Grip', 'Grip', 'cylinder', [0, 0.52, 0], [0, 0, 0], [0.09, 0.52, 0.09], pal.secondary, 'Spine');
    addPart('Runic Crossguard', 'Crossguard', 'box', [0, 0.85, 0], [0, 0, 0], [0.85, 0.14, 0.2], pal.primary, 'Chest');
    addPart('Core Energy Rune', 'RuneCore', 'dodecahedron', [0, 0.85, 0], [0, 0, 0], [0.18, 0.18, 0.18], pal.accent, 'Chest', pal.accent);
    addPart('Lower Fuller Blade', 'BladeLower', 'box', [0, 1.45, 0], [0, 0, 0], [0.24, 1.1, 0.06], pal.primary, 'Head');
    addPart('Beveled Blade Tip', 'BladeTip', 'cone', [0, 2.22, 0], [0, 0, 0], [0.18, 0.5, 0.06], pal.accent, 'Head');
  } else if (category === 'architecture') {
    addPart('Citadel Foundation Base', 'Foundation', 'cylinder', [0, 0.15, 0], [0, 0, 0], [1.45, 0.3, 1.45], pal.dark, 'Hips');
    addPart('Main Sanctuary Keep', 'MainKeep', 'box', [0, 0.85, 0], [0, 0, 0], [1.3, 1.1, 1.3], pal.primary, 'Spine');
    addPart('Pagoda Eave Tier 1', 'RoofTier1', 'cone', [0, 1.55, 0], [0, Math.PI / 4, 0], [1.25, 0.45, 1.25], pal.secondary, 'Chest');
    addPart('Upper Lantern Spire', 'UpperTower', 'box', [0, 1.95, 0], [0, 0, 0], [0.75, 0.65, 0.75], pal.primary, 'Neck');
    addPart('Imperial Spire Roof', 'RoofCrown', 'cone', [0, 2.5, 0], [0, Math.PI / 4, 0], [0.85, 0.58, 0.85], pal.accent, 'Head');
    addPart('Corner Watchtower NW', 'WatchtowerNW', 'cylinder', [-0.82, 0.7, 0.82], [0, 0, 0], [0.22, 1.1, 0.22], pal.secondary, 'LeftArm');
    addPart('Corner Watchtower NE', 'WatchtowerNE', 'cylinder', [0.82, 0.7, 0.82], [0, 0, 0], [0.22, 1.1, 0.22], pal.secondary, 'RightArm');
    addPart('Portal Archway', 'Portal', 'torus', [0, 0.55, 0.68], [0, 0, 0], [0.32, 0.42, 0.15], pal.accent, 'Hips', pal.accent);
  } else if (category === 'animal') {
    addPart('Beast Thorax', 'Torso', 'capsule', [0, 1.05, 0.1], [Math.PI / 2.2, 0, 0], [0.46, 0.95, 0.46], pal.primary, 'Spine');
    addPart('Armored Neck', 'Neck', 'cylinder', [0, 1.48, 0.62], [-0.45, 0, 0], [0.26, 0.55, 0.26], pal.secondary, 'Neck');
    addPart('Dragon Snout & Skull', 'Head', 'dodecahedron', [0, 1.78, 0.92], [0.2, 0, 0], [0.34, 0.3, 0.48], pal.primary, 'Head');
    addPart('Left Crest Horn', 'HornL', 'cone', [-0.18, 2.05, 0.72], [-0.5, 0, 0.25], [0.08, 0.42, 0.08], pal.accent, 'Head');
    addPart('Right Crest Horn', 'HornR', 'cone', [0.18, 2.05, 0.72], [-0.5, 0, -0.25], [0.08, 0.42, 0.08], pal.accent, 'Head');
    addPart('Left Wing Membrane', 'WingL', 'box', [-0.95, 1.55, 0.05], [0.15, 0.2, 0.38], [1.35, 0.06, 0.75], pal.secondary, 'LeftArm');
    addPart('Right Wing Membrane', 'WingR', 'box', [0.95, 1.55, 0.05], [0.15, -0.2, -0.38], [1.35, 0.06, 0.75], pal.secondary, 'RightArm');
    addPart('Segmented Tail', 'Tail', 'cone', [0, 0.82, -0.95], [-1.35, 0, 0], [0.2, 1.1, 0.2], pal.primary, 'Hips');
    addPart('Front Claw L', 'FrontLegL', 'cylinder', [-0.32, 0.48, 0.48], [0, 0, 0], [0.14, 0.85, 0.14], pal.dark, 'LeftLeg');
    addPart('Front Claw R', 'FrontLegR', 'cylinder', [0.32, 0.48, 0.48], [0, 0, 0], [0.14, 0.85, 0.14], pal.dark, 'RightLeg');
    addPart('Hind Leg L', 'HindLegL', 'cylinder', [-0.34, 0.48, -0.42], [0, 0, 0], [0.16, 0.85, 0.16], pal.dark, 'LeftFoot');
    addPart('Hind Leg R', 'HindLegR', 'cylinder', [0.34, 0.48, -0.42], [0, 0, 0], [0.16, 0.85, 0.16], pal.dark, 'RightFoot');
  } else {
    // Character / Game Asset / Default Biped Hero
    addPart('Heroic Helmet & Visor', 'Head', 'sphere', [0, 2.08, 0], [0, 0, 0], [0.28, 0.32, 0.3], pal.primary, 'Head');
    addPart('Glowing Visor Crest', 'Visor', 'box', [0, 2.1, 0.24], [0, 0, 0], [0.32, 0.09, 0.12], pal.accent, 'Head', pal.accent);
    addPart('Armored Chestplate', 'Torso', 'box', [0, 1.48, 0], [0, 0, 0], [0.68, 0.72, 0.42], pal.primary, 'Chest');
    addPart('Reactor Chest Emblem', 'CoreEmblem', 'octahedron', [0, 1.56, 0.23], [0, 0, 0], [0.15, 0.15, 0.1], pal.accent, 'Chest', pal.accent);
    addPart('Tactical Belt & Pelvis', 'Pelvis', 'cylinder', [0, 1.0, 0], [0, 0, 0], [0.32, 0.25, 0.26], pal.secondary, 'Hips');
    addPart('Left Pauldron Armor', 'ShoulderL', 'dodecahedron', [-0.48, 1.74, 0], [0, 0, 0.25], [0.22, 0.2, 0.22], pal.secondary, 'LeftShoulder');
    addPart('Right Pauldron Armor', 'ShoulderR', 'dodecahedron', [0.48, 1.74, 0], [0, 0, -0.25], [0.22, 0.2, 0.22], pal.secondary, 'RightShoulder');
    addPart('Left Gauntlet & Arm', 'ArmL', 'capsule', [-0.56, 1.32, 0], [0, 0, 0.12], [0.13, 0.56, 0.13], pal.primary, 'LeftArm');
    addPart('Right Gauntlet & Arm', 'ArmR', 'capsule', [0.56, 1.32, 0], [0, 0, -0.12], [0.13, 0.56, 0.13], pal.primary, 'RightArm');
    addPart('Equipped Energy Blade', 'WeaponHand', 'box', [0.64, 1.15, 0.45], [0.95, 0, 0], [0.06, 0.92, 0.14], pal.accent, 'RightHand', pal.accent);
    addPart('Left Greave & Thigh', 'LegL', 'capsule', [-0.22, 0.52, 0], [0, 0, 0], [0.16, 0.78, 0.16], pal.secondary, 'LeftLeg');
    addPart('Right Greave & Thigh', 'LegR', 'capsule', [0.22, 0.52, 0], [0, 0, 0], [0.16, 0.78, 0.16], pal.secondary, 'RightLeg');
    addPart('Left Armored Boot', 'BootL', 'box', [-0.22, 0.09, 0.08], [0, 0, 0], [0.2, 0.16, 0.34], pal.dark, 'LeftFoot');
    addPart('Right Armored Boot', 'BootR', 'box', [0.22, 0.09, 0.08], [0, 0, 0], [0.2, 0.16, 0.34], pal.dark, 'RightFoot');
    addPart('Sculpted Pedestal Base', 'Pedestal', 'cylinder', [0, 0.02, 0], [0, 0, 0], [0.85, 0.05, 0.85], pal.dark, 'Hips');
  }

  const isSmartMesh = options.generationMode === 'SMART_MESH';
  const defaultFaces = isSmartMesh ? 12480 : 148600;
  const faces = Math.max(
    500,
    Math.min(2_000_000, options.targetPolycount || defaultFaces)
  );
  const vertices =
    (options.topology || (isSmartMesh ? 'QUAD' : 'TRIANGLE')) === 'QUAD'
      ? Math.round(faces * 0.98)
      : Math.round(faces * 0.52);

  const meshData: ProceduralMeshData = {
    version: 3,
    archetype: category,
    category,
    parts,
    bones: HUMANOID_BONES,
    animations: [
      '#1',
      '#2',
      '#3',
      '#4',
      'Afraid',
      'Agree',
      'Alert',
      'Angry',
      'Annoyed',
      'Arrogant',
      'Attack',
      'Back Off',
      'Bark',
      'Bashful',
      'Battle',
      'Beat',
      'Idle',
      'Walk',
      'Run',
      'Jump',
      'Dance',
      'Combat',
      'Cheer',
      'Bow',
      'Cast_a_Spell',
      'Flip',
    ],
    boundingBox: {
      min: [-1.1, 0, -1.2],
      max: [1.1, 2.45, 1.2],
      dimensions: [2.2, 2.45, 2.4],
    },
    pbrMaps: {
      albedoTint: pal.primary,
      roughnessBase: pal.roughness,
      metalnessBase: pal.metalness,
      normalStrength: 1.0,
      resolution: (options.textureQuality as '2K' | '4K' | '8K') || '4K',
      pattern: 'metallic_armor',
    },
    uvUnwrapped: isSmartMesh,
    uvIslands: parts.length * 2,
    uvCoverage: 0.84,
    originalFaces: faces,
    originalVertices: vertices,
  };

  return { meshData, vertices, faces };
}

export function calculateGenerationCreditCost(input: {
  generationMode: 'HD_MODEL' | 'SMART_MESH' | string;
  aiModel: string;
  generateInParts?: boolean;
  textureQuality?: string;
  userTrials: {
    smartMeshTrials: number;
    partGenTrials: number;
    texture8kTrials: number;
  };
}) {
  let baseCost = 55;
  let usedSmartMeshTrial = false;
  let usedPartGenTrial = false;
  let usedTexture8kTrial = false;

  if (input.generationMode === 'SMART_MESH' || input.aiModel === 'P2.0') {
    if (input.userTrials.smartMeshTrials > 0) {
      baseCost = 0;
      usedSmartMeshTrial = true;
    } else {
      baseCost = 100;
    }
  } else {
    if (input.aiModel.startsWith('H3.0')) baseCost = 35;
    else if (input.aiModel.startsWith('H2.5')) baseCost = 25;
    else baseCost = 55; // H3.1 Best Quality
  }

  if (input.generateInParts) {
    if (input.userTrials.partGenTrials > 0) {
      usedPartGenTrial = true;
    } else {
      baseCost += 20;
    }
  }

  if (input.textureQuality === '8K') {
    if (input.userTrials.texture8kTrials > 0) {
      usedTexture8kTrial = true;
    } else {
      baseCost += 20;
    }
  }

  return {
    creditCost: baseCost,
    usedSmartMeshTrial,
    usedPartGenTrial,
    usedTexture8kTrial,
  };
}
