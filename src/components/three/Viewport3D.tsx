'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Sun,
  Camera,
  Grid,
  HelpCircle,
  Bone,
  Layers,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Redo2,
  Printer,
  Share2,
  Download,
  RefreshCw,
  Star,
  Bookmark,
  History,
  Pipette,
  Plus,
  Paintbrush,
  Eraser,
  Combine,
  SlidersHorizontal,
  UserCheck,
} from 'lucide-react';
import type { ProceduralMeshData } from '@/lib/engine3d/generator';

export type ViewportRenderMode =
  | 'pbr'
  | 'wireframe'
  | 'clay'
  | 'normal'
  | 'segments'
  | 'uv_checker'
  | 'matcap_silver'
  | 'matcap_gold'
  | 'matcap_obsidian'
  | 'matcap_cyan';

interface Viewport3DProps {
  meshData?: ProceduralMeshData | null;
  modelName?: string;
  topology?: string;
  vertices?: number;
  faces?: number;
  originalVertices?: number;
  originalFaces?: number;
  isSegmented?: boolean;
  isRigged?: boolean;
  showSkeletonOverride?: boolean;
  onToggleSkeleton?: (next: boolean) => void;
  activeAnimation?: string | null;
  onSelectAnimation?: (clip: string | null) => void;
  initialRenderMode?: ViewportRenderMode;
  activeWorkspaceStage?: string;
  magicBrushMode?: boolean;
  brushColorHex?: string;
  busyStageLabel?: string | null;
  compact?: boolean;
  showControls?: boolean;
  emptyPlaceholderTitle?: string;
  emptyPlaceholderSubtitle?: string;
  onSelectPart?: (partName: string) => void;
  onPaintPart?: (partName: string, colorHex: string) => void;
  onOpenExportModal?: () => void;
  onRetryModel?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  hiddenParts?: Record<string, boolean>;
}

const STUDIO_TIPS = [
  'Generate your biped in T-pose for a better rigging and animation result',
  'Image with simple background generally leads to better results.',
  'Invite more friends to Tripo Studio and get 1-month pro membership!',
];

const GUIDE_ITEMS = [
  { id: 1, title: '1. How Tripo Studio Works', duration: '1:15' },
  { id: 2, title: '2. How to Segment?', duration: '0:52' },
  { id: 3, title: '3. How to Improve Textures?', duration: '1:08' },
  { id: 4, title: '4. Basic Operations', duration: '0:45' },
  { id: 5, title: '5. Shortcuts', duration: '0:30' },
];

function createUvCheckerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const size = 32;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#1e293b' : '#f5c518';
      ctx.fillRect(x * size, y * size, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

export default function Viewport3D({
  meshData,
  modelName,
  topology = 'TRIANGLE',
  vertices = 0,
  faces = 0,
  originalVertices,
  originalFaces,
  isSegmented = false,
  isRigged = false,
  showSkeletonOverride,
  onToggleSkeleton,
  activeAnimation = null,
  onSelectAnimation,
  initialRenderMode = 'pbr',
  activeWorkspaceStage = 'model',
  magicBrushMode = false,
  brushColorHex = '#f5c518',
  busyStageLabel = null,
  compact = false,
  showControls = true,
  emptyPlaceholderTitle = 'Ready For A New 3D Model?',
  emptyPlaceholderSubtitle = 'Instantly generate 3D from image or text',
  onSelectPart,
  onPaintPart,
  onOpenExportModal,
  onRetryModel,
  onUndo,
  onRedo,
  hiddenParts = {},
}: Viewport3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [renderMode, setRenderMode] = useState<ViewportRenderMode>(initialRenderMode);
  const [showWireframeOverlay, setShowWireframeOverlay] = useState(false);
  const [internalShowSkeleton, setInternalShowSkeleton] = useState(Boolean(isRigged));
  const [showGrid, setShowGrid] = useState(true);
  const [lightAngle, setLightAngle] = useState(45);
  const [isPlaying, setIsPlaying] = useState(true);
  const [animSpeed, setAnimSpeed] = useState<0.5 | 1 | 2>(1);
  const [timelineProgress, setTimelineProgress] = useState(35);
  const [selectedPartName, setSelectedPartName] = useState<string | null>(null);
  const [helpState, setHelpState] = useState<'closed' | 'controls' | 'guide'>('closed');
  const [showMaterialDock, setShowMaterialDock] = useState(false);
  const [activeGuideToast, setActiveGuideToast] = useState<string | null>(null);
  const [tipIndex, setTipIndex] = useState(0);
  const [brushCursor, setBrushCursor] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });
  const [localPartColors, setLocalPartColors] = useState<Record<string, string>>({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const cameraResetRef = useRef<(() => void) | null>(null);

  const showSkeleton =
    typeof showSkeletonOverride === 'boolean' ? showSkeletonOverride : internalShowSkeleton;

  const toggleSkeleton = (next?: boolean) => {
    const val = typeof next === 'boolean' ? next : !showSkeleton;
    setInternalShowSkeleton(val);
    onToggleSkeleton?.(val);
  };

  useEffect(() => {
    if (isRigged) setInternalShowSkeleton(true);
  }, [isRigged]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % STUDIO_TIPS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isPlaying || !activeAnimation || !isRigged) return;
    const timer = setInterval(() => {
      setTimelineProgress((p) => (p + 2 * animSpeed) % 100);
    }, 80);
    return () => clearInterval(timer);
  }, [isPlaying, activeAnimation, isRigged, animSpeed]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container || !meshData) return;

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    let sphericalRadius = compact ? 3.8 : 4.2;
    let sphericalTheta = 0.55;
    let sphericalPhi = 1.22;
    const target = new THREE.Vector3(0, 1.05, 0);

    const updateCamera = () => {
      camera.position.x =
        target.x + sphericalRadius * Math.sin(sphericalPhi) * Math.sin(sphericalTheta);
      camera.position.y = target.y + sphericalRadius * Math.cos(sphericalPhi);
      camera.position.z =
        target.z + sphericalRadius * Math.sin(sphericalPhi) * Math.cos(sphericalTheta);
      camera.lookAt(target);
    };
    updateCamera();

    cameraResetRef.current = () => {
      sphericalRadius = compact ? 3.8 : 4.2;
      sphericalTheta = 0.55;
      sphericalPhi = 1.22;
      updateCamera();
    };

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Studio Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xfff7e6, 2.3);
    const rad = (lightAngle * Math.PI) / 180;
    keyLight.position.set(Math.cos(rad) * 5, 6, Math.sin(rad) * 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xf5c518, 0.65);
    fillLight.position.set(0, -3, 3);
    scene.add(fillLight);

    // Floor Grid
    const gridHelper = new THREE.GridHelper(6, 20, 0x3b4054, 0x1e2230);
    gridHelper.visible = showGrid && !compact;
    scene.add(gridHelper);

    // Root Model Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    const uvCheckerTex = renderMode === 'uv_checker' ? createUvCheckerTexture() : null;
    const partMeshes: Array<{
      mesh: THREE.Mesh;
      partName: string;
      boneName?: string;
      basePos: [number, number, number];
      baseRot: [number, number, number];
    }> = [];

    const resolveMaterialProps = (baseColor: string, segmentColor: string, rough = 0.35, metal = 0.6) => {
      if (renderMode === 'normal') {
        return new THREE.MeshNormalMaterial({
          wireframe: false,
          transparent: showSkeleton && isRigged,
          opacity: showSkeleton && isRigged ? 0.78 : 1.0,
        });
      }
      let colorHex = baseColor;
      let r = rough;
      let m = metal;
      if (renderMode === 'segments') {
        colorHex = segmentColor;
        r = 0.45;
        m = 0.2;
      } else if (renderMode === 'clay') {
        colorHex = '#cbd5e1';
        r = 0.72;
        m = 0.08;
      } else if (renderMode === 'matcap_silver') {
        colorHex = '#e2e8f0';
        r = 0.14;
        m = 0.94;
      } else if (renderMode === 'matcap_gold') {
        colorHex = '#f5c518';
        r = 0.16;
        m = 0.92;
      } else if (renderMode === 'matcap_obsidian') {
        colorHex = '#1e293b';
        r = 0.12;
        m = 0.88;
      } else if (renderMode === 'matcap_cyan') {
        colorHex = '#38bdf8';
        r = 0.2;
        m = 0.82;
      }
      return new THREE.MeshStandardMaterial({
        color: new THREE.Color(colorHex),
        roughness: r,
        metalness: m,
        wireframe: renderMode === 'wireframe',
        map: uvCheckerTex,
        transparent: showSkeleton && isRigged && renderMode !== 'wireframe',
        opacity: showSkeleton && isRigged && renderMode !== 'wireframe' ? 0.78 : 1.0,
      });
    };

    if (meshData.customVertices && meshData.customFaces && meshData.customVertices.length > 0) {
      const geo = new THREE.BufferGeometry();
      const positions: number[] = [];
      for (const f of meshData.customFaces) {
        for (let i = 1; i < f.length - 1; i++) {
          const v0 = meshData.customVertices[f[0]] || [0, 0, 0];
          const v1 = meshData.customVertices[f[i]] || [0, 0, 0];
          const v2 = meshData.customVertices[f[i + 1]] || [0, 0, 0];
          positions.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2]);
        }
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      geo.center();

      const mat = resolveMaterialProps(
        meshData.pbrMaps?.albedoTint || '#f5c518',
        '#38bdf8',
        0.35,
        0.65
      );
      const m = new THREE.Mesh(geo, mat);
      m.position.set(0, 1.0, 0);
      rootGroup.add(m);
    } else {
      for (const part of meshData.parts || []) {
        if (hiddenParts[part.name]) continue;
        let geometry: THREE.BufferGeometry;
        const detail = topology === 'QUAD' ? 16 : 24;
        switch (part.shape) {
          case 'sphere':
            geometry = new THREE.SphereGeometry(0.5, detail, detail);
            break;
          case 'cylinder':
            geometry = new THREE.CylinderGeometry(0.45, 0.5, 1, detail);
            break;
          case 'cone':
            geometry = new THREE.ConeGeometry(0.5, 1, detail);
            break;
          case 'torus':
            geometry = new THREE.TorusGeometry(0.45, 0.14, 14, 28);
            break;
          case 'capsule':
            geometry = new THREE.CapsuleGeometry(0.38, 0.5, 8, 16);
            break;
          case 'octahedron':
            geometry = new THREE.OctahedronGeometry(0.55, 1);
            break;
          case 'dodecahedron':
            geometry = new THREE.DodecahedronGeometry(0.55, 0);
            break;
          default:
            geometry = new THREE.BoxGeometry(1, 1, 1, 2, 2, 2);
            break;
        }

        const paintedColor = localPartColors[part.name] || part.color;
        const material = resolveMaterialProps(
          paintedColor,
          part.segmentColor,
          part.roughness ?? 0.35,
          part.metalness ?? 0.6
        );

        const mesh = new THREE.Mesh(geometry, material);
        const explodeFactor = renderMode === 'segments' ? 1.18 : 1.0;
        const px = part.position[0] * explodeFactor;
        const py = 1.0 + (part.position[1] - 1.0) * explodeFactor;
        const pz = part.position[2] * explodeFactor;
        mesh.position.set(px, py, pz);
        mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
        mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
        mesh.userData = { partName: part.name, segmentLabel: part.segmentLabel };

        if (showWireframeOverlay && renderMode !== 'wireframe') {
          const wireGeo = new THREE.WireframeGeometry(geometry);
          const wireMat = new THREE.LineBasicMaterial({
            color: topology === 'QUAD' ? 0x38bdf8 : 0xa855f7,
            transparent: true,
            opacity: 0.42,
          });
          const wire = new THREE.LineSegments(wireGeo, wireMat);
          mesh.add(wire);
        }

        rootGroup.add(mesh);
        partMeshes.push({
          mesh,
          partName: part.name,
          boneName: part.boneName,
          basePos: [px, py, pz],
          baseRot: [...part.rotation],
        });
      }
    }

    // Mixamo-Style Octahedral Bone Pyramid + Cyan Joint Sphere Rig Visualization (matching Screenshots 79-83)
    const boneGroup = new THREE.Group();
    const boneJointMeshes: Array<{
      joint: THREE.Mesh;
      halo: THREE.Mesh;
      name: string;
      basePos: [number, number, number];
    }> = [];
    const bonePyramidMeshes: Array<{
      pyramid: THREE.Mesh;
      parentName: string;
      childName: string;
    }> = [];

    if (showSkeleton && meshData.bones && meshData.bones.length > 0) {
      const boneMap = new Map<string, [number, number, number]>();
      for (const b of meshData.bones) {
        boneMap.set(b.name, b.position);

        // Glowing cyan joint sphere
        const jointGeo = new THREE.SphereGeometry(0.042, 14, 14);
        const jointMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          depthTest: false,
        });
        const joint = new THREE.Mesh(jointGeo, jointMat);
        joint.position.set(b.position[0], b.position[1], b.position[2]);
        joint.renderOrder = 999;
        boneGroup.add(joint);

        // Outer glowing joint halo
        const haloGeo = new THREE.SphereGeometry(0.062, 12, 12);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: 0.35,
          depthTest: false,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        halo.position.set(b.position[0], b.position[1], b.position[2]);
        halo.renderOrder = 998;
        boneGroup.add(halo);

        boneJointMeshes.push({
          joint,
          halo,
          name: b.name,
          basePos: [...b.position],
        });

        if (b.parent && boneMap.has(b.parent)) {
          const parentPos = boneMap.get(b.parent)!;
          const pVec = new THREE.Vector3(parentPos[0], parentPos[1], parentPos[2]);
          const cVec = new THREE.Vector3(b.position[0], b.position[1], b.position[2]);
          const dir = new THREE.Vector3().subVectors(cVec, pVec);
          const len = Math.max(0.05, dir.length());

          // 4-sided octahedral bone pyramid connecting parent -> child joint
          const pyrGeo = new THREE.ConeGeometry(0.034, len, 4);
          pyrGeo.translate(0, len / 2, 0);
          const pyrMat = new THREE.MeshBasicMaterial({
            color: 0xe2e8f0,
            wireframe: false,
            transparent: true,
            opacity: 0.88,
            depthTest: false,
          });
          const pyramid = new THREE.Mesh(pyrGeo, pyrMat);
          pyramid.position.copy(pVec);
          pyramid.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            dir.clone().normalize()
          );
          pyramid.renderOrder = 997;

          // Edge highlight on octahedral bone
          const edgeGeo = new THREE.EdgesGeometry(pyrGeo);
          const edgeMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            depthTest: false,
          });
          pyramid.add(new THREE.LineSegments(edgeGeo, edgeMat));

          boneGroup.add(pyramid);
          bonePyramidMeshes.push({
            pyramid,
            parentName: b.parent,
            childName: b.name,
          });
        }
      }
      rootGroup.add(boneGroup);
    }

    // Pointer Orbit & Part Picking / Magic Brush Painting
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onPointerDown = (e: MouseEvent) => {
      isDragging = true;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      if (magicBrushMode) {
        setBrushCursor({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          visible: true,
        });
      }
      if (!isDragging) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      prevX = e.clientX;
      prevY = e.clientY;
      sphericalTheta -= dx * 0.008;
      sphericalPhi = Math.max(0.25, Math.min(Math.PI - 0.25, sphericalPhi - dy * 0.008));
      updateCamera();
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onPointerLeave = () => {
      if (magicBrushMode) {
        setBrushCursor((c) => ({ ...c, visible: false }));
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      sphericalRadius = Math.max(1.8, Math.min(9.0, sphericalRadius + e.deltaY * 0.003));
      updateCamera();
    };

    const onClick = (e: MouseEvent) => {
      if (!onSelectPart && !isSegmented && !magicBrushMode) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(
        partMeshes.map((p) => p.mesh),
        false
      );
      if (hits.length > 0) {
        const hitName = hits[0].object.userData?.partName;
        if (hitName) {
          setSelectedPartName(hitName);
          onSelectPart?.(hitName);
          if (magicBrushMode) {
            setLocalPartColors((prev) => ({ ...prev, [hitName]: brushColorHex }));
            onPaintPart?.(hitName, brushColorHex);
          }
        }
      }
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('mouseleave', onPointerLeave);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('click', onClick);

    let animFrameId = 0;
    const clock = new THREE.Clock();

    const computeBoneOffset = (
      boneName: string | undefined,
      clip: string,
      t: number
    ): { dx: number; dy: number; dz: number; rx: number; ry: number; rz: number } => {
      let dx = 0;
      let dy = 0;
      let dz = 0;
      let rx = 0;
      let ry = 0;
      let rz = 0;
      if (!boneName) return { dx, dy, dz, rx, ry, rz };

      const c = clip.toLowerCase();
      if (c === 'walk' || c === 'run' || c === '#1' || c === '#2' || c === 'back off') {
        const speed = c === 'run' || c === '#2' ? 6.2 : 3.6;
        const dirSign = c === 'back off' ? -1 : 1;
        if (boneName.includes('LeftLeg') || boneName.includes('LeftFoot') || boneName.includes('LeftUpLeg')) {
          dz = Math.sin(t * speed) * 0.22 * dirSign;
          dy = Math.max(0, Math.cos(t * speed)) * 0.08;
        } else if (boneName.includes('RightLeg') || boneName.includes('RightFoot') || boneName.includes('RightUpLeg')) {
          dz = -Math.sin(t * speed) * 0.22 * dirSign;
          dy = Math.max(0, -Math.cos(t * speed)) * 0.08;
        } else if (boneName.includes('LeftArm') || boneName.includes('LeftHand')) {
          dz = -Math.sin(t * speed) * 0.18 * dirSign;
          rx = -Math.sin(t * speed) * 0.35;
        } else if (boneName.includes('RightArm') || boneName.includes('RightHand')) {
          dz = Math.sin(t * speed) * 0.18 * dirSign;
          rx = Math.sin(t * speed) * 0.35;
        }
      } else if (c === 'jump' || c === 'flip' || c === '#3') {
        const jumpArc = Math.max(0, Math.sin(t * 4.0));
        dy = jumpArc * 0.38;
        if (boneName.includes('Arm') || boneName.includes('Hand')) {
          dy += jumpArc * 0.18;
          rz = boneName.includes('Left') ? jumpArc * 0.45 : -jumpArc * 0.45;
        }
      } else if (c === 'dance' || c === 'cheer' || c === 'beat' || c === '#4') {
        if (boneName.includes('Arm') || boneName.includes('Hand')) {
          dy = 0.14 + Math.sin(t * 6.5) * 0.16;
          dx = (boneName.includes('Left') ? -1 : 1) * Math.cos(t * 3.25) * 0.08;
        } else if (boneName.includes('Head')) {
          dx = Math.sin(t * 6.5) * 0.06;
        }
      } else if (
        c === 'combat' ||
        c === 'attack' ||
        c === 'battle' ||
        c === 'cast_a_spell' ||
        c === 'angry' ||
        c === 'bark'
      ) {
        if (boneName.includes('RightArm') || boneName.includes('RightHand')) {
          dy = Math.sin(t * 5.8) * 0.2;
          dz = Math.cos(t * 5.8) * 0.22;
          rx = Math.sin(t * 5.8) * 0.65;
        } else if (boneName.includes('LeftArm') || boneName.includes('LeftHand')) {
          dy = Math.cos(t * 5.8) * 0.12;
          dz = 0.12;
        }
      } else if (c === 'afraid' || c === 'alert' || c === 'bashful') {
        dx = Math.sin(t * 16.0) * 0.03;
        if (boneName.includes('Arm') || boneName.includes('Hand')) {
          dy = 0.12;
          dz = 0.14;
        }
      } else if (c === 'agree' || c === 'bow' || c === 'annoyed' || c === 'arrogant') {
        if (boneName.includes('Head') || boneName.includes('Neck')) {
          rx = Math.sin(t * 4.5) * 0.28;
          dz = Math.abs(Math.sin(t * 4.5)) * 0.08;
        } else if (boneName.includes('Chest') || boneName.includes('Spine')) {
          rx = Math.sin(t * 2.5) * 0.16;
        }
      }
      return { dx, dy, dz, rx, ry, rz };
    };

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime() * animSpeed;

      if (isPlaying) {
        if (!isDragging && compact) {
          rootGroup.rotation.y = t * 0.45;
        } else if (activeAnimation && isRigged) {
          const clip = activeAnimation.toLowerCase();
          // Root body motion
          if (clip === 'walk' || clip === 'run' || clip === '#1' || clip === '#2') {
            const speed = clip === 'run' || clip === '#2' ? 6.2 : 3.6;
            rootGroup.position.y = Math.abs(Math.sin(t * speed)) * 0.07;
            rootGroup.rotation.y = Math.sin(t * speed * 0.5) * 0.08;
          } else if (clip === 'dance' || clip === 'cheer' || clip === 'beat' || clip === '#4') {
            rootGroup.rotation.y = Math.sin(t * 2.5) * 0.55;
            rootGroup.position.y = Math.abs(Math.sin(t * 5.0)) * 0.12;
          } else if (
            clip === 'combat' ||
            clip === 'attack' ||
            clip === 'battle' ||
            clip === 'cast_a_spell'
          ) {
            rootGroup.rotation.y = Math.sin(t * 3.8) * 0.32;
            rootGroup.position.y = Math.abs(Math.cos(t * 3.8)) * 0.06;
          } else if (clip === 'agree' || clip === 'bow') {
            rootGroup.rotation.x = Math.abs(Math.sin(t * 2.4)) * 0.28;
          } else if (clip === 'afraid' || clip === 'alert') {
            rootGroup.position.x = Math.sin(t * 18.0) * 0.025;
            rootGroup.position.y = Math.sin(t * 3.2) * 0.035;
          } else {
            rootGroup.position.x = 0;
            rootGroup.rotation.x = 0;
            rootGroup.rotation.y = Math.sin(t * 1.2) * 0.05;
            rootGroup.position.y = Math.sin(t * 2.0) * 0.025;
          }

          // Per-part skeletal animation
          for (const pm of partMeshes) {
            const off = computeBoneOffset(pm.boneName, clip, t);
            pm.mesh.position.set(
              pm.basePos[0] + off.dx,
              pm.basePos[1] + off.dy,
              pm.basePos[2] + off.dz
            );
            pm.mesh.rotation.set(
              pm.baseRot[0] + off.rx,
              pm.baseRot[1] + off.ry,
              pm.baseRot[2] + off.rz
            );
          }

          // Synchronize 3D skeleton joints & octahedral bone pyramids with animation
          const dynamicJointPos = new Map<string, THREE.Vector3>();
          for (const bj of boneJointMeshes) {
            const off = computeBoneOffset(bj.name, clip, t);
            const nx = bj.basePos[0] + off.dx;
            const ny = bj.basePos[1] + off.dy;
            const nz = bj.basePos[2] + off.dz;
            bj.joint.position.set(nx, ny, nz);
            bj.halo.position.set(nx, ny, nz);
            dynamicJointPos.set(bj.name, new THREE.Vector3(nx, ny, nz));
          }
          for (const bp of bonePyramidMeshes) {
            const pVec = dynamicJointPos.get(bp.parentName);
            const cVec = dynamicJointPos.get(bp.childName);
            if (pVec && cVec) {
              const dir = new THREE.Vector3().subVectors(cVec, pVec);
              bp.pyramid.position.copy(pVec);
              if (dir.lengthSq() > 0.0001) {
                bp.pyramid.quaternion.setFromUnitVectors(
                  new THREE.Vector3(0, 1, 0),
                  dir.normalize()
                );
              }
            }
          }
        } else {
          // Reset T-Pose when no animation clip is active
          rootGroup.position.set(0, 0, 0);
          rootGroup.rotation.set(0, 0, 0);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || 640;
      const h = container.clientHeight || 480;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameId);
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('mouseleave', onPointerLeave);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      try {
        renderer.forceContextLoss();
      } catch {
        // ignore
      }
      renderer.dispose();
    };
  }, [
    meshData,
    renderMode,
    showWireframeOverlay,
    showSkeleton,
    showGrid,
    lightAngle,
    isPlaying,
    animSpeed,
    activeAnimation,
    isRigged,
    topology,
    compact,
    isSegmented,
    magicBrushMode,
    brushColorHex,
    localPartColors,
    hiddenParts,
    onSelectPart,
    onPaintPart,
  ]);

  const currentFaces = faces || 18723;
  const origFaces = originalFaces || meshData?.originalFaces || currentFaces;
  const currentVerts = vertices || 25577;
  const origVerts = originalVertices || meshData?.originalVertices || currentVerts;

  if (!meshData) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_center,#1b1e29_0%,#090a0f_75%)] select-none">
        {showControls && (
          <div className="absolute right-5 top-5 z-10 flex flex-col items-center gap-4">
            <div
              className="relative flex h-16 w-16 items-center justify-center"
              title="3D Orientation Gizmo (X / Y / Z)"
            >
              <div className="absolute h-7 w-0.5 -translate-y-3 bg-lime-400" />
              <div className="absolute h-0.5 w-7 -translate-x-3 bg-sky-400" />
              <div className="absolute -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-lime-400 text-[9px] font-bold text-black">
                Y
              </div>
              <div className="absolute -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-[9px] font-bold text-black">
                Z
              </div>
              <div className="z-10 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                X
              </div>
            </div>

            <div className="flex flex-col items-center gap-1 rounded-full border border-white/10 bg-[#191b22]/90 p-1.5 shadow-xl backdrop-blur">
              <button
                type="button"
                className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Environment & Studio Lighting"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Reset Camera View"
              >
                <Camera className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Toggle Topology Grid"
              >
                <Grid className="h-4 w-4" />
              </button>
            </div>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#191b22]/90 text-slate-300 hover:bg-white/10 hover:text-white"
              title="Viewport Shortcuts"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex flex-col items-center text-center px-6">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 shadow-inner">
            <svg viewBox="0 0 40 40" className="h-8 w-8">
              <path
                d="M8 10 H32 L20 32 Z"
                fill="none"
                stroke="#f8fafc"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
              <path d="M20 10 L32 10 L26 21 Z" fill="#f5c518" />
            </svg>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-200/90">
            {emptyPlaceholderTitle}
          </h3>
          <p className="mt-1.5 text-sm text-slate-400">
            {emptyPlaceholderSubtitle}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[radial-gradient(circle_at_center,#1d202b_0%,#090a0f_78%)] select-none">
      {/* Dual-Pane Left "Texture Preview" when Magic Brush (Texture -> Edit) is active (matching Screenshot 68) */}
      {magicBrushMode && !compact && (
        <div
          data-testid="magic-brush-texture-preview-pane"
          className="relative flex w-1/2 flex-col items-center justify-center border-r border-white/10 bg-[radial-gradient(circle_at_center,#222634_0%,#0b0d13_80%)] p-6"
        >
          <span className="absolute left-4 top-4 rounded-lg border border-white/10 bg-[#191b22]/90 px-3 py-1.5 text-xs font-bold text-slate-200 shadow">
            Texture Preview
          </span>
          <div className="flex flex-col items-center gap-3">
            <div className="relative flex h-56 w-56 items-center justify-center rounded-3xl border border-white/10 bg-[#141720]/80 p-4 shadow-2xl">
              <div className="grid h-full w-full grid-cols-3 gap-2">
                {(meshData.parts || []).slice(0, 9).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setLocalPartColors((prev) => ({ ...prev, [p.name]: brushColorHex }));
                      onPaintPart?.(p.name, brushColorHex);
                    }}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-white/10 p-1.5 text-center transition hover:scale-105 hover:border-[#f5c518]"
                    style={{
                      backgroundColor: `${localPartColors[p.name] || p.color}33`,
                    }}
                  >
                    <span
                      className="h-5 w-5 rounded-full border border-white/30 shadow"
                      style={{ backgroundColor: localPartColors[p.name] || p.color }}
                    />
                    <span className="mt-1 truncate w-full text-[9px] font-semibold text-slate-200">
                      {p.segmentLabel || p.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <span className="text-[11px] text-slate-400">
               Synchronized 2D UV Atlas & Part Albedo Preview
            </span>
          </div>
        </div>
      )}

      {/* Main Interactive Three.js Canvas Mount */}
      <div className={`relative h-full ${magicBrushMode && !compact ? 'w-1/2' : 'w-full'}`}>
        <div
          ref={mountRef}
          className={`h-full w-full ${
            magicBrushMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
          }`}
        />

        {/* Yellow Circular 3D Magic Brush Surface Cursor (matching Screenshot 68) */}
        {magicBrushMode && brushCursor.visible && (
          <div
            data-testid="magic-brush-3d-cursor"
            className="pointer-events-none absolute z-20 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#facc15] bg-[#facc15]/25 shadow-[0_0_16px_rgba(250,204,21,0.75)]"
            style={{ left: brushCursor.x, top: brushCursor.y }}
          />
        )}
      </div>

      {/* Top-Left Model Badge & Active Part / Animation Pill */}
      {!compact && (
        <div className="pointer-events-none absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
          {modelName && !magicBrushMode && (
            <span className="rounded-lg border border-white/10 bg-[#121318]/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {modelName}
            </span>
          )}
          {selectedPartName && (
            <span className="rounded-lg border border-[#f5c518]/40 bg-[#f5c518]/15 px-2.5 py-1 text-[11px] font-medium text-[#f5c518]">
              Part: {selectedPartName}
            </span>
          )}
          {activeAnimation && isRigged && (
            <span className="rounded-lg border border-purple-500/40 bg-purple-500/15 px-2.5 py-1 text-[11px] font-semibold text-purple-200">
              Animation: {activeAnimation}
            </span>
          )}
          {activeGuideToast && (
            <span className="rounded-lg border border-indigo-400/40 bg-indigo-950/90 px-3 py-1 text-[11px] font-semibold text-indigo-200">
              {activeGuideToast}
            </span>
          )}
        </div>
      )}

      {/* Top-Right Telemetry HUD + XYZ Gizmo + Vertical Floating Strip (matching Screenshots 61, 76, 78, 86, 87) */}
      {showControls && (
        <div className="absolute right-4 top-4 z-20 flex flex-col items-end gap-3">
          {/* Top-Right Row: Topology/Faces/Vertices Table + Interactive XYZ Gizmo */}
          <div className="flex items-center gap-3">
            {!compact && (
              <div
                data-testid="viewport-topology-hud"
                className="rounded-xl border border-white/5 bg-[#12141c]/75 px-3.5 py-2 text-[11px] leading-relaxed text-slate-300 backdrop-blur"
              >
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-400">Topology</span>
                  <span className="font-semibold text-white">
                    {topology === 'QUAD' ? 'Quad' : 'Triangle'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-400">Faces</span>
                  <span className="font-mono font-semibold text-white">
                    {currentFaces.toLocaleString()} / {origFaces.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <span className="text-slate-400">Vertices</span>
                  <span className="font-mono font-semibold text-white">
                    {currentVerts.toLocaleString()} / {origVerts.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => cameraResetRef.current?.()}
              className="relative flex h-14 w-14 items-center justify-center rounded-full hover:bg-white/5"
              title="Click to reset XYZ orientation"
            >
              <div className="absolute h-6 w-0.5 -translate-y-2.5 bg-lime-400" />
              <div className="absolute h-0.5 w-6 -translate-x-2.5 bg-sky-400" />
              <div className="absolute -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-lime-400 text-[9px] font-bold text-black">
                Y
              </div>
              <div className="absolute -left-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-400 text-[9px] font-bold text-black">
                Z
              </div>
              <div className="z-10 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                X
              </div>
            </button>
          </div>

          {/* Vertical Pill 1: Material/Shading Dock Toggle, Camera Reset, Wireframe/Grid Overlay */}
          <div className="flex flex-col items-center gap-1 rounded-full border border-white/10 bg-[#191b22]/90 p-1.5 shadow-xl backdrop-blur">
            <button
              type="button"
              data-testid="viewport-toggle-material-dock"
              onClick={() => {
                setShowMaterialDock((d) => !d);
                setLightAngle((a) => (a + 45) % 360);
              }}
              className={`rounded-full p-2 transition ${
                showMaterialDock
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-[#f5c518]'
              }`}
              title="Toggle Material / Matcap Shading Dock & Lighting"
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => cameraResetRef.current?.()}
              className="rounded-full p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              title="Reset Camera View"
            >
              <Camera className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowWireframeOverlay((w) => !w)}
              className={`rounded-full p-2 transition ${
                showWireframeOverlay
                  ? 'bg-[#f5c518] text-black'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              title="Toggle Topology Wireframe Overlay"
            >
              <Grid className="h-4 w-4" />
            </button>
          </div>

          {/* Vertical Pill 2: Help/Guide (?) & Version History with Red Notification Dot */}
          <div className="flex flex-col items-center gap-1 rounded-full border border-white/10 bg-[#191b22]/90 p-1.5 shadow-xl backdrop-blur">
            <button
              type="button"
              data-testid="viewport-help-btn"
              onClick={() =>
                setHelpState((s) =>
                  s === 'closed' ? 'controls' : s === 'controls' ? 'guide' : 'closed'
                )
              }
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                helpState !== 'closed'
                  ? 'bg-indigo-500 text-white'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
              title="View Controls & Studio Guide"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onUndo?.()}
              className="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white"
              title="Operation History"
            >
              <History className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
          </div>
        </div>
      )}

      {/* Purple "View Your Model" Controls Card (matching Screenshot 78) */}
      {helpState === 'controls' && (
        <div
          data-testid="viewport-controls-popover"
          className="absolute right-20 top-44 z-30 w-64 rounded-2xl border border-indigo-300/30 bg-gradient-to-b from-[#6366f1] to-[#4f46e5] p-4 text-xs text-white shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-extrabold tracking-tight">View Your Model</span>
            <button
              type="button"
              onClick={() => setHelpState('closed')}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-2.5 text-[11px]">
            <div className="rounded-xl bg-black/15 p-2.5">
              <div className="font-bold text-white">Rotate View</div>
              <div className="mt-0.5 text-indigo-100">Left-Click & drag / Press & drag</div>
            </div>
            <div className="rounded-xl bg-black/15 p-2.5">
              <div className="font-bold text-white">Pan View</div>
              <div className="mt-0.5 text-indigo-100">
                Shift + Click & drag / Right-Click & drag
              </div>
            </div>
            <div className="rounded-xl bg-black/15 p-2.5">
              <div className="font-bold text-white">Zoom in/out</div>
              <div className="mt-0.5 text-indigo-100">
                Scroll wheel to zoom / Two-finger push
              </div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              data-testid="viewport-help-ok"
              onClick={() => setHelpState('guide')}
              className="rounded-full bg-white px-5 py-1.5 text-xs font-extrabold text-indigo-700 shadow hover:bg-indigo-50"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Purple "? Guide" Tutorial Popover (matching Screenshots 86, 87) */}
      {helpState === 'guide' && (
        <div
          data-testid="viewport-guide-popover"
          className="absolute right-20 top-44 z-30 w-64 rounded-2xl border border-indigo-300/30 bg-gradient-to-b from-[#6366f1] to-[#4f46e5] p-4 text-xs text-white shadow-2xl"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm font-extrabold">
              <HelpCircle className="h-4 w-4" /> Guide
            </span>
            <button
              type="button"
              onClick={() => setHelpState('closed')}
              className="text-white/80 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5">
            {GUIDE_ITEMS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setActiveGuideToast(`Playing Guide: ${g.title} (${g.duration})`);
                  setTimeout(() => setActiveGuideToast(null), 3000);
                }}
                className="flex w-full items-center justify-between rounded-xl bg-black/15 px-3 py-2 text-left text-[11px] font-semibold text-white hover:bg-black/25 transition"
              >
                <span>{g.title}</span>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-indigo-600">
                  ▶
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* In-Viewport Progress Overlay with Rotating Studio Tips (matching Screenshots 78, 86, 87) */}
      {busyStageLabel && !compact && (
        <div
          data-testid="viewport-progress-overlay"
          className="pointer-events-none absolute bottom-20 left-1/2 z-30 flex w-[420px] -translate-x-1/2 flex-col items-center rounded-2xl border border-indigo-500/30 bg-[#12141d]/90 px-5 py-3 text-center shadow-2xl backdrop-blur"
        >
          <div className="text-xs font-extrabold tracking-wide text-white">
            {busyStageLabel}
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-indigo-500 via-purple-400 to-[#f5c518]" />
          </div>
          <div className="mt-1.5 text-[11px] text-slate-300">
            {STUDIO_TIPS[tipIndex]}
          </div>
        </div>
      )}

      {/* Floating Segmentation Brush Toolbar (shown above bottom bar when Segment stage is active, matching Screenshot 63) */}
      {showControls && !compact && activeWorkspaceStage === 'segment' && (
        <div
          data-testid="segment-floating-brush-bar"
          className="absolute bottom-16 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-[#181a24]/95 px-3 py-1.5 text-xs text-slate-200 shadow-2xl backdrop-blur"
        >
          <button
            type="button"
            onClick={() => setRenderMode('segments')}
            className="flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/30"
            title="Paint Part Selection Brush"
          >
            <Paintbrush className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-full p-1.5 text-slate-300 hover:bg-white/10"
            title="Erase Part Selection"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
          <div className="mx-1 h-4 w-px bg-white/10" />
          <span
            className="h-4 w-4 rounded-full border border-white/40"
            style={{ backgroundColor: brushColorHex }}
            title="Active Segment Swatch"
          />
          <div className="mx-1 h-4 w-px bg-white/10" />
          <button
            type="button"
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10"
            title="Merge Selected Parts"
          >
            <Combine className="h-3.5 w-3.5" />
            <span>Merge</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPartName(null)}
            className="rounded-full p-1.5 text-slate-300 hover:bg-white/10"
            title="Reset Part Selection"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Floating Material / Shading / Matcap Sphere Dock (matching Screenshots 86, 87) */}
      {showControls && !compact && (
        <div
          data-testid="viewport-material-sphere-dock"
          className={`absolute ${
            activeWorkspaceStage === 'segment' ? 'bottom-28' : 'bottom-16'
          } left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/10 bg-[#14161f]/95 px-3 py-1.5 shadow-2xl backdrop-blur transition-opacity ${
            showMaterialDock ? 'opacity-100' : 'opacity-95'
          }`}
        >
          {/* Wireframe Sphere */}
          <button
            type="button"
            data-testid="viewport-mode-wireframe"
            onClick={() => setRenderMode('wireframe')}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              renderMode === 'wireframe'
                ? 'bg-[#f5c518] text-black font-bold'
                : 'text-slate-300 hover:bg-white/10'
            }`}
            title="Wireframe Mesh"
          >
            <span className="h-3.5 w-3.5 rounded-full border border-current bg-transparent" />
            <span>Wireframe</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          {/* Clay White Sphere */}
          <button
            type="button"
            data-testid="viewport-mode-clay"
            onClick={() => setRenderMode('clay')}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              renderMode === 'clay'
                ? 'bg-[#f5c518] text-black font-bold'
                : 'text-slate-300 hover:bg-white/10'
            }`}
            title="Clay Matte"
          >
            <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-br from-white to-slate-400 shadow-inner" />
            <span>Clay</span>
          </button>

          {/* PBR Shaded Metallic Sphere */}
          <button
            type="button"
            data-testid="viewport-mode-pbr"
            onClick={() => setRenderMode('pbr')}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              renderMode === 'pbr'
                ? 'bg-[#f5c518] text-black font-bold'
                : 'text-slate-300 hover:bg-white/10'
            }`}
            title="PBR Shaded"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>PBR</span>
          </button>

          {/* Normal Map Rainbow Sphere */}
          <button
            type="button"
            data-testid="viewport-mode-normal"
            onClick={() => setRenderMode('normal')}
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition ${
              renderMode === 'normal'
                ? 'bg-indigo-500 text-white font-bold'
                : 'text-slate-300 hover:bg-white/10'
            }`}
            title="Surface Normal Map"
          >
            <span className="h-3.5 w-3.5 rounded-full bg-gradient-to-tr from-sky-400 via-fuchsia-400 to-emerald-300" />
          </button>

          {/* Semantic Parts Mode */}
          <button
            type="button"
            data-testid="viewport-mode-segments"
            onClick={() => setRenderMode('segments')}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              renderMode === 'segments'
                ? 'bg-[#f5c518] text-black font-bold'
                : 'text-slate-300 hover:bg-white/10'
            }`}
            title="Exploded Semantic Parts"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Parts ({meshData.parts?.length || 1})</span>
          </button>

          {/* UV Checker Mode */}
          <button
            type="button"
            data-testid="viewport-mode-uv_checker"
            onClick={() => setRenderMode('uv_checker')}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              renderMode === 'uv_checker'
                ? 'bg-[#f5c518] text-black font-bold'
                : 'text-slate-300 hover:bg-white/10'
            }`}
            title="UV Checkerboard"
          >
            UV Checker
          </button>

          {/* Skeleton Rig Toggle */}
          <button
            type="button"
            data-testid="viewport-toggle-skeleton"
            onClick={() => toggleSkeleton()}
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
              showSkeleton
                ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                : 'text-slate-300 hover:bg-white/10'
            }`}
            title="Toggle Mixamo Skeleton Overlay"
          >
            <Bone className="h-3.5 w-3.5" />
            <span>Rig</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          {/* 4 Matcap Spheres (Silver, Gold, Obsidian, Cyan - matching Screenshots 86, 87) */}
          <div className="flex items-center gap-1">
            {(
              [
                {
                  id: 'matcap_silver',
                  label: 'Silver Matcap',
                  cls: 'from-slate-100 via-slate-300 to-slate-600',
                },
                {
                  id: 'matcap_gold',
                  label: 'Gold Matcap',
                  cls: 'from-amber-200 via-[#f5c518] to-amber-700',
                },
                {
                  id: 'matcap_obsidian',
                  label: 'Dark Metal Matcap',
                  cls: 'from-slate-500 via-slate-800 to-black',
                },
                {
                  id: 'matcap_cyan',
                  label: 'Cyan Matcap',
                  cls: 'from-cyan-200 via-sky-400 to-blue-800',
                },
              ] as const
            ).map((mc) => (
              <button
                key={mc.id}
                type="button"
                data-testid={`viewport-mode-${mc.id}`}
                onClick={() => setRenderMode(mc.id)}
                title={mc.label}
                className={`h-4 w-4 rounded-full bg-gradient-to-br ${mc.cls} transition ${
                  renderMode === mc.id ? 'ring-2 ring-white scale-110' : 'opacity-80 hover:opacity-100'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setLightAngle((a) => (a + 45) % 360)}
            className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            title="Rotate Studio Lighting"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Context-Sensitive Bottom Floating Action Bar (matching Screenshots 61, 68, 76, 81-83) */}
      {showControls && !compact && (
        <div
          data-testid="viewport-bottom-action-bar"
          className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#171922]/95 px-3.5 py-1.5 shadow-2xl backdrop-blur"
        >
          {activeWorkspaceStage === 'animate' || (isRigged && activeAnimation) ? (
            /* Animation Playback & Timeline Bar (matching Screenshots 81, 82, 83) */
            <>
              <button
                type="button"
                onClick={() => onUndo?.()}
                className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Undo"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRedo?.()}
                className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Redo"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button
                type="button"
                data-testid="btn-tpose-reset"
                onClick={() => onSelectAnimation?.(null)}
                className={`rounded-full p-1.5 transition ${
                  !activeAnimation
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
                title="Reset to Bind T-Pose"
              >
                <UserCheck className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-testid="btn-anim-play-pause"
                onClick={() => setIsPlaying((p) => !p)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                title={isPlaying ? 'Pause Animation' : 'Play Animation'}
              >
                {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </button>
              <input
                type="range"
                data-testid="anim-timeline-scrubber"
                min={0}
                max={100}
                value={timelineProgress}
                onChange={(e) => setTimelineProgress(Number(e.target.value))}
                className="w-36 accent-indigo-500 cursor-pointer"
                title={`Animation Frame (${timelineProgress}%)`}
              />
              <button
                type="button"
                data-testid="anim-speed-select"
                onClick={() =>
                  setAnimSpeed((s) => (s === 1 ? 2 : s === 2 ? 0.5 : 1))
                }
                className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10"
                title="Playback Speed"
              >
                {animSpeed}x
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button
                type="button"
                onClick={() => onSelectAnimation?.('Walk')}
                className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Animation</span>
              </button>
              <button
                type="button"
                data-testid="btn-open-export-modal"
                onClick={() => onOpenExportModal?.()}
                className="flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-extrabold text-white shadow hover:bg-indigo-400 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </>
          ) : magicBrushMode ? (
            /* Magic Brush Bottom Bar (matching Screenshot 68) */
            <>
              <button
                type="button"
                onClick={() => setLocalPartColors({})}
                className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Undo Brush Stroke"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRedo?.()}
                className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Redo Brush Stroke"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button
                type="button"
                className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-[#f5c518]"
                title="Eyedropper Color Picker"
              >
                <Pipette className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const firstPart = meshData.parts?.[0]?.name || 'Torso';
                  onPaintPart?.(selectedPartName || firstPart, brushColorHex);
                }}
                className="rounded-full bg-indigo-500 px-3.5 py-1 text-xs font-bold text-white hover:bg-indigo-400"
              >
                Save
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
                <span className="rounded bg-[#f5c518]/20 px-1 text-[9px] font-bold text-[#f5c518]">
                  🎫
                </span>
              </button>
              <button
                type="button"
                data-testid="btn-open-export-modal"
                onClick={() => onOpenExportModal?.()}
                className="flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-extrabold text-white shadow hover:bg-indigo-400 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </>
          ) : (
            /* Standard / Modified Active Model Pill Bar (matching Screenshots 61, 76, 79) */
            <>
              <button
                type="button"
                onClick={() => onUndo?.()}
                className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Undo"
              >
                <Undo2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onRedo?.()}
                className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
                title="Redo"
              >
                <Redo2 className="h-3.5 w-3.5" />
              </button>
              <div className="h-4 w-px bg-white/10" />
              <button
                type="button"
                onClick={() => onRetryModel?.()}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Free Retry</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenExportModal?.()}
                className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>3D Print</span>
              </button>
              {isRigged && (
                <button
                  type="button"
                  data-testid="btn-tpose-reset"
                  onClick={() => onSelectAnimation?.(null)}
                  className="rounded-full p-1.5 text-sky-300 hover:bg-white/10"
                  title="T-Pose / Bind Pose"
                >
                  <UserCheck className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsFavorite((f) => !f)}
                className={`rounded-full p-1.5 transition ${
                  isFavorite ? 'text-[#f5c518]' : 'text-slate-300 hover:bg-white/10'
                }`}
                title="Favorite Asset"
              >
                <Star className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsBookmarked((b) => !b)}
                className={`rounded-full p-1.5 transition ${
                  isBookmarked ? 'text-indigo-400' : 'text-slate-300 hover:bg-white/10'
                }`}
                title="Bookmark Version"
              >
                <Bookmark className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
                <span className="rounded bg-[#f5c518]/20 px-1 text-[9px] font-bold text-[#f5c518]">
                  🎫
                </span>
              </button>
              <button
                type="button"
                data-testid="btn-open-export-modal"
                onClick={() => onOpenExportModal?.()}
                className="flex items-center gap-1.5 rounded-full bg-indigo-500 px-4 py-1.5 text-xs font-extrabold text-white shadow hover:bg-indigo-400 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

