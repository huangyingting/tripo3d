# 00. Exploration Coverage, Quantitative Scenarios & Reverse-Engineering Report

## 1. Executive Summary

Using Playwright with an authenticated Ory Kratos session (balance `200 credits` + `2 free trials`), we systematically explored and reverse-engineered the three pillars of the Tripo3D ecosystem:

1. **Marketing & Public Web Tools (`https://www.tripo3d.ai`)**: Landing page, Pricing, Research (`VAST AI Research`), Feature deep-dives (`image-to-3d-model`, `text-to-3d-model`, `ai-quad-remesher`, `ai-texturing`, `ai-model-segmentation`, `ai-auto-rigging`), and browser-based Free 3D Tools (`/3d-tools/3d-viewer`, `/3d-tools/convert`).
2. **Tripo Studio Web App (`https://studio.tripo3d.ai`)**: Onboarding personalization modal (`How do you create with Tripo?`), Studio Home (`Hi, Creator! What will you bring into 3D?`, Quick Image/Text generator, Community Gallery with category & sort filters), interactive **3D Workspace** (`/workspace/generate` with 7-stage left rail: `Image`, `Model`, `Segment`, `Retopo`, `Smart UV`, `Texture`, `Rig/Animate` + `App`, 3D WebGL viewport with XYZ gizmo & camera/lighting/wireframe tools, right-hand `Assets` & `Property` inspector), `Assets` manager (`/assets`), `Creator Hub`, `DCC Bridge` (11 integrations), and `Tripo Studio Pricing` upgrade modal.
3. **Tripo API Platform (`https://platform.tripo3d.ai`)**: OpenAPI v3 developer documentation, `API Keys`, `Billing`, `Recharge History`, and `Usage` (`Stats`, `History`).

A total of **112 reference screenshots** (desktop `1440×900` and mobile `390×844`, including `50_*.png` through `87_*.png` covering every active 3D model & animation pipeline stage) in `/home/azadmin/tripo3d/screenshots/reference/`, plus **30 replica verification screenshots** (`01_*.png` through `29_*.png`) in `/home/azadmin/tripo3d/screenshots/replica/`, were captured and verified.

---

## 2. Route & Surface Exploration Matrix

| Surface | URL / Route | Auth State | Viewport(s) | Key Observed Components & Behavior | Reference Screenshots |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Marketing Home** | `https://www.tripo3d.ai/` | Public / Auth | `1440×900`, `390×844` | Dark theme (`#070709`), gold accent (`#f5c518`), 3D rotating showcase carousel, Image-to-3D hero dropzone, High Detail (up to 2M polys) vs Smart Mesh (500–25K native quads), 3D printing segmentation, game assets, FAQ. | `01_marketing_home.png`, `36_mobile_marketing_home.png` |
| **Marketing Pricing** | `https://www.tripo3d.ai/pricing` | Public | `1440×900`, `390×844` | Monthly/Annually toggle, Web App plans (`Basic $0`, `Professional $13.9`, `Advanced $35`, `Premium $98`) and API pricing calculator. | `14_marketing_pricing.png`, `37_mobile_marketing_pricing.png` |
| **Research** | `https://www.tripo3d.ai/research` | Public | `1440×900` | VAST AI Research publications, open-source TripoSR / TripoSG / TripoSF foundation model milestones. | `15_marketing_research.png` |
| **Feature Pages** | `/features/image-to-3d-model`, `/features/text-to-3d-model`, `/features/ai-quad-remesher`, `/features/ai-texturing`, `/features/ai-model-segmentation`, `/features/ai-auto-rigging` | Public | `1440×900` | Dedicated interactive before/after comparisons for Image-to-3D, Text-to-3D, Quad Remeshing, 8K PBR Texturing, Semantic Segmentation, and Auto-Rigging. | `16` through `21_marketing_feature_*.png` |
| **Free 3D Viewer** | `https://www.tripo3d.ai/3d-tools/3d-viewer` | Public | `1440×900` | Interactive Three.js WebGL canvas with right-hand inspector (`Scene`, `Geometry`, `UVs`, `Hierarchy`), wireframe/normals toggle, HDRI lighting. | `22_marketing_3d_viewer_tool.png` |
| **Free 3D Converter** | `https://www.tripo3d.ai/3d-tools/convert` | Public | `1440×900` | Drag-and-drop converter supporting `3MF`, `STL`, `OBJ`, `FBX`, `USDZ`, `PLY`, `GLB/GLTF` with auto-detect source format and instant local/server conversion. | `23_marketing_3d_converter_tool.png`, `45_tool_convert_loaded_obj.png` |
| **Auth / Login Modal** | `https://studio.tripo3d.ai` (Unauth) | Unauthenticated | `1440×900` | Split-screen modal: left side showcases 6 industry verticals (`3D Printing`, `Gaming`, `Film`, `Design`, `E-commerce`, `VR/AR/XR`), right side offers authentication (`Continue with Email`, `Use Password`). | `24b_auth_login_modal.png` |
| **Onboarding Modal** | `https://studio.tripo3d.ai/home` | Authenticated | `1440×900` | 2-step radial visual selector: `How do you create with Tripo?` (`Game Assets`, `3D Printing`, `Animation & VFX`, `Product Design`, `3D Generalist`) -> sub-categories (`Character`, `Creatures & Animals`, `Equipment & Props`, `Scenes`, `Others`). | `02_studio_onboarding_modal.png`, `25a_onboarding_game_assets_selected.png` |
| **Studio Home & Gallery** | `https://studio.tripo3d.ai/home` | Authenticated | `1440×900`, `390×844` | Personalized greeting (`Hi, Creator!`), quick Image/Text generator (`Best Quality` vs `Clean Topology Trial ×2`), Community Gallery with category pills (`All`, `3D Printing`, `Featured`, `Character`, `Vehicle`, `Animal`, `Architecture`, `Furniture`, `Props`, `Weapon`, `Clothing`, `Machine`, `Food`, `Nature`, `Abstract`), search bar, `Feature My Model`. | `03_studio_home_feed.png`, `26_studio_workspace_clean.png`, `38_mobile_studio_home.png` |
| **Model Detail View** | `https://studio.tripo3d.ai/3d-model/[id]` | Authenticated | `1440×900` | Interactive 3D WebGL model preview, topology/vertex stats, author profile, prompt/reference image, `Open in Workspace`, `Download`, `Like`, `Share`, `Remix`. | `10_studio_model_detail.png` |
| **Studio 3D Workspace** | `https://studio.tripo3d.ai/workspace/generate` | Authenticated | `1440×900` | Full 3D creation & editing IDE: 7-stage left rail (`Image`, `Model`, `Segment`, `Retopo`, `Smart UV`, `Texture`, `Rig/Animate`), configurable inspector panel, center WebGL viewport with XYZ gizmo & floating tools, right-hand `Assets` & `Property` panel. | `27b_studio_3d_workspace_clicked.png`, `28_texture.png`, `29_animate.png`, `40`–`44_*.png` |
| **Studio Assets** | `https://studio.tripo3d.ai/assets` | Authenticated | `1440×900` | `Model` / `Image` tabs, `My Assets` / `Collected` sub-tabs, filter pills (`All`, `Smart Mesh`, `Untextured`, `Textured`, `Rigged`), batch `Manage` mode. | `31_assets.png` |
| **DCC Bridge** | Top Nav Popover | Authenticated | `1440×900` | One-click bridge status & plugin installer for `Blender (v1.0.3)`, `3ds Max (v1.0.2)`, `Unity (v1.0.1)`, `Unreal (v1.0.4)`, `Maya (v1.0.2)`, `Cocos`, `Godot`, `ZBrush`, `MetaTailor`, `Roblox`, `SketchUp`. | `33_dcc_bridge.png` |
| **Studio Pricing Modal** | Upgrade Modal | Authenticated | `1440×900` | `Free ($0, 200 credits)`, `Pro ($13/mo, 3000/6000/12000 credits)`, `Max ($45/mo, 25000 credits)`, `Individual` vs `Team`, `Redeem Code`. | `34_upgrade.png` |
| **Developer API Portal** | `https://platform.tripo3d.ai/*` | Public / Auth | `1440×900` | OpenAPI v3 docs (`Task`, `Upload`, `Generation`, `Texture`, `Mesh Editing`, `Animation`, `Post Process`, `Wallet`), API Key management, Billing, and Usage stats. | `24_developers_api_portal.png` |

---

## 3. Quantitative Strategy & Capability Scenario Analysis

To understand Tripo3D's quantitative economics, mesh budgets, and pipeline constraints, we tested parameter combinations across the Studio Workspace and Free 3D Tools:

### Scenario A: Credit Cost & Resource Pricing Model
By toggling generation parameters in `/workspace/generate`, we reverse-engineered the exact credit cost function:
- **Initial Wallet Balance**: New accounts receive `200` monthly credits + `2` Smart Mesh trials (`Trial ×2`) + `1` Part Generation trial (`Trial ×1`) + `1` 8K Texture trial (`Trial ×1`).
- **Base Generation Costs**:
  - **Image Generation (`Rail -> Image`)**: `40 credits` (supports aspect ratios `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, batch size `1–4`, `4K Resolution`, templates `T Pose`, `3D Enhance`, `Photo to Figure`).
  - **HD Model (`H3.1 – Best Quality`)**: `55 credits` base cost (`H3.0 – Fast & Balanced`: `35 credits`, `H2.5 – Legacy`: `25 credits`).
  - **Smart Mesh (`P2.0`)**: `100 credits` per generation (`0 credits` while `Trial ×2` is active; supports batch count `1`, `2`, `4`).
  - **Part Segmentation (`Rail -> Segment`)**: `40 credits` (`0 credits` on first trial).
  - **Retopology (`Rail -> Retopo`)**: `10 credits` (Quad or Triangle target polycount from `500` to `2,000,000`).
  - **Smart UV (`Rail -> Smart UV`)**: `10 credits` (enforces constraint: `Tris ≤ 80,000 / Quads ≤ 40,000`).
  - **AI Texturing / PBR / 8K Upscale (`Rail -> Texture`)**: `20 credits` base (`+20 credits` for `8K Texture`).
  - **Auto-Rigging & Animation (`Rail -> Rig / Animate`)**: `30 credits` for auto-rigging; preset animations (`Idle`, `Walk`, `Run`, `Jump`, `Wave`, `Dance`, `Combat`) apply directly to the rigged skeleton.

### Scenario B: Topology & Polycount Constraints
- **HD Model Mode**: Generates dense detail meshes up to `2,000,000` polygons (`Ultra Mesh Quality`, `AI Complete`, `Remove Lighting`, `PBR`, `Quad` vs `Triangle` topology, polycount slider `[500 .. 2,000,000]`).
- **Smart Mesh Mode**: Generates native clean quad/low-poly topology (`500` to `25,000` faces) tailored for game engines.
- **Pipeline Guards (Observed Edge/Error States)**:
  - **Segmentation Guard**: Explicitly blocks `Quad models` and `Rigged models` (`"Unavailable for: Quad models, Rigged models"`).
  - **Smart UV Guard**: Enforces polygon ceiling (`"Tris ≤ 80,000 / Quads ≤ 40,000"`).
  - **File Upload Validation**: Image dropzone enforces `JPG, PNG, WEBP Size ≤ 20MB`; 3D Model upload enforces `OBJ, FBX, STL, GLB Size ≤ 150MB`.
  - **Prompt Length Validation**: Image/Text prompt enforces `0/10000` character limit and non-empty input before enabling `Generate`.

### Scenario C: 3D Format Conversion & Geometry Inspection (`sample-cube.obj`)
- Uploaded a valid Wavefront `.obj` file (`sample-cube.obj`, 8 vertices, 6normals, 6 quad faces) into `/3d-tools/convert`.
- Observed auto-detection (`File name: sample-cube.obj`, detected badge `OBJ`), target format selector (`GLB/GLTF`, `STL`, `OBJ`, `FBX`, `PLY`, `3MF`, `USDZ`), and `Convert Now` workflow.

---

## 4. End-to-End Live 3D Model & Animation Pipeline Verification (`screenshots/reference/50_*.png` – `87_*.png`)

We executed a full live 3D character generation, retopology, auto-rigging, and motion retargeting workflow on `https://studio.tripo3d.ai/workspace/generate` (project `cedadfdb-18fa-4920-8c4d-89c8a3e6af03`, task `53ebaaac-34c4-4ff6-a7f1-05bc812ddfb6`) and captured 38 high-resolution screenshots of every 3D model and animation state:

### 4.1 3D Model Generation Input Modes (`50` – `61`, `70`)
- **`50_live_3d_model_stage_image_to_3d.png`**: Image-to-3D mode (`Upload JPG, PNG, WEBP ≤ 20MB`, `Generate 3D via Image`, `3D Sketch`, `T-Pose`).
- **`51_live_3d_model_stage_multi_view.png`**: Multi-View-to-3D (`Front (Main)`, `Left`, `Back`, `Right` orthogonal slots).
- **`52_live_3d_model_stage_batch_image.png`**: Batch Image-to-3D (`Up to 10 images`, `1–4` models per image).
- **`53_live_3d_model_stage_text_to_3d_tpose.png`**: Text-to-3D with `T-Pose` enabled (`"Armored cyber knight character in T-pose, full body humanoid"`).
- **`54_live_3d_model_smart_mesh_p2.png`**: Smart Mesh `P2.0` (`Trial ×2`, `Quad`/`Triangle` topology, `Polygon Count` slider).
- **`55_live_3d_model_hd_h3_1_full_options.png`**: HD Model `H3.1 – Best Quality` (`Generate in Parts`, `T-Pose`, `Mesh Quality: Standard/Ultra`, `AI Complete`, `Texture`, `Remove Lighting`, `PBR`, `4K Texture`, `Quad/Triangle`, `Polygon Count`).
- **`56_live_image_gen_stage_tpose_prompt.png`**: Stage 1 AI Image Generator with `T-Pose` template (`flux_kontext_pro` / `gpt_4o`, `40 credits`).
- **`60_live_3d_generation_in_progress_or_complete.png` & `61_live_3d_generated_model_in_viewport.png`**: Live `H3.1` 3D character generation progress (`Generating ~1 min 30s`) and completed 3D humanoid mesh (`Faces: 1,881,004`, `Vertices: 970,637`) rendered in the WebGL viewport with `Export` and `Share` controls.
- **`70_live_3d_viewport_clay_or_wireframe_mode.png`**: Live 3D viewport render/shading mode switcher and camera controls.

### 4.2 Active 3D Mesh Post-Processing Stages (`62` – `67`, `71` – `78`)
- **Segmentation (`62`, `71`, `72`)**:
  - `62_live_segment_active_on_3d_model.png` & `71_live_segment_active_controls.png`: `Segment` sub-tab (`Detail Level` slider: `Simple 3-6 parts`, `Balanced 6-15 parts`, `Detailed 15+ parts`, `Start Segmenting Free Trial ×1`, interactive brush `Add Part`, `Merge Parts`).
  - `72_live_segment_fill_parts_tab.png`: `Fill Parts` sub-tab (`Automatically complete your segmented model`, `Fill Parts 20`).
- **Retopology (`63`, `73`, `77`, `78`)**:
  - `63_live_retopo_active_on_3d_model.png` & `73_live_retopo_active_controls.png`: `Retopo` controls (`Topology: Quad / Triangle`, `Smart Mesh P1.0`, `Polygon Count` presets `3k`, `10k`, `30k`, `100k` and slider `500`–`20,000`, `Confirm 10`).
  - `77_live_retopo_completed_lowpoly_model.png` & `78_live_retopo_20k_selected_on_timeline.png`: Executed live `POST /v2/studio/operation/remesh` (`task_id: f28311fe-6c44-4fa7-8db0-c273923eb5fc`), reducing the character from `1,881,004` faces to `18,723` faces (`25,577` vertices).
- **Smart UV (`64`)**:
  - `64_live_smart_uv_active_on_3d_model.png`: Active `Smart UV` stage (`Unwrap UV 10`, `Tris ≤ 80,000 / Quads ≤ 40,000`).
- **AI Texture Suite (`65`, `74`, `75`, `76`)**:
  - `65_live_texture_active_on_3d_model.png`: `Generator` sub-tab (`Text`/`Image`/`Multiview` prompt, `Create Texture`, `Remove Lighting`, `4K Texture`, `PBR`, `Generate Texture 10`).
  - `74_live_texture_magic_brush_active.png`: `Edit (Magic Brush)` sub-tab (`Prompts / Stencil`, `Creative Strength`, `Brush Mode: Camera Projection / Surface Follow`, `Brush Size`).
  - `75_live_texture_upscale_active.png`: `Upscale` sub-tab (`Resolution: 4K / 8K`, `Upscale Texture Free`).
  - `76_live_texture_pbr_active.png`: `PBR` sub-tab (`Generate PBR 10` for metallic, roughness, and normal maps).

### 4.3 Live Auto-Rigging & Skeletal Motion Retargeting (`66` – `69`, `79` – `87`)
- **Polygon Limit Exceeded Guard (`68`, `69`)**:
  - `68_live_auto_rig_running_or_complete.png` & `69_live_auto_rig_completed_skeleton.png`: Clicking `Auto Rig` on the `1,881,004`-face raw mesh triggered the live `Polygon Limit Exceeded` modal (`"Your model's polygon count exceeds the limit for auto-rigging. Please retopologize your model first. Go to Retopo"`).
- **Live Mixamo Auto-Rigging (`66`, `79`)**:
  - `66_live_rig_active_on_3d_model.png`: `Rig` sub-tab (`Rigging Type: Humanoid / Other`, `Skeleton Preset: Mixamo`, `Auto Rig 20`).
  - `79_live_auto_rig_completed_mixamo_skeleton.png`: Executed `POST /v2/studio/operation/pre_rig_check` (`{"check_success":true,"riggable":true,"rig_type":"biped"}`) followed by `POST /v2/studio/operation/rigging_model` (`task_id: 970f6f8a-a731-4287-a03d-e65b330c29e3`), generating a Mixamo-rigged character (`Faces: 18,722`, `Vertices: 11,484`).
- **Live Animation Library & Motion Retargeting (`67`, `80` – `87`)**:
  - `67_live_animate_presets_on_3d_model.png` & `80_live_animate_tab_on_rigged_model.png`: `Animate` tab displaying `Create Your Own Animation` (`Multi-stage Motion`) and the 70+ motion retargeting preset library (`afraid`, `agree`, `angry_01..03`, `applause`, `basketball_shot`, `bow`, `box_01..03`, `cast_a_spell`, `chat_01..03`, `cheer`, `climb_up`, `crossover`, `cry`, `dance_01..06`, `declared`, `defeated`, `dribble`, `excited_walk`, `fail`, `falling_down`, `flip`, `Idle`, `Walk`, `Run`, `Jump`, etc.).
  - `81` through `87_live_animation_*.png`: Triggered live `POST /v2/studio/operation/retarget_model` (`model_version: "v2.0-20250506"`) and captured animated 3D character states across `cheer`, `dance_01`, `box_01`, `cast_a_spell`, `flip`, and `bow`.

---

## 5. Replica 3D Model & Animation E2E Verification Screenshots (`screenshots/replica/18_*.png` – `38_*.png`)

All 8 Studio pipeline stages, 5 expandable sub-stages (`Fill Parts`, `Edit / Magic Brush`, `Upscale`, `PBR`, `Animate`), 10 3D viewport render/matcap modes, 17-bone Mixamo octahedral skeleton overlay, 26 real-time procedural skeletal animations, `Polygon Limit Exceeded` guard modal, `Property -> Hierarchy` tree, and full `Export` modal were verified and captured on our local production replica (`tests/e2e-verification.mjs`):

| Screenshot File | Verified 3D / Animation Capability |
| :--- | :--- |
| `18_replica_3d_stage1_image_generator.png` | Stage 1 (`Image` with `GPT Image 1.5` badge): AI Image Generator with `T-Pose` template, aspect ratios (`1:1`, `16:9`, `9:16`, `4:3`, `3:4`), and credit cost badge. |
| `19_replica_3d_stage2_hd_model_and_tpose.png` | Stage 2 (`Model`): Generated 15-part humanoid `Armored Cyber Valkyrie Paladin Knight` in `PBR` shading mode with `Topology / Faces (current / original) / Vertices (current / original)` HUD. |
| `20_replica_3d_stage3_segment_and_parts_explode.png` | Stage 3 (`Segment`): Executed `Start Segmenting`: 15 color-coded semantic mesh parts with `1.18x` radial exploded-view separation, brush/merge/divide toolbar, and bottom `Confirm (⚡ 20)` bar. |
| `21_replica_3d_stage4_retopo_wireframe.png` | Stage 4 (`Retopo`): Executed `Quad` retopology (`Smart Mesh P1.0`) rendered in wireframe mode with `Faces: 12,000 / 64,000` original ratio HUD. |
| `21b_replica_3d_stage4_clay_mode.png` | 3D Viewport in `Clay` matcap shading mode for surface silhouette inspection. |
| `22_replica_3d_stage5_smart_uv_checker.png` | Stage 5 (`Smart UV`): Executed `Unwrap UV` (`89.4%` island efficiency, `0` overlaps) rendered in `UV Checker` pattern mode. |
| `23_replica_3d_stage6_texture_pbr_and_magic_brush.png` | Sub-Stage (`Texture -> Edit`): Dual-pane `Texture Preview` split viewport + interactive 3D viewport with yellow circular Magic Brush cursor, Brush/Eraser tools, Strength slider, Color Palette, and Creativity Strength. |
| `24_replica_3d_stage7_rig_mixamo_skeleton.png` | Stage 7 (`Rig`): `Humanoid` / `Other`, `Use a T- or A-pose for best results`, `Skeleton Preset: Mixamo`, and `Auto Rig (⚡ 20)`. |
| `25_replica_3d_animate_walk_cycle.png` | Stage 7 (`Animation` – `Walk`): Real-time skeletal limb articulation with Mixamo octahedral bone pyramids and cyan glowing joint spheres. |
| `26_replica_3d_animate_run_and_jump.png` | Stage 7 (`Animation` – `Jump`): Real-time jump trajectory, knee bend, and upward arm swing. |
| `27_replica_3d_animate_dance_and_cheer.png` | Stage 7 (`Animation` – `Dance`): Real-time procedural dance animation deforming arms, legs, hips, and head. |
| `28_replica_3d_animate_combat_and_ai_motion.png` | Stage 7 (`Multi-stage Motion` / `Text to Motion`): Custom motion prompt, `Motion Sequence Chain` (`1. Walk -> 2. Agree`), and `Generate AI Motion`. |
| `29_replica_3d_stage8_stylize_apps_and_export.png` | Stage 8 (`App` + `Export`): Style transfer (`Voxel`, `LEGO`, `Clay`, `Figurines`, `Low Poly`, `Gold`) and binary `.glb`/`.fbx`/`.obj`/`.stl`/`.ply` export. |
| `30_replica_3d_substage_fill_parts.png` | Sub-Stage (`Segment -> Fill Parts`): Completed `Fill Parts` volumetric interior synthesis (`⚡ 30`). |
| `31_replica_polygon_limit_exceeded_modal.png` | `Polygon Limit Exceeded` modal when attempting to rig a `> 200,000` face mesh, with `[Cancel]` and `[Go to Retopology]` actions. |
| `32_replica_3d_substage_texture_upscale.png` | Sub-Stage (`Texture -> Upscale`): `4K` / `8K` AI texture super-resolution (`Upscale Texture ⚡ 10`). |
| `33_replica_3d_substage_pbr_generator.png` | Sub-Stage (`Texture -> PBR`): Metallic gold sphere preview, `Roughness` & `Metallic` sliders, and `Generate PBR (⚡ 20)`. |
| `34_replica_right_sidebar_property_hierarchy.png` | Right Sidebar `Property` tab with collapsible `Hierarchy` scene node tree (`tripo_node_...` + 16 semantic child parts with color dots, eye visibility toggles, and lock toggles). |
| `35_replica_rig_completed_octahedral_skeleton.png` | Completed `3D Rigging` state with `Skeleton` toggle switch, `"Rigged models can be used for animation ›"` link, `Retry (⚡ 20)` button, Mixamo 3D octahedral bone pyramids + cyan joint spheres inside the semi-transparent mesh, and bottom Animation Playback Timeline bar. |
| `36_replica_animate_preset_clips_and_timeline_bar.png` | `Animation -> Preset` 4-column grid (`#1`–`#4`, `Afraid`, `Agree`, `Alert`, `Angry`, `Annoyed`, `Arrogant`, `Attack`, `Back Off`...) with search input, category pills, active `Agree` motion, and bottom timeline scrubber (`Undo`, `Redo`, `T-Pose Reset`, `Play/Pause`, scrubber, `1x` speed, `+ Add Animation`, `Export`). |
| `37_replica_viewport_guide_popover_and_matcap_dock.png` | Top-right purple `"View Your Model"` & `"? Guide"` 5-item tutorial popovers (`1. How Tripo Studio Works` ... `5. Shortcuts`) and floating Material/Matcap sphere dock. |
| `38_replica_export_modal_with_animation.png` | Full Studio `Export` modal with `File Name`, `Format` (`GLB`, `FBX`, `OBJ`, `USDZ`, `STL`, `3MF`, `SCHEMATIC`, `PLY`), `Pivot Position` (`Origin`, `Bottom`, `Center`), `Transform` (`SCALE X/Y/Z`), `With Texture` (`PNG`/`JPG`, `Metallic Roughness`), and `With Animation` toggle. |

