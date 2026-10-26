import { AccountAdmissionError } from '@/lib/account-admission/errors';
import type { ProceduralMeshData } from './generator';

export type PipelineStageAction =
  | 'segment'
  | 'fill_parts'
  | 'retopo'
  | 'smart_uv'
  | 'texture'
  | 'pbr_generate'
  | 'upscale_4k'
  | 'upscale_8k'
  | 'rig'
  | 'animate';

export interface PipelineProcessInput {
  action: PipelineStageAction;
  currentTopology: string;
  currentFaces: number;
  currentVertices: number;
  isRigged: boolean;
  isSegmented: boolean;
  meshData: ProceduralMeshData;
  params?: {
    targetTopology?: 'TRIANGLE' | 'QUAD';
    targetPolycount?: number;
    texturePrompt?: string;
    textureStyle?: 'metallic_armor' | 'organic_skin' | 'stylized_cel' | 'cyber_neon' | 'stone_weathered' | 'wood_grain';
    albedoColor?: string;
    roughness?: number;
    metalness?: number;
    animationClip?: string;
  };
}

export function processAssetPipelineStage(input: PipelineProcessInput): {
  creditCost: number;
  topology: string;
  faces: number;
  vertices: number;
  hasTexture: boolean;
  textureQuality: string;
  hasPbr: boolean;
  hasSmartUv: boolean;
  isSegmented: boolean;
  isRigged: boolean;
  activeAnimation: string | null;
  meshData: ProceduralMeshData;
  summary: string;
} {
  const nextMesh: ProceduralMeshData = JSON.parse(JSON.stringify(input.meshData));
  let topology = input.currentTopology;
  let faces = input.currentFaces;
  let vertices = input.currentVertices;
  let hasTexture = true;
  let textureQuality = nextMesh.pbrMaps?.resolution || '4K';
  let hasPbr = true;
  let hasSmartUv = Boolean(nextMesh.uvUnwrapped);
  let isSegmented = input.isSegmented;
  let isRigged = input.isRigged;
  let activeAnimation: string | null = null;
  let creditCost = 10;
  let summary = '';

  switch (input.action) {
    case 'segment': {
      // Observed Tripo Studio rule: "Unavailable for: Quad models, Rigged models"
      if (topology === 'QUAD' || isRigged) {
        throw new AccountAdmissionError(
          400,
          'SEGMENTATION_UNAVAILABLE_FOR_QUAD_OR_RIGGED',
          'Part Segmentation is unavailable for Quad models and Rigged models. Convert topology to Triangle first.'
        );
      }
      creditCost = 40;
      isSegmented = true;
      const palette = ['#f5c518', '#38bdf8', '#f43f5e', '#22c55e', '#a855f7', '#fb923c', '#ec4899', '#14b8a6'];
      nextMesh.parts = nextMesh.parts.map((part, idx) => ({
        ...part,
        segmentColor: palette[idx % palette.length],
      }));
      summary = `Segmented model into ${nextMesh.parts.length} semantic parts.`;
      break;
    }

    case 'fill_parts': {
      creditCost = 20;
      isSegmented = true;
      faces = Math.round(faces * 1.08);
      vertices = Math.round(vertices * 1.08);
      summary = `Completed internal occluded geometry across ${nextMesh.parts.length} mesh parts.`;
      break;
    }

    case 'retopo': {
      creditCost = 10;
      if (!nextMesh.originalFaces) {
        nextMesh.originalFaces = input.currentFaces;
      }
      if (!nextMesh.originalVertices) {
        nextMesh.originalVertices = input.currentVertices;
      }
      const targetTopo =
        input.params?.targetTopology ||
        ((input.params as any)?.topology as 'TRIANGLE' | 'QUAD' | undefined) ||
        'QUAD';
      const targetPoly = Math.max(
        500,
        Math.min(2_000_000, Number(input.params?.targetPolycount || 15000))
      );
      topology = targetTopo;
      faces = targetPoly;
      vertices =
        targetTopo === 'QUAD'
          ? Math.round(targetPoly * 0.98)
          : Math.round(targetPoly * 0.52);
      nextMesh.originalFaces = faces;
      nextMesh.originalVertices = vertices;
      summary = `Retopologized mesh to ${targetTopo} topology (${faces.toLocaleString()} faces, ${vertices.toLocaleString()} vertices).`;
      break;
    }

    case 'smart_uv': {
      // Observed Tripo Studio rule: "Tris <= 80,000 / Quads <= 40,000"
      if (
        (topology === 'TRIANGLE' && faces > 80_000) ||
        (topology === 'QUAD' && faces > 40_000)
      ) {
        throw new AccountAdmissionError(
          400,
          'SMART_UV_POLYCOUNT_EXCEEDED',
          `Smart UV requires Tris ≤ 80,000 / Quads ≤ 40,000 (current: ${faces.toLocaleString()} ${topology.toLowerCase()} faces). Run Retopology first.`
        );
      }
      creditCost = 10;
      hasSmartUv = true;
      nextMesh.uvUnwrapped = true;
      nextMesh.uvIslands = Math.max(8, nextMesh.parts.length * 3);
      nextMesh.uvCoverage = 0.89;
      summary = `Unwrapped Smart UV atlas (${nextMesh.uvIslands} islands, 89% texel utilization).`;
      break;
    }

    case 'texture': {
      creditCost = 20;
      hasTexture = true;
      hasPbr = true;
      const tint = input.params?.albedoColor || nextMesh.pbrMaps?.albedoTint || '#f5c518';
      const rough =
        typeof input.params?.roughness === 'number'
          ? input.params.roughness
          : 0.28;
      const metal =
        typeof input.params?.metalness === 'number'
          ? input.params.metalness
          : 0.72;
      nextMesh.pbrMaps = {
        albedoTint: tint,
        roughnessBase: rough,
        metalnessBase: metal,
        normalStrength: 1.0,
        resolution: (textureQuality as '2K' | '4K' | '8K') || '4K',
        pattern: input.params?.textureStyle || 'metallic_armor',
      };
      nextMesh.parts = nextMesh.parts.map((part, idx) => ({
        ...part,
        color: idx % 3 === 0 ? tint : part.color,
        roughness: rough,
        metalness: metal,
      }));
      summary = `Generated PBR texture maps (Albedo, Normal, Roughness=${rough.toFixed(2)}, Metallic=${metal.toFixed(2)}).`;
      break;
    }

    case 'pbr_generate': {
      creditCost = 20;
      hasTexture = true;
      hasPbr = true;
      const rough =
        typeof input.params?.roughness === 'number' ? input.params.roughness : 0.24;
      const metal =
        typeof input.params?.metalness === 'number' ? input.params.metalness : 0.82;
      nextMesh.pbrMaps = {
        albedoTint: nextMesh.pbrMaps?.albedoTint || '#d4af37',
        roughnessBase: rough,
        metalnessBase: metal,
        normalStrength: 1.25,
        resolution: (textureQuality as '2K' | '4K' | '8K') || '4K',
        pattern: 'metallic_armor',
      };
      nextMesh.parts = nextMesh.parts.map((part) => ({
        ...part,
        roughness: rough,
        metalness: metal,
      }));
      summary = `Generated physically-based rendering (PBR) Metallic/Roughness/Normal maps.`;
      break;
    }

    case 'upscale_4k': {
      creditCost = 10;
      textureQuality = '4K';
      if (nextMesh.pbrMaps) {
        nextMesh.pbrMaps.resolution = '4K';
      }
      summary = 'Upscaled texture maps to 4K Ultra-Crisp resolution.';
      break;
    }

    case 'upscale_8k': {
      creditCost = 20;
      textureQuality = '8K';
      if (nextMesh.pbrMaps) {
        nextMesh.pbrMaps.resolution = '8K';
      }
      summary = 'Upscaled PBR texture maps to Ultra-HD 8K resolution.';
      break;
    }

    case 'rig': {
      creditCost = 20;
      isRigged = true;
      activeAnimation = input.params?.animationClip || 'Idle';
      summary = `Auto-rigged ${nextMesh.bones.length}-bone hierarchy and bound skin weights.`;
      break;
    }

    case 'animate': {
      if (!isRigged) {
        throw new AccountAdmissionError(
          400,
          'RIG_REQUIRED_FOR_ANIMATION',
          'Model must be rigged before applying skeletal animation clips.'
        );
      }
      creditCost = (input.params as any)?.customMotionPrompt ? 10 : 0;
      activeAnimation =
        input.params?.animationClip ||
        ((input.params as any)?.clipName as string | undefined) ||
        'Walk';
      summary = `Applied skeletal animation clip: ${activeAnimation}.`;
      break;
    }
  }

  return {
    creditCost,
    topology,
    faces,
    vertices,
    hasTexture,
    textureQuality,
    hasPbr,
    hasSmartUv,
    isSegmented,
    isRigged,
    activeAnimation,
    meshData: nextMesh,
    summary,
  };
}

export function generatePre3DImageSvgDataUri(input: {
  prompt: string;
  template: string;
  modelName: string;
  aspectRatio: string;
  resolution4k?: boolean;
}): string {
  const safePrompt = input.prompt
    .replace(/[<>&"']/g, '')
    .slice(0, 64);
  const safeTemplate = input.template.replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
    <defs>
      <radialGradient id="bg" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="#29251a"/>
        <stop offset="60%" stop-color="#121318"/>
        <stop offset="100%" stop-color="#070709"/>
      </radialGradient>
      <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#ffe14d"/>
        <stop offset="100%" stop-color="#f5c518"/>
      </linearGradient>
    </defs>
    <rect width="600" height="600" fill="url(#bg)"/>
    <g stroke="#262936" stroke-width="1" opacity="0.6">
      <line x1="0" y1="460" x2="600" y2="460"/>
      <line x1="0" y1="500" x2="600" y2="500"/>
      <line x1="300" y1="80" x2="300" y2="540" stroke-dasharray="4 4"/>
    </g>
    <!-- T-Pose / Pre-3D Silhouette -->
    <g transform="translate(300, 270)">
      <ellipse cx="0" cy="195" rx="115" ry="24" fill="#f5c518" opacity="0.18"/>
      <circle cx="0" cy="-115" r="36" fill="url(#gold)" opacity="0.9"/>
      <rect x="-48" y="-70" width="96" height="120" rx="16" fill="#38bdf8" opacity="0.82"/>
      <rect x="-145" y="-62" width="90" height="26" rx="12" fill="url(#gold)" opacity="0.85"/>
      <rect x="55" y="-62" width="90" height="26" rx="12" fill="url(#gold)" opacity="0.85"/>
      <rect x="-42" y="56" width="32" height="125" rx="12" fill="#94a3b8" opacity="0.9"/>
      <rect x="10" y="56" width="32" height="125" rx="12" fill="#94a3b8" opacity="0.9"/>
    </g>
    <rect x="24" y="24" width="160" height="32" rx="16" fill="#191b22" stroke="#f5c518" stroke-width="1.2"/>
    <text x="104" y="45" fill="#f5c518" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="middle">${safeTemplate} • ${input.resolution4k ? '4K' : 'HD'}</text>
    <text x="300" y="555" fill="#e2e8f0" font-family="sans-serif" font-size="15" font-weight="600" text-anchor="middle">${safePrompt}</text>
    <text x="300" y="578" fill="#94a3b8" font-family="sans-serif" font-size="12" text-anchor="middle">${input.modelName} • Aspect ${input.aspectRatio}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}
