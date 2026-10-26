# 02. Product Requirements Document (PRD)

## 1. Product Vision & Scope

**Tripo3D Studio & Platform** is an end-to-end AI-powered 3D creation workspace, community hub, free 3D utility suite, and developer API platform. It replicates the visual design, UX workflows, quantitative credit mechanics, and 3D processing capabilities of `www.tripo3d.ai`, `studio.tripo3d.ai`, and `platform.tripo3d.ai`, enhanced with enterprise **invite-only registration**, single-use/expiring invitation codes, role-based access control (`ADMIN`, `CREATOR`, `VIEWER`), account/invite revocation, and full audit logging.

---

## 2. User Roles & Personas

1. **Administrator (`ADMIN`)**:
   - Full access to Studio 3D Workspace, Assets, Community Gallery, and Developer Platform.
   - Access to the **Admin Governance Console (`/admin`)** to issue single-use or multi-use expiring invitation codes, assign roles, revoke invitations or user accounts, grant/adjust user credits, and inspect the immutable security `AuditLog`.
2. **Creator (`CREATOR`)**:
   - Standard admitted user role (granted `200` initial monthly credits + `2` Smart Mesh trials + `1` Part Segmentation trial + `1` 8K Texture trial upon invite redemption).
   - Can generate 3D models and Pre-3D images, run Segmentation, Retopology, Smart UV, PBR Texturing, Auto-Rigging & Animation, upload/export 3D models (`.glb`, `.obj`, `.stl`, `.ply`), publish models to the Community Gallery, and create Developer API keys.
3. **Viewer (`VIEWER`)**:
   - Read-only admitted role. Can browse the Community Gallery, inspect 3D models in the interactive WebGL viewer, use the public 3D Viewer/Converter tools, and view documentation, but cannot execute credit-consuming generation mutations or manage admin settings.

---

## 3. Core Functional Requirements

### FR-1: Marketing Website & Public 3D Tools (`/`, `/pricing`, `/research`, `/features/[slug]`, `/3d-tools/*`)
- **FR-1.1 Marketing Home (`/`)**: Dark theme (`#070709`) with signature Tripo yellow/gold (`#f5c518`) CTAs, interactive hero Image/Text-to-3D quick entry, High Detail (up to 2M polygons) vs Smart Mesh (500–25K native quad topology) comparison showcase, 6-stage pipeline overview (Generate, Segment, Retopo, UV, Texture, Rig), Industry verticals (`Gaming`, `3D Printing`, `Film & VFX`, `AR/VR`, `E-Commerce`, `Product Design`), Community Gallery preview, and FAQ accordion.
- **FR-1.2 Pricing (`/pricing`)**: Monthly vs Annually (`30%–50% Off`) billing toggle, Web Studio plans (`Free $0`, `Pro $13/mo`, `Max $45/mo`), credit tier selectors (`3k`, `6k`, `12k`, `25k`), feature comparison table, and API credit calculator.
- **FR-1.3 Feature & Research Pages (`/features/[slug]`, `/research`)**: Dedicated interactive showcase pages for `image-to-3d-model`, `text-to-3d-model`, `ai-quad-remesher`, `ai-texturing`, `ai-model-segmentation`, `ai-auto-rigging`, and `VAST AI Research` foundation models.
- **FR-1.4 Free Online 3D Viewer (`/3d-tools/3d-viewer`)**: Upload any `.glb`, `.obj`, `.stl`, or `.ply` file (or load built-in presets) into an interactive WebGL viewport with `Scene`, `Geometry` (vertex/triangle/quad counts, bounding box dimensions), `UVs` (UV layout preview + checker texture toggle), and `Hierarchy` (mesh part tree) tabs.
- **FR-1.5 Free Online 3D Converter (`/3d-tools/convert`)**: Drag-and-drop 3D file converter that auto-detects source format (`OBJ`, `GLB`, `STL`, `PLY`, `FBX`, `3MF`, `USDZ`), repairs geometry normals, and converts/downloads into the selected target format.

### FR-2: Invite-Only Authentication, RBAC, Revocation & Audit Logging (`/login`, `/register`, `/admin`)
- **FR-2.1 Split-Screen Auth UI**: Replicates the Tripo Studio login/register screen with the 6 industry showcase cards on the left (`3D Printing`, `Gaming`, `Film`, `Design`, `E-commerce`, `VR/AR/XR`) and authentication form on the right.
- **FR-2.2 Invite-Only Registration**: Registration requires a valid invitation code, email, display name, and strong password (`≥ 8` chars). Rejects expired, revoked, or already-consumed single-use codes with clear error messages and records failed/successful attempts in `AuditLog`.
- **FR-2.3 No Demo Accounts**: No hardcoded or seeded demo user accounts exist. The first administrator is provisioned via `scripts/bootstrap-admin.mjs` or a bootstrap invite token.
- **FR-2.4 Onboarding Personalization Modal**: First-time authenticated users in Studio see the `"How do you create with Tripo?"` modal (`Game Assets`, `3D Printing`, `Animation & VFX`, `Product Design`, `3D Generalist` + sub-categories like `Character`, `Creatures & Animals`, `Equipment & Props`, `Scenes`, `Others`) and save their preference to their profile.

### FR-3: Tripo Studio Home, Community Gallery & Model Detail (`/studio`, `/3d-model/[id]`, `/creator-hub`)
- **FR-3.1 Studio Top Navigation**: `TRIPO` logo, `3D Workspace ▾` dropdown (`High Detail Model`, `Smart Topology Mesh`, `Generate Image`), `Home`, `Assets`, `Creator Hub`, `Resources ▾`, `DCC Bridge` popover (11 DCC plugins with version & install toggles), Credit balance pill (`⚡ 200` + `Upgrade` button), `Redeem / Referral` gift modal, Notifications bell, User profile & Level badge (`Lv.0`), and `Admin` link for admins.
- **FR-3.2 Quick Generator & Community Gallery**: Studio Home features the `"Hi, <username>! What will you bring into 3D?"` hero generator (`Best Quality` vs `Clean Topology Trial ×2`) and the filterable Community Gallery (`All`, `3D Printing`, `Featured`, `Character`, `Vehicle`, `Animal`, `Architecture`, `Furniture`, `Props`, `Weapon`, `Clothing`, `Machine`, `Food`, `Nature`, `Abstract`) with search, likes, and model detail modal/page.
- **FR-3.3 Model Detail Page (`/3d-model/[id]`)**: Interactive 3D WebGL viewer, wireframe/textured/UV/skeleton toggles, topology stats (vertices, faces, topology type, PBR status, rigged status), creator metadata, `Open in Workspace`, `Download` (`.glb`, `.obj`, `.stl`, `.ply`), `Like`, and `Remix`.

### FR-4: Interactive 3D Workspace (`/workspace/generate`)
- **FR-4.1 7-Stage Far-Left Pipeline Rail**:
  1. `Image` (`GPT Image 2.5` / `Nano Banana` Pre-3D Image Generator with `T Pose`, `3D Enhance`, `Photo to Figure` templates, aspect ratios `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `40 credits`)
  2. `Model` (`HD Model` vs `Smart Mesh`, 4 input sub-modes: `Image to 3D`, `Multi-View to 3D`, `Text to 3D`, `Sketch/Stylize`; `Geometry & Texture` settings drawer with `Ultra Mesh Quality`, `AI Complete`, `2K/4K/8K Texture`, `Remove Lighting`, `PBR`, `Quad/Triangle`, polycount `500–2,000,000`; `Members Only` toggles `Generate in Parts Trial ×1`, `8K Texture Trial ×1`, `Privacy Public/Private`; AI Model selector `H3.1 – Best Quality (55⚡)`, `H3.0 – Fast & Balanced (35⚡)`, `H2.5 – Legacy (25⚡)`, `P2.0 Smart Mesh (100⚡ / Trial ×2)`)
  3. `Segment` (`Part Segmentation` & `Fill Parts` — `40 credits`, blocks Quad/Rigged models unless converted, colors & separates semantic mesh parts)
  4. `Retopo` (`Quad` / `Triangle` retopology with target polycount slider — `10 credits`)
  5. `Smart UV` (`Tris ≤ 80,000 / Quads ≤ 40,000` UV unwrapping — `10 credits`)
  6. `Texture` (`3D Model Texture Generator`, `Edit` magic brush, `Upscale` to 4K/8K, `PBR` material maps — `20 credits`)
  7. `Rig` & `Animate` (`Auto-Rigging` skeleton builder + animation clip player `Idle`, `Walk`, `Run`, `Jump`, `Dance`, `Combat` — `30 credits`)
- **FR-4.2 Center 3D WebGL Viewport**: Real-time Three.js canvas with orbit/pan/zoom, top-right XYZ orientation gizmo, floating viewport toolbar (Lighting/HDRI rotation, Camera reset/orthographic toggle, Wireframe/Grid/Skeleton/Segment-color overlay toggles, Help shortcuts), and bottom playback/export bar.
- **FR-4.3 Right Inspector (`Assets` & `Property` Tabs)**: Browse generated/uploaded workspace assets, upload custom `.obj`/`.glb`/`.stl` models (`≤ 150MB`), inspect real-time `Property` metrics (Vertices, Faces, Topology, UV status, Rigging bones, Parts list), and export in `GLB`, `OBJ`, `STL`, or `PLY`.

### FR-5: Developer API Platform (`/platform`)
- **FR-5.1 API Key Management**: Create, view prefix, and revoke `tsk_...` Bearer API keys with audit logging.
- **FR-5.2 OpenAPI v3 Endpoints**: Live interactive API documentation and working REST endpoints (`/api/v3/tasks`, `/api/v3/wallet`) supporting programmatic `text_to_model`, `image_to_model`, `multiview_to_model`, `texture_model`, `refine_model`, `animate_rig`, and `convert_model` tasks.
