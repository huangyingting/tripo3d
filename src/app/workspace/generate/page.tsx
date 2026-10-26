'use client';

import React, { useEffect, useRef, useState } from 'react';
import { StudioNavbar, type ViewerUser } from '@/components/layout/StudioNav';
import Viewport3D from '@/components/three/Viewport3D';
import type { ProceduralMeshData } from '@/lib/engine3d/generator';
import {
  Image as ImageIcon,
  Box,
  Scissors,
  Grid,
  Sparkles,
  Palette,
  Bone,
  AppWindow,
  Upload,
  Download,
  Zap,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Globe,
  RefreshCw,
  Wand2,
  Search,
  ChevronDown,
  ChevronRight,
  Star,
  Filter,
  Rocket,
  Info,
  X,
  Crown,
  Check,
  Play,
} from 'lucide-react';

type PipelineStage =
  | 'image'
  | 'model'
  | 'segment'
  | 'fill_parts'
  | 'retopo'
  | 'smart_uv'
  | 'texture'
  | 'texture_edit'
  | 'texture_upscale'
  | 'texture_pbr'
  | 'rig'
  | 'animate'
  | 'app';

interface AssetItem {
  id: string;
  name: string;
  prompt: string | null;
  category: string;
  generationMode: string;
  inputType: string;
  aiModelVersion: string;
  topology: string;
  meshQuality: string;
  vertices: number;
  faces: number;
  pbrEnabled: boolean;
  textureQuality: string;
  hasTexture: boolean;
  inParts: boolean;
  isSegmented: boolean;
  isRigged: boolean;
  uvUnwrapped: boolean;
  animationClips: string | null;
  partsJson: string | null;
  geometryJson: string | null;
  createdAt: string;
}

const SAMPLE_PROMPTS = [
  'Armored Cyber Valkyrie character with glowing golden visor, game-ready T-pose',
  'Tactical Sci-Fi Rover vehicle with 4 rugged wheels and solar radar dish',
  'Celestial Guardian Dragon creature with crystal wings and obsidian scales',
  'Medieval Rune Greatsword weapon with gold crossguard and sapphire pommel',
  'Neo-Tokyo Ramen Kiosk architecture diorama with neon lanterns',
];

const ANIMATION_PRESETS: Array<{
  id: string;
  label: string;
  testId: string;
  category: 'All' | 'Idle' | 'Move' | 'Sport' | 'Emotion' | 'Dance' | 'Fight' | 'Other';
}> = [
  { id: '#1', label: '#1', testId: '1', category: 'Idle' },
  { id: '#2', label: '#2', testId: '2', category: 'Move' },
  { id: '#3', label: '#3', testId: '3', category: 'Sport' },
  { id: '#4', label: '#4', testId: '4', category: 'Dance' },
  { id: 'Afraid', label: 'Afraid', testId: 'afraid', category: 'Emotion' },
  { id: 'Agree', label: 'Agree', testId: 'agree', category: 'Emotion' },
  { id: 'Alert', label: 'Alert', testId: 'alert', category: 'Idle' },
  { id: 'Angry', label: 'Angry', testId: 'angry', category: 'Emotion' },
  { id: 'Annoyed', label: 'Annoyed', testId: 'annoyed', category: 'Emotion' },
  { id: 'Arrogant', label: 'Arrogant', testId: 'arrogant', category: 'Emotion' },
  { id: 'Attack', label: 'Attack', testId: 'attack', category: 'Fight' },
  { id: 'Back Off', label: 'Back Off', testId: 'back_off', category: 'Move' },
  { id: 'Bark', label: 'Bark', testId: 'bark', category: 'Other' },
  { id: 'Bashful', label: 'Bashful', testId: 'bashful', category: 'Emotion' },
  { id: 'Battle', label: 'Battle', testId: 'battle', category: 'Fight' },
  { id: 'Beat', label: 'Beat', testId: 'beat', category: 'Dance' },
  { id: 'Idle', label: 'Idle', testId: 'idle', category: 'Idle' },
  { id: 'Walk', label: 'Walk', testId: 'walk', category: 'Move' },
  { id: 'Run', label: 'Run', testId: 'run', category: 'Move' },
  { id: 'Jump', label: 'Jump', testId: 'jump', category: 'Sport' },
  { id: 'Dance', label: 'Dance', testId: 'dance', category: 'Dance' },
  { id: 'Combat', label: 'Combat', testId: 'combat', category: 'Fight' },
  { id: 'Cheer', label: 'Cheer', testId: 'cheer', category: 'Emotion' },
  { id: 'Bow', label: 'Bow', testId: 'bow', category: 'Other' },
  { id: 'Cast_a_Spell', label: 'Cast a Spell', testId: 'cast_a_spell', category: 'Fight' },
  { id: 'Flip', label: 'Flip', testId: 'flip', category: 'Sport' },
];

export default function WorkspaceGeneratePage() {
  const [user, setUser] = useState<ViewerUser | null>(null);
  const [activeStage, setActiveStage] = useState<PipelineStage>('model');

  // Model Generation State (Stage 2)
  const [generationMode, setGenerationMode] = useState<'HD_MODEL' | 'SMART_MESH'>('HD_MODEL');
  const [inputType, setInputType] = useState<'IMAGE' | 'MULTI_VIEW' | 'TEXT' | 'SKETCH'>('TEXT');
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [negativePrompt] = useState('low quality, blurry, broken topology');
  const [meshQuality, setMeshQuality] = useState<'STANDARD' | 'ULTRA'>('STANDARD');
  const [inParts, setInParts] = useState(false);
  const [aiComplete, setAiComplete] = useState(true);
  const [hasTexture, setHasTexture] = useState(true);
  const [textureQuality, setTextureQuality] = useState<'2K' | '4K' | '8K'>('2K');
  const [removeLighting, setRemoveLighting] = useState(true);
  const [pbrEnabled, setPbrEnabled] = useState(true);
  const [topology, setTopology] = useState<'TRIANGLE' | 'QUAD'>('TRIANGLE');
  const [lowPoly, setLowPoly] = useState(false);
  const [targetPolycount, setTargetPolycount] = useState(24000);
  const [tPose, setTPose] = useState(true);
  const [aiModelVersion, setAiModelVersion] = useState('H3.1');
  const [useTrial, setUseTrial] = useState(true);
  const [batchSize, setBatchSize] = useState(1);
  const [isPublic, setIsPublic] = useState(false);

  // Image Generation State (Stage 1)
  const [imagePrompt, setImagePrompt] = useState(
    'Full-body stylized sci-fi paladin in T-pose, studio neutral lighting, 3D reference sheet'
  );
  const [imageStyle, setImageStyle] = useState('T-Pose Ortho');
  const [imageAspect, setImageAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [generatedImages, setGeneratedImages] = useState<
    Array<{ id: string; prompt: string; style: string; dataUrl: string }>
  >([]);

  // Multi-View slots
  const [multiViews, setMultiViews] = useState<{
    front: string | null;
    left: string | null;
    back: string | null;
    right: string | null;
  }>({ front: null, left: null, back: null, right: null });

  // Sketch Canvas Ref
  const sketchCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawingSketch, setIsDrawingSketch] = useState(false);

  // Retopo Stage State (Stage 4)
  const [retopoSmartLowPoly, setRetopoSmartLowPoly] = useState(false);
  const [retopoTopology, setRetopoTopology] = useState<'QUAD' | 'TRIANGLE'>('QUAD');
  const [retopoPolycount, setRetopoPolycount] = useState<number>(10000);

  // Smart UV State (Stage 5)
  const [uvMode, setUvMode] = useState<'Auto' | 'Organic' | 'Hard Surface'>('Auto');

  // Texture & Magic Brush State (Stage 6)
  const [textureSubTab, setTextureSubTab] = useState<'generator' | 'magic_brush'>('generator');
  const [textureInputTab, setTextureInputTab] = useState<'Prompt' | 'Image' | 'Multi-View'>('Prompt');
  const [magicBrushSubMode, setMagicBrushSubMode] = useState<'Gen Mode' | 'Paint Mode'>('Gen Mode');
  const [creativityStrength, setCreativityStrength] = useState(0.6);
  const [upscaleResolution, setUpscaleResolution] = useState<'4K' | '8K'>('4K');
  const [pbrRoughness, setPbrRoughness] = useState(0.24);
  const [pbrMetalness, setPbrMetalness] = useState(0.82);
  const [retexturePrompt, setRetexturePrompt] = useState(
    'Weathered battle-worn titanium armor with brushed gold trim and glowing cyan runes'
  );
  const [brushTargetPart, setBrushTargetPart] = useState<string>('Torso_Core');
  const [brushColorHex, setBrushColorHex] = useState<string>('#f5c518');

  // Rig & Animate State (Stage 7)
  const [rigSubTab, setRigSubTab] = useState<'rig' | 'animate'>('rig');
  const [rigPreset, setRigPreset] = useState<'biped' | 'quadruped'>('biped');
  const [skeletonPreset, setSkeletonPreset] = useState<'Mixamo' | 'UE5' | 'Unity' | 'Universal'>('Mixamo');
  const [showSkeletonInViewport, setShowSkeletonInViewport] = useState(true);
  const [segmentDetailLevel, setSegmentDetailLevel] = useState<'simple' | 'balanced' | 'detailed'>('balanced');
  const [animateSubTab, setAnimateSubTab] = useState<'preset' | 'multistage'>('preset');
  const [animSearch, setAnimSearch] = useState('');
  const [animCategory, setAnimCategory] = useState<
    'All' | 'Idle' | 'Move' | 'Sport' | 'Emotion' | 'Dance' | 'Fight' | 'Other'
  >('All');
  const [customMotionPrompt, setCustomMotionPrompt] = useState(
    'A knight walking forward cautiously then raising sword in salute'
  );
  const [multiStageMotion, setMultiStageMotion] = useState(false);
  const [motionStages, setMotionStages] = useState<string[]>(['Walk', 'Agree']);
  const [activeAnimation, setActiveAnimation] = useState<string | null>('Idle');

  // App / Stylize State (Stage 8)
  const [stylizeFilter, setStylizeFilter] = useState<'voxel' | 'lego' | 'clay' | 'gold'>('voxel');

  // Right Sidebar (`Assets` | `Property` Tabs) & Hierarchy State
  const [rightSidebarTab, setRightSidebarTab] = useState<'assets' | 'property'>('assets');
  const [hierarchyExpanded, setHierarchyExpanded] = useState(true);
  const [hiddenParts, setHiddenParts] = useState<Record<string, boolean>>({});
  const [lockedParts, setLockedParts] = useState<Record<string, boolean>>({});

  // Modals: Polygon Limit Exceeded (`74`) & Export Modal (`85`)
  const [showPolyLimitModal, setShowPolyLimitModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFileName, setExportFileName] = useState('tripo_studio_dd79045a-4cf8-4b77-86a0');
  const [exportFormat, setExportFormat] = useState<
    'glb' | 'fbx' | 'obj' | 'usdz' | 'stl' | '3mf' | 'schematic' | 'ply'
  >('glb');
  const [exportPivot, setExportPivot] = useState<'Origin' | 'Bottom' | 'Center'>('Bottom');
  const [exportScale, setExportScale] = useState<{ x: string; y: string; z: string }>({
    x: '1.0',
    y: '1.0',
    z: '1.0',
  });
  const [exportWithTexture, setExportWithTexture] = useState(true);
  const [exportTextureFormat, setExportTextureFormat] = useState<'PNG' | 'JPG'>('PNG');
  const [exportMetallicPreset, setExportMetallicPreset] = useState<
    'Default (glTF)' | 'Unity' | 'Unreal'
  >('Default (glTF)');
  const [exportWithAnimation, setExportWithAnimation] = useState(true);
  const [exportDccBridge, setExportDccBridge] = useState('Blender 4.x');

  // Assets & Active Selection
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [activeAsset, setActiveAsset] = useState<AssetItem | null>(null);
  const [assetFilter, setAssetFilter] = useState<'all' | 'mine' | 'public'>('all');
  const [busy, setBusy] = useState(false);
  const [busyStageLabel, setBusyStageLabel] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadedRefImage, setUploadedRefImage] = useState<string | null>(null);

  const fetchAssets = async (selectLatest = false) => {
    try {
      const res = await fetch('/api/studio/assets?scope=all');
      const data = await res.json();
      if (data.assets) {
        setAssets(data.assets);
        if (selectLatest && data.assets.length > 0) {
          setActiveAsset(data.assets[0]);
        } else if (!activeAsset && data.assets.length > 0) {
          setActiveAsset(data.assets[0]);
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAssets(false);
  }, []);

  useEffect(() => {
    if (activeAsset) {
      setExportFileName(`tripo_studio_${activeAsset.id.slice(0, 16)}`);
      if (activeAsset.isRigged) {
        setShowSkeletonInViewport(true);
      }
    }
  }, [activeAsset]);

  useEffect(() => {
    if (generationMode === 'SMART_MESH') {
      setAiModelVersion('P2.0');
      setTopology('QUAD');
    } else if (aiModelVersion.startsWith('P')) {
      setAiModelVersion('H3.1');
    }
  }, [generationMode, aiModelVersion]);

  const computeEstimatedCost = (): { cost: number; usingTrial: boolean } => {
    if (generationMode === 'SMART_MESH') {
      const trialsAvailable = user ? user.smartMeshTrials : 2;
      if (useTrial && trialsAvailable > 0 && batchSize === 1) {
        return { cost: 0, usingTrial: true };
      }
      return {
        cost: (aiModelVersion === 'P1.0' ? 80 : 100) * batchSize,
        usingTrial: false,
      };
    }
    let c = aiModelVersion === 'H2.5' ? 25 : aiModelVersion === 'H3.0' ? 35 : 40;
    if (meshQuality === 'ULTRA') c += 15;
    if (hasTexture) {
      c += 10;
      if (textureQuality === '4K') c += 10;
      if (textureQuality === '8K') c += 30;
    }
    if (inParts) c += 20;
    return { cost: c * batchSize, usingTrial: false };
  };

  const { cost: estimatedCost, usingTrial } = computeEstimatedCost();

  const parsedMeshData: ProceduralMeshData | null = React.useMemo(() => {
    if (!activeAsset?.geometryJson) return null;
    try {
      return JSON.parse(activeAsset.geometryJson) as ProceduralMeshData;
    } catch {
      return null;
    }
  }, [activeAsset]);

  // Pipeline Guard Checks (Exact Tripo Studio rules)
  const isSegmentBlocked = Boolean(
    activeAsset && (activeAsset.topology === 'QUAD' || activeAsset.isRigged)
  );
  const isSmartUvBlocked = Boolean(
    activeAsset &&
      ((activeAsset.topology === 'TRIANGLE' && activeAsset.faces > 80000) ||
        (activeAsset.topology === 'QUAD' && activeAsset.faces > 40000))
  );

  const handleGenerateReferenceImage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(256, 256, 40, 256, 256, 260);
    grad.addColorStop(0, '#2e3446');
    grad.addColorStop(1, '#0d0f17');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(245, 197, 24, 0.2)';
    for (let i = 0; i < 512; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    ctx.fillStyle = '#f5c518';
    ctx.beginPath();
    ctx.arc(256, 130, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(206, 185, 100, 140);
    ctx.fillRect(130, 195, 70, 28);
    ctx.fillRect(312, 195, 70, 28);
    ctx.fillRect(212, 330, 36, 120);
    ctx.fillRect(264, 330, 36, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`TRIPO AI REF • ${imageStyle.toUpperCase()}`, 24, 480);

    const dataUrl = canvas.toDataURL('image/png');
    const item = {
      id: `img_${Date.now()}`,
      prompt: imagePrompt,
      style: imageStyle,
      dataUrl,
    };
    setGeneratedImages((prev) => [item, ...prev]);
    setUploadedRefImage(dataUrl);
    setStatusMessage({
      type: 'success',
      text: 'Generated 2D reference image! Click "Send to 3D Model" to turn it into a 3D mesh.',
    });
  };

  const handleGenerateModel = async () => {
    setBusy(true);
    setBusyStageLabel('Generating 3D...');
    setStatusMessage({
      type: 'info',
      text: `Synthesizing ${generationMode === 'SMART_MESH' ? 'Smart Mesh P2.0' : `Tripo ${aiModelVersion}`} 3D geometry...`,
    });
    try {
      const res = await fetch('/api/studio/generate-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            inputType === 'TEXT'
              ? prompt
              : prompt || `3D Model from ${inputType.toLowerCase()} input`,
          negativePrompt,
          generationMode,
          inputType,
          aiModelVersion,
          meshQuality,
          hasTexture,
          textureQuality,
          pbrEnabled,
          removeLighting,
          inParts,
          aiComplete,
          topology,
          lowPoly,
          targetPolycount: lowPoly ? targetPolycount : null,
          tPose,
          useTrial,
          batchSize,
          isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || 'Failed to generate 3D model',
        });
      } else {
        if (data.asset) {
          setAssets((prev) => [data.asset, ...prev]);
          setActiveAsset(data.asset);
        }
        if (user && typeof data.creditsBalance === 'number') {
          setUser({
            ...user,
            creditsBalance: data.creditsBalance,
            smartMeshTrials:
              typeof data.smartMeshTrials === 'number'
                ? data.smartMeshTrials
                : user.smartMeshTrials,
          });
        }
        setStatusMessage({
          type: 'success',
          text: `Generated "${data.asset?.name}" (${data.asset?.faces?.toLocaleString()} faces, ${data.asset?.topology}) • Cost: ${data.creditCost} ⚡`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Network error during generation',
      });
    } finally {
      setBusy(false);
      setBusyStageLabel(null);
    }
  };

  const handleProcessStage = async (
    stage:
      | 'segment'
      | 'fill_parts'
      | 'retopo'
      | 'smart_uv'
      | 'texture'
      | 'pbr_generate'
      | 'upscale_4k'
      | 'upscale_8k'
      | 'rig'
      | 'animate',
    extraParams: Record<string, unknown> = {}
  ) => {
    if (!activeAsset) {
      setStatusMessage({
        type: 'error',
        text: 'Select or generate a 3D model first before running pipeline stages.',
      });
      return;
    }

    const stageLabels: Record<string, string> = {
      segment: 'Segmenting...',
      fill_parts: 'Filling Parts...',
      retopo: 'Retopologizing...',
      smart_uv: 'Unwrapping UV...',
      texture: 'Generating Texture...',
      pbr_generate: 'Generating PBR Maps...',
      upscale_4k: 'Upscaling 4K Texture...',
      upscale_8k: 'Upscaling 8K Texture...',
      rig: 'Rigging...',
      animate: 'Retargeting...',
    };

    setBusy(true);
    setBusyStageLabel(stageLabels[stage] || 'Processing...');
    setStatusMessage({
      type: 'info',
      text: `Running ${stage.toUpperCase()} pipeline stage on "${activeAsset.name}"...`,
    });

    try {
      const res = await fetch(`/api/studio/assets/${activeAsset.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          ...extraParams,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({
          type: 'error',
          text: data.error || `Stage ${stage} failed`,
        });
      } else {
        setActiveAsset(data.asset);
        setAssets((prev) =>
          prev.map((a) => (a.id === data.asset.id ? data.asset : a))
        );
        if (user && typeof data.creditsBalance === 'number') {
          setUser({ ...user, creditsBalance: data.creditsBalance });
        }
        setStatusMessage({
          type: 'success',
          text: `${data.summary} (${data.creditCost} ⚡)`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to process asset stage',
      });
    } finally {
      setBusy(false);
      setBusyStageLabel(null);
    }
  };

  const handleUpload3DModel = async (file: File) => {
    setBusy(true);
    setBusyStageLabel('Uploading 3D Model...');
    setStatusMessage({ type: 'info', text: `Uploading & parsing 3D file ${file.name}...` });
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/studio/assets', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: data.error || 'Upload failed' });
      } else if (data.asset) {
        setAssets((prev) => [data.asset, ...prev]);
        setActiveAsset(data.asset);
        setStatusMessage({
          type: 'success',
          text: `Imported "${data.asset.name}" (${data.asset.faces.toLocaleString()} faces)`,
        });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error uploading 3D model' });
    } finally {
      setBusy(false);
      setBusyStageLabel(null);
    }
  };

  const isMagicBrushActive =
    activeStage === 'texture_edit' ||
    (activeStage === 'texture' && textureSubTab === 'magic_brush');

  const filteredAnimations = ANIMATION_PRESETS.filter((clip) => {
    const matchesCat = animCategory === 'All' || clip.category === animCategory;
    const matchesSearch =
      !animSearch.trim() ||
      clip.label.toLowerCase().includes(animSearch.trim().toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#070709] text-slate-100">
      <StudioNavbar
        user={user}
        onUserUpdated={setUser}
        onSelectWorkspaceMode={(mode) => {
          if (mode === 'IMAGE_GEN') {
            setActiveStage('image');
          } else {
            setActiveStage('model');
            setGenerationMode(mode);
          }
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* 1. Far-Left Expandable 7-Stage Pipeline Icon Rail (matching Screenshots 63-84) */}
        <aside className="flex w-[68px] shrink-0 flex-col items-center justify-between border-r border-white/10 bg-[#0d0e12] py-2.5 select-none overflow-y-auto">
          <div className="flex w-full flex-col items-center gap-1 px-1.5">
            {/* Stage 1: Image (with GPT Image 1.5 badge) */}
            <button
              type="button"
              data-testid="rail-image"
              onClick={() => setActiveStage('image')}
              className={`group flex w-full flex-col items-center justify-center rounded-xl py-1.5 transition ${
                activeStage === 'image'
                  ? 'bg-[#222530] text-[#f5c518] shadow-inner'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <ImageIcon className="h-4 w-4" />
              <span className="mt-0.5 text-[10px] font-semibold">Image</span>
              <span className="mt-0.5 rounded bg-indigo-500/30 px-1 py-0.2 text-[7px] font-extrabold text-indigo-300">
                GPT Image 1.5
              </span>
            </button>

            {/* Stage 2: Model */}
            <button
              type="button"
              data-testid="rail-model"
              onClick={() => setActiveStage('model')}
              className={`group flex w-full flex-col items-center justify-center rounded-xl py-2 transition ${
                activeStage === 'model'
                  ? 'bg-[#222530] text-[#f5c518] shadow-inner'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Box className="h-4 w-4" />
              <span className="mt-1 text-[10px] font-semibold">Model</span>
            </button>

            {/* Stage 3: Segment + Expandable Sub-item "Fill Parts" (matching Screenshots 63, 64) */}
            <div className="flex w-full flex-col items-center">
              <button
                type="button"
                data-testid="rail-segment"
                onClick={() => setActiveStage('segment')}
                className={`group flex w-full flex-col items-center justify-center rounded-xl py-2 transition ${
                  activeStage === 'segment' || activeStage === 'fill_parts'
                    ? 'bg-[#222530] text-[#f5c518] shadow-inner'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Scissors className="h-4 w-4" />
                <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold">
                  Segment <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                </span>
              </button>
              {(activeStage === 'segment' || activeStage === 'fill_parts') && (
                <button
                  type="button"
                  data-testid="rail-sub-fill_parts"
                  onClick={() => setActiveStage('fill_parts')}
                  className={`mt-1 w-full rounded-lg py-1 text-[9px] font-bold transition ${
                    activeStage === 'fill_parts'
                      ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Fill Parts
                </button>
              )}
            </div>

            {/* Stage 4: Retopo */}
            <button
              type="button"
              data-testid="rail-retopo"
              onClick={() => setActiveStage('retopo')}
              className={`group flex w-full flex-col items-center justify-center rounded-xl py-2 transition ${
                activeStage === 'retopo'
                  ? 'bg-[#222530] text-[#f5c518] shadow-inner'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Grid className="h-4 w-4" />
              <span className="mt-1 text-[10px] font-semibold">Retopo</span>
            </button>

            {/* Stage 5: Smart UV */}
            <button
              type="button"
              data-testid="rail-smart_uv"
              onClick={() => setActiveStage('smart_uv')}
              className={`group flex w-full flex-col items-center justify-center rounded-xl py-2 transition ${
                activeStage === 'smart_uv'
                  ? 'bg-[#222530] text-[#f5c518] shadow-inner'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="mt-1 text-[10px] font-semibold">Smart UV</span>
            </button>

            {/* Stage 6: Texture + Expandable Sub-items "Edit", "Upscale", "PBR" (matching Screenshots 67-70) */}
            <div className="flex w-full flex-col items-center">
              <button
                type="button"
                data-testid="rail-texture"
                onClick={() => {
                  setActiveStage('texture');
                  setTextureSubTab('generator');
                }}
                className={`group flex w-full flex-col items-center justify-center rounded-xl py-2 transition ${
                  activeStage.startsWith('texture')
                    ? 'bg-[#222530] text-[#f5c518] shadow-inner'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Palette className="h-4 w-4" />
                <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold">
                  Texture <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                </span>
              </button>
              {activeStage.startsWith('texture') && (
                <div className="mt-1 flex w-full flex-col gap-1">
                  <button
                    type="button"
                    data-testid="rail-sub-texture_edit"
                    onClick={() => setActiveStage('texture_edit')}
                    className={`flex items-center justify-center gap-0.5 rounded-lg py-1 text-[9px] font-bold transition ${
                      activeStage === 'texture_edit'
                        ? 'bg-indigo-500/25 text-[#f5c518] border border-[#f5c518]/40'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Wand2 className="h-2.5 w-2.5 text-[#f5c518]" /> Edit
                  </button>
                  <button
                    type="button"
                    data-testid="rail-sub-texture_upscale"
                    onClick={() => setActiveStage('texture_upscale')}
                    className={`rounded-lg py-1 text-[9px] font-bold transition ${
                      activeStage === 'texture_upscale'
                        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    Upscale
                  </button>
                  <button
                    type="button"
                    data-testid="rail-sub-texture_pbr"
                    onClick={() => setActiveStage('texture_pbr')}
                    className={`rounded-lg py-1 text-[9px] font-bold transition ${
                      activeStage === 'texture_pbr'
                        ? 'bg-indigo-500/25 text-indigo-300 border border-indigo-500/40'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    PBR
                  </button>
                </div>
              )}
            </div>

            {/* Stage 7: Rig + Expandable Sub-item "Animate" (matching Screenshots 71-84) */}
            <div className="flex w-full flex-col items-center">
              <button
                type="button"
                data-testid="rail-rig"
                onClick={() => {
                  setActiveStage('rig');
                  setRigSubTab('rig');
                }}
                className={`group flex w-full flex-col items-center justify-center rounded-xl py-2 transition ${
                  activeStage === 'rig' || activeStage === 'animate'
                    ? 'bg-[#222530] text-[#f5c518] shadow-inner'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Bone className="h-4 w-4" />
                <span className="mt-1 flex items-center gap-0.5 text-[10px] font-semibold">
                  Rig <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                </span>
              </button>
              {(activeStage === 'rig' || activeStage === 'animate') && (
                <button
                  type="button"
                  data-testid="rail-sub-animate"
                  onClick={() => {
                    setActiveStage('animate');
                    setRigSubTab('animate');
                  }}
                  className={`mt-1 w-full rounded-lg py-1 text-[9px] font-bold transition ${
                    activeStage === 'animate' || (activeStage === 'rig' && rigSubTab === 'animate')
                      ? 'bg-indigo-500/25 text-[#f5c518] border border-[#f5c518]/40'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  Animate
                </button>
              )}
            </div>
          </div>

          <button
            type="button"
            data-testid="rail-app"
            onClick={() => setActiveStage('app')}
            className={`flex w-[52px] flex-col items-center justify-center rounded-xl py-2 transition ${
              activeStage === 'app'
                ? 'bg-[#222530] text-[#f5c518]'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <AppWindow className="h-4 w-4" />
            <span className="mt-1 text-[10px] font-semibold">App</span>
          </button>
        </aside>

        {/* 2. Left Stage Configuration Drawer */}
        <section className="flex w-[335px] shrink-0 flex-col border-r border-white/10 bg-[#111319] overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* STAGE 1: IMAGE */}
            {activeStage === 'image' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-extrabold text-white">
                      Generate Reference Image
                    </h2>
                    <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300">
                      GPT Image 1.5
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Create clean T-pose or studio reference sheets for 1-click Image-to-3D.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    Image Prompt
                  </label>
                  <textarea
                    rows={3}
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#181a23] p-3 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                    placeholder="Describe the character or object..."
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">
                    3D Reference Style Preset
                  </label>
                  <div className="mt-1.5 grid grid-cols-2 gap-2">
                    {['T-Pose Ortho', 'Studio White', 'Isometric Prop', 'Game Concept'].map(
                      (st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setImageStyle(st)}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            imageStyle === st
                              ? 'border-[#f5c518] bg-[#f5c518]/15 text-[#f5c518]'
                              : 'border-white/10 bg-[#181a23] text-slate-300 hover:border-white/25'
                          }`}
                        >
                          {st}
                        </button>
                      )
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Aspect Ratio</label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2">
                    {(['1:1', '16:9', '9:16'] as const).map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setImageAspect(ratio)}
                        className={`rounded-lg border py-1.5 text-xs font-bold ${
                          imageAspect === ratio
                            ? 'border-[#f5c518] bg-[#f5c518] text-black'
                            : 'border-white/10 bg-[#181a23] text-slate-300'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateReferenceImage}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
                >
                  <Wand2 className="h-4 w-4" />
                  Generate 2D Reference (⚡ 5)
                </button>

                {generatedImages.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-bold text-slate-300">
                      Generated Reference Sheets
                    </div>
                    {generatedImages.map((img) => (
                      <div
                        key={img.id}
                        className="rounded-xl border border-white/10 bg-[#181a23] p-2.5"
                      >
                        <img
                          src={img.dataUrl}
                          alt={img.prompt}
                          className="h-36 w-full rounded-lg object-cover"
                        />
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-300">
                            {img.style}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setUploadedRefImage(img.dataUrl);
                              setPrompt(img.prompt);
                              setInputType('IMAGE');
                              setActiveStage('model');
                            }}
                            className="rounded-lg bg-[#f5c518] px-2.5 py-1 text-[11px] font-bold text-black hover:bg-[#fde047]"
                          >
                            Send to 3D Model →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STAGE 2: MODEL */}
            {activeStage === 'model' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-[#181a23] p-1">
                  <button
                    type="button"
                    data-testid="mode-hd-model"
                    onClick={() => setGenerationMode('HD_MODEL')}
                    className={`rounded-lg py-2 text-xs font-bold transition ${
                      generationMode === 'HD_MODEL'
                        ? 'bg-[#262a38] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    HD Model
                  </button>
                  <button
                    type="button"
                    data-testid="mode-smart-mesh"
                    onClick={() => setGenerationMode('SMART_MESH')}
                    className={`relative rounded-lg py-2 text-xs font-bold transition ${
                      generationMode === 'SMART_MESH'
                        ? 'bg-[#262a38] text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Smart Mesh</span>
                    <span className="ml-1 rounded bg-orange-500 px-1 py-0.5 text-[8px] font-extrabold text-white">
                      NEW
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-4 border-b border-white/10 text-xs font-semibold">
                  {(
                    [
                      { id: 'IMAGE', label: 'Image' },
                      { id: 'MULTI_VIEW', label: 'Multi-View' },
                      { id: 'TEXT', label: 'Text' },
                      { id: 'SKETCH', label: 'Sketch' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      data-testid={`input-tab-${tab.id.toLowerCase()}`}
                      onClick={() => setInputType(tab.id)}
                      className={`pb-2.5 text-center transition ${
                        inputType === tab.id
                          ? 'border-b-2 border-[#f5c518] text-white font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {inputType === 'IMAGE' && (
                  <div className="space-y-2.5">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = () =>
                            setUploadedRefImage(String(reader.result));
                          reader.readAsDataURL(file);
                          if (!prompt) setPrompt(file.name.replace(/\.[^.]+$/, ''));
                        }
                      }}
                    />
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      className="flex h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[#181a23] p-4 text-center hover:border-[#f5c518]/60 transition"
                    >
                      {uploadedRefImage ? (
                        <img
                          src={uploadedRefImage}
                          alt="Uploaded Reference"
                          className="h-full object-contain rounded-lg"
                        />
                      ) : (
                        <>
                          <Upload className="mb-2 h-6 w-6 text-slate-400" />
                          <div className="text-xs font-semibold text-slate-200">
                            Upload image or drag & drop here
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400">
                            Supports JPG, PNG, WEBP up to 20MB
                          </div>
                        </>
                      )}
                    </div>
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Optional semantic subject label..."
                      className="w-full rounded-xl border border-white/10 bg-[#181a23] px-3 py-2 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                    />
                  </div>
                )}

                {inputType === 'MULTI_VIEW' && (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      {(['front', 'left', 'back', 'right'] as const).map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() =>
                            setMultiViews((mv) => ({
                              ...mv,
                              [slot]: mv[slot] ? null : `loaded_${slot}`,
                            }))
                          }
                          className={`flex h-20 flex-col items-center justify-center rounded-xl border border-dashed text-xs transition ${
                            multiViews[slot]
                              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                              : 'border-white/15 bg-[#181a23] text-slate-400 hover:border-white/30'
                          }`}
                        >
                          <Upload className="mb-1 h-4 w-4" />
                          <span className="capitalize font-semibold">
                            {slot} {slot === 'front' ? '(Required)' : ''}
                          </span>
                          {multiViews[slot] && (
                            <span className="text-[10px] text-emerald-400">✓ Ready</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Subject description for multi-view fusion..."
                      className="w-full rounded-xl border border-white/10 bg-[#181a23] px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}

                {inputType === 'TEXT' && (
                  <div className="space-y-2.5">
                    <div className="relative">
                      <textarea
                        data-testid="workspace-prompt-input"
                        rows={3}
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the 3D model you want to generate..."
                        className="w-full rounded-2xl border border-white/15 bg-[#181a23] p-3 text-xs text-white focus:border-[#f5c518] focus:outline-none"
                      />
                      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const next =
                              SAMPLE_PROMPTS[
                                (SAMPLE_PROMPTS.indexOf(prompt) + 1) %
                                  SAMPLE_PROMPTS.length
                              ];
                            setPrompt(next);
                          }}
                          className="flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold text-[#f5c518] hover:bg-white/10"
                        >
                          <Sparkles className="h-3 w-3" /> Inspire Prompt
                        </button>
                        <span className="text-[10px] text-slate-500">
                          {prompt.length}/600
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {inputType === 'SKETCH' && (
                  <div className="space-y-2">
                    <div className="overflow-hidden rounded-2xl border border-white/15 bg-[#181a23]">
                      <canvas
                        ref={sketchCanvasRef}
                        width={290}
                        height={140}
                        onMouseDown={(e) => {
                          setIsDrawingSketch(true);
                          const ctx = sketchCanvasRef.current?.getContext('2d');
                          if (ctx && sketchCanvasRef.current) {
                            const r = sketchCanvasRef.current.getBoundingClientRect();
                            ctx.strokeStyle = '#f5c518';
                            ctx.lineWidth = 3;
                            ctx.beginPath();
                            ctx.moveTo(e.clientX - r.left, e.clientY - r.top);
                          }
                        }}
                        onMouseMove={(e) => {
                          if (!isDrawingSketch) return;
                          const ctx = sketchCanvasRef.current?.getContext('2d');
                          if (ctx && sketchCanvasRef.current) {
                            const r = sketchCanvasRef.current.getBoundingClientRect();
                            ctx.lineTo(e.clientX - r.left, e.clientY - r.top);
                            ctx.stroke();
                          }
                        }}
                        onMouseUp={() => setIsDrawingSketch(false)}
                        className="w-full cursor-crosshair bg-[#0d0e14]"
                      />
                    </div>
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="Prompt to guide sketch-to-3D..."
                      className="w-full rounded-xl border border-white/10 bg-[#181a23] px-3 py-2 text-xs text-white"
                    />
                  </div>
                )}

                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#161821] p-3.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                    <span>Geometry & Texture</span>
                    <Sliders className="h-3.5 w-3.5 text-slate-400" />
                  </div>

                  {generationMode === 'HD_MODEL' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Mesh Quality</span>
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-[#f5c518]">
                          👑 Ultra 3.1
                        </span>
                      </div>
                      <div className="grid grid-cols-2 rounded-lg bg-[#0e1016] p-1 text-xs">
                        <button
                          type="button"
                          onClick={() => setMeshQuality('STANDARD')}
                          className={`rounded-md py-1 font-semibold ${
                            meshQuality === 'STANDARD'
                              ? 'bg-[#252936] text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          Standard
                        </button>
                        <button
                          type="button"
                          onClick={() => setMeshQuality('ULTRA')}
                          className={`rounded-md py-1 font-semibold ${
                            meshQuality === 'ULTRA'
                              ? 'bg-[#252936] text-[#f5c518]'
                              : 'text-slate-400'
                          }`}
                        >
                          Ultra (+15⚡)
                        </button>
                      </div>
                    </div>
                  )}

                  {generationMode === 'HD_MODEL' && (
                    <div className="space-y-2 border-t border-white/5 pt-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">Generate in Parts</span>
                        <input
                          type="checkbox"
                          checked={inParts}
                          onChange={(e) => setInParts(e.target.checked)}
                          className="h-4 w-4 accent-[#f5c518]"
                        />
                      </div>
                      {inParts && (
                        <div className="flex items-center justify-between pl-2 text-[11px] text-slate-400">
                          <span>AI Complete Hidden Surfaces</span>
                          <input
                            type="checkbox"
                            checked={aiComplete}
                            onChange={(e) => setAiComplete(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[#f5c518]"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 border-t border-white/5 pt-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Texture</span>
                      <input
                        type="checkbox"
                        checked={hasTexture}
                        onChange={(e) => setHasTexture(e.target.checked)}
                        className="h-4 w-4 accent-[#f5c518]"
                      />
                    </div>
                    {hasTexture && (
                      <div className="space-y-2 rounded-xl bg-[#0e1016] p-2.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">4K / 8K Resolution</span>
                          <div className="flex gap-1">
                            {(['2K', '4K', '8K'] as const).map((q) => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => setTextureQuality(q)}
                                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                  textureQuality === q
                                    ? 'bg-[#f5c518] text-black'
                                    : 'bg-white/5 text-slate-400'
                                }`}
                              >
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Remove Lighting (De-light)</span>
                          <input
                            type="checkbox"
                            checked={removeLighting}
                            onChange={(e) => setRemoveLighting(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[#f5c518]"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">PBR Material Channels</span>
                          <input
                            type="checkbox"
                            checked={pbrEnabled}
                            onChange={(e) => setPbrEnabled(e.target.checked)}
                            className="h-3.5 w-3.5 accent-[#f5c518]"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 border-t border-white/5 pt-2.5">
                    <div className="text-xs text-slate-300">Topology</div>
                    <div className="grid grid-cols-2 rounded-lg bg-[#0e1016] p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setTopology('QUAD')}
                        className={`rounded-md py-1 font-semibold ${
                          topology === 'QUAD'
                            ? 'bg-[#252936] text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        Quad
                      </button>
                      <button
                        type="button"
                        onClick={() => setTopology('TRIANGLE')}
                        className={`rounded-md py-1 font-semibold ${
                          topology === 'TRIANGLE'
                            ? 'bg-[#252936] text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        Triangle
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-white/5 pt-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Low Poly / Polycount Limit</span>
                      <input
                        type="checkbox"
                        checked={lowPoly}
                        onChange={(e) => setLowPoly(e.target.checked)}
                        className="h-4 w-4 accent-[#f5c518]"
                      />
                    </div>
                    {lowPoly && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>Target Faces</span>
                          <span className="font-mono text-[#f5c518]">
                            {targetPolycount.toLocaleString()}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={500}
                          max={200000}
                          step={500}
                          value={targetPolycount}
                          onChange={(e) => setTargetPolycount(Number(e.target.value))}
                          className="w-full accent-[#f5c518]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-xs">
                    <span className="text-slate-300">T-Pose / A-Pose Symmetry</span>
                    <input
                      type="checkbox"
                      checked={tPose}
                      onChange={(e) => setTPose(e.target.checked)}
                      className="h-4 w-4 accent-[#f5c518]"
                    />
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-[#161821] p-3.5">
                  <div className="text-xs font-bold text-slate-200">AI Model</div>
                  {generationMode === 'HD_MODEL' ? (
                    <div className="space-y-1.5">
                      {[
                        {
                          v: 'H3.1',
                          title: 'H3.1 – Best Quality',
                          desc: 'Ultra-sharp details & photoreal PBR',
                        },
                        {
                          v: 'H3.0',
                          title: 'H3.0 – Fast & Balanced',
                          desc: 'Rapid iteration for concept workflows',
                        },
                        {
                          v: 'H2.5',
                          title: 'H2.5 – Legacy',
                          desc: 'Lightweight classic Tripo generator',
                        },
                      ].map((m) => (
                        <button
                          key={m.v}
                          type="button"
                          onClick={() => setAiModelVersion(m.v)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                            aiModelVersion === m.v
                              ? 'border-[#f5c518] bg-[#f5c518]/10 text-white'
                              : 'border-white/5 bg-[#0e1016] text-slate-400 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{m.title}</div>
                            <div className="text-[10px] text-slate-400">{m.desc}</div>
                          </div>
                          {aiModelVersion === m.v && (
                            <span className="h-2 w-2 rounded-full bg-[#f5c518]" />
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {[
                        {
                          v: 'P2.0',
                          title: 'P2.0 – Detail & Speed',
                          desc: 'Native clean edge-flow quad topology (100⚡ or Trial)',
                        },
                        {
                          v: 'P1.0',
                          title: 'P1.0 – Precision & Control',
                          desc: 'Strict low-poly game asset quad cage (80⚡)',
                        },
                      ].map((m) => (
                        <button
                          key={m.v}
                          type="button"
                          onClick={() => setAiModelVersion(m.v)}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left transition ${
                            aiModelVersion === m.v
                              ? 'border-[#f5c518] bg-[#f5c518]/10 text-white'
                              : 'border-white/5 bg-[#0e1016] text-slate-400 hover:border-white/20'
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-white">{m.title}</div>
                            <div className="text-[10px] text-slate-400">{m.desc}</div>
                          </div>
                        </button>
                      ))}

                      <div className="mt-2 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs">
                        <span className="font-semibold text-[#f5c518]">
                          Free Trial ×{user ? user.smartMeshTrials : 2}
                        </span>
                        <input
                          type="checkbox"
                          checked={useTrial}
                          onChange={(e) => setUseTrial(e.target.checked)}
                          className="h-4 w-4 accent-[#f5c518]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#161821] px-3.5 py-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Batch:</span>
                    {[1, 2, 3, 4].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setBatchSize(n)}
                        className={`h-6 w-6 rounded-md font-bold ${
                          batchSize === n
                            ? 'bg-[#f5c518] text-black'
                            : 'bg-[#0e1016] text-slate-400'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic((p) => !p)}
                    className="flex items-center gap-1 rounded-lg bg-[#0e1016] px-2.5 py-1 text-[11px] text-slate-300"
                  >
                    {isPublic ? (
                      <>
                        <Globe className="h-3 w-3 text-emerald-400" /> Public
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3 text-[#f5c518]" /> Private
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* STAGE 3: SEGMENT (matching Screenshot 63) */}
            {activeStage === 'segment' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-white">Segmentation</h2>
                  <p className="text-[11px] text-slate-400">
                    Decompose your 3D mesh into semantic sub-components and complete occluded interior geometry.
                  </p>
                </div>

                {isSegmentBlocked && (
                  <div
                    data-testid="segment-guard-banner"
                    className="flex items-start gap-2.5 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#f5c518]" />
                    <div>
                      <div className="font-bold text-[#f5c518]">
                        Models with quad faces or animation are not supported
                      </div>
                      <div className="mt-0.5 text-[11px] text-amber-200/80">
                        Switch to Retopo → Triangle topology before running AI Segmentation.
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-white/10 bg-[#161821] p-3.5 space-y-2.5">
                  <div className="text-xs font-bold text-slate-200">Detail Level</div>
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    {[
                      { id: 'simple', label: 'Simple', sub: '3–6 parts' },
                      { id: 'balanced', label: 'Balanced', sub: '6–15 parts' },
                      { id: 'detailed', label: 'Detailed', sub: '15+ parts' },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() =>
                          setSegmentDetailLevel(lvl.id as 'simple' | 'balanced' | 'detailed')
                        }
                        className={`rounded-xl border p-2 text-xs transition ${
                          segmentDetailLevel === lvl.id
                            ? 'border-[#f5c518] bg-[#f5c518]/15 text-[#f5c518]'
                            : 'border-white/10 bg-[#0e1016] text-slate-300'
                        }`}
                      >
                        <div className="font-bold">{lvl.label}</div>
                        <div className="text-[10px] text-slate-400">{lvl.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#161821] p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Semantic Parts Detected</span>
                    <span className="font-bold text-white">
                      {parsedMeshData?.parts?.length || 0} Parts
                    </span>
                  </div>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {(parsedMeshData?.parts || []).map((part) => (
                      <div
                        key={part.name}
                        className="flex items-center justify-between rounded-xl bg-[#0e1016] px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: part.segmentColor }}
                          />
                          <span className="font-medium text-slate-200">
                            {part.segmentLabel || part.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setHiddenParts((hp) => ({
                              ...hp,
                              [part.name]: !hp[part.name],
                            }))
                          }
                          className="text-slate-400 hover:text-white"
                        >
                          {hiddenParts[part.name] ? (
                            <EyeOff className="h-3.5 w-3.5 text-rose-400" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-200">
                  <span className="font-bold">New Function Trial x1</span>
                  <span className="rounded bg-indigo-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                    FREE
                  </span>
                </div>

                <button
                  type="button"
                  data-testid="btn-start-segmenting"
                  disabled={busy || isSegmentBlocked}
                  onClick={() => handleProcessStage('segment')}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black disabled:opacity-40 hover:bg-[#fde047] transition"
                >
                  <Scissors className="h-4 w-4" />
                  <span>Start Segmenting</span>
                  <span className="line-through opacity-60">⚡ 40</span>
                  <span>0</span>
                </button>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setActiveStage('fill_parts')}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
                >
                  <Sparkles className="h-4 w-4 text-[#f5c518]" />
                  Open Fill Parts Sub-Stage →
                </button>
              </div>
            )}

            {/* STAGE 3B: FILL PARTS (matching Screenshot 64) */}
            {activeStage === 'fill_parts' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-white">Fill Parts</h2>
                  <p className="mt-1 text-xs text-slate-300">
                    Automatically complete your segmented model.
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#161821] p-4">
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl border border-white/10 bg-[#0e1016] p-3">
                      <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-rose-400/50 bg-rose-500/10 text-xs font-bold text-rose-300">
                        Hollow Seam
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400">
                        Before Fill
                      </span>
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-500/20 text-xs font-bold text-emerald-200">
                        Watertight Cap
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-300">
                        After Fill
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-fill-parts"
                  disabled={busy}
                  onClick={() => handleProcessStage('fill_parts')}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
                >
                  <Sparkles className="h-4 w-4" />
                  Fill Parts (⚡ 20)
                </button>
              </div>
            )}

            {/* STAGE 4: RETOPO (matching Screenshots 65, 75, 76) */}
            {activeStage === 'retopo' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-white">Retopology</h2>
                  <p className="text-[11px] text-slate-400">
                    Convert dense triangle meshes into clean isotropic Quad cages or game-ready low-poly budgets.
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#161821] p-3.5">
                  <div className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-300">Topology</span>
                    <div className="grid grid-cols-2 rounded-lg bg-[#0e1016] p-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setRetopoTopology('QUAD')}
                        className={`rounded-md py-1.5 font-bold ${
                          retopoTopology === 'QUAD'
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        Quad
                      </button>
                      <button
                        type="button"
                        onClick={() => setRetopoTopology('TRIANGLE')}
                        className={`rounded-md py-1.5 font-bold ${
                          retopoTopology === 'TRIANGLE'
                            ? 'bg-indigo-500 text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        Triangle
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-200">Smart Mesh</span>
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-slate-300">
                        P1.0
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={retopoSmartLowPoly}
                      onChange={(e) => setRetopoSmartLowPoly(e.target.checked)}
                      className="h-4 w-4 accent-[#f5c518]"
                    />
                  </div>

                  <div className="space-y-2 border-t border-white/5 pt-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">Polygon Count</span>
                      <input
                        type="number"
                        data-testid="retopo-polycount-input"
                        min={500}
                        max={200000}
                        step={500}
                        value={retopoPolycount}
                        onChange={(e) =>
                          setRetopoPolycount(
                            Math.max(500, Math.min(200000, Number(e.target.value) || 500))
                          )
                        }
                        className="w-24 rounded-lg border border-white/10 bg-[#0e1016] px-2 py-1 text-right font-mono text-xs text-white"
                      />
                    </div>
                    <input
                      type="range"
                      min={500}
                      max={200000}
                      step={500}
                      value={retopoPolycount}
                      onChange={(e) => setRetopoPolycount(Number(e.target.value))}
                      className="w-full accent-indigo-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>500</span>
                      <span>200,000</span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5 pt-1">
                      {[3000, 10000, 20000, 50000, 100000].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setRetopoPolycount(val)}
                          className={`rounded-lg py-1.5 text-[11px] font-bold ${
                            retopoPolycount === val
                              ? 'bg-[#f5c518] text-black'
                              : 'bg-[#0e1016] text-slate-400 hover:text-white'
                          }`}
                        >
                          {val / 1000}k
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-confirm-retopo"
                  disabled={busy}
                  onClick={() =>
                    handleProcessStage('retopo', {
                      topology: retopoTopology,
                      targetPolycount: retopoPolycount,
                      smartLowPoly: retopoSmartLowPoly,
                    })
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
                >
                  <Grid className="h-4 w-4" />
                  Retopology (⚡ 40)
                </button>
              </div>
            )}

            {/* STAGE 5: SMART UV (matching Screenshots 66, 77) */}
            {activeStage === 'smart_uv' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-white">Smart UV</h2>
                  <p className="text-[11px] text-slate-400">
                    Automatic distortion-free UV atlas packing for clean texture baking.
                  </p>
                </div>

                {/* Before / After UV Comparison Card matching Screenshot 66 */}
                <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-white/10 bg-[#161821] p-3 text-center">
                  <div className="rounded-xl bg-[#0e1016] p-2.5">
                    <div className="mx-auto mb-1.5 grid h-16 w-16 grid-cols-4 gap-0.5 rounded border border-rose-500/30 bg-rose-950/30 p-1">
                      {Array.from({ length: 16 }).map((_, idx) => (
                        <span key={idx} className="rounded-xs bg-rose-400/30" />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Fragmented UV
                    </span>
                  </div>
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-2.5">
                    <div className="mx-auto mb-1.5 grid h-16 w-16 grid-cols-3 gap-1 rounded border border-indigo-400/40 bg-indigo-950/40 p-1.5">
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <span key={idx} className="rounded-xs bg-indigo-400/60" />
                      ))}
                    </div>
                    <span className="text-[10px] font-semibold text-indigo-300">
                      Smart UV Atlas
                    </span>
                  </div>
                </div>

                <div
                  data-testid="smart-uv-rule-banner"
                  className={`flex items-start gap-2.5 rounded-2xl border p-3 text-xs ${
                    isSmartUvBlocked
                      ? 'border-rose-500/40 bg-rose-500/10 text-rose-200'
                      : 'border-white/10 bg-[#161821] text-slate-300'
                  }`}
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#f5c518]" />
                  <div>
                    <div className="font-bold text-white">
                      Polygon Threshold Requirement
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      Smart UV is only available for models with ≤ 80,000 tris or ≤ 40,000 quads. Current:{' '}
                      <span className="font-mono text-white">
                        {activeAsset?.faces?.toLocaleString() || 0}
                      </span>{' '}
                      ({activeAsset?.topology || 'TRIANGLE'}).
                    </div>
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-[#161821] p-3.5">
                  <div className="text-xs font-semibold text-slate-300">
                    UV Chart Packing Mode
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['Auto', 'Organic', 'Hard Surface'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setUvMode(m)}
                        className={`rounded-lg py-1.5 text-[11px] font-bold ${
                          uvMode === m
                            ? 'bg-[#f5c518] text-black'
                            : 'bg-[#0e1016] text-slate-400'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-200">
                  <span className="font-bold">Trial ×2</span>
                  <span className="text-[10px] font-bold text-indigo-300">Free UV Unwrap</span>
                </div>

                <button
                  type="button"
                  data-testid="btn-unwrap-uv"
                  disabled={busy || isSmartUvBlocked}
                  onClick={() => handleProcessStage('smart_uv')}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black disabled:opacity-40 hover:bg-[#fde047] transition"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Unwrap UV</span>
                  <span className="line-through opacity-60">⚡ 20</span>
                  <span>0</span>
                </button>
              </div>
            )}

            {/* STAGE 6: TEXTURE GENERATOR & MAGIC BRUSH (matching Screenshots 67, 68) */}
            {(activeStage === 'texture' || activeStage === 'texture_edit') && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-extrabold text-white">
                    {isMagicBrushActive ? 'Magic Brush' : '3D Model Texture Generator'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      if (isMagicBrushActive) {
                        setActiveStage('texture');
                        setTextureSubTab('generator');
                      } else {
                        setTextureSubTab('magic_brush');
                      }
                    }}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition ${
                      isMagicBrushActive
                        ? 'border-[#f5c518] bg-[#f5c518]/15 text-[#f5c518]'
                        : 'border-white/10 bg-[#181a23] text-slate-300 hover:text-white'
                    }`}
                  >
                    Magic Brush
                  </button>
                </div>

                {!isMagicBrushActive ? (
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-3 rounded-xl border border-white/10 bg-[#181a23] p-1 text-xs font-bold">
                      {(['Prompt', 'Image', 'Multi-View'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTextureInputTab(t)}
                          className={`rounded-lg py-1.5 ${
                            textureInputTab === t
                              ? 'bg-[#262a38] text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <textarea
                        rows={3}
                        value={retexturePrompt}
                        onChange={(e) => setRetexturePrompt(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#181a23] p-3 text-xs text-white"
                        placeholder="Input text to generate texture..."
                      />
                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{retexturePrompt.length}/1000</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRetexturePrompt(
                              `${retexturePrompt}, hyper-detailed 4K PBR metallic finish`
                            )
                          }
                          className="rounded bg-indigo-500/20 px-1.5 py-0.5 font-bold text-indigo-300"
                        >
                          ✨ AI
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#161821] p-3">
                      <div className="text-xs font-semibold text-slate-300">
                        Create Your Own Texture Style
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="flex h-14 items-center justify-center rounded-xl border border-indigo-500 bg-[#0e1016] text-xs font-bold text-white">
                          None
                        </div>
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="flex h-14 items-center justify-center rounded-xl border border-dashed border-white/20 bg-[#0e1016] text-lg font-bold text-slate-400 hover:border-white/40"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2.5 rounded-2xl border border-white/10 bg-[#161821] p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Remove Lighting</span>
                        <input
                          type="checkbox"
                          checked={removeLighting}
                          onChange={(e) => setRemoveLighting(e.target.checked)}
                          className="h-4 w-4 accent-[#f5c518]"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Texture Resolution</span>
                        <div className="flex gap-1">
                          {(['2K', '4K', '8K'] as const).map((q) => (
                            <button
                              key={q}
                              type="button"
                              onClick={() => setTextureQuality(q)}
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                textureQuality === q
                                  ? 'bg-[#f5c518] text-black'
                                  : 'bg-[#0e1016] text-slate-400'
                              }`}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">PBR Roughness/Metallic</span>
                        <input
                          type="checkbox"
                          checked={pbrEnabled}
                          onChange={(e) => setPbrEnabled(e.target.checked)}
                          className="h-4 w-4 accent-[#f5c518]"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="btn-generate-texture"
                      disabled={busy}
                      onClick={() =>
                        handleProcessStage('texture', {
                          texturePrompt: retexturePrompt,
                          textureQuality,
                          pbrEnabled,
                        })
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047]"
                    >
                      <Palette className="h-4 w-4" />
                      Generate Texture (⚡ 20)
                    </button>
                  </div>
                ) : (
                  /* Magic Brush Sub-Panel (matching Screenshot 68) */
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-[#181a23] p-1 text-xs font-bold">
                      {(['Gen Mode', 'Paint Mode'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMagicBrushSubMode(m)}
                          className={`rounded-lg py-1.5 ${
                            magicBrushSubMode === m
                              ? 'bg-[#262a38] text-white'
                              : 'text-slate-400'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Hover over the 3D mesh in the right viewport to position the yellow Magic Brush cursor, or select a target part below.
                    </p>

                    <textarea
                      rows={3}
                      value={retexturePrompt}
                      onChange={(e) => setRetexturePrompt(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#181a23] p-3 text-xs text-white"
                      placeholder="Describe localized texture repair or material..."
                    />

                    <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#161821] p-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300">Creativity Strength</span>
                        <span className="font-mono text-white">
                          {creativityStrength.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1.0}
                        step={0.1}
                        value={creativityStrength}
                        onChange={(e) => setCreativityStrength(Number(e.target.value))}
                        className="w-full accent-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300">
                        Target Mesh Part
                      </label>
                      <select
                        value={brushTargetPart}
                        onChange={(e) => setBrushTargetPart(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#181a23] px-3 py-2 text-xs text-white"
                      >
                        {(parsedMeshData?.parts || []).map((p) => (
                          <option key={p.name} value={p.name}>
                            {p.segmentLabel || p.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300">
                        Brush Accent Color
                      </label>
                      <div className="mt-1.5 flex gap-2">
                        {[
                          '#f5c518',
                          '#38bdf8',
                          '#f43f5e',
                          '#10b981',
                          '#a855f7',
                          '#e2e8f0',
                        ].map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => setBrushColorHex(hex)}
                            className={`h-7 w-7 rounded-full border-2 ${
                              brushColorHex === hex
                                ? 'border-white scale-110'
                                : 'border-transparent'
                            }`}
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid="btn-apply-magic-brush"
                      disabled={busy}
                      onClick={() =>
                        handleProcessStage('texture', {
                          albedoColor: brushColorHex,
                          texturePrompt: `${retexturePrompt} (${brushTargetPart} accented ${brushColorHex})`,
                          textureQuality: '4K',
                          pbrEnabled: true,
                        })
                      }
                      className="w-full rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047]"
                    >
                      Generate Preview (⚡ 5)
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STAGE 6B: TEXTURE UPSCALE (matching Screenshot 69) */}
            {activeStage === 'texture_upscale' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-white">Texture Upscale</h2>
                  <p className="text-[11px] text-slate-400">
                    Super-resolve blurred albedo maps into crisp 4K or 8K Ultra-HD textures.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 rounded-2xl border border-white/10 bg-[#161821] p-3 text-center">
                  <div className="rounded-xl bg-[#0e1016] p-3">
                    <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-xl bg-amber-500/20 blur-[1.5px] text-xs font-bold text-amber-200">
                      1K / 2K
                    </div>
                    <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] text-slate-400">
                      Before
                    </span>
                  </div>
                  <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3">
                    <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-xl border border-[#f5c518]/50 bg-[#f5c518]/20 text-xs font-extrabold text-[#f5c518]">
                      Crisp {upscaleResolution}
                    </div>
                    <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[10px] font-bold text-indigo-200">
                      After
                    </span>
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-white/10 bg-[#161821] p-3.5">
                  <div className="text-xs font-semibold text-slate-300">
                    Texture Resolution
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUpscaleResolution('4K')}
                      className={`rounded-xl border py-2 text-xs font-bold ${
                        upscaleResolution === '4K'
                          ? 'border-indigo-500 bg-indigo-500/20 text-white'
                          : 'border-white/10 bg-[#0e1016] text-slate-400'
                      }`}
                    >
                      4K
                    </button>
                    <button
                      type="button"
                      onClick={() => setUpscaleResolution('8K')}
                      className={`flex items-center justify-center gap-1 rounded-xl border py-2 text-xs font-bold ${
                        upscaleResolution === '8K'
                          ? 'border-[#f5c518] bg-[#f5c518]/20 text-[#f5c518]'
                          : 'border-white/10 bg-[#0e1016] text-slate-400'
                      }`}
                    >
                      <span>8K</span>
                      <Crown className="h-3.5 w-3.5 text-[#f5c518]" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs text-indigo-200">
                  <span className="font-bold">Trial ×1</span>
                  <span className="text-[10px] font-bold text-indigo-300">Free 4K Trial</span>
                </div>

                <button
                  type="button"
                  data-testid="btn-upscale-texture"
                  disabled={busy}
                  onClick={() =>
                    handleProcessStage(
                      upscaleResolution === '8K' ? 'upscale_8k' : 'upscale_4k'
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Upscale Texture</span>
                  <span className="line-through opacity-60">⚡ 10</span>
                  <span>0</span>
                </button>
              </div>
            )}

            {/* STAGE 6C: PBR GENERATOR (matching Screenshot 70) */}
            {activeStage === 'texture_pbr' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-white">PBR Generator</h2>
                  <p className="text-[11px] text-slate-400">
                    Synthesize physically-based Metallic, Roughness, Normal, and Ambient Occlusion maps.
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#161821] p-5">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-200 via-[#f5c518] to-slate-900 shadow-[0_0_30px_rgba(245,197,24,0.35)]" />
                  <span className="mt-2.5 rounded-full bg-white/10 px-3 py-0.5 text-[11px] font-bold text-white">
                    PBR Metallic / Roughness
                  </span>
                </div>

                <div className="space-y-3 rounded-2xl border border-white/10 bg-[#161821] p-3.5 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>Roughness</span>
                      <span className="font-mono text-white">{pbrRoughness.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={1.0}
                      step={0.05}
                      value={pbrRoughness}
                      onChange={(e) => setPbrRoughness(Number(e.target.value))}
                      className="mt-1 w-full accent-[#f5c518]"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-slate-300">
                      <span>Metallic</span>
                      <span className="font-mono text-white">{pbrMetalness.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={1.0}
                      step={0.05}
                      value={pbrMetalness}
                      onChange={(e) => setPbrMetalness(Number(e.target.value))}
                      className="mt-1 w-full accent-[#f5c518]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="btn-generate-pbr"
                  disabled={busy}
                  onClick={() =>
                    handleProcessStage('pbr_generate', {
                      roughness: pbrRoughness,
                      metalness: pbrMetalness,
                    })
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate PBR (⚡ 20)
                </button>
              </div>
            )}

            {/* STAGE 7: 3D RIGGING & ANIMATION (matching Screenshots 71, 73, 74, 78-84) */}
            {(activeStage === 'rig' || activeStage === 'animate') && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-[#181a23] p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStage('rig');
                      setRigSubTab('rig');
                    }}
                    className={`rounded-lg py-1.5 ${
                      activeStage === 'rig' && rigSubTab === 'rig'
                        ? 'bg-[#262a38] text-white'
                        : 'text-slate-400'
                    }`}
                  >
                    3D Rigging
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStage('animate');
                      setRigSubTab('animate');
                    }}
                    className={`rounded-lg py-1.5 ${
                      activeStage === 'animate' || rigSubTab === 'animate'
                        ? 'bg-[#262a38] text-[#f5c518]'
                        : 'text-slate-400'
                    }`}
                  >
                    Animation
                  </button>
                </div>

                {activeStage === 'rig' && rigSubTab === 'rig' ? (
                  /* 3D Rigging Panel (matching Screenshots 71, 74, 79) */
                  <div className="space-y-3.5">
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-slate-300">
                        Rigging Type
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
                        {(
                          [
                            {
                              id: 'biped',
                              title: 'Humanoid',
                              desc: 'Biped T-Pose / A-Pose',
                            },
                            {
                              id: 'quadruped',
                              title: 'Other',
                              desc: 'Quadruped / Creature',
                            },
                          ] as const
                        ).map((card) => (
                          <button
                            key={card.id}
                            type="button"
                            onClick={() => setRigPreset(card.id)}
                            className={`relative flex flex-col items-center rounded-2xl border p-3 text-center transition ${
                              rigPreset === card.id
                                ? 'border-indigo-500 bg-indigo-500/15 text-white'
                                : 'border-white/10 bg-[#181a23] text-slate-300 hover:border-white/25'
                            }`}
                          >
                            {rigPreset === card.id && (
                              <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white">
                                <Check className="h-2.5 w-2.5" />
                              </span>
                            )}
                            <Bone className="mb-1.5 h-6 w-6 text-sky-400" />
                            <div className="text-xs font-bold">{card.title}</div>
                            <div className="text-[10px] text-slate-400">{card.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
                      <Info className="h-4 w-4 shrink-0 text-[#f5c518]" />
                      <span>Use a T- or A-pose for best results.</span>
                    </div>

                    {activeAsset && activeAsset.faces > 200000 && (
                      <div
                        data-testid="rig-poly-limit-banner"
                        className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200 space-y-2"
                      >
                        <div className="font-bold text-[#f5c518]">
                          Polygon Limit Exceeded ({activeAsset.faces.toLocaleString()} faces)
                        </div>
                        <div className="text-[11px] text-amber-200/80">
                          This model&apos;s polygon count exceeds the rigging limit. Reduce polygons in Retopology before rigging.
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveStage('retopo')}
                            className="rounded-lg bg-[#f5c518] px-3 py-1 text-[11px] font-bold text-black"
                          >
                            Go to Retopology
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowPolyLimitModal(true)}
                            className="rounded-lg border border-white/20 px-2.5 py-1 text-[11px] font-semibold text-white"
                          >
                            Details
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 rounded-2xl border border-white/10 bg-[#161821] p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">Skeleton Preset</span>
                        <select
                          data-testid="rig-skeleton-preset-select"
                          value={skeletonPreset}
                          onChange={(e) =>
                            setSkeletonPreset(
                              e.target.value as 'Mixamo' | 'UE5' | 'Unity' | 'Universal'
                            )
                          }
                          className="rounded-lg border border-white/10 bg-[#0e1016] px-2.5 py-1 text-xs font-bold text-white"
                        >
                          <option value="Mixamo">Mixamo</option>
                          <option value="UE5">UE5 Mannequin</option>
                          <option value="Unity">Unity Humanoid</option>
                          <option value="Universal">Universal</option>
                        </select>
                      </div>

                      {/* Skeleton Toggle Switch shown when Rigged (matching Screenshot 79) */}
                      <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2.5 text-xs">
                        <span className="font-semibold text-slate-300">Skeleton</span>
                        <button
                          type="button"
                          data-testid="rig-panel-skeleton-toggle"
                          onClick={() => setShowSkeletonInViewport((s) => !s)}
                          className={`relative h-5 w-9 rounded-full transition ${
                            showSkeletonInViewport ? 'bg-indigo-500' : 'bg-white/15'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
                              showSkeletonInViewport ? 'left-4' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Post-Rigging Link: "Rigged models can be used for animation ›" (matching Screenshot 79) */}
                    {activeAsset?.isRigged && (
                      <div className="text-center text-xs text-slate-400">
                        Rigged models can be used for{' '}
                        <button
                          type="button"
                          data-testid="link-go-to-animation"
                          onClick={() => {
                            setActiveStage('animate');
                            setRigSubTab('animate');
                          }}
                          className="font-bold text-[#f5c518] hover:underline"
                        >
                          animation ›
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      data-testid="btn-confirm-rigging"
                      disabled={busy}
                      onClick={() => {
                        if (activeAsset && activeAsset.faces > 200000) {
                          setShowPolyLimitModal(true);
                          return;
                        }
                        handleProcessStage('rig');
                        setShowSkeletonInViewport(true);
                        setRigSubTab('animate');
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-full bg-[#f5c518] py-3 text-xs font-extrabold text-black hover:bg-[#fde047]"
                    >
                      <Bone className="h-4 w-4" />
                      <span>
                        {activeAsset?.isRigged ? 'Retry' : 'Auto Rig'} (⚡ 20)
                      </span>
                    </button>
                  </div>
                ) : (
                  /* Animation Preset & Multi-Stage Motion Panel (matching Screenshots 73, 80-84) */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 border-b border-white/10 text-xs font-bold">
                      <button
                        type="button"
                        data-testid="animate-tab-preset"
                        onClick={() => setAnimateSubTab('preset')}
                        className={`pb-2 ${
                          animateSubTab === 'preset'
                            ? 'border-b-2 border-[#f5c518] text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        Preset
                      </button>
                      <button
                        type="button"
                        data-testid="animate-tab-multistage"
                        onClick={() => setAnimateSubTab('multistage')}
                        className={`pb-2 ${
                          animateSubTab === 'multistage'
                            ? 'border-b-2 border-[#f5c518] text-white'
                            : 'text-slate-400'
                        }`}
                      >
                        Multi-stage Motion
                      </button>
                    </div>

                    {animateSubTab === 'preset' ? (
                      <>
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                          <input
                            type="text"
                            value={animSearch}
                            onChange={(e) => setAnimSearch(e.target.value)}
                            placeholder="Search"
                            className="w-full rounded-xl border border-white/10 bg-[#181a23] pl-8 pr-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                          />
                        </div>

                        {/* Category Filter Pills (All, Idle, Move, Sport, Emotion, Dance, Fight, Other) */}
                        <div className="flex flex-wrap gap-1">
                          {(
                            [
                              'All',
                              'Idle',
                              'Move',
                              'Sport',
                              'Emotion',
                              'Dance',
                              'Fight',
                              'Other',
                            ] as const
                          ).map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setAnimCategory(cat)}
                              className={`rounded-lg px-2 py-1 text-[10px] font-bold transition ${
                                animCategory === cat
                                  ? 'bg-[#2a2e3f] text-white'
                                  : 'bg-[#161821] text-slate-400 hover:text-white'
                              }`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>

                        {/* 4-Column Animated Character Thumbnail Grid (matching Screenshots 80-83) */}
                        <div className="grid grid-cols-4 gap-1.5 max-h-64 overflow-y-auto pr-1">
                          {filteredAnimations.map((clip) => {
                            const isSelected = activeAnimation === clip.id;
                            return (
                              <button
                                key={clip.id}
                                type="button"
                                data-testid={`anim-clip-${clip.testId}`}
                                onClick={() => {
                                  setActiveAnimation(clip.id);
                                  if (activeAsset?.isRigged) {
                                    handleProcessStage('animate', {
                                      animationClip: clip.id,
                                    });
                                  }
                                }}
                                className={`flex flex-col items-center justify-between rounded-xl border p-2 text-center transition ${
                                  isSelected
                                    ? 'border-indigo-500 bg-indigo-500/20 text-white shadow'
                                    : 'border-white/10 bg-[#181a23] text-slate-300 hover:border-white/25'
                                }`}
                              >
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#11131a]">
                                  <Bone
                                    className={`h-4 w-4 ${
                                      isSelected ? 'text-[#f5c518]' : 'text-slate-400'
                                    }`}
                                  />
                                </div>
                                <span className="mt-1 truncate w-full text-[10px] font-bold">
                                  {clip.label}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <p className="text-center text-[10px] text-slate-500 pt-1">
                          Supports binding animations to models that have already been rigged.
                        </p>
                      </>
                    ) : (
                      /* Multi-stage Motion & Text-to-Motion Panel (matching Screenshot 84) */
                      <div className="space-y-3">
                        <div className="rounded-2xl border border-white/10 bg-[#161821] p-3 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-bold text-white">
                            <span>Text to Motion</span>
                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-[#f5c518]">
                              AI Motion
                            </span>
                          </div>
                          <textarea
                            rows={2}
                            data-testid="text-to-motion-input"
                            value={customMotionPrompt}
                            onChange={(e) => setCustomMotionPrompt(e.target.value)}
                            placeholder="Describe a multi-stage motion sequence..."
                            className="w-full rounded-xl border border-white/10 bg-[#0e1016] p-2.5 text-xs text-white"
                          />

                          <div className="space-y-1.5">
                            <div className="text-[11px] font-semibold text-slate-300">
                              Motion Sequence Chain
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {motionStages.map((stg, idx) => (
                                <span
                                  key={idx}
                                  className="flex items-center gap-1 rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-2.5 py-1 text-[11px] font-bold text-indigo-200"
                                >
                                  {idx + 1}. {stg}
                                </span>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  setMotionStages((s) => [...s, 'Attack'])
                                }
                                className="rounded-lg border border-dashed border-white/20 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-white/40"
                              >
                                + Stage
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Seamless Transition Blending</span>
                            <input
                              type="checkbox"
                              checked={multiStageMotion}
                              onChange={(e) => setMultiStageMotion(e.target.checked)}
                              className="h-3.5 w-3.5 accent-[#f5c518]"
                            />
                          </div>

                          <button
                            type="button"
                            data-testid="btn-generate-ai-motion"
                            disabled={busy}
                            onClick={() => {
                              setActiveAnimation('Combat');
                              if (activeAsset?.isRigged) {
                                handleProcessStage('animate', {
                                  animationClip: 'Combat',
                                });
                              }
                            }}
                            className="w-full rounded-full bg-[#f5c518] py-2.5 text-xs font-extrabold text-black hover:bg-[#fde047] transition"
                          >
                            Generate AI Motion (⚡ 20)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STAGE 8: APP / STYLIZE */}
            {activeStage === 'app' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-sm font-extrabold text-white">
                    Stylize & Post-Processing Apps
                  </h2>
                  <p className="text-[11px] text-slate-400">
                    One-click voxelization, brick-toy conversion, or studio turntable shaders.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'voxel', label: 'Voxel Craft', prompt: 'Voxel block style' },
                    { id: 'lego', label: 'Brick Toy', prompt: 'Interlocking ABS plastic brick style' },
                    { id: 'clay', label: 'ZBrush Clay', prompt: 'Matte terracotta clay sculpture' },
                    { id: 'gold', label: '24K Gold Relic', prompt: 'Polished 24K gold metallic finish' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setStylizeFilter(f.id as typeof stylizeFilter);
                        handleProcessStage('texture', {
                          texturePrompt: f.prompt,
                          textureQuality: '4K',
                          pbrEnabled: true,
                        });
                      }}
                      className={`rounded-xl border p-3 text-left text-xs font-bold transition ${
                        stylizeFilter === f.id
                          ? 'border-[#f5c518] bg-[#f5c518]/15 text-[#f5c518]'
                          : 'border-white/10 bg-[#181a23] text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {activeStage === 'model' && (
            <div className="border-t border-white/10 bg-[#111319] p-4">
              <button
                type="button"
                data-testid="btn-generate-model"
                disabled={busy}
                onClick={handleGenerateModel}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#fef08a] via-[#f5c518] to-[#eab308] py-3.5 text-sm font-extrabold text-black shadow-lg shadow-[#f5c518]/25 hover:brightness-105 disabled:opacity-50 transition"
              >
                <span>{busy ? 'Generating 3D...' : 'Generate'}</span>
                <span className="flex items-center gap-0.5 rounded-full bg-black/15 px-2.5 py-0.5 text-xs font-black">
                  <Zap className="h-3.5 w-3.5 fill-black text-black" />
                  {estimatedCost}
                  {usingTrial ? ' (Trial)' : ''}
                </span>
              </button>
            </div>
          )}
        </section>

        {/* 3. Center Interactive Three.js 3D Viewport */}
        <main className="relative flex flex-1 flex-col overflow-hidden">
          {statusMessage && (
            <div
              data-testid="workspace-status-toast"
              className={`absolute left-1/2 top-4 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold shadow-2xl backdrop-blur ${
                statusMessage.type === 'error'
                  ? 'border-rose-500/50 bg-rose-950/90 text-rose-200'
                  : statusMessage.type === 'success'
                  ? 'border-emerald-500/50 bg-emerald-950/90 text-emerald-200'
                  : 'border-sky-500/50 bg-slate-900/90 text-sky-200'
              }`}
            >
              {statusMessage.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-rose-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              )}
              <span>{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="ml-2 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex-1">
            <Viewport3D
              meshData={parsedMeshData}
              modelName={activeAsset?.name}
              topology={activeAsset?.topology || topology}
              vertices={activeAsset?.vertices}
              faces={activeAsset?.faces}
              originalVertices={parsedMeshData?.originalVertices}
              originalFaces={parsedMeshData?.originalFaces}
              isSegmented={activeAsset?.isSegmented}
              isRigged={activeAsset?.isRigged}
              showSkeletonOverride={showSkeletonInViewport}
              onToggleSkeleton={setShowSkeletonInViewport}
              activeAnimation={activeAnimation}
              onSelectAnimation={(clip) => setActiveAnimation(clip)}
              initialRenderMode={activeStage === 'segment' ? 'segments' : 'pbr'}
              activeWorkspaceStage={
                activeStage === 'rig' && rigSubTab === 'animate' ? 'animate' : activeStage
              }
              magicBrushMode={isMagicBrushActive}
              brushColorHex={brushColorHex}
              busyStageLabel={busyStageLabel}
              onSelectPart={(partName) => setBrushTargetPart(partName)}
              onPaintPart={(partName, colorHex) => {
                setBrushTargetPart(partName);
                setStatusMessage({
                  type: 'success',
                  text: `Painted ${partName} with Magic Brush (${colorHex})`,
                });
              }}
              onOpenExportModal={() => setShowExportModal(true)}
              onRetryModel={handleGenerateModel}
              hiddenParts={hiddenParts}
            />
          </div>
        </main>

        {/* 4. Right Sidebar: Promo Banner + Assets / Property Tabs (matching Screenshots 61, 62, 78, 86) */}
        <aside className="flex w-[285px] shrink-0 flex-col border-l border-white/10 bg-[#111319] select-none">
          {/* Gold Promo Banner at Top */}
          <div className="m-2.5 flex items-center justify-between gap-2 rounded-xl border border-[#f5c518]/30 bg-gradient-to-r from-[#2c2410] to-[#1a1814] px-3 py-2 text-[10px] text-amber-100">
            <span className="leading-snug">
              Upgrade to unlock 3D model exports, Multi-View &amp; more. Save up to 50%.
            </span>
            <a
              href="/pricing"
              className="shrink-0 rounded-full bg-[#f5c518] px-2.5 py-1 text-[10px] font-extrabold text-black hover:bg-[#fde047]"
            >
              Upgrade
            </a>
          </div>

          {/* Assets | Property Tab Switcher */}
          <div className="flex items-center border-b border-white/10 px-3.5 text-xs font-bold">
            <button
              type="button"
              data-testid="right-tab-assets"
              onClick={() => setRightSidebarTab('assets')}
              className={`mr-5 pb-2.5 transition ${
                rightSidebarTab === 'assets'
                  ? 'border-b-2 border-white text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Assets
            </button>
            <button
              type="button"
              data-testid="right-tab-property"
              onClick={() => setRightSidebarTab('property')}
              className={`pb-2.5 transition ${
                rightSidebarTab === 'property'
                  ? 'border-b-2 border-white text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Property
            </button>
          </div>

          {rightSidebarTab === 'assets' ? (
            <>
              {/* Filter Toolbar Row */}
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px]">
                <div className="flex items-center gap-1">
                  {(['all', 'mine', 'public'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAssetFilter(f)}
                      className={`rounded-md px-2 py-1 font-semibold capitalize ${
                        assetFilter === f
                          ? 'bg-[#252936] text-white'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-400 hover:text-[#f5c518]"
                    title="Favorites"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-md p-1 text-slate-400 hover:text-white"
                    title="Filter Assets"
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => fetchAssets(false)}
                  className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10"
                >
                  <RefreshCw className="h-3 w-3" /> Manage
                </button>
              </div>

              {/* 2-Column Asset Grid starting with Upload 3D Model Card + Active Queuing Rocket Card */}
              <div className="flex-1 overflow-y-auto p-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".glb,.obj,.stl,.ply,.fbx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload3DModel(f);
                  }}
                />
                <div className="grid grid-cols-2 gap-2">
                  {/* Cell 1: Upload 3D Model Card (matching Screenshot 61) */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#161822] p-2 text-center hover:border-indigo-400 transition"
                  >
                    <div className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500 text-white shadow">
                      <Upload className="h-4 w-4" />
                    </div>
                    <div className="text-[11px] font-bold text-slate-200">
                      Upload 3D Model
                    </div>
                    <div className="mt-0.5 text-[9px] leading-tight text-slate-400">
                      OBJ, FBX, STL, GLB
                      <br />
                      Size ≤150MB
                    </div>
                  </button>

                  {/* Active Queuing Card with Rocket Icon when a job is running (matching Screenshots 78, 86, 87) */}
                  {busy && (
                    <div
                      data-testid="asset-queuing-card"
                      className="flex h-32 flex-col items-center justify-center rounded-xl border border-indigo-500/50 bg-[#181b28] p-2 text-center"
                    >
                      <Rocket className="mb-1.5 h-6 w-6 animate-bounce text-indigo-400" />
                      <div className="text-[11px] font-bold text-white">Queuing</div>
                      <div className="mt-0.5 text-[9px] text-indigo-300">
                        {busyStageLabel || 'Processing...'}
                      </div>
                    </div>
                  )}

                  {/* Asset Cards */}
                  {assets.map((item) => {
                    const isSelected = activeAsset?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-testid={`asset-card-${item.id}`}
                        onClick={() => setActiveAsset(item)}
                        className={`group relative flex h-32 flex-col justify-between rounded-xl border p-2 text-left transition ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-500/10 shadow-md ring-1 ring-indigo-500'
                            : 'border-white/10 bg-[#181a23] hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[8px] font-bold text-[#f5c518]">
                            {item.aiModelVersion}
                          </span>
                          {item.isRigged && (
                            <span className="rounded bg-emerald-500/20 px-1 py-0.5 text-[8px] font-bold text-emerald-300">
                              Rig
                            </span>
                          )}
                        </div>

                        <div className="my-auto flex flex-col items-center justify-center text-center">
                          <Box className="mb-1 h-6 w-6 text-slate-300 group-hover:text-[#f5c518] transition" />
                          <span className="line-clamp-1 w-full text-[10px] font-bold text-white">
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[9px] text-slate-400">
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/40 text-slate-300">
                            <Info className="h-2.5 w-2.5" />
                          </span>
                          <span>{item.faces.toLocaleString()}f</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Property & Scene Node Hierarchy Tab (matching Screenshot 62) */
            <div
              data-testid="property-hierarchy-panel"
              className="flex-1 overflow-y-auto p-3 space-y-3"
            >
              <div className="rounded-xl border border-white/10 bg-[#161822] p-2.5">
                <button
                  type="button"
                  onClick={() => setHierarchyExpanded((e) => !e)}
                  className="flex w-full items-center justify-between text-xs font-bold text-white"
                >
                  <span className="flex items-center gap-1.5">
                    {hierarchyExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                    )}
                    Hierarchy
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(parsedMeshData?.parts?.length || 0) + 1} nodes
                  </span>
                </button>

                {hierarchyExpanded && (
                  <div className="mt-2 space-y-1 pl-2">
                    {/* Root Tripo Scene Node */}
                    <div className="flex items-center justify-between rounded-lg bg-[#222634] px-2.5 py-1.5 text-[11px] font-semibold text-white">
                      <span className="truncate">
                        tripo_node_{activeAsset?.id.slice(0, 8) || 'root'}
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Eye className="h-3.5 w-3.5" />
                        <Lock className="h-3.5 w-3.5" />
                      </div>
                    </div>

                    {/* Semantic Mesh Part Nodes */}
                    {(parsedMeshData?.parts || []).map((part) => {
                      const isHidden = Boolean(hiddenParts[part.name]);
                      const isLocked = Boolean(lockedParts[part.name]);
                      return (
                        <div
                          key={part.name}
                          className="flex items-center justify-between rounded-lg bg-[#12141c] px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-white/5"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: part.segmentColor }}
                            />
                            <span className="truncate">
                              {part.segmentLabel || part.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setHiddenParts((hp) => ({
                                  ...hp,
                                  [part.name]: !hp[part.name],
                                }))
                              }
                              className="text-slate-400 hover:text-white"
                              title="Toggle Node Visibility"
                            >
                              {isHidden ? (
                                <EyeOff className="h-3.5 w-3.5 text-rose-400" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setLockedParts((lp) => ({
                                  ...lp,
                                  [part.name]: !lp[part.name],
                                }))
                              }
                              className="text-slate-400 hover:text-white"
                              title="Toggle Node Lock"
                            >
                              {isLocked ? (
                                <Lock className="h-3.5 w-3.5 text-[#f5c518]" />
                              ) : (
                                <Unlock className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {activeAsset && (
                <div className="rounded-xl border border-white/10 bg-[#161822] p-3 space-y-1.5 text-[11px]">
                  <div className="font-bold text-white">Mesh Telemetry</div>
                  <div className="flex justify-between text-slate-400">
                    <span>Topology</span>
                    <span className="text-white">{activeAsset.topology}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Faces</span>
                    <span className="font-mono text-white">
                      {activeAsset.faces.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Vertices</span>
                    <span className="font-mono text-white">
                      {activeAsset.vertices.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>UV Atlas</span>
                    <span className="text-white">
                      {activeAsset.uvUnwrapped ? 'Unwrapped (89%)' : 'Auto'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Skeleton Rig</span>
                    <span className="text-white">
                      {activeAsset.isRigged ? `${skeletonPreset} (16 Bones)` : 'None'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Export Footer in Right Drawer */}
          {activeAsset && (
            <div className="border-t border-white/10 bg-[#151821] p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-200">
                <span>Export 3D Asset</span>
                <div className="flex gap-1">
                  {(['glb', 'fbx', 'obj', 'stl', 'ply'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setExportFormat(fmt)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        exportFormat === fmt
                          ? 'bg-[#f5c518] text-black'
                          : 'bg-[#0d0e12] text-slate-400 hover:text-white'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5">
                <a
                  data-testid="btn-export-asset"
                  href={`/api/studio/assets/${activeAsset.id}/export?format=${exportFormat}`}
                  download
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-white py-2 text-xs font-extrabold text-black hover:bg-[#f5c518] transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download .{exportFormat.toUpperCase()}
                </a>
                <button
                  type="button"
                  onClick={() => setShowExportModal(true)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white hover:bg-white/10"
                  title="Advanced Export Settings"
                >
                  Settings
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* MODAL 1: Polygon Limit Exceeded Modal (matching Screenshot 74) */}
      {showPolyLimitModal && (
        <div
          data-testid="poly-limit-exceeded-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-[#1b1d26] p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-extrabold text-white">
              Polygon Limit Exceeded
            </h3>
            <p className="mt-2.5 text-xs leading-relaxed text-slate-300">
              This model&apos;s polygon count exceeds the rigging limit. Reduce polygons in Retopology before rigging.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                data-testid="modal-btn-cancel-poly-limit"
                onClick={() => setShowPolyLimitModal(false)}
                className="rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="modal-btn-go-to-retopo"
                onClick={() => {
                  setShowPolyLimitModal(false);
                  setActiveStage('retopo');
                }}
                className="rounded-xl bg-indigo-500 px-4 py-2 text-xs font-extrabold text-white hover:bg-indigo-400"
              >
                Go to Retopology
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Full Export Modal with Animation & Pivot Options (matching Screenshot 85) */}
      {showExportModal && activeAsset && (
        <div
          data-testid="studio-export-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#181a24] p-6 text-slate-100 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white">Export</h3>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">File Name</label>
              <input
                type="text"
                data-testid="export-modal-filename"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#10121a] px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Format</label>
              <div className="flex flex-wrap gap-1.5">
                {(
                  ['glb', 'fbx', 'obj', 'usdz', 'stl', '3mf', 'schematic', 'ply'] as const
                ).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    data-testid={`export-format-${fmt}`}
                    onClick={() => setExportFormat(fmt)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ${
                      exportFormat === fmt
                        ? 'bg-indigo-500 text-white shadow'
                        : 'bg-[#10121a] text-slate-400 hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Pivot Position
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['Origin', 'Bottom', 'Center'] as const).map((piv) => (
                  <button
                    key={piv}
                    type="button"
                    onClick={() => setExportPivot(piv)}
                    className={`rounded-lg py-1.5 text-xs font-bold ${
                      exportPivot === piv
                        ? 'bg-[#282c3e] text-white border border-indigo-500'
                        : 'bg-[#10121a] text-slate-400'
                    }`}
                  >
                    {piv}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Transform</label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <div
                    key={axis}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-[#10121a] px-2.5 py-1.5"
                  >
                    <span className="uppercase text-slate-400">Scale {axis}</span>
                    <input
                      type="text"
                      value={exportScale[axis]}
                      onChange={(e) =>
                        setExportScale((s) => ({ ...s, [axis]: e.target.value }))
                      }
                      className="w-12 bg-transparent text-right font-mono text-white focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2.5 rounded-xl border border-white/10 bg-[#12141d] p-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">With Texture</span>
                <input
                  type="checkbox"
                  checked={exportWithTexture}
                  onChange={(e) => setExportWithTexture(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
              </div>
              {exportWithTexture && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Texture Format</span>
                    <div className="flex gap-1">
                      {(['PNG', 'JPG'] as const).map((tf) => (
                        <button
                          key={tf}
                          type="button"
                          onClick={() => setExportTextureFormat(tf)}
                          className={`rounded px-2.5 py-0.5 text-[11px] font-bold ${
                            exportTextureFormat === tf
                              ? 'bg-indigo-500 text-white'
                              : 'bg-[#1a1d29] text-slate-400'
                          }`}
                        >
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Metallic Roughness</span>
                    <select
                      value={exportMetallicPreset}
                      onChange={(e) =>
                        setExportMetallicPreset(
                          e.target.value as 'Default (glTF)' | 'Unity' | 'Unreal'
                        )
                      }
                      className="rounded-lg border border-white/10 bg-[#1a1d29] px-2 py-1 text-xs text-white"
                    >
                      <option value="Default (glTF)">Default (glTF)</option>
                      <option value="Unity">Unity URP/HDRP</option>
                      <option value="Unreal">Unreal Engine</option>
                    </select>
                  </div>
                </>
              )}

              <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                <span className="font-semibold text-slate-200">
                  With Animation {activeAnimation ? `(${activeAnimation})` : ''}
                </span>
                <input
                  type="checkbox"
                  checked={exportWithAnimation}
                  onChange={(e) => setExportWithAnimation(e.target.checked)}
                  className="h-4 w-4 accent-indigo-500"
                />
              </div>

              <div className="flex items-center justify-between border-t border-white/5 pt-2.5">
                <span className="text-slate-400">Send to DCC Bridge</span>
                <select
                  value={exportDccBridge}
                  onChange={(e) => setExportDccBridge(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#1a1d29] px-2 py-1 text-xs text-white"
                >
                  <option value="Blender 4.x">Blender 4.x</option>
                  <option value="Unreal Engine 5">Unreal Engine 5</option>
                  <option value="Unity">Unity</option>
                  <option value="Maya">Autodesk Maya</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-full bg-white/10 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/15"
              >
                Cancel
              </button>
              <a
                data-testid="modal-btn-confirm-export"
                href={`/api/studio/assets/${activeAsset.id}/export?format=${exportFormat}&filename=${encodeURIComponent(
                  exportFileName
                )}&pivot=${exportPivot}&withAnimation=${exportWithAnimation}`}
                download
                onClick={() => {
                  setStatusMessage({
                    type: 'success',
                    text: `Exported "${exportFileName}.${exportFormat}" (Pivot: ${exportPivot}, Animation: ${
                      exportWithAnimation ? activeAnimation || 'Included' : 'Off'
                    })`,
                  });
                  setShowExportModal(false);
                }}
                className="flex items-center gap-2 rounded-full bg-indigo-500 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg hover:bg-indigo-400 transition"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

